"use client";

import { useEffect, useRef, useState } from "react";
import Shell from "@/components/Shell";
import { parseAgentFile, AgentWorkflow } from "../lib/agentParser";
import { analyzeWorkflow, WorkflowAnalysis } from "../lib/agentAnalyzer";
import { generateMermaid } from "../lib/mermaidGenerator";
import {
  downloadJson,
  downloadSvgFromContainer,
  downloadText,
  printPage,
} from "../lib/exportUtils";

export default function AgentAnalyzerPage() {
  const [workflow, setWorkflow]       = useState<AgentWorkflow | null>(null);
  const [analysis, setAnalysis]       = useState<WorkflowAnalysis | null>(null);
  const [mermaidCode, setMermaidCode] = useState<string>("");
  const [error, setError]             = useState<string>("");
  const [loading, setLoading]         = useState(false);
  const [isDragging, setIsDragging]   = useState(false);
  const [showRawMmd, setShowRawMmd]   = useState(false);
  const [mermaidError, setMermaidError] = useState<string>("");
  const mermaidRef  = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setLoading(true);
    setError("");
    setWorkflow(null);
    setAnalysis(null);
    setMermaidCode("");
    setMermaidError("");
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
        <div className="muted" style={{ fontSize: 13 }}>Supports .xlsx and .csv</div>
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }} onChange={pick} />
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
            {/* Info card */}
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

            {/* Summary card */}
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
              <pre
                className="pre mono"
                style={{ marginTop: 12, fontSize: 12, whiteSpace: "pre-wrap", maxHeight: 320, overflowY: "auto" }}
              >
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
                    <th>Description / Parameters</th>
                    <th style={{ width: 80 }}>Flow</th>
                    <th style={{ width: 70 }}>SQL</th>
                  </tr>
                </thead>
                <tbody>
                  {allSteps.map((step) => (
                    <tr key={`${step.sequence}-${step.flowType}`}>
                      <td className="mono" style={{ fontWeight: 700 }}>{step.sequence}</td>
                      <td>
                        <ActionBadge actionType={step.actionType} />
                      </td>
                      <td style={{ maxWidth: 500, wordBreak: "break-word" }}>
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
                      </td>
                      <td>
                        <span
                          className={step.flowType === "Err" ? "badge bad" : "badge good"}
                          style={{ fontSize: 11 }}
                        >
                          {step.flowType}
                        </span>
                      </td>
                      <td>
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
              onClick={() => downloadJson({ workflow, analysis, mermaidCode }, `${analysis.agentGid}_export.json`)}
            >
              Export JSON
            </button>
            <button className="btn" onClick={printPage}>Export PDF (Print)</button>
          </div>
        </div>
      )}
    </Shell>
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
    <div
      style={{
        border: `1px solid ${border}`,
        background: bg,
        borderRadius: 10,
        padding: "8px 14px",
        textAlign: "center",
        minWidth: 80,
      }}
    >
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
    <span
      style={{
        display: "inline-block",
        background: bg,
        border: `1px solid ${border}`,
        color,
        borderRadius: 6,
        padding: "3px 8px",
        fontSize: 12,
        fontFamily: "monospace",
        fontWeight: 600,
      }}
    >
      {actionType}
    </span>
  );
}
