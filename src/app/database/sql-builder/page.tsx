"use client";

import { useEffect, useMemo, useState } from "react";
import Shell from "@/components/Shell";

type TableSummary = { tableName: string; subjectArea: string; fileName: string };
type TableField = { name: string; description: string };
type TableDetail = {
  tableName: string;
  description: string;
  fields: TableField[];
  fileName: string;
  subjectArea: string;
  relationships?: { fieldName: string; targetTable: string; targetLabel?: string }[];
};
type JoinSuggestion = {
  tableName: string;
  fieldName: string;
  condition: string;
  score: number;
};
type JoinedTable = {
  tableName: string;
  fieldName: string;
  condition: string;
  alias: string;
  fields: TableField[];
  fieldSearch: string;
  collapsed: boolean;
};

const HIGH_VALUE_TABLES = new Set([
  "LOCATION", "SHIPMENT", "ORDER_RELEASE", "INVOICE", "TRANSPORT_MODE", "CURRENCY",
  "SERVPROV", "EQUIPMENT", "CONTACT", "ITEM", "ITEM_MASTER", "FLEET", "DRIVER",
  "INVOICE_LINE", "ORDER_BASE", "ORDER_MOVEMENT", "SHIPMENT_STATUS",
  "LOCATION_ROLE", "CORPORATE_ACCOUNT",
]);

function scoreRel(rel: { fieldName: string; targetTable: string }): number {
  let score = 0;
  if (HIGH_VALUE_TABLES.has(rel.targetTable)) score += 10;
  if (!rel.fieldName.includes("USER_DEFINED")) score += 5;
  if (!rel.fieldName.includes("ICON") && !rel.fieldName.includes("ALIAS_QUAL")) score += 3;
  if (rel.fieldName.endsWith("_GID")) score += 2;
  return score;
}

