import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { loadStore, saveStore } from "@/lib/demoStore";

function detectTxSetsFromFilename(filename: string): string[] {
  const detected: string[] = [];
  const name = filename.toLowerCase();

  // Direct number patterns
  const numberMatch = name.match(/\b(204|214|210|990|300|301|310|315|856|850|810|997)\b/g);
  if (numberMatch) {
    detected.push(...numberMatch);
  }

  // Descriptive names to transaction type mapping
  if (name.includes("load tender") || name.includes("motor carrier load")) detected.push("204");
  if (name.includes("shipment status")) detected.push("214");
  if (name.includes("freight invoice")) detected.push("210");
  if (name.includes("booking")) detected.push("300");
  if (name.includes("warehouse shipping")) detected.push("940");
  if (name.includes("ship notice") || name.includes("asn")) detected.push("856");
  if (name.includes("purchase order")) detected.push("850");

  return [...new Set(detected)]; // Remove duplicates
}

function detectTxSetsFromContent(content: string): string[] {
  const detected: string[] = [];

  // Look for ST*XXX segments
  const stMatches = content.match(/ST\*(\d{3})/gi);
  if (stMatches) {
    for (const match of stMatches) {
      const txSet = match.split('*')[1];
      if (txSet) detected.push(txSet);
    }
  }

  // Look for "204" or "Transaction Set 204" patterns in documentation
  const docMatches = content.match(/(?:transaction\s+set\s+|set\s+)?(\d{3})(?:\s+\-|\s+motor|:\s+)/gi);
  if (docMatches) {
    for (const match of docMatches) {
      const txSet = match.match(/\d{3}/)?.[0];
      if (txSet) detected.push(txSet);
    }
  }

  return [...new Set(detected)]; // Remove duplicates
}

export async function GET() {
  const store = await loadStore();
  return NextResponse.json({ docs: store.edi.docs });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const store = await loadStore();
  const rawText = body.rawText ?? "";
  const sourceName = body.sourceName ?? "";

  // Auto-detect transaction sets from filename and content
  const filenameTxSets = detectTxSetsFromFilename(sourceName);
  const contentTxSets = detectTxSetsFromContent(rawText);
  const detectedTxSets = [...new Set([...filenameTxSets, ...contentTxSets])];

  // Use detected txSets or fall back to the provided txSet
  const primaryTxSet = body.txSet || detectedTxSets[0] || "204";
  const allTxSets = detectedTxSets.length > 0 ? detectedTxSets : [primaryTxSet];

  const doc = {
    id: randomUUID(),
    version: body.version,
    txSet: primaryTxSet, // Primary transaction set
    txSets: allTxSets, // All detected transaction sets
    carrier: body.carrier,
    sourceName,
    notes: body.notes ?? "",
    status: rawText ? "processed" : "registered",
    chunkCount: rawText ? Math.max(1, Math.ceil(rawText.length / 1200)) : 0,
    charCount: rawText.length,
    snippetPreview: rawText.slice(0, 240),
    createdAt: new Date().toISOString(),
    detectedTxSets: detectedTxSets.join(", "), // User-friendly display
  };
  store.edi.docs.unshift(doc);
  await saveStore(store);
  return NextResponse.json({ doc, detectedTxSets });
}
