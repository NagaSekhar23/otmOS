export interface ParsedSql {
  operation: "UPDATE" | "INSERT" | "DELETE" | "SELECT" | "UNKNOWN";
  mainTable: string;
  tableAlias: string;
  columns: string[];
  conditions: string[];
  joins: string[];
  purpose: string;
  humanSummary: string;
}

const TABLE_LABELS: Record<string, string> = {
  order_release: "Order Release",
  order_release_refnum: "Order Release Reference Number",
  order_release_status: "Order Release Status",
  order_release_line: "Order Release Line",
  order_base: "Order Base",
  order_movement: "Order Movement",
  shipment: "Shipment",
  shipment_refnum: "Shipment Reference Number",
  shipment_status: "Shipment Status",
  shipment_stop: "Shipment Stop",
  location: "Location",
  servprov: "Service Provider",
  rate_offering: "Rate Offering",
  rate_geo: "Rate Geography",
  itinerary: "Itinerary",
  contact: "Contact",
  equipment: "Equipment",
  user_profile: "User Profile",
  transport_mode: "Transport Mode",
  planning_parameter: "Planning Parameter",
};

function readableTable(t: string): string {
  const key = t.toLowerCase().trim();
  return TABLE_LABELS[key] ?? t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const SQL_KEYWORD_RX = /^\s*(UPDATE|INSERT|DELETE|SELECT)\b/i;

function normalizeSQL(raw: string): string {
  // Strip comments first (preserving newlines so line-based scan works)
  let s = raw
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/--[^\n]*/g, " ");

  // OTM Excel often prefixes SQL with metadata lines: "sqlDescription=...\nUPDATE ..."
  // Find the first line that starts with a SQL keyword and start from there.
  const lines = s.split(/\r?\n/);
  const sqlLine = lines.findIndex(l => SQL_KEYWORD_RX.test(l));
  if (sqlLine > 0) {
    s = lines.slice(sqlLine).join("\n");
  } else if (sqlLine === -1) {
    // No line starts with SQL keyword — check for inline keyword (e.g. "sql=UPDATE ...")
    const m = s.match(/\b(UPDATE|INSERT\s+(?:INTO\s+)?\w|DELETE\s+(?:FROM\s+)?\w|SELECT\s+\w)/i);
    if (m && m.index !== undefined) s = s.slice(m.index);
  }

  return s.replace(/\s+/g, " ").trim();
}

function isSqlLike(s: string): boolean {
  return /\b(UPDATE|INSERT|DELETE|SELECT|CREATE|ALTER|DROP)\b/i.test(s.slice(0, 80));
}

function stripAlias(expr: string): string {
  return expr.replace(/\b[a-z_]+\./gi, "").trim();
}

function extractFromTokens(fromChunk: string): string[] {
  const tables: string[] = [];

  const joinMatches = fromChunk.matchAll(/\b(?:INNER|LEFT|RIGHT|FULL|CROSS)?\s*JOIN\s+(\w+)/gi);
  for (const m of joinMatches) {
    if (m[1]) tables.push(m[1]);
  }

  const noJoins = fromChunk.replace(/\b(?:INNER|LEFT|RIGHT|FULL|CROSS)?\s*JOIN\s+\w+[^,]*/gi, "");
  for (const token of noJoins.split(",")) {
    const name = token.trim().split(/\s+/)[0];
    if (name && name.length > 1 && !/^(WHERE|SET|ON|AND|OR|SELECT)$/i.test(name)) {
      tables.push(name);
    }
  }

  return [...new Set(tables)];
}