export default function SqlBuilderPage() {
  const [tables, setTables] = useState<TableSummary[]>([]);
  const [baseTable, setBaseTable] = useState<string>(() => {
    if (typeof window === "undefined") return "INVOICE";
    return new URLSearchParams(window.location.search).get("table") ?? "INVOICE";
  });
  const [detail, setDetail] = useState<TableDetail | null>(null);
  const [joinedTables, setJoinedTables] = useState<JoinedTable[]>([]);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [whereText, setWhereText] = useState<string>("");
  const [orderBy, setOrderBy] = useState<string>("");
  const [limitText, setLimitText] = useState<string>("100");
  const [fieldSearch, setFieldSearch] = useState<string>("");
  const [template, setTemplate] = useState<"select" | "count" | "gid" | "date-range">("select");
  const [gidValue, setGidValue] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("2024-01-01");
  const [dateTo, setDateTo] = useState<string>("2024-02-01");
  const [joinFilter, setJoinFilter] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetch("/api/database/tables");
      const data = (await res.json()) as { tables?: TableSummary[] };
      if (!cancelled) setTables(data.tables ?? []);
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!baseTable) return;
      const res = await fetch(`/api/database/tables?table=${encodeURIComponent(baseTable)}`);
      const data = (await res.json()) as TableDetail;
      if (!cancelled) {
        setDetail(data);
        setSelectedFields([]);
        setJoinedTables([]);
        setFieldSearch("");
        setJoinFilter("");
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [baseTable]);

  const joinSuggestions = useMemo((): JoinSuggestion[] => {
    if (!detail) return [];
    const addedPairs = new Set(joinedTables.map((j) => `${j.tableName}|${j.fieldName}`));
    const seen = new Set<string>();
    const out: JoinSuggestion[] = [];
    for (const rel of detail.relationships ?? []) {
      const key = `${rel.targetTable}|${rel.fieldName}`;
      if (seen.has(key) || addedPairs.has(key)) continue;
      seen.add(key);
      out.push({
        tableName: rel.targetTable,
        fieldName: rel.fieldName,
        condition: `t.${rel.fieldName} = __ALIAS__.${rel.targetTable}_GID`,
        score: scoreRel(rel),
      });
    }
    return out.sort((a, b) => b.score - a.score);
  }, [detail, joinedTables]);

  const filteredSuggestions = useMemo(() => {
    const q = joinFilter.trim().toLowerCase();
    if (!q) return joinSuggestions;
    return joinSuggestions.filter(
      (s) => s.tableName.toLowerCase().includes(q) || s.fieldName.toLowerCase().includes(q)
    );
  }, [joinSuggestions, joinFilter]);

  const filteredBaseFields = useMemo(() => {
    const q = fieldSearch.trim().toLowerCase();
    if (!detail) return [];
    if (!q) return detail.fields;
    return detail.fields.filter(
      (f) => f.name.toLowerCase().includes(q) || f.description.toLowerCase().includes(q)
    );
  }, [detail, fieldSearch]);

  const computedWhere = useMemo(() => {
    if (template === "gid")
      return whereText.trim() || `t.${baseTable}_GID = '${gidValue || "DOMAIN.XID"}'`;
    if (template === "date-range")
      return whereText.trim() || `t.INSERT_DATE >= DATE '${dateFrom}' AND t.INSERT_DATE < DATE '${dateTo}'`;
    return whereText.trim();
  }, [template, whereText, baseTable, gidValue, dateFrom, dateTo]);

  const sql = useMemo(() => {
    const safeLimit = Number(limitText) > 0 ? Number(limitText) : 100;
    const selectClause = selectedFields.length
      ? selectedFields.join(",\n  ")
      : template === "count"
        ? "COUNT(*) AS row_count"
        : "t.*";
    const joinClauses = joinedTables.map(
      (j) => `LEFT JOIN ${j.tableName} ${j.alias} ON ${j.condition}`
    );
    return [
      "SELECT",
      `  ${selectClause}`,
      `FROM ${baseTable || "<TABLE_NAME>"} t`,
      ...joinClauses,
      computedWhere ? `WHERE ${computedWhere}` : "-- WHERE <conditions>",
      template !== "count"
        ? orderBy.trim() ? `ORDER BY ${orderBy.trim()}` : "-- ORDER BY <field>"
        : "-- (no ORDER BY needed for COUNT)",
      template !== "count" ? `FETCH FIRST ${safeLimit} ROWS ONLY;` : ";",
    ].join("\n");
  }, [selectedFields, baseTable, computedWhere, orderBy, limitText, joinedTables, template]);

  function toggleField(fieldRef: string) {
    setSelectedFields((prev) =>
      prev.includes(fieldRef) ? prev.filter((f) => f !== fieldRef) : [...prev, fieldRef]
    );
  }

  async function copySql() {
    await navigator.clipboard.writeText(sql);
  }

  async function addJoin(suggestion: JoinSuggestion) {
    const alias = `j${joinedTables.length + 1}`;
    const condition = suggestion.condition.replace("__ALIAS__", alias);
    const res = await fetch(`/api/database/tables?table=${encodeURIComponent(suggestion.tableName)}`);
    const data = (await res.json()) as TableDetail;
    setJoinedTables((prev) => [
      ...prev,
      {
        tableName: suggestion.tableName,
        fieldName: suggestion.fieldName,
        condition,
        alias,
        fields: data.fields ?? [],
        fieldSearch: "",
        collapsed: false,
      },
    ]);
  }

  function removeJoin(alias: string) {
    setJoinedTables((prev) => prev.filter((j) => j.alias !== alias));
    setSelectedFields((prev) => prev.filter((f) => !f.startsWith(`${alias}.`)));
  }

  function updateJoinCondition(alias: string, condition: string) {
    setJoinedTables((prev) => prev.map((j) => (j.alias === alias ? { ...j, condition } : j)));
  }

  function updateJoinFieldSearch(alias: string, search: string) {
    setJoinedTables((prev) => prev.map((j) => (j.alias === alias ? { ...j, fieldSearch: search } : j)));
  }

  function toggleJoinCollapsed(alias: string) {
    setJoinedTables((prev) => prev.map((j) => (j.alias === alias ? { ...j, collapsed: !j.collapsed } : j)));
  }

  const baseSelectedCount = selectedFields.filter((f) => f.startsWith("t.")).length;

  return (
    <Shell title="SQL Builder">
      <div
        className="grid2"
        style={{ alignItems: "start", gridTemplateColumns: "minmax(360px, 0.9fr) minmax(560px, 1.1fr)" }}
      >
        {/* LEFT — query setup + joins */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <section className="card">
            <div style={{ fontWeight: 700 }}>Query Setup</div>

            <div style={{ marginTop: 12 }}>
              <div className="label">Base table</div>
              <select className="input" value={baseTable} onChange={(e) => setBaseTable(e.target.value)}>
                {tables.map((t) => (
                  <option key={t.tableName} value={t.tableName}>{t.tableName}</option>
                ))}
              </select>
              {detail?.description ? (
                <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>{detail.description}</div>
              ) : null}
            </div>

            <div style={{ marginTop: 12 }}>
              <div className="label">Query template</div>
              <select
                className="input"
                value={template}
                onChange={(e) => setTemplate(e.target.value as typeof template)}
              >
                <option value="select">Select rows</option>
                <option value="count">Count rows</option>
                <option value="gid">Find by GID</option>
                <option value="date-range">Date range query</option>
              </select>
            </div>

            {template === "gid" && (
              <div style={{ marginTop: 12 }}>
                <div className="label">GID value</div>
                <input
                  className="input mono"
                  value={gidValue}
                  onChange={(e) => setGidValue(e.target.value)}
                  placeholder="DOMAIN.XID"
                />
              </div>
            )}

            {template === "date-range" && (
              <div className="formGrid" style={{ marginTop: 12 }}>
                <div>
                  <div className="label">From date</div>
                  <input
                    className="input mono"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    placeholder="YYYY-MM-DD"
                  />
                </div>
                <div>
                  <div className="label">To date</div>
                  <input
                    className="input mono"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    placeholder="YYYY-MM-DD"
                  />
                </div>
              </div>
            )}

            <div className="formGrid" style={{ marginTop: 12 }}>
              <div>
                <div className="label">
                  WHERE
                  {(template === "gid" || template === "date-range") && (
                    <span className="muted" style={{ fontWeight: 400 }}> (optional override)</span>
                  )}
                </div>
                <textarea
                  className="textarea mono"
                  value={whereText}
                  onChange={(e) => setWhereText(e.target.value)}
                  style={{ minHeight: 72 }}
                  placeholder={
                    template === "gid"
                      ? "Leave blank to use GID value above"
                      : template === "date-range"
                        ? "Leave blank to use date range above"
                        : "e.g. t.INVOICE_GID = 'DOMAIN.ID'"
                  }
                />
              </div>
              <div>
                <div className="label">ORDER BY</div>
                <input
                  className="input mono"
                  value={orderBy}
                  onChange={(e) => setOrderBy(e.target.value)}
                  placeholder="e.g. t.INSERT_DATE DESC"
                />
                <div className="label" style={{ marginTop: 12 }}>Limit</div>
                <input
                  className="input mono"
                  value={limitText}
                  onChange={(e) => setLimitText(e.target.value)}
                  placeholder="100"
                />
              </div>
            </div>
          </section>

          {/* Join suggestions */}
          <section className="card">
            <div className="toolbar" style={{ justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontWeight: 700 }}>Join Suggestions</span>
                <span className="badge">{joinSuggestions.length}</span>
              </div>
              {joinedTables.length > 0 && (
                <span className="badge good">{joinedTables.length} active</span>
              )}
            </div>
            <input
              className="input"
              style={{ marginTop: 10 }}
              value={joinFilter}
              onChange={(e) => setJoinFilter(e.target.value)}
              placeholder="Filter by table or field name…"
            />
            {filteredSuggestions.length === 0 ? (
              <div className="muted" style={{ marginTop: 12, fontSize: 13 }}>
                {joinSuggestions.length === 0
                  ? "No FK-based join suggestions for this table."
                  : "No suggestions match filter."}
              </div>
            ) : (
              <div className="listStack" style={{ marginTop: 12, maxHeight: "38vh", overflowY: "auto" }}>
                {filteredSuggestions.map((s, idx) => (
                  <div
                    key={`${s.tableName}-${s.fieldName}-${idx}`}
                    className="detailPane"
                    style={{ minHeight: "auto", padding: "10px 14px" }}
                  >
                    <div className="toolbar" style={{ justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontWeight: 700 }}>{s.tableName}</span>
                          {HIGH_VALUE_TABLES.has(s.tableName) && (
                            <span className="badge good" style={{ fontSize: 11 }}>core</span>
                          )}
                        </div>
                        <div className="mono muted" style={{ fontSize: 12, marginTop: 4 }}>
                          via {s.fieldName}
                        </div>
                      </div>
                      <button
                        className="btn primary"
                        style={{ padding: "5px 12px", fontSize: 13, flexShrink: 0 }}
                        onClick={() => addJoin(s)}
                      >
                        Add
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Active joins */}
          {joinedTables.length > 0 && (
            <section className="card">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontWeight: 700 }}>Active Joins</span>
                <span className="badge">{joinedTables.length}</span>
              </div>
              <div className="listStack" style={{ marginTop: 12 }}>
                {joinedTables.map((join) => (
                  <div key={join.alias} className="detailPane" style={{ minHeight: "auto" }}>
                    <div className="toolbar" style={{ justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <span className="mono" style={{ fontWeight: 700, color: "var(--accent)" }}>{join.alias}</span>
                        <span style={{ margin: "0 8px", color: "var(--muted)" }}>→</span>
                        <span style={{ fontWeight: 700 }}>{join.tableName}</span>
                        <div className="mono muted" style={{ fontSize: 12, marginTop: 4 }}>
                          via {join.fieldName}
                        </div>
                      </div>
                      <button
                        className="btn"
                        style={{ padding: "4px 10px", fontSize: 12 }}
                        onClick={() => removeJoin(join.alias)}
                      >
                        Remove
                      </button>
                    </div>
                    <textarea
                      className="textarea mono"
                      value={join.condition}
                      onChange={(e) => updateJoinCondition(join.alias, e.target.value)}
                      style={{ minHeight: 56, marginTop: 8, fontSize: 13 }}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* RIGHT — SQL output + field selection */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <section className="card">
            <div className="toolbar" style={{ justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 700 }}>Generated SQL</div>
              <button className="btn primary" onClick={copySql}>Copy SQL</button>
            </div>
            <pre className="pre mono" style={{ marginTop: 12, whiteSpace: "pre-wrap", fontSize: 13 }}>{sql}</pre>
          </section>

          <section className="card">
            <div style={{ fontWeight: 700 }}>
              Fields
              {selectedFields.length > 0 && (
                <span className="badge" style={{ marginLeft: 8 }}>{selectedFields.length} selected</span>
              )}
            </div>
            <div className="muted" style={{ marginTop: 4, fontSize: 13 }}>
              Select fields to include — defaults to <span className="mono">t.*</span> if none chosen.
            </div>

            {/* Base table fields */}
            <div style={{ marginTop: 14 }}>
              <div className="label">
                {baseTable}
                <span className="mono muted" style={{ fontWeight: 400 }}> (t)</span>
                {baseSelectedCount > 0 && (
                  <span className="badge" style={{ marginLeft: 8 }}>{baseSelectedCount} selected</span>
                )}
              </div>
              <input
                className="input"
                style={{ marginTop: 8 }}
                value={fieldSearch}
                onChange={(e) => setFieldSearch(e.target.value)}
                placeholder="Search fields…"
              />
              <div className="muted" style={{ marginTop: 4, fontSize: 12 }}>
                {filteredBaseFields.length} of {detail?.fields.length ?? 0} fields
              </div>
              <div className="listStack" style={{ marginTop: 8, maxHeight: "48vh", overflowY: "auto" }}>
                {filteredBaseFields.map((field) => (
                  <label
                    key={field.name}
                    className="detailPane"
                    style={{ minHeight: "auto", padding: "8px 12px", cursor: "pointer" }}
                  >
                    <div className="toolbar" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ flex: 1 }}>
                        <div className="mono" style={{ fontWeight: 700 }}>{field.name}</div>
                        {field.description && (
                          <div className="muted" style={{ marginTop: 3, fontSize: 12 }}>{field.description}</div>
                        )}
                      </div>
                      <input
                        type="checkbox"
                        checked={selectedFields.includes(`t.${field.name}`)}
                        onChange={() => toggleField(`t.${field.name}`)}
                        style={{ marginLeft: 12, marginTop: 2, flexShrink: 0 }}
                      />
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Per-joined-table fields */}
            {joinedTables.map((join) => {
              const q = join.fieldSearch.trim().toLowerCase();
              const filtered = q
                ? join.fields.filter(
                    (f) =>
                      f.name.toLowerCase().includes(q) ||
                      f.description.toLowerCase().includes(q)
                  )
                : join.fields;
              const selectedCount = selectedFields.filter((f) => f.startsWith(`${join.alias}.`)).length;
              return (
                <div key={join.alias} style={{ marginTop: 18 }}>
                  <div
                    className="toolbar"
                    style={{ justifyContent: "space-between", cursor: "pointer", userSelect: "none" }}
                    onClick={() => toggleJoinCollapsed(join.alias)}
                  >
                    <div className="label">
                      {join.tableName}
                      <span className="mono muted" style={{ fontWeight: 400 }}> ({join.alias})</span>
                      {selectedCount > 0 && (
                        <span className="badge" style={{ marginLeft: 8 }}>{selectedCount} selected</span>
                      )}
                    </div>
                    <span className="muted" style={{ fontSize: 13 }}>{join.collapsed ? "▸ show" : "▾ hide"}</span>
                  </div>
                  {!join.collapsed && (
                    <>
                      <input
                        className="input"
                        style={{ marginTop: 8 }}
                        value={join.fieldSearch}
                        onChange={(e) => updateJoinFieldSearch(join.alias, e.target.value)}
                        placeholder={`Search ${join.tableName} fields…`}
                      />
                      <div className="muted" style={{ marginTop: 4, fontSize: 12 }}>
                        {Math.min(filtered.length, 60)} of {join.fields.length} fields
                        {filtered.length > 60 ? " — use search to narrow" : ""}
                      </div>
                      <div className="listStack" style={{ marginTop: 8, maxHeight: "38vh", overflowY: "auto" }}>
                        {filtered.slice(0, 60).map((field) => (
                          <label
                            key={`${join.alias}-${field.name}`}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "flex-start",
                              padding: "7px 10px",
                              borderRadius: 8,
                              border: "1px solid var(--border)",
                              background: "#fff",
                              cursor: "pointer",
                            }}
                          >
                            <div style={{ flex: 1 }}>
                              <div className="mono" style={{ fontWeight: 700, fontSize: 13 }}>{field.name}</div>
                              {field.description && (
                                <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{field.description}</div>
                              )}
                            </div>
                            <input
                              type="checkbox"
                              checked={selectedFields.includes(`${join.alias}.${field.name}`)}
                              onChange={() => toggleField(`${join.alias}.${field.name}`)}
                              style={{ marginLeft: 12, marginTop: 2, flexShrink: 0 }}
                            />
                          </label>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </section>
        </div>
      </div>
    </Shell>
  );
}
