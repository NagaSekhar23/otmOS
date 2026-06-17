import * as XLSX from "xlsx";
import Papa from "papaparse";

export interface AgentStep {
  sequence: number;
  actionType: string;
  flowType: "Norm" | "Err";
  parameters: string;
  agentGid: string;
  description?: string;
  sqlType?: "INSERT" | "UPDATE" | "DELETE";
  condition?: string;
}

export interface AgentWorkflow {
  agentGid: string;
  fileName: string;
  totalSteps: number;
  normalFlow: AgentStep[];
  errorFlow: AgentStep[];
  summary: {
    sqlOperations: number;
    conditionals: number;
    specialActions: number;
  };
}

const COL_SEQUENCE = ["action_sequence", "actionsequence", "sequence", "seq"];
const COL_ACTION   = ["agent_action_gid", "agentactiongid", "action_gid", "action_type", "action"];
const COL_FLOW     = ["action_flow", "actionflow", "flow_type", "flow"];
const COL_PARAMS   = ["action_parameters", "actionparameters", "parameters", "params", "sql"];
const COL_AGENT    = ["agent_gid", "agentgid", "agent"];

function findCol(headers: string[], aliases: string[]): string | null {
  const norm = headers.map((h) => h.toLowerCase().trim().replace(/[\s\-]+/g, "_"));
  for (const alias of aliases) {
    const idx = norm.indexOf(alias);
    if (idx >= 0) return headers[idx];
  }
  return null;
}

function extractDescription(params: string, actionType: string): string | undefined {
  if (!params) return undefined;
  const lineComment = params.match(/--\s*(.+)/);
  if (lineComment) return lineComment[1].trim().slice(0, 120);
  const blockComment = params.match(/\/\*\s*([\s\S]*?)\s*\*\//);
  if (blockComment) return blockComment[1].replace(/\s+/g, " ").trim().slice(0, 120);
  if (actionType === "IF") {
    const gid = params.match(/[A-Z][A-Z0-9_]*(?:\.[A-Z][A-Z0-9_]+)+/);
    if (gid) return gid[0];
    return params.trim().slice(0, 80);
  }
  const first = params.trim().split(/[\n;]/)[0].trim();
  return first.length > 4 ? first.slice(0, 100) : undefined;
}

function extractSqlType(params: string): "INSERT" | "UPDATE" | "DELETE" | undefined {
  const u = params.toUpperCase().replace(/\s+/g, " ").trimStart();
  if (u.startsWith("INSERT") || /\bINSERT\b/.test(u.slice(0, 200))) return "INSERT";
  if (u.startsWith("UPDATE") || /\bUPDATE\b/.test(u.slice(0, 200))) return "UPDATE";
  if (u.startsWith("DELETE") || /\bDELETE\b/.test(u.slice(0, 200))) return "DELETE";
  return undefined;
}

function parseRows(rows: Record<string, string>[], fileName: string): AgentWorkflow {
  if (rows.length === 0) throw new Error("No data rows found in file");
  const headers = Object.keys(rows[0]);
  const seqCol    = findCol(headers, COL_SEQUENCE);
  const actionCol = findCol(headers, COL_ACTION);
  const flowCol   = findCol(headers, COL_FLOW);
  const paramsCol = findCol(headers, COL_PARAMS);
  const agentCol  = findCol(headers, COL_AGENT);

  if (!seqCol || !actionCol) {
    throw new Error(
      `Required columns not found. Need ACTION_SEQUENCE and AGENT_ACTION_GID.\nDetected columns: ${headers.slice(0, 10).join(", ")}`
    );
  }

  const steps: AgentStep[] = [];
  for (const row of rows) {
    const seq = parseInt(String(row[seqCol] ?? "").trim(), 10);
    if (isNaN(seq)) continue;
    const actionType = String(row[actionCol] ?? "").trim().toUpperCase();
    if (!actionType) continue;
    const flowRaw = String(flowCol ? (row[flowCol] ?? "") : "").trim();
    const flowType: "Norm" | "Err" = /^err/i.test(flowRaw) ? "Err" : "Norm";
    const parameters = String(paramsCol ? (row[paramsCol] ?? "") : "").trim();
    const agentGid   = String(agentCol  ? (row[agentCol]  ?? "") : "").trim();
    steps.push({
      sequence: seq,
      actionType,
      flowType,
      parameters,
      agentGid,
      description: extractDescription(parameters, actionType),
      sqlType: extractSqlType(parameters),
    });
  }
  if (steps.length === 0) throw new Error("No valid agent steps found. Check column names.");
  steps.sort((a, b) => a.sequence - b.sequence);

  const agentGid   = steps.find((s) => s.agentGid)?.agentGid ?? fileName.replace(/\.[^.]+$/, "");
  const normalFlow = steps.filter((s) => s.flowType === "Norm");
  const errorFlow  = steps.filter((s) => s.flowType === "Err");

  const sqlOperations  = steps.filter((s) => s.sqlType || s.actionType.includes("SQL")).length;
  const conditionals   = steps.filter((s) => ["IF", "ELSE", "ENDIF"].includes(s.actionType)).length;
  const specialActions = steps.filter(
    (s) => !s.sqlType && !["IF", "ELSE", "ENDIF"].includes(s.actionType) && !s.actionType.includes("SQL")
  ).length;

  return { agentGid, fileName, totalSteps: steps.length, normalFlow, errorFlow, summary: { sqlOperations, conditionals, specialActions } };
}

export async function parseXlsx(file: File): Promise<AgentWorkflow> {
  const buf = await file.arrayBuffer();
  const wb  = XLSX.read(buf, { type: "array" });
  const ws  = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: "" });
  return parseRows(rows, file.name);
}

