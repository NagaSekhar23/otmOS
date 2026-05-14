"use client";

import { useState } from "react";
import Shell from "@/components/Shell";
import SectionIntro from "@/components/SectionIntro";
import { SAMPLE_GENERATORS, jsonToXml, getAvailableObjectTypes, type SampleOptions } from "@/lib/sampleGenerator";

export default function SampleGeneratorPage() {
  const [objectType, setObjectType] = useState("Shipment");
  const [format, setFormat] = useState<"json" | "xml">("json");
  const [includeOptional, setIncludeOptional] = useState(true);
  const [includeArrays, setIncludeArrays] = useState(true);
  const [arrayLength, setArrayLength] = useState(2);
  const [output, setOutput] = useState("");
  const [status, setStatus] = useState("");

  const objectTypes = getAvailableObjectTypes();

  function generateSample() {
    try {
      setStatus("Generating sample...");

      const options: SampleOptions = {
        includeOptional,
        includeArrays,
        arrayLength,
      };

      const generator = SAMPLE_GENERATORS[objectType];
      if (!generator) {
        throw new Error(`No generator found for ${objectType}`);
      }

      const sample = generator(options);

      if (format === "json") {
        setOutput(JSON.stringify(sample, null, 2));
      } else {
        setOutput(jsonToXml(sample, objectType));
      }

      setStatus(`✅ ${objectType} sample generated in ${format.toUpperCase()} format`);
    } catch (error) {
      setStatus(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
      setOutput("");
    }
  }

  function copyToClipboard() {
    navigator.clipboard.writeText(output);
    setStatus("✅ Copied to clipboard!");
  }

  function downloadSample() {
    const extension = format === "json" ? "json" : "xml";
    const filename = `${objectType.toLowerCase()}_sample.${extension}`;
    const blob = new Blob([output], { type: `application/${extension}` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    setStatus(`✅ Downloaded ${filename}`);
  }

  return (
    <Shell title="Sample Generator">
      <section className="card">
        <SectionIntro
          title="Oracle OTM Sample Generator"
          description="Generate sample JSON or XML for Oracle Transportation Management objects with realistic data."
          actions={
            <button className="btn primary" onClick={generateSample}>
              Generate Sample
            </button>
          }
        />

        <div className="formGrid">
          <label>
            <span className="label">Object Type</span>
            <select className="input" value={objectType} onChange={(e) => setObjectType(e.target.value)}>
              {objectTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="label">Output Format</span>
            <select className="input" value={format} onChange={(e) => setFormat(e.target.value as "json" | "xml")}>
              <option value="json">JSON</option>
              <option value="xml">XML</option>
            </select>
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              checked={includeOptional}
              onChange={(e) => setIncludeOptional(e.target.checked)}
            />
            <span className="label" style={{ marginBottom: 0 }}>Include Optional Fields</span>
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              checked={includeArrays}
              onChange={(e) => setIncludeArrays(e.target.checked)}
            />
            <span className="label" style={{ marginBottom: 0 }}>Include Arrays</span>
          </label>

          {includeArrays && (
            <label>
              <span className="label">Array Length</span>
              <input
                type="number"
                className="input"
                min="1"
                max="10"
                value={arrayLength}
                onChange={(e) => setArrayLength(Number(e.target.value))}
              />
            </label>
          )}
        </div>

        {status && (
          <p className="muted mono" style={{ marginTop: 12 }}>
            {status}
          </p>
        )}

        {output && (
          <>
            <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
              <button className="btn" onClick={copyToClipboard}>
                📋 Copy to Clipboard
              </button>
              <button className="btn" onClick={downloadSample}>
                💾 Download
              </button>
            </div>

            <div style={{ marginTop: 16 }}>
              <label style={{ display: "block" }}>
                <span className="label">Generated Sample:</span>
                <textarea
                  className="textarea"
                  value={output}
                  readOnly
                  style={{ minHeight: "500px", fontFamily: "monospace", fontSize: 13 }}
                />
              </label>
            </div>
          </>
        )}

        <div style={{ marginTop: 24, padding: 16, background: "#f3f4f6", borderRadius: 8 }}>
          <h3 style={{ marginBottom: 12, fontSize: 16, fontWeight: 600 }}>Available Object Types:</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
            {objectTypes.map((type) => (
              <div
                key={type}
                style={{
                  padding: "8px 12px",
                  background: "white",
                  borderRadius: 6,
                  border: objectType === type ? "2px solid #2563eb" : "1px solid #e5e7eb",
                  cursor: "pointer",
                }}
                onClick={() => setObjectType(type)}
              >
                <div style={{ fontWeight: 600 }}>{type}</div>
                <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                  {type === "Shipment" && "Freight shipment with stops"}
                  {type === "Order" && "Transportation order"}
                  {type === "Location" && "Physical location/address"}
                  {type === "Item" && "Product/commodity item"}
                  {type === "Equipment" && "Vehicle/container"}
                  {type === "Rate" && "Freight rate quote"}
                  {type === "Invoice" && "Billing invoice"}
                  {type === "Agent" && "Automation workflow agent"}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 24, padding: 16, background: "#eff6ff", borderRadius: 8, border: "1px solid #bfdbfe" }}>
          <h3 style={{ marginBottom: 8, fontSize: 14, fontWeight: 600, color: "#1e40af" }}>📚 Oracle OTM Documentation</h3>
          <p className="muted" style={{ marginBottom: 8 }}>
            For complete schema documentation and API reference, visit:
          </p>
          <a
            href="https://docs.oracle.com/en/cloud/saas/transportation/26b/otmra/index.html"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#2563eb", textDecoration: "underline" }}
          >
            https://docs.oracle.com/en/cloud/saas/transportation/26b/otmra/
          </a>
        </div>
      </section>
    </Shell>
  );
}
