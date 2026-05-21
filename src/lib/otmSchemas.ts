export interface OtmSchemaEntry {
  label: string;
  schema: object;
  sample: object;
}

const SHIPMENT_SCHEMA = {
  $schema: "http://json-schema.org/draft-07/schema#",
  title: "Oracle OTM Shipment",
  description: "Oracle Transportation Management Shipment object",
  type: "object",
  properties: {
    Shipment: {
      type: "object",
      required: ["shipmentGid", "transportMode"],
      properties: {
        shipmentGid: { type: "string", description: "Global ID for the shipment" },
        shipmentXid: { type: "string", description: "External ID for the shipment" },
        transportationPlanGid: { type: "string", description: "Transportation plan reference" },
        totalCost: {
          type: "object",
          properties: {
            costAmount: { type: "number" },
            currencyCode: { type: "string" },
          },
        },
        totalWeight: {
          type: "object",
          properties: {
            weightValue: { type: "number" },
            weightUom: { type: "string" },
          },
        },
        totalVolume: {
          type: "object",
          properties: {
            volumeValue: { type: "number" },
            volumeUom: { type: "string" },
          },
        },
        shipmentStatusType: {
          type: "string",
          enum: ["PENDING", "TENDERED", "ACCEPTED", "DECLINED", "IN_TRANSIT", "DELIVERED", "CANCELLED"],
        },
        transportMode: {
          type: "string",
          enum: ["TL", "LTL", "PARCEL", "AIR", "OCEAN", "RAIL", "INTERMODAL"],
        },
        serviceProvider: {
          type: "object",
          properties: {
            serviceProviderGid: { type: "string" },
            serviceProviderXid: { type: "string" },
          },
        },
        shipmentRefnums: {
          type: "array",
          items: {
            type: "object",
            properties: {
              shipmentRefnumGid: { type: "string" },
              shipmentRefnumQualGid: { type: "string" },
              shipmentRefnumValue: { type: "string" },
            },
          },
        },
        shipmentStops: {
          type: "array",
          items: {
            type: "object",
            properties: {
              shipmentStopGid: { type: "string" },
              stopSequenceNum: { type: "integer" },
              stopType: { type: "string", enum: ["PICKUP", "DELIVERY"] },
              locationGid: { type: "string" },
              earlyDateTime: { type: "string", format: "date-time" },
              lateDateTime: { type: "string", format: "date-time" },
            },
          },
        },
        shipmentRemarks: {
          type: "array",
          items: {
            type: "object",
            properties: {
              remarkText: { type: "string" },
              remarkQualifierGid: { type: "string" },
            },
          },
        },
      },
    },
  },
};

const SHIPMENT_SAMPLE = {
  Shipment: {
    shipmentGid: "DOMAIN.SHIP-001",
    shipmentXid: "SHP-4521",
    transportationPlanGid: "DOMAIN.PLAN-789",
    totalCost: { costAmount: 1250.00, currencyCode: "USD" },
    totalWeight: { weightValue: 4500, weightUom: "LB" },
    totalVolume: { volumeValue: 120, volumeUom: "CF" },
    shipmentStatusType: "IN_TRANSIT",
    transportMode: "TL",
    serviceProvider: {
      serviceProviderGid: "DOMAIN.CARRIER-FedEx",
      serviceProviderXid: "FEDEX",
    },
    shipmentRefnums: [
      {
        shipmentRefnumGid: "DOMAIN.REFNUM-001",
        shipmentRefnumQualGid: "DOMAIN.ORDER_NUM",
        shipmentRefnumValue: "PO-2024-00123",
      },
    ],
    shipmentStops: [
      {
        shipmentStopGid: "DOMAIN.STOP-001",
        stopSequenceNum: 1,
        stopType: "PICKUP",
        locationGid: "DOMAIN.LOC-CHICAGO-WH",
        earlyDateTime: "2026-05-21T08:00:00Z",
        lateDateTime: "2026-05-21T12:00:00Z",
      },
      {
        shipmentStopGid: "DOMAIN.STOP-002",
        stopSequenceNum: 2,
        stopType: "DELIVERY",
        locationGid: "DOMAIN.LOC-NYC-DC",
        earlyDateTime: "2026-05-23T08:00:00Z",
        lateDateTime: "2026-05-23T17:00:00Z",
      },
    ],
    shipmentRemarks: [
      { remarkText: "Handle with care – fragile items", remarkQualifierGid: "HANDLING_INSTRUCTION" },
    ],
  },
};

