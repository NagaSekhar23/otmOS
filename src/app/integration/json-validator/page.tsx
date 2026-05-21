"use client";

import { useMemo, useState } from "react";
import Ajv from "ajv";
import Shell from "@/components/Shell";
import { OTM_SCHEMAS, OTM_DOCS_URL } from "@/lib/otmSchemas";

type Mode = "format" | "schema";

const INITIAL_JSON =
  '{\n  "hello": "world",\n  "items": [\n    { "id": 1, "name": "A" },\n    { "id": 2, "name": "B" }\n  ]\n}\n';

const OTM_OBJECT_KEYS = Object.keys(OTM_SCHEMAS);

export default function JsonValidatorPage() {
  const [mode, setMode] = useState<Mode>("format");

  // Format mode state
  const [json, setJson] = useState<string>(INITIAL_JSON);
  const [pretty, setPretty] = useState(true);

  // Schema mode state
  const [selectedOtmKey, setSelectedOtmKey] = useState<string>("");
  const [schemaText, setSchemaText] = useState<string>("");
  const [dataText, setDataText] = useState<string>("");

  // Format mode: parse result
  const parsed = useMemo(() => {
    if (!json.trim()) return { ok: false as const, message: "Paste JSON to validate." };
    try {
      const v = JSON.parse(json);
      return { ok: true as const, message: "Valid JSON", value: v };
    } catch (e) {
      return { ok: false as const, message: (e as Error).message };
    }
  }, [json]);

  const displayed = useMemo(() => {
    if (!pretty) return json;
    if (!parsed.ok) return json;
    try {
      return JSON.stringify(parsed.value, null, 2) + "\n";
    } catch {
      return json;
    }
  }, [json, pretty, parsed]);

  // Schema mode: validation result
  const schemaResult = useMemo(() => {
    if (!schemaText.trim()) return { state: "idle" as const, message: "Select an OTM schema or paste a JSON Schema." };
    if (!dataText.trim()) return { state: "idle" as const, message: "Load the sample or paste JSON data to validate." };

    let schema: unknown;
    try {
      schema = JSON.parse(schemaText);
    } catch (e) {
      return { state: "error" as const, message: "Schema is not valid JSON: " + (e as Error).message };
    }

    let data: unknown;
    try {
      data = JSON.parse(dataText);
    } catch (e) {
      return { state: "error" as const, message: "Data is not valid JSON: " + (e as Error).message };
    }

    try {
      const ajv = new Ajv({ allErrors: true });
      const valid = ajv.validate(schema as Parameters<typeof ajv.validate>[0], data);
      if (valid) return { state: "valid" as const, message: "Data is valid against the schema.", errors: [] };
      return {
        state: "invalid" as const,
        message: `${ajv.errors!.length} validation error${ajv.errors!.length === 1 ? "" : "s"}`,
        errors: ajv.errors!,
      };
    } catch (e) {
      return { state: "error" as const, message: "Schema compilation failed: " + (e as Error).message };
    }
  }, [schemaText, dataText]);

  function loadOtmSchema(key: string) {
    setSelectedOtmKey(key);
    if (!key) return;
    const entry = OTM_SCHEMAS[key];
    setSchemaText(JSON.stringify(entry.schema, null, 2));
    setDataText(JSON.stringify(entry.sample, null, 2));
  }

  return (
    <Shell title="JSON Validator">
      {/* Oracle docs link */}
      <div style={{ marginBottom: 14, fontSize: 13 }}>
        <span className="muted">Reference: </span>
        <a
          href={OTM_DOCS_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "var(--accent, #e05a2b)", textDecoration: "underline" }}
        >
          Oracle OTM REST API Documentation ↗
        </a>
      </div>

      {/* Mode tabs */}
      <div className="toolbar" style={{ marginBottom: 12, gap: 0 }}>
        <button
          className={`btn${mode === "format" ? " primary" : ""}`}
          style={{ borderRadius: "6px 0 0 6px" }}
          onClick={() => setMode("format")}
        >
          Format validation
        </button>
        <button
          className={`btn${mode === "schema" ? " primary" : ""}`}
          style={{ borderRadius: "0 6px 6px 0" }}
          onClick={() => setMode("schema")}
        >
          Schema validation
        </button>
      </div>

      {mode === "format" && (
        <section className="card">
          <div style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontWeight: 600 }}>{parsed.ok ? "✅" : "⚠️"} {parsed.message}</div>
              <div className="muted" style={{ marginTop: 6 }}>Validates JSON syntax and pretty-prints.</div>
            </div>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="checkbox" checked={pretty} onChange={(e) => setPretty(e.target.checked)} />
              <span className="muted" style={{ fontSize: 12 }}>Pretty</span>
            </label>
          </div>
          <textarea
            value={displayed}
            onChange={(e) => setJson(e.target.value)}
            spellCheck={false}
            style={{ width: "100%", marginTop: 12, minHeight: 360, fontFamily: "var(--font-geist-mono)" }}
          />
        </section>
      )}

      {mode === "schema" && (
        <>
          {/* OTM schema selector */}
          <section className="card" style={{ marginBottom: 12 }}>
            <div className="toolbar" style={{ flexWrap: "wrap", gap: 12, alignItems: "center" }}>
              <div>
                <div className="label" style={{ marginBottom: 6 }}>Load OTM Schema</div>
                <div className="toolbar" style={{ gap: 8, flexWrap: "wrap" }}>
                  {OTM_OBJECT_KEYS.map((key) => (
                    <button
                      key={key}
                      className={`btn${selectedOtmKey === key ? " primary" : ""}`}
                      onClick={() => loadOtmSchema(key)}
                    >
                      {OTM_SCHEMAS[key].label}
                    </button>
                  ))}
                  {selectedOtmKey && (
                    <button
                      className="btn"
                      onClick={() => { setSelectedOtmKey(""); setSchemaText(""); setDataText(""); }}
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>

          <div className="grid2" style={{ alignItems: "start" }}>
            {/* Schema pane */}
            <section className="card">
              <div className="toolbar" style={{ justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ fontWeight: 700 }}>JSON Schema</div>
                <span className="badge">draft-07</span>
              </div>
              <textarea
                className="textarea mono"
                value={schemaText}
                onChange={(e) => { setSchemaText(e.target.value); setSelectedOtmKey(""); }}
                spellCheck={false}
                style={{ minHeight: "52vh", resize: "vertical" }}
                placeholder="Select an OTM object above or paste a custom JSON Schema..."
              />
            </section>

            {/* Data pane */}
            <section className="card">
              <div className="toolbar" style={{ justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ fontWeight: 700 }}>JSON Data</div>
                {schemaResult.state === "valid" && <span className="badge good">Valid</span>}
                {schemaResult.state === "invalid" && <span className="badge bad">Invalid</span>}
                {schemaResult.state === "error" && <span className="badge bad">Error</span>}
                {schemaResult.state === "idle" && <span className="badge">waiting</span>}
              </div>
              <textarea
                className="textarea mono"
                value={dataText}
                onChange={(e) => setDataText(e.target.value)}
                spellCheck={false}
                style={{ minHeight: "52vh", resize: "vertical" }}
                placeholder="Select an OTM schema above to auto-load a sample, or paste JSON data..."
              />
            </section>
          </div>

          {/* Validation result */}
          <section className="card" style={{ marginTop: 12 }}>
            {schemaResult.state === "idle" && (
              <div className="muted">{schemaResult.message}</div>
            )}
            {schemaResult.state === "error" && (
              <div className="badge bad" style={{ borderRadius: 6, padding: "8px 12px", fontSize: 13 }}>
                {schemaResult.message}
              </div>
            )}
            {schemaResult.state === "valid" && (
              <div style={{ color: "var(--good, #16a34a)", fontWeight: 600 }}>✅ {schemaResult.message}</div>
            )}
            {schemaResult.state === "invalid" && (
              <div>
                <div style={{ fontWeight: 700, marginBottom: 10 }}>
                  <span className="badge bad" style={{ marginRight: 8 }}>{schemaResult.message}</span>
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ textAlign: "left", borderBottom: "1px solid var(--border, #e5e7eb)" }}>
                      <th style={{ padding: "4px 8px" }}>Path</th>
                      <th style={{ padding: "4px 8px" }}>Message</th>
                      <th style={{ padding: "4px 8px" }}>Keyword</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schemaResult.errors.map((err, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid var(--border, #f3f4f6)" }}>
                        <td style={{ padding: "6px 8px", fontFamily: "var(--font-geist-mono)", color: "var(--muted, #6b7280)" }}>
                          {(err as { dataPath?: string; instancePath?: string }).instancePath ||
                            (err as { dataPath?: string }).dataPath || "(root)"}
                        </td>
                        <td style={{ padding: "6px 8px" }}>{err.message}</td>
                        <td style={{ padding: "6px 8px" }}>
                          <span className="badge">{err.keyword}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </Shell>
  );
}
