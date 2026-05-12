import { NextRequest, NextResponse } from "next/server";
import { loadStore } from "@/lib/demoStore";

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").toLowerCase();
  const txSet = req.nextUrl.searchParams.get("txSet");
  const carrier = req.nextUrl.searchParams.get("carrier");
  const version = req.nextUrl.searchParams.get("version");

  const store = await loadStore();

  // Filter mappings
  let mappings = store.edi.mappings;
  if (q) mappings = mappings.filter((m) => JSON.stringify(m).toLowerCase().includes(q));
  if (txSet) mappings = mappings.filter((m: any) => m.txSet === txSet);
  if (carrier) mappings = mappings.filter((m: any) => m.carrier === carrier || m.carrier === "industry");
  if (version) mappings = mappings.filter((m: any) => m.version === version);

  // Filter docs
  let docs = store.edi.docs;
  if (q) docs = docs.filter((d) => JSON.stringify(d).toLowerCase().includes(q));
  if (txSet) {
    docs = docs.filter((d: any) => {
      // Match if primary txSet matches OR if it's in the txSets array
      return d.txSet === txSet || (d.txSets && Array.isArray(d.txSets) && d.txSets.includes(txSet));
    });
  }
  if (carrier) docs = docs.filter((d: any) => d.carrier === carrier || d.carrier === "industry");
  if (version) docs = docs.filter((d: any) => d.version === version);

  // Rank docs by relevance (carrier-specific first, then industry-wide)
  docs = docs.sort((a: any, b: any) => {
    if (carrier) {
      if (a.carrier === carrier && b.carrier !== carrier) return -1;
      if (a.carrier !== carrier && b.carrier === carrier) return 1;
    }
    // Most recent first
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  });

  return NextResponse.json({ mappings, docs });
}