const ORDER_SCHEMA = {
  $schema: "http://json-schema.org/draft-07/schema#",
  title: "Oracle OTM Order",
  description: "Oracle Transportation Management Order (Order Release) object",
  type: "object",
  properties: {
    Order: {
      type: "object",
      required: ["orderGid", "sourceLocationGid", "destLocationGid"],
      properties: {
        orderGid: { type: "string", description: "Global ID for the order" },
        orderXid: { type: "string", description: "External ID for the order" },
        orderReleaseGid: { type: "string", description: "Order release reference" },
        totalCost: {
          type: "object",
          properties: {
            costAmount: { type: "number" },
            currencyCode: { type: "string" },
          },
        },
        totalWeight: {
          type: "object",
          properties: {
            weightValue: { type: "number" },
            weightUom: { type: "string" },
          },
        },
        totalVolume: {
          type: "object",
          properties: {
            volumeValue: { type: "number" },
            volumeUom: { type: "string" },
          },
        },
        sourceLocationGid: { type: "string" },
        destLocationGid: { type: "string" },
        earlyPickupDate: { type: "string", format: "date-time" },
        latePickupDate: { type: "string", format: "date-time" },
        earlyDeliveryDate: { type: "string", format: "date-time" },
        lateDeliveryDate: { type: "string", format: "date-time" },
        transportMode: {
          type: "string",
          enum: ["TL", "LTL", "PARCEL", "AIR", "OCEAN", "RAIL", "INTERMODAL"],
        },
        serviceLevel: { type: "string" },
        orderRefnums: {
          type: "array",
          items: {
            type: "object",
            properties: {
              orderRefnumGid: { type: "string" },
              orderRefnumQualGid: { type: "string" },
              orderRefnumValue: { type: "string" },
            },
          },
        },
        orderLines: {
          type: "array",
          items: {
            type: "object",
            properties: {
              orderLineGid: { type: "string" },
              lineNumber: { type: "integer" },
              itemGid: { type: "string" },
              orderedQuantity: { type: "number" },
              quantityUom: { type: "string" },
              packagedItemGid: { type: "string" },
            },
          },
        },
      },
    },
  },
};

const ORDER_SAMPLE = {
  Order: {
    orderGid: "DOMAIN.ORD-2024-00456",
    orderXid: "ORD-4521",
    orderReleaseGid: "DOMAIN.RELEASE-789",
    totalCost: { costAmount: 3200.00, currencyCode: "USD" },
    totalWeight: { weightValue: 8000, weightUom: "LB" },
    totalVolume: { volumeValue: 240, volumeUom: "CF" },
    sourceLocationGid: "DOMAIN.LOC-CHICAGO-WH",
    destLocationGid: "DOMAIN.LOC-NYC-DC",
    earlyPickupDate: "2026-05-21T08:00:00Z",
    latePickupDate: "2026-05-21T17:00:00Z",
    earlyDeliveryDate: "2026-05-23T08:00:00Z",
    lateDeliveryDate: "2026-05-23T17:00:00Z",
    transportMode: "LTL",
    serviceLevel: "STANDARD",
    orderRefnums: [
      { orderRefnumGid: "DOMAIN.REFNUM-001", orderRefnumQualGid: "PO_NUMBER", orderRefnumValue: "PO-2024-00123" },
    ],
    orderLines: [
      { orderLineGid: "DOMAIN.LINE-001", lineNumber: 1, itemGid: "DOMAIN.ITEM-WIDGET-A", orderedQuantity: 50, quantityUom: "EA", packagedItemGid: "DOMAIN.PKG-001" },
      { orderLineGid: "DOMAIN.LINE-002", lineNumber: 2, itemGid: "DOMAIN.ITEM-GADGET-B", orderedQuantity: 25, quantityUom: "EA", packagedItemGid: "DOMAIN.PKG-002" },
    ],
  },
};

const LOCATION_SCHEMA = {
  $schema: "http://json-schema.org/draft-07/schema#",
  title: "Oracle OTM Location",
  description: "Oracle Transportation Management Location object",
  type: "object",
  properties: {
    Location: {
      type: "object",
      required: ["locationGid", "locationName"],
      properties: {
        locationGid: { type: "string" },
        locationXid: { type: "string" },
        locationName: { type: "string" },
        locationType: {
          type: "string",
          enum: ["WAREHOUSE", "DC", "STORE", "CUSTOMER", "VENDOR", "PORT"],
        },
        addressLines: {
          type: "object",
          properties: {
            addressLine1: { type: "string" },
            addressLine2: { type: "string" },
            city: { type: "string" },
            stateProvince: { type: "string" },
            postalCode: { type: "string" },
            countryCode3Gid: { type: "string", description: "ISO 3-letter country code" },
          },
        },
        timeZone: { type: "string" },
        geoCoordinates: {
          type: "object",
          properties: {
            latitude: { type: "number", minimum: -90, maximum: 90 },
            longitude: { type: "number", minimum: -180, maximum: 180 },
          },
        },
        contactInfo: {
          type: "object",
          properties: {
            contactName: { type: "string" },
            phoneNumber: { type: "string" },
            emailAddress: { type: "string", format: "email" },
          },
        },
        operatingHours: {
          type: "object",
          properties: {
            openTime: { type: "string" },
            closeTime: { type: "string" },
            operatingDays: { type: "string" },
          },
        },
      },
    },
  },
};

