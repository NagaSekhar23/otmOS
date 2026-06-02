"use client";

import Link from "next/link";
import Shell from "@/components/Shell";

export default function AgentsPage() {
  return (
    <Shell title="Agent Tools">
      <div className="muted" style={{ marginBottom: 20 }}>
        Tools for analyzing and comparing Oracle OTM automation agents.
      </div>
      <div className="grid2" style={{ gridTemplateColumns: "1fr 1fr", maxWidth: 800 }}>
        <Link href="/agents/analyzer" style={{ textDecoration: "none" }}>
          <div
            className="card"
            style={{ cursor: "pointer", transition: "box-shadow 0.15s" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.boxShadow = "0 4px 20px rgba(31,111,235,0.15)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.boxShadow = "")}
          >
            <div style={{ fontSize: 36, marginBottom: 12 }}>🔍</div>
            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Agent Analyzer</div>
            <div className="muted" style={{ fontSize: 14, lineHeight: 1.6 }}>
              Upload a single agent file to generate a visual flowchart, workflow summary, and
              detailed step analysis.
            </div>
            <div style={{ marginTop: 16 }}>
              {["Flowchart", "SQL Summary", "Step Table", "Export JSON"].map((tag) => (
                <span key={tag} className="badge" style={{ marginRight: 6, marginBottom: 4 }}>
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </Link>

        <Link href="/agents/compare" style={{ textDecoration: "none" }}>
          <div
            className="card"
            style={{ cursor: "pointer", transition: "box-shadow 0.15s" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.boxShadow = "0 4px 20px rgba(31,111,235,0.15)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.boxShadow = "")}
          >
            <div style={{ fontSize: 36, marginBottom: 12 }}>⚖️</div>
            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Compare Agents</div>
            <div className="muted" style={{ fontSize: 14, lineHeight: 1.6 }}>
              Upload two agent files to see a side-by-side diff with added, removed, and modified
              steps highlighted.
            </div>
            <div style={{ marginTop: 16 }}>
              {["Side-by-Side Diff", "Change Details", "Export HTML", "Export CSV"].map((tag) => (
                <span key={tag} className="badge" style={{ marginRight: 6, marginBottom: 4 }}>
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </Link>
      </div>
    </Shell>
  );
}