type ExistsResult = { cleaned: string; relatedTables: string[] };
function stripExistsBlocks(sql: string): ExistsResult {
  let i = 0;
  let output = "";
  const relatedTables: string[] = [];

  while (i < sql.length) {
    const slice = sql.slice(i);
    const existsM = slice.match(/^(?:NOT\s+)?EXISTS\s*\(/i);
    if (existsM) {
      i += existsM[0].length;
      let depth = 1;
      let inner = "";
      while (i < sql.length && depth > 0) {
        if (sql[i] === "(") depth++;
        else if (sql[i] === ")") {
          depth--;
          if (depth === 0) { i++; break; }
        }
        inner += sql[i++];
      }
      const fm = inner.match(/\bFROM\s+([\s\S]+?)(?:\bWHERE\b|$)/i);
      if (fm) relatedTables.push(...extractFromTokens(fm[1]));
      output += " __EXISTS__ ";
      continue;
    }
    output += sql[i++];
  }

  return { cleaned: output, relatedTables };
}

function extractConditions(whereClause: string): { conditions: string[]; relatedTables: string[] } {
  const { cleaned, relatedTables } = stripExistsBlocks(whereClause);

  const parts = cleaned.split(/\bAND\b/i);
  const conditions: string[] = [];

  for (const part of parts) {
    const t = part.trim();
    if (t === "__EXISTS__") {
      conditions.push("EXISTS subquery (cross-table validation)");
      continue;
    }
    const simplified = stripAlias(t).replace(/\s+/g, " ");
    if (simplified.length > 3 && !/^\s*$/.test(simplified)) {
      conditions.push(simplified.slice(0, 110));
    }
  }

  return { conditions, relatedTables };
}

// OTM-specific business signal detection
function detectSignals(raw: string) {
  const u = raw.toUpperCase();
  return {
    isPlanningIssues:   /PLANNING_ISSUES/.test(u),
    isRefnum:           /REFNUM/.test(u),
    isStatus:           /ORDER_RELEASE_STATUS|SHIPMENT_STATUS/.test(u),
    hasPostalCode:      /POSTAL_CODE/.test(u),
    hasWeight:          /TOTAL_WEIGHT|WEIGHT_VOLUME|GROSS_WEIGHT/.test(u),
    hasServProv:        /SERVPROV/.test(u),
    hasPlanToLoc:       /PLAN_TO_LOCATION/.test(u),
    hasNotExists:       /NOT\s+EXISTS/.test(u),
    hasDiscount:        /DISCOUNT/.test(u),
    hasAlias:           /ALIAS/.test(u),
    hasInvoice:         /INVOICE/.test(u),
    hasMode:            /TRANSPORT_MODE|MODE_GID|SHIPMENT_MODE/.test(u),
    // string being appended: SET col = col || ' – SOME TEXT'
    appendedStr:        (raw.match(/\|\|\s*'([^']+)'/) ?? [])[1]?.trim() ?? "",
    // literal string values in INSERT SELECT (not GIDs/keywords)
    insertLiterals:     [...raw.matchAll(/'([A-Z][A-Z ]{2,48})'/g)]
                          .map(m => m[1].trim())
                          .filter(v => !/^THG\.|^ADMIN|^SYSDATE|^N$/.test(v)),
  };
}

function buildSmartSummary(raw: string, p: Omit<ParsedSql, "humanSummary">): string {
  const sig = detectSignals(raw);
  const table = readableTable(p.mainTable);

  // ── DELETE ──────────────────────────────────────────────────────────────
  if (p.operation === "DELETE") {
    if (sig.isRefnum && sig.isPlanningIssues)
      return "Remove existing planning issue reference numbers";
    if (sig.isRefnum)
      return "Clear order reference number records before re-processing";
    return `Delete records from ${table}`;
  }

  // ── INSERT ──────────────────────────────────────────────────────────────
  if (p.operation === "INSERT") {
    if (sig.isRefnum && sig.isPlanningIssues) {
      if (sig.hasPostalCode)    return "Insert planning issue flag for orders with invalid postal code";
      if (sig.hasWeight && sig.hasNotExists)
                                return "Insert planning issue for orders missing weight or line items";
      if (sig.hasWeight)        return "Insert planning issue flag for orders with excess weight";
      if (sig.hasServProv)      return "Insert planning issue flag for orders missing service provider";
      if (sig.hasPlanToLoc)     return "Insert planning issue flag for orders missing plan-to location";
      const label = sig.insertLiterals[0];
      if (label)                return `Insert planning issue: "${label.toLowerCase()}"`;
      return "Insert planning issue reference for order";
    }
    if (sig.isStatus)           return `Set status record on ${table.replace(" Status", "")}`;
    if (sig.isRefnum && sig.hasMode)
                                return "Add shipment mode reference number";
    if (sig.isRefnum)           return `Add reference number to ${table.replace(" Reference Number", "")}`;
    return `Insert record into ${table}`;
  }

  // ── UPDATE ──────────────────────────────────────────────────────────────
  if (p.operation === "UPDATE") {
    if (sig.isRefnum && sig.appendedStr) {
      if (sig.hasPostalCode)    return `Flag orders with invalid postal code (appends "${sig.appendedStr}")`;
      if (sig.hasWeight)        return `Flag orders with weight issue (appends "${sig.appendedStr}")`;
      if (sig.hasServProv)      return `Flag orders missing service provider (appends "${sig.appendedStr}")`;
      return `Append issue text to planning reference: "${sig.appendedStr}"`;
    }
    if (sig.isRefnum && sig.isPlanningIssues)
                                return "Update planning issue reference for matching orders";
    if (sig.hasPostalCode)      return "Update records based on postal code validation";
    if (sig.hasWeight)          return "Update records based on weight/volume check";
    if (sig.hasServProv && sig.hasAlias)
                                return "Update service provider from alias mapping";
    if (sig.hasServProv)        return "Update records based on service provider assignment";
    if (sig.hasDiscount && sig.hasInvoice)
                                return "Rollup invoice discount amount";
    if (sig.hasDiscount)        return "Update discount amount";
    if (sig.hasMode)            return "Update transport mode assignment";
    // Generic: mention columns changed
    const cols = p.columns.slice(0, 2).map(c => c.replace(/_/g, " ")).join(" and ");
    return `Update ${table}${cols ? ` — set ${cols}` : ""}`;
  }

  // ── SELECT ───────────────────────────────────────────────────────────────
  if (p.operation === "SELECT") {
    return `Query ${table}${p.joins.length ? " with " + p.joins.map(readableTable).join(", ") : ""}`;
  }

  return `Execute SQL on ${table}`;
}

export function parseSql(sql: string, description?: string): ParsedSql {
  const norm = normalizeSQL(sql);

  let operation: ParsedSql["operation"] = "UNKNOWN";
  let mainTable = "";
  let tableAlias = "";
  let columns: string[] = [];
  let conditions: string[] = [];
  let joins: string[] = [];

  if (/^UPDATE\b/i.test(norm)) {
    operation = "UPDATE";
    const m = norm.match(/^UPDATE\s+(\w+)(?:\s+(?:AS\s+)?(\w+))?\s+SET\b/i);
    if (m) { mainTable = m[1] ?? ""; tableAlias = m[2] ?? ""; }

    const setM = norm.match(/\bSET\b([\s\S]+?)(?:\bWHERE\b|$)/i);
    if (setM) {
      columns = setM[1]
        .split(",")
        .map((s) => stripAlias(s.split("=")[0].trim()))
        .filter((c) => c.length > 0 && !/^\s*$/.test(c));
    }

    const whereM = norm.match(/\bWHERE\b([\s\S]+)$/i);
    if (whereM) {
      const { conditions: conds, relatedTables } = extractConditions(whereM[1]);
      conditions = conds;
      joins = relatedTables;
    }

  } else if (/^INSERT\b/i.test(norm)) {
    operation = "INSERT";
    const m = norm.match(/^INSERT\s+(?:INTO\s+)?(\w+)/i);
    if (m) mainTable = m[1] ?? "";

    const colM = norm.match(/^INSERT\s+(?:INTO\s+)?\w+\s*\(([^)]+)\)/i);
    if (colM) {
      columns = colM[1].split(",").map((c) => c.trim()).filter(Boolean);
    }

    const fromM = norm.match(/\bFROM\b([\s\S]+?)(?:\bWHERE\b|$)/i);
    if (fromM) {
      joins = extractFromTokens(fromM[1]).filter(
        (t) => t.toLowerCase() !== mainTable.toLowerCase()
      );
    }

    const whereM = norm.match(/\bWHERE\b([\s\S]+)$/i);
    if (whereM) {
      const { conditions: conds } = extractConditions(whereM[1]);
      conditions = conds;
    }

  } else if (/^DELETE\b/i.test(norm)) {
    operation = "DELETE";
    const m = norm.match(/^DELETE\s+(?:FROM\s+)?(\w+)/i);
    if (m) mainTable = m[1] ?? "";

    const whereM = norm.match(/\bWHERE\b([\s\S]+)$/i);
    if (whereM) {
      const { conditions: conds, relatedTables } = extractConditions(whereM[1]);
      conditions = conds;
      joins = relatedTables;
    }

  } else if (/^SELECT\b/i.test(norm)) {
    operation = "SELECT";
    const fromM = norm.match(/\bFROM\b([\s\S]+?)(?:\bWHERE\b|$)/i);
    if (fromM) {
      const tables = extractFromTokens(fromM[1]);
      mainTable = tables[0] ?? "";
      joins = tables.slice(1);
    }

    const whereM = norm.match(/\bWHERE\b([\s\S]+)$/i);
    if (whereM) {
      const { conditions: conds } = extractConditions(whereM[1]);
      conditions = conds;
    }
  }

  const purpose =
    description && !isSqlLike(description)
      ? description
      : operation === "UPDATE"
      ? `Update ${readableTable(mainTable)}`
      : operation === "INSERT"
      ? `Insert into ${readableTable(mainTable)}`
      : operation === "DELETE"
      ? `Delete from ${readableTable(mainTable)}`
      : `Query ${readableTable(mainTable)}`;

  const partial: Omit<ParsedSql, "humanSummary"> = {
    operation,
    mainTable,
    tableAlias,
    columns,
    conditions,
    joins,
    purpose,
  };

  return { ...partial, humanSummary: buildSmartSummary(norm, partial) };
}