const LOCATION_SAMPLE = {
  Location: {
    locationGid: "DOMAIN.LOC-CHICAGO-WH",
    locationXid: "CHI-WH-001",
    locationName: "Chicago Main Warehouse",
    locationType: "WAREHOUSE",
    addressLines: {
      addressLine1: "1234 Logistics Blvd",
      addressLine2: "Dock B",
      city: "Chicago",
      stateProvince: "IL",
      postalCode: "60601",
      countryCode3Gid: "USA",
    },
    timeZone: "America/Chicago",
    geoCoordinates: { latitude: 41.8781, longitude: -87.6298 },
    contactInfo: {
      contactName: "Jane Smith",
      phoneNumber: "312-555-0100",
      emailAddress: "warehouse@example.com",
    },
    operatingHours: { openTime: "07:00", closeTime: "19:00", operatingDays: "MON-SAT" },
  },
};

const ITEM_SCHEMA = {
  $schema: "http://json-schema.org/draft-07/schema#",
  title: "Oracle OTM Item",
  description: "Oracle Transportation Management packaged item / commodity",
  type: "object",
  properties: {
    Item: {
      type: "object",
      required: ["itemGid"],
      properties: {
        itemGid: { type: "string" },
        itemXid: { type: "string" },
        itemDescription: { type: "string" },
        commodityGid: { type: "string" },
        packageType: { type: "string", enum: ["PALLET", "CARTON", "DRUM", "CRATE", "BAG", "ROLL", "BUNDLE"] },
        unitWeight: {
          type: "object",
          properties: {
            weightValue: { type: "number" },
            weightUom: { type: "string" },
          },
        },
        unitVolume: {
          type: "object",
          properties: {
            volumeValue: { type: "number" },
            volumeUom: { type: "string" },
          },
        },
        unitDimensions: {
          type: "object",
          properties: {
            length: { type: "number" },
            width: { type: "number" },
            height: { type: "number" },
            dimensionUom: { type: "string" },
          },
        },
        hazmatInfo: {
          type: "object",
          properties: {
            isHazmat: { type: "boolean" },
            unNumber: { type: "string" },
            hazmatClass: { type: "string" },
          },
        },
        isStackable: { type: "boolean" },
        isTemperatureControlled: { type: "boolean" },
      },
    },
  },
};

const ITEM_SAMPLE = {
  Item: {
    itemGid: "DOMAIN.ITEM-WIDGET-A",
    itemXid: "ITM-1042",
    itemDescription: "Widget Model A – Industrial Grade",
    commodityGid: "DOMAIN.COMMODITY-ELECTRONICS",
    packageType: "PALLET",
    unitWeight: { weightValue: 48, weightUom: "LB" },
    unitVolume: { volumeValue: 18, volumeUom: "CF" },
    unitDimensions: { length: 48, width: 40, height: 36, dimensionUom: "IN" },
    hazmatInfo: { isHazmat: false },
    isStackable: true,
    isTemperatureControlled: false,
  },
};

const EQUIPMENT_SCHEMA = {
  $schema: "http://json-schema.org/draft-07/schema#",
  title: "Oracle OTM Equipment",
  description: "Oracle Transportation Management equipment / vehicle",
  type: "object",
  properties: {
    Equipment: {
      type: "object",
      required: ["equipmentGid"],
      properties: {
        equipmentGid: { type: "string" },
        equipmentXid: { type: "string" },
        equipmentType: {
          type: "string",
          enum: ["TRUCK", "TRAILER", "VAN", "FLATBED", "REEFER", "TANKER", "CONTAINER", "RAILCAR"],
        },
        equipmentGroupGid: { type: "string" },
        capacity: {
          type: "object",
          properties: {
            weightCapacity: { type: "number" },
            weightUom: { type: "string" },
            volumeCapacity: { type: "number" },
            volumeUom: { type: "string" },
          },
        },
        dimensions: {
          type: "object",
          properties: {
            length: { type: "number" },
            width: { type: "number" },
            height: { type: "number" },
            dimensionUom: { type: "string" },
          },
        },
        activeStatus: { type: "string", enum: ["ACTIVE", "INACTIVE", "MAINTENANCE"] },
        ownerGid: { type: "string" },
        licensePlate: { type: "string" },
      },
    },
  },
};

