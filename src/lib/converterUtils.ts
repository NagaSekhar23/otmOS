// eslint-disable-next-line @typescript-eslint/no-require-imports
const xmljs = require("xml-js") as typeof import("xml-js");

export type ConvertResult =
  | { ok: true; output: string }
  | { ok: false; error: string };

export function xmlToJson(xmlString: string, pretty: boolean): ConvertResult {
  try {
    const result = xmljs.xml2json(xmlString, {
      compact: true,
      spaces: pretty ? 2 : 0,
      ignoreDeclaration: false,
      ignoreInstruction: false,
      ignoreComment: false,
      ignoreCdata: false,
    });
    const parsed = JSON.parse(result);
    return { ok: true, output: pretty ? JSON.stringify(parsed, null, 2) : JSON.stringify(parsed) };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export function jsonToXml(jsonString: string, pretty: boolean): ConvertResult {
  try {
    const parsed = JSON.parse(jsonString);
    const output = xmljs.json2xml(JSON.stringify(parsed), {
      compact: true,
      spaces: pretty ? 2 : 0,
      ignoreDeclaration: false,
    });
    return { ok: true, output };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export function detectFormat(text: string): "xml" | "json" | "unknown" {
  const trimmed = text.trim();
  if (!trimmed) return "unknown";
  if (trimmed.startsWith("<")) return "xml";
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return "json";
  return "unknown";
}
