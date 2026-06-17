export interface ParsedCondition {
  conditionGid: string;
  conditionName: string;
  role: string;
  forceTrue: boolean;
  forceFalse: boolean;
  humanDescription: string;
}

const KNOWN_CONDITIONS: Record<string, { name: string; description: string }> = {
  "THG.CHECK_IF_PLANTO_EXISTS": {
    name: "Plan-To Location Exists",
    description: "Checks if the destination (plan-to) location is set on the order release",
  },
  "THG.CHECK_IF_PLANTO_MISSING": {
    name: "Plan-To Location Missing",
    description: "Checks if no destination location is assigned to the order release",
  },
  "THG.CHECK_IF_SERVPROV_MISSING": {
    name: "Service Provider Missing",
    description: "Checks if no carrier/service provider is assigned to the order or shipment",
  },
  "THG.CHECK_IF_SERVPROV_EXISTS": {
    name: "Service Provider Exists",
    description: "Checks if a carrier/service provider is assigned to the order or shipment",
  },
  "THG.CHECK_IF_POSTAL_CODE_INVALID": {
    name: "Postal Code Invalid",
    description: "Validates that the postal code matches expected US/Canada format (5 or 6 characters)",
  },
  "THG.CHECK_IF_POSTAL_CODE_VALID": {
    name: "Postal Code Valid",
    description: "Verifies the postal code meets format requirements for US/Canada",
  },
  "THG.CHECK_IF_PLANNING_ISSUES": {
    name: "Planning Issues Present",
    description: "Checks if there are unresolved planning issues flagged on the order",
  },
  "THG.CHECK_IF_ORDER_RELEASED": {
    name: "Order Released",
    description: "Checks if the order has been released and is ready for shipment",
  },
  "THG.CHECK_IF_ORDER_PLANNED": {
    name: "Order Planned",
    description: "Checks if the order has been assigned to a shipment or route",
  },
  "THG.CHECK_IF_SHIPMENT_EXISTS": {
    name: "Shipment Exists",
    description: "Checks if a shipment record exists for this order movement",
  },
  "THG.CHECK_IF_RATE_EXISTS": {
    name: "Rate Offering Exists",
    description: "Checks if a rate offering or tariff is available for the lane",
  },
  "THG.CHECK_IF_RATE_MISSING": {
    name: "Rate Offering Missing",
    description: "Checks if no rate offering is available for the shipment lane",
  },
  "THG.CHECK_IF_CONTACT_EXISTS": {
    name: "Contact Exists",
    description: "Checks if a contact person is associated with the location or order",
  },
  "THG.CHECK_IF_EQUIPMENT_ASSIGNED": {
    name: "Equipment Assigned",
    description: "Checks if transport equipment (trailer or container) is assigned to the shipment",
  },
  "THG.CHECK_IF_ITINERARY_EXISTS": {
    name: "Itinerary Exists",
    description: "Checks if a routing itinerary has been created for the shipment",
  },
  "THG.CHECK_IF_STATUS_ACTIVE": {
    name: "Status Is Active",
    description: "Checks if the order or shipment is in an active (non-cancelled) status",
  },
};

function gidToReadableName(gid: string): string {
  const part = gid.split(".").pop() ?? gid;
  return part
    .replace(/^CHECK_IF_/i, "")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function gidToDescription(gid: string): string {
  const part = gid.split(".").pop() ?? gid;
  const words = part.replace(/^CHECK_IF_/i, "").split("_").map((w) => w.toLowerCase());
  return `Checks if ${words.join(" ")}`;
}

export function parseIfCondition(parameters: string): ParsedCondition {
  let conditionGid = "";
  let role = "";
  let forceTrue = false;
  let forceFalse = false;

  // Try semicolon-delimited key=value pairs
  const kvPairs = parameters.match(/[a-zA-Z_]+=[^;]+/g) ?? [];
  for (const kv of kvPairs) {
    const eqIdx = kv.indexOf("=");
    if (eqIdx < 0) continue;
    const key = kv.slice(0, eqIdx).trim().toLowerCase().replace(/[_\s]/g, "");
    const val = kv.slice(eqIdx + 1).trim();

    if (key === "savedcondition" || key === "conditiongid" || key === "condition") {
      conditionGid = val;
    } else if (key === "role") {
      role = val;
    } else if (key === "forcetrue") {
      forceTrue = /^(y|yes|true|1)$/i.test(val);
    } else if (key === "forcefalse") {
      forceFalse = /^(y|yes|true|1)$/i.test(val);
    }
  }

  // Fall back: extract first GID-like token (NAMESPACE.IDENTIFIER)
  if (!conditionGid) {
    const gidMatch = parameters.match(/[A-Z][A-Z0-9_]*(?:\.[A-Z][A-Z0-9_]+)+/);
    if (gidMatch) {
      conditionGid = gidMatch[0];
    } else {
      conditionGid = parameters.trim().slice(0, 80);
    }
  }

  const known = KNOWN_CONDITIONS[conditionGid];
  const conditionName = known?.name ?? gidToReadableName(conditionGid);
  let humanDescription = known?.description ?? gidToDescription(conditionGid);

  if (forceTrue) humanDescription += " [FORCED TRUE — always takes true branch]";
  if (forceFalse) humanDescription += " [FORCED FALSE — always takes false branch]";

  return { conditionGid, conditionName, role, forceTrue, forceFalse, humanDescription };
}