const EQUIPMENT_SAMPLE = {
  Equipment: {
    equipmentGid: "DOMAIN.EQP-TRK-001",
    equipmentXid: "TRK-4521",
    equipmentType: "TRAILER",
    equipmentGroupGid: "DOMAIN.GROUP-DRY-VAN",
    capacity: { weightCapacity: 44000, weightUom: "LB", volumeCapacity: 2800, volumeUom: "CF" },
    dimensions: { length: 53, width: 8.5, height: 9, dimensionUom: "FT" },
    activeStatus: "ACTIVE",
    ownerGid: "DOMAIN.CARRIER-FedEx",
    licensePlate: "TX-XYZ-9012",
  },
};

const RATE_SCHEMA = {
  $schema: "http://json-schema.org/draft-07/schema#",
  title: "Oracle OTM Rate",
  description: "Oracle Transportation Management rate / quote",
  type: "object",
  properties: {
    Rate: {
      type: "object",
      required: ["rateGid", "serviceProviderGid"],
      properties: {
        rateGid: { type: "string" },
        rateOfferingGid: { type: "string" },
        serviceProviderGid: { type: "string" },
        totalCost: {
          type: "object",
          properties: {
            costAmount: { type: "number" },
            currencyCode: { type: "string" },
          },
        },
        transitTime: { type: "number" },
        transitTimeUom: { type: "string", enum: ["HOUR", "DAY", "WEEK"] },
        effectiveDate: { type: "string", format: "date-time" },
        expirationDate: { type: "string", format: "date-time" },
        rateComponents: {
          type: "array",
          items: {
            type: "object",
            properties: {
              componentType: { type: "string" },
              costAmount: { type: "number" },
              currencyCode: { type: "string" },
            },
          },
        },
        originZone: { type: "string" },
        destinationZone: { type: "string" },
        transportMode: { type: "string" },
        serviceLevel: { type: "string" },
      },
    },
  },
};

const RATE_SAMPLE = {
  Rate: {
    rateGid: "DOMAIN.RATE-2024-001",
    rateOfferingGid: "DOMAIN.OFFERING-TL-STANDARD",
    serviceProviderGid: "DOMAIN.CARRIER-FedEx",
    totalCost: { costAmount: 1875.50, currencyCode: "USD" },
    transitTime: 2,
    transitTimeUom: "DAY",
    effectiveDate: "2026-01-01T00:00:00Z",
    expirationDate: "2026-12-31T23:59:59Z",
    rateComponents: [
      { componentType: "BASE_RATE", costAmount: 1500.00, currencyCode: "USD" },
      { componentType: "FUEL_SURCHARGE", costAmount: 300.00, currencyCode: "USD" },
      { componentType: "ACCESSORIAL", costAmount: 75.50, currencyCode: "USD" },
    ],
    originZone: "MIDWEST",
    destinationZone: "NORTHEAST",
    transportMode: "TL",
    serviceLevel: "STANDARD",
  },
};

const INVOICE_SCHEMA = {
  $schema: "http://json-schema.org/draft-07/schema#",
  title: "Oracle OTM Invoice",
  description: "Oracle Transportation Management freight invoice",
  type: "object",
  properties: {
    Invoice: {
      type: "object",
      required: ["invoiceGid", "invoiceNumber"],
      properties: {
        invoiceGid: { type: "string" },
        invoiceXid: { type: "string" },
        invoiceNumber: { type: "string" },
        invoiceDate: { type: "string", format: "date-time" },
        dueDate: { type: "string", format: "date-time" },
        totalAmount: {
          type: "object",
          properties: {
            amount: { type: "number" },
            currencyCode: { type: "string" },
          },
        },
        invoiceStatus: {
          type: "string",
          enum: ["PENDING", "APPROVED", "DISPUTED", "PAID", "CANCELLED"],
        },
        shipmentGid: { type: "string" },
        serviceProviderGid: { type: "string" },
        invoiceLines: {
          type: "array",
          items: {
            type: "object",
            properties: {
              lineNumber: { type: "integer" },
              chargeCode: { type: "string" },
              description: { type: "string" },
              amount: { type: "number" },
              currencyCode: { type: "string" },
            },
          },
        },
        paymentTerms: { type: "string" },
        remitToAddress: { type: "string" },
      },
    },
  },
};

