import { NextRequest, NextResponse } from "next/server";
import { loadStore } from "@/lib/demoStore";
import { parseX12 } from "@/lib/ediParser";
import { getSegmentMetadata, getLoopContext } from "@/lib/ediMetadata";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rows = parseX12(body.x12 ?? "", body.elementSep ?? "*", body.segmentTerm ?? "~");

    // TEMPORARY: Skip store loading due to timeout issues
    // const store = await loadStore();
    // const mappings = store.edi.mappings;
    const mappings: any[] = []; // Empty mappings for now

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
  } catch (error) {
    console.error("Explain API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Explain failed", rows: [] },
      { status: 500 }
    );
  }
}
