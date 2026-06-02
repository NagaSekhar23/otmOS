import type { AgentWorkflow, AgentStep } from "./agentParser";

function sanitize(text: string, max = 40): string {
  return text
    .replace(/"/g, "'")
    .replace(/[<>{}[\]]/g, " ")
    .replace(/\n+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, max);
}

function nodeId(seq: number): string {
  return `n${seq}`;
}

function nodeLabel(step: AgentStep): string {
  const actionShort =
    step.actionType.length > 20 ? step.actionType.slice(0, 18) + "…" : step.actionType;
  const desc = step.description ? ` · ${step.description.slice(0, 28)}` : "";
  return sanitize(`${step.sequence} - ${actionShort}${desc}`, 50);
}

type Frame = {
  ifId: string;
  trueEnds: string[];
  falseEnds: string[];
  seenElse: boolean;
};

interface Edge {
  from: string;
  to: string;
  label?: string;
}

export function generateMermaid(workflow: AgentWorkflow): string {
  const steps = workflow.normalFlow.length > 0 ? workflow.normalFlow : [
    ...workflow.normalFlow,
    ...workflow.errorFlow,
  ];
  if (steps.length === 0) return "flowchart TD\n  Empty([No steps found])";

  const lines: string[] = [
    "flowchart TD",
    "  classDef sql fill:#90EE90,stroke:#5a9a5a,color:#000",
    "  classDef decision fill:#ADD8E6,stroke:#5a8ea8,color:#000",
    "  classDef special fill:#FFB347,stroke:#cc8800,color:#000",
    "  classDef error fill:#FFB6C1,stroke:#cc5566,color:#000",
    "  classDef merge fill:#e8e8e8,stroke:#888,color:#000",
    "  classDef se fill:#333,stroke:#333,color:#fff",
    "  Start([Start]):::se",
  ];

  // Node definitions
  for (const step of steps) {
    const id  = nodeId(step.sequence);
    const lbl = nodeLabel(step);

    if (step.actionType === "IF") {
      lines.push(`  ${id}{"${lbl}"}:::decision`);
    } else if (step.actionType === "ELSE") {
      lines.push(`  ${id}(["${lbl}"]):::merge`);
    } else if (step.actionType === "ENDIF") {
      lines.push(`  ${id}(("${lbl}")):::merge`);
    } else if (step.flowType === "Err" || step.actionType.includes("ERROR")) {
      lines.push(`  ${id}["${lbl}"]:::error`);
    } else if (step.sqlType || step.actionType.includes("SQL")) {
      lines.push(`  ${id}["${lbl}"]:::sql`);
    } else {
      lines.push(`  ${id}["${lbl}"]:::special`);
    }
  }
  lines.push("  End([End]):::se");

  // Edge generation — stack-based IF/ELSE/ENDIF tracking
  const edges: Edge[]  = [];
  const stack: Frame[] = [];
  let prev             = "Start";
  let prevLabel: string | undefined;

  function emit(from: string, to: string, label?: string) {
    edges.push({ from, to, label });
  }

  for (const step of steps) {
    const curr = nodeId(step.sequence);

    if (step.actionType === "IF") {
      emit(prev, curr, prevLabel);
      prevLabel = "TRUE";
      stack.push({ ifId: curr, trueEnds: [], falseEnds: [], seenElse: false });
      prev = curr;
    } else if (step.actionType === "ELSE") {
      if (stack.length > 0) {
        const top = stack[stack.length - 1];
        top.trueEnds.push(prev);
        emit(top.ifId, curr, "FALSE");
        top.seenElse = true;
      } else {
        emit(prev, curr, prevLabel);
      }
      prev      = curr;
      prevLabel = undefined;
    } else if (step.actionType === "ENDIF") {
      if (stack.length > 0) {
        const top = stack.pop()!;
        if (top.seenElse) {
          top.falseEnds.push(prev);
          for (const e of [...top.trueEnds, ...top.falseEnds]) emit(e, curr);
        } else {
          top.trueEnds.push(prev);
          emit(top.ifId, curr, "FALSE");
          for (const e of top.trueEnds) emit(e, curr);
        }
      } else {
        emit(prev, curr, prevLabel);
      }
      prev      = curr;
      prevLabel = undefined;
    } else {
      emit(prev, curr, prevLabel);
      prev      = curr;
      prevLabel = undefined;
    }
  }

  // Drain any unclosed IF blocks
  while (stack.length > 0) {
    const top = stack.pop()!;
    emit(top.ifId, "End", "FALSE");
  }
  emit(prev, "End", prevLabel);

  // Emit edges
  for (const e of edges) {
    if (e.label) {
      lines.push(`  ${e.from} -- "${e.label}" --> ${e.to}`);
    } else {
      lines.push(`  ${e.from} --> ${e.to}`);
    }
  }

  // Add error flow note if present
  if (workflow.errorFlow.length > 0) {
    lines.push(`\n  ErrNote["⚠ Error Path: ${workflow.errorFlow.length} step${workflow.errorFlow.length > 1 ? "s" : ""} — see steps table"]:::error`);
  }

  return lines.join("\n");
}