const INVOICE_SAMPLE = {
  Invoice: {
    invoiceGid: "DOMAIN.INV-2024-00789",
    invoiceXid: "INV-789",
    invoiceNumber: "FX-INV-2024-00789",
    invoiceDate: "2026-05-20T00:00:00Z",
    dueDate: "2026-06-19T00:00:00Z",
    totalAmount: { amount: 1875.50, currencyCode: "USD" },
    invoiceStatus: "PENDING",
    shipmentGid: "DOMAIN.SHIP-001",
    serviceProviderGid: "DOMAIN.CARRIER-FedEx",
    invoiceLines: [
      { lineNumber: 1, chargeCode: "BASE_RATE", description: "Line Haul Charge", amount: 1500.00, currencyCode: "USD" },
      { lineNumber: 2, chargeCode: "FUEL", description: "Fuel Surcharge", amount: 300.00, currencyCode: "USD" },
      { lineNumber: 3, chargeCode: "ACCESSORIAL", description: "Liftgate – Delivery", amount: 75.50, currencyCode: "USD" },
    ],
    paymentTerms: "NET_30",
    remitToAddress: "FedEx Freight, PO Box 1234, Memphis TN 38101",
  },
};

const AGENT_SCHEMA = {
  $schema: "http://json-schema.org/draft-07/schema#",
  title: "Oracle OTM Agent",
  description: "Oracle Transportation Management automation agent / business rule",
  type: "object",
  properties: {
    Agent: {
      type: "object",
      required: ["agentGid", "agentName"],
      properties: {
        agentGid: { type: "string" },
        agentXid: { type: "string" },
        agentName: { type: "string" },
        agentType: {
          type: "string",
          enum: ["WORKFLOW", "NOTIFICATION", "RATE_SELECTION", "TENDER", "TRACKING", "ALLOCATION"],
        },
        triggerConditions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              conditionType: { type: "string" },
              conditionValue: { type: "string" },
              conditionOperator: { type: "string", enum: ["EQUALS", "NOT_EQUALS", "GREATER_THAN", "LESS_THAN", "CONTAINS"] },
            },
          },
        },
        actions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              actionType: { type: "string" },
              actionConfig: { type: "object" },
            },
          },
        },
        isActive: { type: "boolean" },
        priority: { type: "integer", minimum: 1, maximum: 100 },
        effectiveDate: { type: "string", format: "date-time" },
        expirationDate: { type: "string", format: "date-time" },
      },
    },
  },
};

const AGENT_SAMPLE = {
  Agent: {
    agentGid: "DOMAIN.AGENT-AUTO-TENDER",
    agentXid: "AGT-0042",
    agentName: "Auto-Tender on Order Accept",
    agentType: "TENDER",
    triggerConditions: [
      { conditionType: "ORDER_STATUS", conditionValue: "ACCEPTED", conditionOperator: "EQUALS" },
      { conditionType: "TRANSPORT_MODE", conditionValue: "TL", conditionOperator: "EQUALS" },
    ],
    actions: [
      {
        actionType: "SEND_TENDER",
        actionConfig: { serviceProviderGid: "DOMAIN.CARRIER-FedEx", tenderExpireHours: 4 },
      },
      {
        actionType: "SEND_NOTIFICATION",
        actionConfig: { recipient: "logistics@example.com", template: "TENDER_SENT" },
      },
    ],
    isActive: true,
    priority: 10,
    effectiveDate: "2026-01-01T00:00:00Z",
    expirationDate: "2026-12-31T23:59:59Z",
  },
};

export const OTM_SCHEMAS: Record<string, OtmSchemaEntry> = {
  Shipment: { label: "Shipment", schema: SHIPMENT_SCHEMA, sample: SHIPMENT_SAMPLE },
  Order: { label: "Order (Release)", schema: ORDER_SCHEMA, sample: ORDER_SAMPLE },
  Location: { label: "Location", schema: LOCATION_SCHEMA, sample: LOCATION_SAMPLE },
  Item: { label: "Item / Commodity", schema: ITEM_SCHEMA, sample: ITEM_SAMPLE },
  Equipment: { label: "Equipment", schema: EQUIPMENT_SCHEMA, sample: EQUIPMENT_SAMPLE },
  Rate: { label: "Rate / Quote", schema: RATE_SCHEMA, sample: RATE_SAMPLE },
  Invoice: { label: "Invoice", schema: INVOICE_SCHEMA, sample: INVOICE_SAMPLE },
  Agent: { label: "Agent (Automation)", schema: AGENT_SCHEMA, sample: AGENT_SAMPLE },
};

export const OTM_DOCS_URL = "https://docs.oracle.com/en/cloud/saas/transportation/26b/otmra/";
