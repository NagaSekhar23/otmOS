"use client";

import { useCallback, useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { detectFormat, jsonToXml, xmlToJson } from "@/lib/converterUtils";

type Direction = "xml-to-json" | "json-to-xml";

const XML_SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<Shipment>
  <ShipmentGid>
    <Gid>
      <DomainName>DOMAIN</DomainName>
      <Xid>SHIP-001</Xid>
    </Gid>
  </ShipmentGid>
  <ShipmentRefnum>
    <ShipmentRefnumQualGid>
      <Gid>
        <DomainName>DOMAIN</DomainName>
        <Xid>ORDER_NUM</Xid>
      </Gid>
    </ShipmentRefnumQualGid>
    <ShipmentRefnumValue>ORD-2024-001</ShipmentRefnumValue>
  </ShipmentRefnum>
  <TotalWeightUom>LB</TotalWeightUom>
  <TotalWeightCount>500</TotalWeightCount>
</Shipment>`;

const JSON_SAMPLE = JSON.stringify({
  Shipment: {
    ShipmentGid: {
      Gid: {
        DomainName: { _text: "DOMAIN" },
        Xid: { _text: "SHIP-001" },
      },
    },
    TotalWeightUom: { _text: "LB" },
    TotalWeightCount: { _text: "500" },
  },
}, null, 2);

export default function ConverterPage() {
  const [direction, setDirection] = useState<Direction>("xml-to-json");
  const [input, setInput] = useState<string>(XML_SAMPLE);
  const [pretty, setPretty] = useState<boolean>(true);
  const [output, setOutput] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);

  const convert = useCallback((text: string, dir: Direction, p: boolean) => {
    if (!text.trim()) {
      setOutput("");
      setError("");
      return;
    }
    const result = dir === "xml-to-json" ? xmlToJson(text, p) : jsonToXml(text, p);
    if (result.ok) {
      setOutput(result.output);
      setError("");
    } else {
      setOutput("");
      setError(result.error);
    }
  }, []);

  useEffect(() => {
    convert(input, direction, pretty);
  }, [input, direction, pretty, convert]);

  function handleInputChange(text: string) {
    setInput(text);
    // Auto-detect format and flip direction if needed
    const fmt = detectFormat(text);
    if (fmt === "xml" && direction !== "xml-to-json") setDirection("xml-to-json");
    if (fmt === "json" && direction !== "json-to-xml") setDirection("json-to-xml");
  }

  function flipDirection() {
    const next: Direction = direction === "xml-to-json" ? "json-to-xml" : "xml-to-json";
    setDirection(next);
    // Load appropriate sample
    setInput(next === "xml-to-json" ? XML_SAMPLE : JSON_SAMPLE);
  }

  function loadSample() {
    setInput(direction === "xml-to-json" ? XML_SAMPLE : JSON_SAMPLE);
  }

  async function copyOutput() {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function downloadOutput() {
    if (!output) return;
    const ext = direction === "xml-to-json" ? "json" : "xml";
    const blob = new Blob([output], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `converted.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const inputLabel = direction === "xml-to-json" ? "XML input" : "JSON input";
  const outputLabel = direction === "xml-to-json" ? "JSON output" : "XML output";

  return (
    <Shell title="XML ↔ JSON Converter">
      {/* Controls bar */}
      <section className="card" style={{ marginBottom: 12 }}>
        <div className="toolbar" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div className="toolbar" style={{ gap: 12, flexWrap: "wrap" }}>
            <div>
              <div className="label">Direction</div>
              <div className="toolbar" style={{ marginTop: 6, gap: 8 }}>
                <button
                  className={`btn${direction === "xml-to-json" ? " primary" : ""}`}
                  onClick={() => { setDirection("xml-to-json"); setInput(XML_SAMPLE); }}
                >
                  XML → JSON
                </button>
                <button
                  className={`btn${direction === "json-to-xml" ? " primary" : ""}`}
                  onClick={() => { setDirection("json-to-xml"); setInput(JSON_SAMPLE); }}
                >
                  JSON → XML
                </button>
                <button className="btn" onClick={flipDirection} title="Swap direction and load sample">⇄ Swap</button>
              </div>
            </div>

            <div>
              <div className="label">Options</div>
              <label className="toolbar" style={{ marginTop: 6, gap: 8, cursor: "pointer" }}>
                <input type="checkbox" checked={pretty} onChange={(e) => setPretty(e.target.checked)} />
                <span>Pretty print</span>
              </label>
            </div>
          </div>

          <div className="toolbar" style={{ gap: 8, alignItems: "flex-end" }}>
            <button className="btn" onClick={loadSample}>Load sample</button>
            <button className="btn" onClick={copyOutput} disabled={!output}>{copied ? "Copied!" : "Copy output"}</button>
            <button className="btn" onClick={downloadOutput} disabled={!output}>Download</button>
          </div>
        </div>
      </section>

      {/* Side-by-side panes */}
      <div className="grid2" style={{ alignItems: "start" }}>
        {/* Input */}
        <section className="card">
          <div className="toolbar" style={{ justifyContent: "space-between", marginBottom: 8 }}>
            <div style={{ fontWeight: 700 }}>{inputLabel}</div>
            <span className="badge">
              {detectFormat(input) === "unknown" ? "paste input" : detectFormat(input).toUpperCase()}
            </span>
          </div>
          <textarea
            className="textarea mono"
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            spellCheck={false}
            style={{ minHeight: "62vh", resize: "vertical" }}
            placeholder={direction === "xml-to-json" ? "Paste XML here..." : "Paste JSON here..."}
          />
        </section>

        {/* Output */}
        <section className="card">
          <div className="toolbar" style={{ justifyContent: "space-between", marginBottom: 8 }}>
            <div style={{ fontWeight: 700 }}>{outputLabel}</div>
            {error ? (
              <span className="badge bad">Error</span>
            ) : output ? (
              <span className="badge good">OK</span>
            ) : (
              <span className="badge">waiting</span>
            )}
          </div>
          {error ? (
            <div style={{ padding: "12px 0" }}>
              <div className="badge bad" style={{ borderRadius: 6, padding: "8px 12px", fontSize: 13 }}>
                {error}
              </div>
            </div>
          ) : (
            <textarea
              className="textarea mono"
              value={output}
              readOnly
              spellCheck={false}
              style={{ minHeight: "62vh", resize: "vertical", background: "var(--bg)" }}
              placeholder="Output will appear here..."
            />
          )}
        </section>
      </div>
    </Shell>
  );
}
