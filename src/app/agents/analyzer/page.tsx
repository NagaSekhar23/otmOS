"use client";

import { useEffect, useRef, useState } from "react";
import Shell from "@/components/Shell";
import { parseAgentFile, AgentWorkflow, AgentStep } from "../lib/agentParser";
import { analyzeWorkflow, WorkflowAnalysis } from "../lib/agentAnalyzer";
import { generateMermaid } from "../lib/mermaidGenerator";
import { parseSql, ParsedSql } from "../lib/sqlParser";
import { parseIfCondition, ParsedCondition } from "../lib/ifConditionParser";
import {
  downloadJson,
  downloadSvgFromContainer,
  downloadText,
  printPage,
} from "../lib/exportUtils";

// ── helpers ────────────────────────────────────────────────────────────────

function getIfPaths(
  steps: AgentStep[],
  ifIndex: number
): { truePath: string[]; falsePath: string[] } {
  const truePath: string[] = [];
  const falsePath: string[] = [];
  let depth = 0;
  let inFalse = false;

  for (let i = ifIndex + 1; i < steps.length; i++) {
    const s = steps[i];
    if (s.actionType === "IF") { depth++; continue; }
    if (s.actionType === "ENDIF") {
      if (depth === 0) break;
      depth--;
      continue;
    }
    if (s.actionType === "ELSE" && depth === 0) { inFalse = true; continue; }
    if (depth === 0) {
      const label = `${s.sequence}: ${(s.description ?? s.actionType).slice(0, 60)}`;
      if (!inFalse && truePath.length < 2) truePath.push(label);
      if (inFalse && falsePath.length < 2) falsePath.push(label);
    }
  }
  return { truePath, falsePath };
}

function buildExportData(
  workflow: AgentWorkflow,
  analysis: WorkflowAnalysis,
  mermaidCode: string
) {
  const parsedSteps = [...workflow.normalFlow, ...workflow.errorFlow]
    .sort((a, b) => a.sequence - b.sequence)
    .map((step) => ({
      sequence: step.sequence,
      actionType: step.actionType,
      flowType: step.flowType,
      description: step.description,
      parsedSql: step.sqlType ? parseSql(step.parameters, step.description) : undefined,
      parsedCondition: step.actionType === "IF" ? parseIfCondition(step.parameters) : undefined,
    }));
  return { workflow, analysis, mermaidCode, parsedSteps };
}

// ── main component ─────────────────────────────────────────────────────────

