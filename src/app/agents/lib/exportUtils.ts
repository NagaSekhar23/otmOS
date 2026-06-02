import type { AgentWorkflow } from "./agentParser";
import type { WorkflowAnalysis } from "./agentAnalyzer";
import type { AgentDiff } from "./agentDiff";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a   = Object.assign(document.createElement("a"), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadJson(data: unknown, filename: string) {
  downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }), filename);
}

export function downloadText(text: string, filename: string) {
  downloadBlob(new Blob([text], { type: "text/plain" }), filename);
}

export function downloadSvgFromContainer(container: HTMLElement, filename: string) {
  const svg = container.querySelector("svg");
  if (!svg) return;
  const str = new XMLSerializer().serializeToString(svg);
  downloadBlob(new Blob([str], { type: "image/svg+xml" }), filename);
}

export function downloadHtml(html: string, filename: string) {
  downloadBlob(new Blob([html], { type: "text/html" }), filename);
}

export function printPage() {
  window.print();
}

export function buildCompareHtml(
  wf1: AgentWorkflow,
  wf2: AgentWorkflow,
  diff: AgentDiff,
  analysis1?: WorkflowAnalysis,
  analysis2?: WorkflowAnalysis,
): string {
  const COLOR: Record<string, string> = {
    unchanged: "#f8f9fa",
    modified:  "#fffde7",
    added:     "#e8f5e9",
    removed:   "#ffebee",
  };
  const SYMBOL: Record<string, string> = {
    unchanged: "✓",
    modified:  "⚠",
    added:     "✚",
    removed:   "✗",
  };

  const rows = diff.steps
    .map((d) => {
      const s1 = d.step1;
      const s2 = d.step2;
      const bg = COLOR[d.status] ?? "#fff";
      const sym = SYMBOL[d.status] ?? "";
      const changes = d.changes.length ? `<ul>${d.changes.map((c) => `<li>${c}</li>`).join("")}</ul>` : "—";
      return `<tr style="background:${bg}">
  <td>${d.sequence}</td>
  <td><strong>${sym}</strong> ${d.status}</td>
  <td>${s1 ? s1.actionType : "—"}</td>
  <td style="max-width:240px;word-break:break-word">${s1?.description ?? (s1?.parameters.slice(0, 80) ?? "—")}</td>
  <td>${s2 ? s2.actionType : "—"}</td>
  <td style="max-width:240px;word-break:break-word">${s2?.description ?? (s2?.parameters.slice(0, 80) ?? "—")}</td>
  <td style="max-width:200px">${changes}</td>
</tr>`;
    })
    .join("\n");

  const summaryBlock = analysis1 && analysis2
    ? `<div class="info-grid">
  <div class="info-card"><h3>Agent 1</h3><p>${analysis1.workflowSummary}</p></div>
  <div class="info-card"><h3>Agent 2</h3><p>${analysis2.workflowSummary}</p></div>
</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Agent Comparison: ${wf1.agentGid} vs ${wf2.agentGid}</title>
<style>
  body { font-family: Arial, sans-serif; padding: 24px; color: #171717; }
  h1 { font-size: 22px; }
  h2 { font-size: 17px; margin-top: 28px; }
  h3 { margin: 0 0 8px; }
  p { margin: 0; font-size: 14px; line-height: 1.5; }
  .stats { display: flex; gap: 16px; margin: 16px 0; flex-wrap: wrap; }
  .stat { border: 1px solid #ddd; border-radius: 8px; padding: 12px 20px; text-align: center; min-width: 90px; }
  .stat .n { font-size: 28px; font-weight: 700; line-height: 1; }
  .stat .l { font-size: 13px; color: #555; margin-top: 4px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 16px 0; }
  .info-card { border: 1px solid #ddd; border-radius: 8px; padding: 14px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 16px; }
  th { background: #333; color: #fff; padding: 10px 8px; text-align: left; }
  td { padding: 8px; border-bottom: 1px solid #e0e0e0; vertical-align: top; }
  ul { margin: 0; padding-left: 16px; }
  .added   { color: #2e7d32; font-weight: 700; }
  .removed { color: #c62828; font-weight: 700; }
  .modified { color: #f57f17; font-weight: 700; }
  @media print { .stats { break-inside: avoid; } }
</style>
</head>
<body>
<h1>Agent Comparison Report</h1>
<p>Generated: ${new Date().toLocaleString()}</p>
<p><strong>Agent 1:</strong> ${wf1.agentGid} (${wf1.totalSteps} steps, file: ${wf1.fileName})</p>
<p><strong>Agent 2:</strong> ${wf2.agentGid} (${wf2.totalSteps} steps, file: ${wf2.fileName})</p>
<div class="stats">
  <div class="stat"><div class="n added">${diff.summary.added}</div><div class="l">Added</div></div>
  <div class="stat"><div class="n removed">${diff.summary.removed}</div><div class="l">Removed</div></div>
  <div class="stat"><div class="n modified">${diff.summary.modified}</div><div class="l">Modified</div></div>
  <div class="stat"><div class="n" style="color:#555">${diff.summary.unchanged}</div><div class="l">Unchanged</div></div>
</div>
${summaryBlock}
<h2>Step-by-Step Comparison</h2>
<table>
  <thead>
    <tr>
      <th>Step</th><th>Status</th>
      <th>Agent 1 Action</th><th>Agent 1 Description</th>
      <th>Agent 2 Action</th><th>Agent 2 Description</th>
      <th>Changes</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>
</body>
</html>`;
}

export function buildComparisonCsv(diff: AgentDiff): string {
  const header = "Step,Status,Agent1_Action,Agent1_Description,Agent2_Action,Agent2_Description,Changes";
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const rows = diff.steps.map((d) =>
    [
      d.sequence,
      esc(d.status),
      esc(d.step1?.actionType ?? ""),
      esc(d.step1?.description ?? d.step1?.parameters.slice(0, 80) ?? ""),
      esc(d.step2?.actionType ?? ""),
      esc(d.step2?.description ?? d.step2?.parameters.slice(0, 80) ?? ""),
      esc(d.changes.join("; ")),
    ].join(",")
  );
  return [header, ...rows].join("\n");
}
