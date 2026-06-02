"use client";

import { useState } from "react";
import Shell from "@/components/Shell";
import { parseAgentFile, AgentWorkflow } from "../lib/agentParser";
import { analyzeWorkflow, WorkflowAnalysis } from "../lib/agentAnalyzer";
import { computeDiff, AgentDiff, DiffStep } from "../lib/agentDiff";
import {
  downloadJson,
  downloadHtml,
  buildCompareHtml,
  buildComparisonCsv,
  downloadText,
  printPage,
} from "../lib/exportUtils";

const STATUS_STYLE: Record<string, { bg: string; border: string; symbol: string; color: string }> = {
  unchanged: { bg: "#f8f9fa",  border: "#e0e0e0", symbol: "✓", color: "#555" },
  modified:  { bg: "#fffde7",  border: "#f9e154", symbol: "⚠", color: "#7c6d00" },
  added:     { bg: "#e8f5e9",  border: "#a5d6a7", symbol: "✚", color: "#1b5e20" },
  removed:   { bg: "#ffebee",  border: "#ef9a9a", symbol: "✗", color: "#7f0000" },
};

export default function CompareAgentsPage() {
  const [wf1, setWf1]         = useState<AgentWorkflow | null>(null);
  const [wf2, setWf2]         = useState<AgentWorkflow | null>(null);
  const [an1, setAn1]         = useState<WorkflowAnalysis | null>(null);
  const [an2, setAn2]         = useState<WorkflowAnalysis | null>(null);
  const [diff, setDiff]       = useState<AgentDiff | null>(null);
  const [err1, setErr1]       = useState<string>("");
  const [err2, setErr2]       = useState<string>("");
  const [loading1, setLoading1] = useState(false);
  const [loading2, setLoading2] = useState(false);
  const [modal, setModal]     = useState<DiffStep | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [drag1, setDrag1]     = useState(false);
  const [drag2, setDrag2]     = useState(false);

  async function loadFile(
    file: File,
    setWf: (w: AgentWorkflow) => void,
    setAn: (a: WorkflowAnalysis) => void,
    setErr: (e: string) => void,
    setLoading: (b: boolean) => void,
    other: AgentWorkflow | null,
    setDiff: (d: AgentDiff) => void,
    isFirst: boolean,
  ) {
    setLoading(true);
    setErr("");
    try {
      const wf = await parseAgentFile(file);
      const an = analyzeWorkflow(wf);
      setWf(wf);
      setAn(an);
      const partner = isFirst ? wf2 : wf1;
      const newWf1  = isFirst ? wf : wf1;
      const newWf2  = isFirst ? wf2 : wf;
      if (partner && newWf1 && newWf2) setDiff(computeDiff(newWf1, newWf2));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function handleFile1(file: File) {
    void loadFile(file, setWf1, setAn1, setErr1, setLoading1, wf2, setDiff, true);
    // Recompute diff if wf2 already exists — handled inside loadFile
    if (wf2) {
      // Will be recomputed inside loadFile
    }
  }
  function handleFile2(file: File) {
    void loadFile(file, setWf2, setAn2, setErr2, setLoading2, wf1, setDiff, false);
  }

  const filteredSteps = diff?.steps.filter((s) =>
    filterStatus === "all" ? true : s.status === filterStatus
  ) ?? [];

  return (
    <Shell title="Compare Agents">
      {/* Upload row */}
      <div className="grid2" style={{ gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <UploadZone
          label="Agent 1"
          workflow={wf1}
          analysis={an1}
          error={err1}
          loading={loading1}
          dragging={drag1}
          onFile={handleFile1}
          onDragChange={setDrag1}
          accent="#1a56db"
        />
        <UploadZone
          label="Agent 2"
          workflow={wf2}
          analysis={an2}
          error={err2}
          loading={loading2}
          dragging={drag2}
          onFile={handleFile2}
          onDragChange={setDrag2}
          accent="#7e22ce"
        />
      </div>

      {/* Diff section */}
      {diff && wf1 && wf2 && an1 && an2 && (
        <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Stats bar */}
          <section className="card">
            <div className="toolbar" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <div className="toolbar" style={{ gap: 12, flexWrap: "wrap" }}>
                {(["added", "removed", "modified", "unchanged"] as const).map((status) => {
                  const st = STATUS_STYLE[status];
                  return (
                    <button
                      key={status}
                      onClick={() => setFilterStatus(filterStatus === status ? "all" : status)}
                      style={{
                        border: `2px solid ${filterStatus === status ? st.border : "transparent"}`,
                        background: st.bg,
                        borderRadius: 10,
                        padding: "8px 16px",
                        cursor: "pointer",
                        minWidth: 80,
                        textAlign: "center",
                      }}
                    >
                      <div style={{ fontSize: 22, fontWeight: 700, color: st.color, lineHeight: 1 }}>
                        {diff.summary[status as keyof typeof diff.summary]}
                      </div>
                      <div style={{ fontSize: 12, color: "#555", marginTop: 3, textTransform: "capitalize" }}>
                        {status}
                      </div>
                    </button>
                  );
                })}
                {filterStatus !== "all" && (
                  <button className="btn" onClick={() => setFilterStatus("all")} style={{ fontSize: 12 }}>
                    Show all
                  </button>
                )}
              </div>
              <div className="toolbar" style={{ gap: 8, flexWrap: "wrap" }}>
                <button
                  className="btn primary"
                  onClick={() => downloadHtml(buildCompareHtml(wf1, wf2, diff, an1, an2), `compare_${wf1.agentGid}_vs_${wf2.agentGid}.html`)}
                >
                  Export HTML
                </button>
                <button
                  className="btn"
                  onClick={() => downloadJson({ agent1: wf1.agentGid, agent2: wf2.agentGid, diff }, `compare_${wf1.agentGid}_vs_${wf2.agentGid}.json`)}
                >
                  Export JSON
                </button>
                <button
                  className="btn"
                  onClick={() => downloadText(buildComparisonCsv(diff), `compare_${wf1.agentGid}_vs_${wf2.agentGid}.csv`)}
                >
                  Export CSV
                </button>
                <button className="btn" onClick={printPage}>Export PDF</button>
              </div>
            </div>
          </section>

          {/* Comparison table */}
          <section className="card">
            <div style={{ fontWeight: 700, marginBottom: 12 }}>
              Step-by-Step Comparison
              {filterStatus !== "all" && (
                <span className="badge" style={{ marginLeft: 8 }}>{filteredSteps.length} shown</span>
              )}
            </div>
            <div style={{ overflowX: "auto" }}>
              <table className="table" style={{ fontSize: 13, tableLayout: "fixed", width: "100%" }}>
                <colgroup>
                  <col style={{ width: 48 }} />
                  <col style={{ width: 70 }} />
                  <col style={{ width: "25%" }} />
                  <col style={{ width: "25%" }} />
                  <col style={{ width: 24 }} />
                </colgroup>
                <thead>
                  <tr>
                    <th>Step</th>
                    <th>Status</th>
                    <th style={{ color: "#1a56db" }}>Agent 1 — {an1.agentName}</th>
                    <th style={{ color: "#7e22ce" }}>Agent 2 — {an2.agentName}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSteps.map((d) => {
                    const st = STATUS_STYLE[d.status];
                    return (
                      <tr
                        key={`${d.sequence}-${d.status}`}
                        style={{ background: st.bg, cursor: d.status === "modified" ? "pointer" : "default" }}
                        onClick={() => d.status === "modified" && setModal(d)}
                      >
                        <td className="mono" style={{ fontWeight: 700 }}>{d.sequence}</td>
                        <td>
                          <span style={{ color: st.color, fontWeight: 700, fontSize: 13 }}>
                            {st.symbol} {d.status}
                          </span>
                        </td>
                        <td style={{ verticalAlign: "top" }}>
                          {d.step1 ? (
                            <>
                              <div style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700 }}>{d.step1.actionType}</div>
                              <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                                {d.step1.description ?? d.step1.parameters.slice(0, 60)}
                              </div>
                            </>
                          ) : <span className="muted">—</span>}
                        </td>
                        <td style={{ verticalAlign: "top" }}>
                          {d.step2 ? (
                            <>
                              <div style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700 }}>{d.step2.actionType}</div>
                              <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                                {d.step2.description ?? d.step2.parameters.slice(0, 60)}
                              </div>
                            </>
                          ) : <span className="muted">—</span>}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          {d.status === "modified" && (
                            <span className="muted" style={{ fontSize: 16 }} title="Click for details">›</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredSteps.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: "center", padding: 24 }} className="muted">
                        No steps match the current filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* Modal for modified step detail */}
      {modal && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1000, padding: 20,
          }}
          onClick={() => setModal(null)}
        >
          <div
            className="card"
            style={{ maxWidth: 760, width: "100%", maxHeight: "85vh", overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="toolbar" style={{ justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>Step {modal.sequence} — Changes</div>
              <button className="btn" onClick={() => setModal(null)}>Close ✕</button>
            </div>

            {modal.changes.length > 0 && (
              <div
                style={{
                  background: "#fffde7", border: "1px solid #f9e154",
                  borderRadius: 8, padding: "10px 14px", marginBottom: 16,
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 6 }}>What changed</div>
                <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13 }}>
                  {modal.changes.map((c, i) => <li key={i}>{c}</li>)}
                </ul>
              </div>
            )}

            <div className="grid2" style={{ gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <div className="label" style={{ color: "#1a56db", marginBottom: 8 }}>Agent 1 — BEFORE</div>
                <StepDetail step={modal.step1} />
              </div>
              <div>
                <div className="label" style={{ color: "#7e22ce", marginBottom: 8 }}>Agent 2 — AFTER</div>
                <StepDetail step={modal.step2} />
              </div>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}

function UploadZone({
  label, workflow, analysis, error, loading, dragging, onFile, onDragChange, accent,
}: {
  label: string;
  workflow: AgentWorkflow | null;
  analysis: WorkflowAnalysis | null;
  error: string;
  loading: boolean;
  dragging: boolean;
  onFile: (f: File) => void;
  onDragChange: (b: boolean) => void;
  accent: string;
}) {
  return (
    <div>
      <div className="label" style={{ marginBottom: 8, color: accent }}>{label}</div>
      <div
        className={dragging ? "dropzone dropzoneActive" : "dropzone"}
        style={{ textAlign: "center", padding: "20px 16px", cursor: "pointer" }}
        onClick={() => {
          const inp = document.createElement("input");
          inp.type = "file";
          inp.accept = ".xlsx,.xls,.csv";
          inp.onchange = () => { if (inp.files?.[0]) onFile(inp.files[0]); };
          inp.click();
        }}
        onDragOver={(e) => { e.preventDefault(); onDragChange(true); }}
        onDragLeave={() => onDragChange(false)}
        onDrop={(e) => { e.preventDefault(); onDragChange(false); if (e.dataTransfer.files[0]) onFile(e.dataTransfer.files[0]); }}
      >
        {loading ? (
          <span className="muted">Parsing…</span>
        ) : workflow && analysis ? (
          <div>
            <div style={{ fontWeight: 700, color: accent, fontSize: 15 }}>{analysis.agentName}</div>
            <div className="muted" style={{ fontSize: 12, marginTop: 4, fontFamily: "monospace" }}>{workflow.agentGid}</div>
            <div style={{ marginTop: 8, display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
              <span className="badge">{workflow.totalSteps} steps</span>
              <span className="badge good">{analysis.sqlOperations} SQL</span>
              <span className="badge" style={{ background: "#eff6ff", borderColor: "#bfdbfe", color: "#1a56db" }}>{analysis.ifBlocks} IF</span>
            </div>
            <div className="muted" style={{ fontSize: 11, marginTop: 8 }}>Click to replace</div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 24, marginBottom: 6 }}>📂</div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>Drop {label} file or click</div>
            <div className="muted" style={{ fontSize: 12 }}>xlsx or csv</div>
          </>
        )}
      </div>
      {error && (
        <div className="muted errorText" style={{ marginTop: 6, fontSize: 12 }}>{error}</div>
      )}
    </div>
  );
}

function StepDetail({ step }: { step: typeof undefined | { actionType: string; flowType: string; description?: string; parameters: string } | undefined }) {
  if (!step) return <div className="muted">Not present in this agent</div>;
  return (
    <div className="detailPane" style={{ minHeight: "auto" }}>
      <div style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 13 }}>{step.actionType}</div>
      <div style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <span className={`badge ${step.flowType === "Err" ? "bad" : "good"}`} style={{ fontSize: 11 }}>{step.flowType}</span>
      </div>
      {step.description && (
        <div style={{ marginTop: 8, fontSize: 13 }}>{step.description}</div>
      )}
      {step.parameters && (
        <pre style={{ marginTop: 8, fontSize: 11, whiteSpace: "pre-wrap", background: "#f5f7fb", padding: 8, borderRadius: 6, maxHeight: 260, overflowY: "auto" }}>
          {step.parameters}
        </pre>
      )}
    </div>
  );
}
