import type { AgentStep, AgentWorkflow } from "./agentParser";

export type DiffStatus = "unchanged" | "modified" | "added" | "removed";

export interface DiffStep {
  sequence: number;
  status: DiffStatus;
  step1?: AgentStep;
  step2?: AgentStep;
  changes: string[];
}

export interface AgentDiff {
  steps: DiffStep[];
  summary: {
    added: number;
    removed: number;
    modified: number;
    unchanged: number;
    total1: number;
    total2: number;
  };
}

function diffStep(s1: AgentStep, s2: AgentStep): string[] {
  const changes: string[] = [];
  if (s1.actionType !== s2.actionType)
    changes.push(`Action type: "${s1.actionType}" → "${s2.actionType}"`);
  if (s1.flowType !== s2.flowType)
    changes.push(`Flow type: ${s1.flowType} → ${s2.flowType}`);
  if (s1.parameters.trim() !== s2.parameters.trim())
    changes.push("Parameters / SQL content changed");
  return changes;
}

export function computeDiff(w1: AgentWorkflow, w2: AgentWorkflow): AgentDiff {
  const all = [...w1.normalFlow, ...w1.errorFlow, ...w2.normalFlow, ...w2.errorFlow];
  const sequences = [...new Set(all.map((s) => s.sequence))].sort((a, b) => a - b);

  const map1 = new Map([...w1.normalFlow, ...w1.errorFlow].map((s) => [s.sequence, s]));
  const map2 = new Map([...w2.normalFlow, ...w2.errorFlow].map((s) => [s.sequence, s]));

  let added = 0, removed = 0, modified = 0, unchanged = 0;
  const steps: DiffStep[] = [];

  for (const seq of sequences) {
    const s1 = map1.get(seq);
    const s2 = map2.get(seq);
    if (s1 && s2) {
      const changes = diffStep(s1, s2);
      if (changes.length === 0) { unchanged++; steps.push({ sequence: seq, status: "unchanged", step1: s1, step2: s2, changes: [] }); }
      else                       { modified++;  steps.push({ sequence: seq, status: "modified",  step1: s1, step2: s2, changes }); }
    } else if (s1) {
      removed++;
      steps.push({ sequence: seq, status: "removed", step1: s1, changes: [] });
    } else if (s2) {
      added++;
      steps.push({ sequence: seq, status: "added", step2: s2, changes: [] });
    }
  }

  return {
    steps,
    summary: { added, removed, modified, unchanged, total1: w1.totalSteps, total2: w2.totalSteps },
  };
}
