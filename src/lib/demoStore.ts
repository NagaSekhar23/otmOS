import { Redis } from "@upstash/redis";

// Use Redis when environment variables are available (production)
// Fall back to local file storage for development
const useRedis = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

let redis: Redis | null = null;
if (useRedis) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
}

// Fallback to file system for local development
import fs from "fs/promises";
import path from "path";

const DATA_DIR = path.join(process.cwd(), ".data");
const STORE_PATH = path.join(DATA_DIR, "otmos-demo-store.json");
const REDIS_KEY = "otmos-demo-store";

export type DemoStore = {
  qa: {
    config: { baseUrl: string; username: string; browser: "chrome" | "firefox" | "edge" };
    tests: Array<{ id: string; file: string; tags?: string[]; title?: string }>;
    runs: Array<Record<string, unknown>>;
    cycles: Array<Record<string, unknown>>;
  };
  edi: {
    mappings: Array<Record<string, unknown>>;
    docs: Array<Record<string, unknown>>;
  };
  orders: {
    results: Array<Record<string, unknown>>;
  };
};

const defaultStore: DemoStore = {
  qa: {
    config: { baseUrl: "", username: "", browser: "chrome" },
    tests: [
      { id: "Test_01_Login", file: "Tests/SanityBatch/Test_01_Login.ts", tags: ["sanity", "login"], title: "Login" },
      { id: "Test_08_ShipmentSearch", file: "Tests/SanityBatch/Test_08_ShipmentSearch.ts", tags: ["shipment", "search"], title: "Shipment Search" },
      { id: "Gen_ocean_booking_smoke", file: "Tests/Generated/Gen_ocean_booking_smoke.ts", tags: ["generated", "ocean"], title: "Ocean Booking Smoke" },
    ],
    runs: [],
    cycles: [],
  },
  edi: {
    mappings: [
      { id: "m1", version: "4010", txSet: "204", carrier: "industry", segment: "B2", elementPos: 3, code: "SCAC", meaning: "Standard Carrier Alpha Code", notes: "Common carrier identifier", source: "seed" },
    ],
    docs: [],
  },
  orders: {
    results: [],
  },
};

export async function loadStore(): Promise<DemoStore> {
  // Try Redis first (production)
  if (redis) {
    try {
      const stored = await redis.get<DemoStore>(REDIS_KEY);
      if (stored) return stored;

      // Initialize with defaults if empty
      await saveStore(defaultStore);
      return structuredClone(defaultStore);
    } catch (error) {
      console.error("Redis load error:", error);
      // Fall through to file system
    }
  }

  // Fallback to file system (local development)
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    const raw = await fs.readFile(STORE_PATH, "utf-8");
    return JSON.parse(raw) as DemoStore;
  } catch {
    await saveStore(defaultStore);
    return structuredClone(defaultStore);
  }
}

export async function saveStore(store: DemoStore): Promise<void> {
  // Save to Redis first (production)
  if (redis) {
    try {
      await redis.set(REDIS_KEY, store);
    } catch (error) {
      console.error("Redis save error:", error);
      // Continue to save to file system as backup
    }
  }

  // Always save to file system (local development + backup)
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2));
}
