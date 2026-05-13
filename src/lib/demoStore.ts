import { neon } from "@neondatabase/serverless";

// Use Postgres when environment variable is available (production)
// Fall back to local file storage for development
const usePostgres = !!process.env.POSTGRES_URL;

let sql: ReturnType<typeof neon> | null = null;
if (usePostgres) {
  sql = neon(process.env.POSTGRES_URL!);
}

// Fallback to file system for local development
import fs from "fs/promises";
import path from "path";

const DATA_DIR = path.join(process.cwd(), ".data");
const STORE_PATH = path.join(DATA_DIR, "otmos-demo-store.json");
const TABLE_NAME = "otmos_store";

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

async function initializeDatabase() {
  if (!sql) return;

  try {
    // Create table if it doesn't exist (using string interpolation for table name)
    await sql`
      CREATE TABLE IF NOT EXISTS otmos_store (
        id INTEGER PRIMARY KEY DEFAULT 1,
        data JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Check if we have any data
    const result = await sql`SELECT data FROM otmos_store WHERE id = 1`;
    if (result.length === 0) {
      // Insert default store
      await sql`
        INSERT INTO otmos_store (id, data)
        VALUES (1, ${JSON.stringify(defaultStore)}::jsonb)
      `;
    }
  } catch (error) {
    console.error("Database initialization error:", error);
  }
}

export async function loadStore(): Promise<DemoStore> {
  // Try Postgres first (production)
  if (sql) {
    try {
      await initializeDatabase();
      const result = await sql`SELECT data FROM otmos_store WHERE id = 1`;
      if (result.length > 0 && result[0].data) {
        return result[0].data as DemoStore;
      }

      // Initialize with defaults if empty
      await saveStore(defaultStore);
      return structuredClone(defaultStore);
    } catch (error) {
      console.error("Postgres load error:", error);
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
  // Save to Postgres first (production)
  if (sql) {
    try {
      await sql`
        INSERT INTO otmos_store (id, data, updated_at)
        VALUES (1, ${JSON.stringify(store)}::jsonb, NOW())
        ON CONFLICT (id)
        DO UPDATE SET data = ${JSON.stringify(store)}::jsonb, updated_at = NOW()
      `;
    } catch (error) {
      console.error("Postgres save error:", error);
      // Continue to save to file system as backup
    }
  }

  // Always save to file system (local development + backup)
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2));
}
