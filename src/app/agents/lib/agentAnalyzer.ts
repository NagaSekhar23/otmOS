import type { AgentWorkflow, AgentStep } from "./agentParser";

export interface WorkflowAnalysis {
  agentName: string;
  agentGid: string;
  totalSteps: number;
  normalSteps: number;
  errorSteps: number;
  sqlOperations: number;
  conditionals: number;
  ifBlocks: number;
  specialActions: string[];
  workflowSummary: string;
  businessPurpose: string;
  keyConditions: string[];
}

function agentNameFromGid(gid: string): string {
  const part = gid.split(".").pop() ?? gid;
  return part.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function extractConditions(steps: AgentStep[]): string[] {
  return [
    ...new Set(
      steps
        .filter((s) => s.actionType === "IF")
        .map((s) => s.description ?? s.parameters.slice(0, 80).trim())
        .filter(Boolean)
    ),
  ].slice(0, 6);
}

function extractSpecialActions(steps: AgentStep[]): string[] {
  return [
    ...new Set(
      steps
        .filter((s) => !["IF", "ELSE", "ENDIF"].includes(s.actionType) && !s.actionType.includes("SQL"))
        .map((s) => s.actionType)
    ),
  ].slice(0, 6);
}

function buildSummary(wf: AgentWorkflow, conditions: string[], specials: string[]): string {
  const name = agentNameFromGid(wf.agentGid);
  const ifCount = wf.normalFlow.filter((s) => s.actionType === "IF").length;
  const sqlCount = wf.summary.sqlOperations;
  const hasNotify   = specials.some((a) => a.includes("NOTIFY"));
  const hasAutoMatch = specials.some((a) => a.includes("AUTO MATCH") || a.includes("AUTOMATCH"));

  let s = `This agent handles ${name} processing with ${wf.normalFlow.length} workflow step${wf.normalFlow.length !== 1 ? "s" : ""}. `;

  if (ifCount > 0) {
    s += `It evaluates ${ifCount} condition${ifCount > 1 ? "s" : ""}`;
    if (conditions.length > 0) {
      const readable = conditions
        .slice(0, 3)
        .map((c) => c.replace(/[._]/g, " ").toLowerCase())
        .join(", ");
      s += ` (${readable})`;
    }
    s += ". ";
  }

  if (sqlCount > 0) {
    const insertCount = wf.normalFlow.filter((s) => s.sqlType === "INSERT").length;
    const updateCount = wf.normalFlow.filter((s) => s.sqlType === "UPDATE").length;
    const deleteCount = wf.normalFlow.filter((s) => s.sqlType === "DELETE").length;
    const parts: string[] = [];
    if (insertCount) parts.push(`${insertCount} INSERT${insertCount > 1 ? "s" : ""}`);
    if (updateCount) parts.push(`${updateCount} UPDATE${updateCount > 1 ? "s" : ""}`);
    if (deleteCount) parts.push(`${deleteCount} DELETE${deleteCount > 1 ? "s" : ""}`);
    s += parts.length
      ? `SQL operations: ${parts.join(", ")}. `
      : `${sqlCount} SQL operation${sqlCount > 1 ? "s" : ""} execute database changes. `;
  }

  if (hasAutoMatch) s += "Automatic order/shipment matching is applied. ";
  if (hasNotify) s += "Notifications are sent upon completion. ";
  if (wf.errorFlow.length > 0)
    s += `An error handling path covers ${wf.errorFlow.length} step${wf.errorFlow.length > 1 ? "s" : ""}.`;

  return s.trim();
}

export function analyzeWorkflow(wf: AgentWorkflow): WorkflowAnalysis {
  const conditions = extractConditions(wf.normalFlow);
  const specials   = extractSpecialActions([...wf.normalFlow, ...wf.errorFlow]);
  const ifBlocks   = wf.normalFlow.filter((s) => s.actionType === "IF").length;

  return {
    agentName:       agentNameFromGid(wf.agentGid),
    agentGid:        wf.agentGid,
    totalSteps:      wf.totalSteps,
    normalSteps:     wf.normalFlow.length,
    errorSteps:      wf.errorFlow.length,
    sqlOperations:   wf.summary.sqlOperations,
    conditionals:    wf.summary.conditionals,
    ifBlocks,
    specialActions:  specials,
    workflowSummary: buildSummary(wf, conditions, specials),
    businessPurpose: `Automates ${agentNameFromGid(wf.agentGid).toLowerCase()} in Oracle OTM.`,
    keyConditions:   conditions,
  };
}