export async function parseCsv(file: File): Promise<AgentWorkflow> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        try { resolve(parseRows(res.data, file.name)); }
        catch (e) { reject(e); }
      },
      error: reject,
    });
  });
}

async function parseZip(file: File): Promise<AgentWorkflow> {
  const JSZip = (await import("jszip")).default;
  const buf = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buf);

  // Collect candidate files — prefer xlsx > xls > csv, skip macOS artifacts
  type Candidate = { entry: import("jszip").JSZipObject; name: string; ext: string };
  const candidates: Candidate[] = [];

  zip.forEach((relativePath, entry) => {
    if (entry.dir) return;
    if (relativePath.startsWith("__MACOSX/")) return;
    const name = relativePath.split("/").pop() ?? "";
    if (name.startsWith(".")) return;
    const ext = (name.split(".").pop() ?? "").toLowerCase();
    if (["xlsx", "xls", "csv"].includes(ext)) {
      candidates.push({ entry, name, ext });
    }
  });

  if (candidates.length === 0) {
    throw new Error("No Excel or CSV files found inside the ZIP archive. Please include a .xlsx or .csv agent file.");
  }

  const priority = (ext: string) => (ext === "xlsx" ? 0 : ext === "xls" ? 1 : 2);
  candidates.sort((a, b) => priority(a.ext) - priority(b.ext));

  const { entry, name, ext } = candidates[0];
  const content = await entry.async("arraybuffer");
  const inner = new File([content], name);

  if (ext === "xlsx" || ext === "xls") return parseXlsx(inner);
  return parseCsv(inner);
}

export async function parseAgentFile(file: File): Promise<AgentWorkflow> {
  const ext = (file.name.split(".").pop() ?? "").toLowerCase();
  if (ext === "xlsx" || ext === "xls") return parseXlsx(file);
  if (ext === "csv") return parseCsv(file);
  if (ext === "zip") return parseZip(file);
  throw new Error(`Unsupported file type: .${ext} — use .xlsx, .csv, or .zip`);
}