export default function AgentAnalyzerPage() {
  const [workflow, setWorkflow]         = useState<AgentWorkflow | null>(null);
  const [analysis, setAnalysis]         = useState<WorkflowAnalysis | null>(null);
  const [mermaidCode, setMermaidCode]   = useState<string>("");
  const [error, setError]               = useState<string>("");
  const [loading, setLoading]           = useState(false);
  const [isDragging, setIsDragging]     = useState(false);
  const [showRawMmd, setShowRawMmd]     = useState(false);
  const [mermaidError, setMermaidError] = useState<string>("");
  const [modalStep, setModalStep]       = useState<AgentStep | null>(null);
  const mermaidRef  = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setLoading(true);
    setError("");
    setWorkflow(null);
    setAnalysis(null);
    setMermaidCode("");
    setMermaidError("");
    setModalStep(null);
    try {
      const wf  = await parseAgentFile(file);
      const an  = analyzeWorkflow(wf);
      const mmd = generateMermaid(wf);
      setWorkflow(wf);
      setAnalysis(an);
      setMermaidCode(mmd);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!mermaidCode || !mermaidRef.current) return;
    let alive = true;
    async function render() {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: "default",
          flowchart: { curve: "basis", padding: 12 },
          maxTextSize: 9_000_000,
        });
        const uid = `mmd-${Date.now()}`;
        const { svg } = await mermaid.render(uid, mermaidCode);
        if (alive && mermaidRef.current) mermaidRef.current.innerHTML = svg;
      } catch (e) {
        if (alive) setMermaidError(String(e));
      }
    }
    void render();
    return () => { alive = false; };
  }, [mermaidCode]);

  function drop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) void handleFile(file);
  }

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
  }

  async function copySummary() {
    if (analysis) await navigator.clipboard.writeText(analysis.workflowSummary);
  }

  async function copyMmd() {
    if (mermaidCode) await navigator.clipboard.writeText(mermaidCode);
  }

  const allSteps = workflow
    ? [...workflow.normalFlow, ...workflow.errorFlow].sort((a, b) => a.sequence - b.sequence)
    : [];

  const modalParsed: ParsedSql | null =
    modalStep?.sqlType ? parseSql(modalStep.parameters, modalStep.description) : null;

  return (
    <Shell title="Agent Analyzer">
      {/* Upload zone */}
      <div
        className={isDragging ? "dropzone dropzoneActive" : "dropzone"}
        style={{ textAlign: "center", padding: 32, cursor: "pointer" }}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={drop}
      >
        <div style={{ fontSize: 32, marginBottom: 8 }}>📂</div>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>
          {loading ? "Parsing…" : "Drop an agent file here or click to browse"}
        </div>
        <div className="muted" style={{ fontSize: 13 }}>Supports .xlsx, .csv, and .zip</div>
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv,.zip" style={{ display: "none" }} onChange={pick} />
      </div>

      {error && (
        <div className="detailPane" style={{ marginTop: 16, minHeight: "auto", borderColor: "#fecdca", background: "#fef3f2" }}>
          <div className="errorText" style={{ fontWeight: 600 }}>Parse error</div>
          <div style={{ marginTop: 8, fontFamily: "monospace", fontSize: 13 }}>{error}</div>
        </div>
      )}

      {workflow && analysis && (
        <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Info + Summary row */}
          <div className="grid2">
            <section className="card">
              <div style={{ fontWeight: 700, fontSize: 16 }}>{analysis.agentName}</div>
              <div className="muted" style={{ fontSize: 12, marginTop: 4, fontFamily: "monospace" }}>{analysis.agentGid}</div>
              <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", gap: 8 }}>
                <StatBadge label="Total Steps"    value={analysis.totalSteps}    color="#555" />
                <StatBadge label="Normal Flow"    value={analysis.normalSteps}   color="#067647" bg="#ecfdf3" border="#a6f4c5" />
                {analysis.errorSteps > 0 && (
                  <StatBadge label="Error Flow"   value={analysis.errorSteps}    color="#b42318" bg="#fef3f2" border="#fecdca" />
                )}
                <StatBadge label="SQL Operations" value={analysis.sqlOperations} color="#067647" bg="#ecfdf3" border="#a6f4c5" />
                <StatBadge label="IF Blocks"      value={analysis.ifBlocks}      color="#1a56db" bg="#eff6ff" border="#bfdbfe" />
                {analysis.specialActions.length > 0 && (
                  <StatBadge label="Special Actions" value={analysis.specialActions.length} color="#b54708" bg="#fffaeb" border="#fedf89" />
                )}
              </div>
              {analysis.keyConditions.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <div className="label" style={{ fontSize: 12 }}>Key Conditions</div>
                  <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {analysis.keyConditions.map((c) => (
                      <span key={c} className="badge" style={{ fontFamily: "monospace", fontSize: 11 }}>{c}</span>
                    ))}
                  </div>
                </div>
              )}
              {analysis.specialActions.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <div className="label" style={{ fontSize: 12 }}>Special Actions</div>
                  <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {analysis.specialActions.map((a) => (
                      <span key={a} className="badge warn" style={{ fontSize: 11 }}>{a}</span>
                    ))}
                  </div>
                </div>
              )}
            </section>

            <section className="card">
              <div className="toolbar" style={{ justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ fontWeight: 700 }}>Workflow Summary</div>
                <div className="toolbar" style={{ gap: 8 }}>
                  <button className="btn" style={{ fontSize: 12, padding: "5px 10px" }} onClick={copySummary}>Copy</button>
                  <button className="btn" style={{ fontSize: 12, padding: "5px 10px" }} onClick={() => downloadText(analysis.workflowSummary, `${analysis.agentGid}_summary.txt`)}>Download</button>
                </div>
              </div>
              <div style={{ lineHeight: 1.7, fontSize: 14 }}>{analysis.workflowSummary}</div>
              <div className="muted" style={{ marginTop: 12, fontSize: 13, fontStyle: "italic" }}>{analysis.businessPurpose}</div>
            </section>
          </div>

          {/* Flowchart */}
          <section className="card">
            <div className="toolbar" style={{ justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ fontWeight: 700 }}>Workflow Flowchart</div>
              <div className="toolbar" style={{ gap: 8 }}>
                <button className="btn" style={{ fontSize: 12, padding: "5px 10px" }} onClick={copyMmd}>Copy Mermaid</button>
                <button
                  className="btn"
                  style={{ fontSize: 12, padding: "5px 10px" }}
                  onClick={() => mermaidRef.current && downloadSvgFromContainer(mermaidRef.current, `${analysis.agentGid}_flowchart.svg`)}
                >
                  Download SVG
                </button>
                <button className="btn" style={{ fontSize: 12, padding: "5px 10px" }} onClick={() => setShowRawMmd((v) => !v)}>
                  {showRawMmd ? "Hide" : "Show"} Source
                </button>
              </div>
            </div>

            {mermaidError ? (
              <div className="errorText" style={{ padding: 12 }}>
                <div style={{ fontWeight: 600 }}>Flowchart render error</div>
                <pre style={{ fontSize: 12, marginTop: 8, whiteSpace: "pre-wrap" }}>{mermaidError}</pre>
              </div>
            ) : (
              <div
                ref={mermaidRef}
                style={{
                  overflowX: "auto",
                  overflowY: "auto",
                  maxHeight: 560,
                  background: "#fff",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: 16,
                  textAlign: "center",
                }}
              />
            )}

            {showRawMmd && (
              <pre className="pre mono" style={{ marginTop: 12, fontSize: 12, whiteSpace: "pre-wrap", maxHeight: 320, overflowY: "auto" }}>
                {mermaidCode}
              </pre>
            )}
          </section>

          {/* Steps table */}
          <section className="card">
            <div className="toolbar" style={{ justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ fontWeight: 700 }}>
                Step Details
                <span className="badge" style={{ marginLeft: 8 }}>{allSteps.length}</span>
              </div>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table className="table" style={{ fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={{ width: 52 }}>Step</th>
                    <th style={{ width: 180 }}>Action Type</th>
                    <th>Business Logic / Parameters</th>
                    <th style={{ width: 80 }}>Flow</th>
                    <th style={{ width: 70 }}>SQL</th>
                  </tr>
                </thead>
                <tbody>
                  {allSteps.map((step, idx) => (
                    <tr key={`${step.sequence}-${step.flowType}`}>
                      <td className="mono" style={{ fontWeight: 700, verticalAlign: "top", paddingTop: 12 }}>{step.sequence}</td>
                      <td style={{ verticalAlign: "top", paddingTop: 12 }}>
                        <ActionBadge actionType={step.actionType} />
                      </td>
                      <td style={{ maxWidth: 560 }}>
                        {step.sqlType ? (
                          <SqlSummaryCell
                            step={step}
                            onDetails={() => setModalStep(step)}
                          />
                        ) : step.actionType === "IF" ? (
                          <IfSummaryCell step={step} steps={allSteps} idx={idx} />
                        ) : (
                          <DefaultCell step={step} />
                        )}
                      </td>
                      <td style={{ verticalAlign: "top", paddingTop: 12 }}>
                        <span className={step.flowType === "Err" ? "badge bad" : "badge good"} style={{ fontSize: 11 }}>
                          {step.flowType}
                        </span>
                      </td>
                      <td style={{ verticalAlign: "top", paddingTop: 12 }}>
                        {step.sqlType ? (
                          <span className="badge" style={{ fontSize: 11, background: "#e8f5e9", borderColor: "#a6f4c5", color: "#067647" }}>
                            {step.sqlType}
                          </span>
                        ) : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Export row */}
          <div className="toolbar" style={{ gap: 10 }}>
            <button
              className="btn primary"
              onClick={() => downloadJson(buildExportData(workflow, analysis, mermaidCode), `${analysis.agentGid}_export.json`)}
            >
              Export JSON
            </button>
            <button className="btn" onClick={printPage}>Export PDF (Print)</button>
          </div>
        </div>
      )}

      {/* SQL Detail Modal */}
      {modalStep && (
        <SqlDetailModal
          step={modalStep}
          parsed={modalParsed}
          onClose={() => setModalStep(null)}
        />
      )}
    </Shell>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function SqlSummaryCell({ step, onDetails }: { step: AgentStep; onDetails: () => void }) {
  const parsed = parseSql(step.parameters, step.description);

  const opColors: Record<string, { bg: string; border: string; color: string }> = {
    UPDATE: { bg: "#fffaeb", border: "#fedf89", color: "#b45309" },
    INSERT: { bg: "#ecfdf3", border: "#a6f4c5", color: "#067647" },
    DELETE: { bg: "#fef3f2", border: "#fecdca", color: "#b42318" },
    SELECT: { bg: "#eff6ff", border: "#bfdbfe", color: "#1a56db" },
    UNKNOWN: { bg: "#f5f7fb", border: "var(--border)", color: "#555" },
  };
  const opStyle = opColors[parsed.operation] ?? opColors.UNKNOWN;

  return (
    <div style={{ padding: "8px 0" }}>
      {/* Business summary header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
        <span
          style={{
            background: opStyle.bg,
            border: `1px solid ${opStyle.border}`,
            color: opStyle.color,
            borderRadius: 6,
            padding: "2px 8px",
            fontSize: 11,
            fontFamily: "monospace",
            fontWeight: 700,
          }}
        >
          {parsed.operation}
        </span>
        {parsed.mainTable && (
          <span style={{ fontSize: 12, color: "#333" }}>
            <span className="muted">Table: </span>
            <strong>{parsed.mainTable}</strong>
          </span>
        )}
      </div>

      {/* Human summary */}
      <div style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 8, color: "#222" }}>
        {parsed.humanSummary}
      </div>

      {/* Columns */}
      {parsed.columns.length > 0 && (
        <div style={{ fontSize: 12, marginBottom: 4 }}>
          <span className="muted">Modifies: </span>
          <span style={{ fontFamily: "monospace" }}>{parsed.columns.slice(0, 4).join(", ")}</span>
          {parsed.columns.length > 4 && <span className="muted"> +{parsed.columns.length - 4} more</span>}
        </div>
      )}

      {/* Conditions */}
      {parsed.conditions.length > 0 && (
        <div style={{ fontSize: 12, marginBottom: 4 }}>
          <span className="muted">Conditions: </span>
          {parsed.conditions.slice(0, 3).map((c, i) => (
            <span key={i} style={{ display: "inline-block", background: "#f0f4ff", border: "1px solid #c7d7fd", borderRadius: 4, padding: "1px 6px", fontSize: 11, marginRight: 4, marginBottom: 2, fontFamily: "monospace" }}>
              {c}
            </span>
          ))}
          {parsed.conditions.length > 3 && <span className="muted">+{parsed.conditions.length - 3} more</span>}
        </div>
      )}

      {/* Related tables */}
      {parsed.joins.length > 0 && (
        <div style={{ fontSize: 12, marginBottom: 6 }}>
          <span className="muted">Related tables: </span>
          <span>{parsed.joins.join(", ")}</span>
        </div>
      )}

      {/* Action row */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6 }}>
        <button
          className="btn"
          style={{ fontSize: 11, padding: "3px 8px" }}
          onClick={onDetails}
        >
          SQL Details
        </button>
        {step.parameters && (
          <details style={{ flex: 1 }}>
            <summary className="muted" style={{ fontSize: 11, cursor: "pointer", userSelect: "none" }}>
              Raw SQL
            </summary>
            <pre style={{ marginTop: 4, fontSize: 11, whiteSpace: "pre-wrap", background: "#f5f7fb", padding: 8, borderRadius: 6, overflowX: "auto", maxHeight: 240 }}>
              {step.parameters}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}

function IfSummaryCell({ step, steps, idx }: { step: AgentStep; steps: AgentStep[]; idx: number }) {
  const parsed: ParsedCondition = parseIfCondition(step.parameters);
  const { truePath, falsePath } = getIfPaths(steps, idx);

  return (
    <div style={{ padding: "8px 0" }}>
      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>
        {parsed.conditionName}
      </div>
      <div style={{ fontSize: 12, color: "#444", marginBottom: 6, lineHeight: 1.5 }}>
        {parsed.humanDescription}
      </div>
      {parsed.conditionGid && (
        <div style={{ fontSize: 11, fontFamily: "monospace", color: "#888", marginBottom: 6 }}>
          {parsed.conditionGid}
        </div>
      )}
      {parsed.role && (
        <div style={{ fontSize: 11, marginBottom: 4 }}>
          <span className="muted">Role: </span>{parsed.role}
        </div>
      )}
      {(parsed.forceTrue || parsed.forceFalse) && (
        <span className="badge warn" style={{ fontSize: 11, marginBottom: 6, display: "inline-block" }}>
          {parsed.forceTrue ? "Force TRUE" : "Force FALSE"}
        </span>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 4 }}>
        {truePath.length > 0 && (
          <div style={{ fontSize: 12 }}>
            <span style={{ color: "#067647", fontWeight: 700 }}>✓ True → </span>
            <span className="muted">{truePath.join(", ")}</span>
          </div>
        )}
        {falsePath.length > 0 && (
          <div style={{ fontSize: 12 }}>
            <span style={{ color: "#b42318", fontWeight: 700 }}>✗ False → </span>
            <span className="muted">{falsePath.join(", ")}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function DefaultCell({ step }: { step: AgentStep }) {
  return (
    <div style={{ padding: "8px 0" }}>
      <span style={{ fontSize: 13 }}>
        {step.description ?? step.parameters.slice(0, 120) ?? "—"}
      </span>
      {step.parameters.length > 0 && (
        <details style={{ marginTop: 4 }}>
          <summary className="muted" style={{ fontSize: 11, cursor: "pointer" }}>Full parameters</summary>
          <pre style={{ marginTop: 4, fontSize: 11, whiteSpace: "pre-wrap", background: "#f5f7fb", padding: 8, borderRadius: 6 }}>
            {step.parameters}
          </pre>
        </details>
      )}
    </div>
  );
}

function SqlDetailModal({ step, parsed, onClose }: { step: AgentStep; parsed: ParsedSql | null; onClose: () => void }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.48)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 14,
          boxShadow: "0 8px 40px rgba(0,0,0,0.22)",
          padding: 28,
          maxWidth: 720,
          width: "100%",
          maxHeight: "85vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 17 }}>SQL Details — Step {step.sequence}</div>
            <div className="muted" style={{ fontSize: 12, marginTop: 2, fontFamily: "monospace" }}>{step.actionType}</div>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", padding: "4px 10px", fontSize: 16, color: "#555" }}
          >
            ✕
          </button>
        </div>

        {parsed ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Business Logic */}
            <div style={{ background: "#f0fdf4", border: "1px solid #a6f4c5", borderRadius: 10, padding: 16 }}>
              <div style={{ fontWeight: 600, marginBottom: 6, color: "#15803d" }}>Business Logic</div>
              <div style={{ fontSize: 14, lineHeight: 1.6 }}>{parsed.humanSummary}</div>
              {parsed.purpose !== parsed.humanSummary && (
                <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>{parsed.purpose}</div>
              )}
            </div>

            {/* Details grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <DetailBox label="Operation" value={parsed.operation} mono />
              <DetailBox label="Main Table" value={parsed.mainTable || "—"} mono />
              {parsed.tableAlias && <DetailBox label="Table Alias" value={parsed.tableAlias} mono />}
            </div>

            {parsed.columns.length > 0 && (
              <div>
                <div className="label" style={{ fontSize: 12, marginBottom: 6 }}>Columns Modified</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {parsed.columns.map((c) => (
                    <span key={c} style={{ background: "#fffaeb", border: "1px solid #fedf89", borderRadius: 6, padding: "2px 8px", fontSize: 12, fontFamily: "monospace" }}>{c}</span>
                  ))}
                </div>
              </div>
            )}

            {parsed.conditions.length > 0 && (
              <div>
                <div className="label" style={{ fontSize: 12, marginBottom: 6 }}>WHERE Conditions</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {parsed.conditions.map((c, i) => (
                    <div key={i} style={{ background: "#f0f4ff", border: "1px solid #c7d7fd", borderRadius: 6, padding: "4px 10px", fontSize: 12, fontFamily: "monospace" }}>
                      {c}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {parsed.joins.length > 0 && (
              <div>
                <div className="label" style={{ fontSize: 12, marginBottom: 6 }}>Related / Joined Tables</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {parsed.joins.map((t) => (
                    <span key={t} style={{ background: "#fdf4ff", border: "1px solid #e9d5ff", borderRadius: 6, padding: "2px 8px", fontSize: 12, fontFamily: "monospace" }}>{t}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Raw SQL */}
            <div>
              <div className="label" style={{ fontSize: 12, marginBottom: 6 }}>Raw SQL</div>
              <pre style={{ fontSize: 12, background: "#f5f7fb", border: "1px solid var(--border)", borderRadius: 8, padding: 12, whiteSpace: "pre-wrap", overflowX: "auto", maxHeight: 300 }}>
                {step.parameters}
              </pre>
            </div>

            {/* Parsed object */}
            <details>
              <summary className="muted" style={{ fontSize: 12, cursor: "pointer" }}>Full parsed object (JSON)</summary>
              <pre style={{ fontSize: 11, background: "#f5f7fb", border: "1px solid var(--border)", borderRadius: 8, padding: 12, marginTop: 6, whiteSpace: "pre-wrap", overflowX: "auto", maxHeight: 280 }}>
                {JSON.stringify(parsed, null, 2)}
              </pre>
            </details>
          </div>
        ) : (
          <div>
            <div className="muted" style={{ marginBottom: 12 }}>No SQL detected in parameters.</div>
            <pre style={{ fontSize: 12, background: "#f5f7fb", borderRadius: 8, padding: 12, whiteSpace: "pre-wrap" }}>
              {step.parameters}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailBox({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ background: "#f5f7fb", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 14px" }}>
      <div className="label" style={{ fontSize: 11, marginBottom: 4 }}>{label}</div>
      <div style={{ fontWeight: 600, fontFamily: mono ? "monospace" : undefined, fontSize: 14 }}>{value}</div>
    </div>
  );
}

function StatBadge({
  label,
  value,
  color = "#555",
  bg = "#f5f7fb",
  border = "var(--border)",
}: {
  label: string;
  value: number;
  color?: string;
  bg?: string;
  border?: string;
}) {
  return (
    <div style={{ border: `1px solid ${border}`, background: bg, borderRadius: 10, padding: "8px 14px", textAlign: "center", minWidth: 80 }}>
      <div style={{ fontSize: 22, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, color: "#555", marginTop: 4 }}>{label}</div>
    </div>
  );
}

function ActionBadge({ actionType }: { actionType: string }) {
  let bg = "#fff", border = "var(--border)", color = "#333";
  if (actionType === "IF") { bg = "#eff6ff"; border = "#bfdbfe"; color = "#1a56db"; }
  else if (actionType === "ELSE") { bg = "#f0fdf4"; border = "#bbf7d0"; color = "#15803d"; }
  else if (actionType === "ENDIF") { bg = "#f5f5f4"; border = "#d4d4d4"; color = "#555"; }
  else if (actionType.includes("SQL")) { bg = "#f0fdf4"; border = "#bbf7d0"; color = "#15803d"; }
  else if (actionType.includes("NOTIFY")) { bg = "#fffaeb"; border = "#fedf89"; color = "#b45309"; }
  else if (actionType.includes("AUTO MATCH") || actionType.includes("AUTOMATCH")) {
    bg = "#fdf4ff"; border = "#e9d5ff"; color = "#7e22ce";
  }
  return (
    <span style={{ display: "inline-block", background: bg, border: `1px solid ${border}`, color, borderRadius: 6, padding: "3px 8px", fontSize: 12, fontFamily: "monospace", fontWeight: 600 }}>
      {actionType}
    </span>
  );
}
