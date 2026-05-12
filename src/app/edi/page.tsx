"use client";

import { useCallback, useEffect, useState } from "react";
import Shell from "@/components/Shell";
import SectionIntro from "@/components/SectionIntro";
import { ediGet, ediPost, type EdiDoc, type EdiExplainRow, type EdiMapping } from "@/lib/ediApi";
import { getDefaultEdiApiBase } from "@/lib/runtimeConfig";

const EDI_API_BASE = getDefaultEdiApiBase();

export default function EDIPage() {
  const [version, setVersion] = useState("4010");
  const [txSet, setTxSet] = useState("204");
  const [carrier, setCarrier] = useState("industry");
  const [elementSep, setElementSep] = useState("*");
  const [segmentTerm, setSegmentTerm] = useState("~");
  const [x12, setX12] = useState("ISA*00*          *00*          *ZZ*SENDERID       *ZZ*RECEIVERID     *250101*1200*U*00401*000000905*0*T*:~\nGS*SM*SENDER*RECEIVER*20250101*1200*1*X*004010~\nST*204*0001~\nB2**CARRIER*SCAC~\nSE*4*0001~");
  const [rows, setRows] = useState<EdiExplainRow[]>([]);
  const [kbQuery, setKbQuery] = useState("");
  const [kbMappings, setKbMappings] = useState<EdiMapping[]>([]);
  const [kbDocs, setKbDocs] = useState<EdiDoc[]>([]);
  const [docName, setDocName] = useState("");
  const [docNotes, setDocNotes] = useState("");
  const [docText, setDocText] = useState("");
  const [detectedTxSets, setDetectedTxSets] = useState<string[]>([]);
  const [relevantDocs, setRelevantDocs] = useState<EdiDoc[]>([]);
  const [saveSegment, setSaveSegment] = useState("B2");
  const [savePos, setSavePos] = useState(3);
  const [saveCode, setSaveCode] = useState("SCAC");
  const [saveMeaning, setSaveMeaning] = useState("");
  const [status, setStatus] = useState("");

  const explain = useCallback(async () => {
    setStatus("Explaining...");
    const data = await ediPost<{ rows: EdiExplainRow[] }>(EDI_API_BASE, "/explain", { version, txSet, carrier, elementSep, segmentTerm, x12 });
    setRows(data.rows ?? []);
    setStatus("Explanation updated.");
    // Load relevant docs for this transaction type
    await loadRelevantDocs();
  }, [version, txSet, carrier, elementSep, segmentTerm, x12]);

  const loadRelevantDocs = useCallback(async () => {
    const path = `/search?txSet=${encodeURIComponent(txSet)}&carrier=${encodeURIComponent(carrier)}&version=${encodeURIComponent(version)}`;
    const data = await ediGet<{ docs: EdiDoc[] }>(EDI_API_BASE, path);
    setRelevantDocs(data.docs ?? []);
  }, [txSet, carrier, version]);

  const loadKnowledge = useCallback(async (query = kbQuery) => {
    const path = query ? `/search?q=${encodeURIComponent(query)}` : `/search?q=`;
    const data = await ediGet<{ mappings: EdiMapping[]; docs: EdiDoc[] }>(EDI_API_BASE, path);
    setKbMappings(data.mappings ?? []);
    setKbDocs(data.docs ?? []);
  }, [kbQuery]);

  async function saveMapping() {
    try {
      await ediPost(EDI_API_BASE, "/mappings", { version, txSet, carrier, segment: saveSegment, elementPos: savePos, code: saveCode, meaning: saveMeaning, notes: "", source: "user" });
      setStatus("Mapping saved.");
      await explain();
      await loadKnowledge();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e));
    }
  }

  async function ingestDoc() {
    try {
      const result = await ediPost<{ doc: EdiDoc; detectedTxSets: string[] }>(EDI_API_BASE, "/docs", { version, txSet, carrier, sourceName: docName, notes: docNotes, rawText: docText });
      setDetectedTxSets(result.detectedTxSets ?? []);
      setStatus(`Document ingested. Detected transaction types: ${result.detectedTxSets?.join(", ") || "none"}`);
      setDocName("");
      setDocNotes("");
      setDocText("");
      await loadKnowledge();
      await loadRelevantDocs();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e));
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void explain();
      void loadKnowledge();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [explain, loadKnowledge]);

  return (
    <Shell title="EDI Explainer">
      <section className="card">
        <SectionIntro title="Explain EDI Message" description="Paste an X12 message and inspect a parsed, mapping-backed row-level view." actions={<button className="btn primary" onClick={explain}>Explain</button>} />
        <div className="formGrid">
          <label><span className="label">Version</span><select className="input" value={version} onChange={(e) => setVersion(e.target.value)}><option value="4010">4010</option><option value="5010">5010</option></select></label>
          <label><span className="label">Tx Set</span><select className="input" value={txSet} onChange={(e) => setTxSet(e.target.value)}>{["300", "204", "301", "990", "210", "310", "214", "315"].map((v) => <option key={v} value={v}>{v}</option>)}</select></label>
          <label><span className="label">Carrier / Scope</span><input className="input" value={carrier} onChange={(e) => setCarrier(e.target.value)} /></label>
          <label><span className="label">Element Separator</span><input className="input" value={elementSep} onChange={(e) => setElementSep(e.target.value)} /></label>
          <label><span className="label">Segment Terminator</span><input className="input" value={segmentTerm} onChange={(e) => setSegmentTerm(e.target.value)} /></label>
        </div>
        <label style={{ display: "block", marginTop: 16 }}><span className="label">Paste X12</span><textarea className="textarea" value={x12} onChange={(e) => setX12(e.target.value)} /></label>
        <p className="muted mono" style={{ marginTop: 12 }}>{status}</p>
        <div style={{ overflowX: "auto", marginTop: 16 }}>
          <table className="table" style={{ fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#2563eb", color: "white" }}>
                <th style={{ minWidth: 180 }}>Loop/Context</th>
                <th style={{ minWidth: 80 }}>Segment</th>
                <th style={{ minWidth: 60 }}>Element</th>
                <th style={{ minWidth: 220 }}>Segment Element Name</th>
                <th style={{ minWidth: 150 }}>Value</th>
                <th style={{ minWidth: 300 }}>Element Description</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={`${row.segIndex}-${row.segment}-${row.pos}-${idx}`} style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td className="muted" style={{ fontSize: 12 }}>{(row as any).loop || "Detail"}</td>
                  <td className="mono" style={{ fontWeight: 600 }}>{row.segment}</td>
                  <td className="mono">{String(row.pos).padStart(2, "0")}</td>
                  <td style={{ fontSize: 12 }}>{(row as any).elementName || `Element ${row.pos}`}</td>
                  <td className="mono" style={{ fontWeight: 500 }}>{row.value || <span className="muted">—</span>}</td>
                  <td style={{ fontSize: 12 }}>{(row as any).elementDescription || row.meaning || <span className="muted">No description information found</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {relevantDocs.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <h3 style={{ marginBottom: 12 }}>Relevant Documentation for {txSet}</h3>
            <div style={{ display: "grid", gap: 12 }}>
              {relevantDocs.map((doc) => (
                <div key={doc.id} className="detailPane" style={{ minHeight: "auto" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700 }}>{doc.sourceName}</div>
                      <div className="muted" style={{ marginTop: 4, fontSize: 13 }}>
                        {doc.carrier && <span style={{ marginRight: 12 }}>Carrier: {doc.carrier}</span>}
                        {doc.txSets && Array.isArray(doc.txSets) && doc.txSets.length > 0 && (
                          <span style={{ marginRight: 12 }}>
                            Transaction Types: {doc.txSets.map(t => (
                              <span key={t} style={{
                                padding: "2px 6px",
                                marginLeft: 4,
                                borderRadius: 4,
                                background: t === txSet ? "#2563eb" : "#6b7280",
                                color: "white",
                                fontSize: 11
                              }}>{t}</span>
                            ))}
                          </span>
                        )}
                        {doc.charCount && <span>{doc.charCount.toLocaleString()} chars</span>}
                      </div>
                      {doc.snippetPreview && (
                        <div className="muted mono" style={{ marginTop: 8, fontSize: 12 }}>{doc.snippetPreview}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <div className="grid2" style={{ marginTop: 16 }}>
        <section className="card">
          <SectionIntro title="Save Mapping" description="Teach the explainer deterministic code meanings." actions={<button className="btn" onClick={saveMapping}>Save mapping</button>} />
          <div className="formGrid">
            <label><span className="label">Segment</span><input className="input" value={saveSegment} onChange={(e) => setSaveSegment(e.target.value)} /></label>
            <label><span className="label">Element Pos</span><input className="input" type="number" value={savePos} onChange={(e) => setSavePos(Number(e.target.value || 1))} /></label>
            <label><span className="label">Code</span><input className="input" value={saveCode} onChange={(e) => setSaveCode(e.target.value)} /></label>
            <label><span className="label">Meaning</span><input className="input" value={saveMeaning} onChange={(e) => setSaveMeaning(e.target.value)} /></label>
          </div>
        </section>

        <section className="card">
          <SectionIntro title="Document Ingestion" description="Load implementation guides and carrier notes into the local test knowledge base." actions={<button className="btn" onClick={ingestDoc}>Ingest document</button>} />
          <div className="formGrid">
            <label><span className="label">Source name</span><input className="input" value={docName} onChange={(e) => setDocName(e.target.value)} placeholder="Carrier 204 Guide" /></label>
            <label><span className="label">Notes</span><input className="input" value={docNotes} onChange={(e) => setDocNotes(e.target.value)} placeholder="Optional notes" /></label>
          </div>
          <label style={{ display: "block", marginTop: 16 }}>
            <span className="label">Upload file (optional)</span>
            <input
              type="file"
              className="input"
              accept=".txt,.edi,.csv,.pdf"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setDocName(file.name);
                  const text = await file.text();
                  setDocText(text);
                  setStatus(`File loaded: ${file.name} (${file.size.toLocaleString()} bytes)`);
                }
              }}
            />
          </label>
          <label style={{ display: "block", marginTop: 16 }}><span className="label">Document text</span><textarea className="textarea" value={docText} onChange={(e) => setDocText(e.target.value)} placeholder="Paste document content or upload a file above" /></label>
          {detectedTxSets.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <span className="label">Detected Transaction Types:</span>
              <div style={{ marginTop: 6 }}>
                {detectedTxSets.map(t => (
                  <span key={t} style={{
                    display: "inline-block",
                    padding: "4px 10px",
                    marginRight: 8,
                    borderRadius: 6,
                    background: "#2563eb",
                    color: "white",
                    fontSize: 13,
                    fontWeight: 600
                  }}>{t}</span>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      <section className="card" style={{ marginTop: 16 }}>
        <SectionIntro title="Knowledge Base" description="Search saved mappings and ingested documents." actions={<button className="btn" onClick={() => loadKnowledge()}>Search</button>} />
        <input className="input" value={kbQuery} onChange={(e) => setKbQuery(e.target.value)} placeholder="Search mappings + docs" />
        <div className="grid2" style={{ marginTop: 16 }}>
          <div>
            <h3 style={{ marginBottom: 10 }}>Mappings</h3>
            <div style={{ overflowX: "auto" }}>
              <table className="table"><thead><tr><th>Segment</th><th>Pos</th><th>Code</th><th>Meaning</th></tr></thead><tbody>{kbMappings.map((m) => <tr key={m.id}><td>{m.segment}</td><td>{m.elementPos}</td><td className="mono">{m.code}</td><td>{m.meaning}</td></tr>)}</tbody></table>
            </div>
          </div>
          <div>
            <h3 style={{ marginBottom: 10 }}>Documents</h3>
            <div style={{ overflowX: "auto" }}>
              <table className="table"><thead><tr><th>Source</th><th>Status</th><th>Chars</th><th>Preview</th></tr></thead><tbody>{kbDocs.map((d) => <tr key={d.id}><td>{d.sourceName}</td><td>{d.status}</td><td>{d.charCount}</td><td className="muted">{d.snippetPreview}</td></tr>)}</tbody></table>
            </div>
          </div>
        </div>
      </section>
    </Shell>
  );
}
