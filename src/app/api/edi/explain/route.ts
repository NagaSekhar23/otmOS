import { NextRequest, NextResponse } from "next/server";
import { loadStore } from "@/lib/demoStore";
import { parseX12 } from "@/lib/ediParser";
import { getSegmentMetadata, getLoopContext } from "@/lib/ediMetadata";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const rows = parseX12(body.x12 ?? "", body.elementSep ?? "*", body.segmentTerm ?? "~");
  const store = await loadStore();
  const mappings = store.edi.mappings;

  let currentLoop = "";
  const explained = rows.map((row) => {
    // Get segment metadata
    const segmentMeta = getSegmentMetadata(row.segment, body.txSet);
    const elementMeta = segmentMeta?.elements.find(e => e.pos === row.pos);

    // Update loop context
    currentLoop = getLoopContext(row.segment, currentLoop);

    // Check for custom mappings
    const match = mappings.find((m: any) =>
      m.version === body.version &&
      m.txSet === body.txSet &&
      (m.carrier === body.carrier || m.carrier === "industry") &&
      m.segment === row.segment &&
      Number(m.elementPos) === row.pos &&
      m.code === row.value,
    );

    return {
      ...row,
      loop: currentLoop,
      segmentName: segmentMeta?.name ?? row.segment,
      elementName: elementMeta?.name ?? `Element ${row.pos}`,
      elementDescription: match?.meaning || elementMeta?.description || "",
      meaning: match?.meaning ?? "",
      notes: match?.notes ?? "",
      source: match?.source ?? (match ? "mapping" : "standard"),
    };
  });

  return NextResponse.json({ rows: explained });
}
