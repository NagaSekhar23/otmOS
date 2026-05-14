import { NextRequest, NextResponse } from "next/server";
import { loadStore } from "@/lib/demoStore";

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").toLowerCase();
  const txSet = req.nextUrl.searchParams.get("txSet");
  const carrier = req.nextUrl.searchParams.get("carrier");
  const version = req.nextUrl.searchParams.get("version");

  // TEMPORARY: Return empty results due to store timeout issues
  // const store = await loadStore();
  // let mappings = store.edi.mappings;
  // let docs = store.edi.docs;
  let mappings: any[] = [];
  let docs: any[] = [];

  // Skip filtering since we have no data
  /*
  // Filter mappings
  let mappings = store.edi.mappings;
  if (q) mappings = mappings.filter((m) => JSON.stringify(m).toLowerCase().includes(q));
  if (txSet) mappings = mappings.filter((m: any) => m.txSet === txSet);
  if (carrier) mappings = mappings.filter((m: any) => m.carrier === carrier || m.carrier === "industry");
  if (version) mappings = mappings.filter((m: any) => m.version === version);

  // Filter docs
  let docs = store.edi.docs;
  */

  // Skip filtering - return empty arrays
  return NextResponse.json({ mappings: [], docs: [] });
}
