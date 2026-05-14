import xmljs from "xml-js";

// Sample data pools for realistic generation
const SAMPLE_DATA = {
  cities: ["New York", "Los Angeles", "Chicago", "Houston", "Phoenix", "Philadelphia", "San Antonio", "San Diego", "Dallas", "San Jose"],
  states: ["NY", "CA", "IL", "TX", "AZ", "PA", "FL", "OH", "NC", "GA"],
  countries: ["USA", "CAN", "MEX"],
  transportModes: ["TL", "LTL", "PARCEL", "AIR", "OCEAN", "RAIL", "INTERMODAL"],
  statuses: ["PENDING", "TENDERED", "ACCEPTED", "IN_TRANSIT", "DELIVERED"],
  currencies: ["USD", "CAD", "EUR", "GBP"],
  weightUoms: ["LB", "KG", "TON"],
  volumeUoms: ["CF", "CM", "M3"],
  locationTypes: ["WAREHOUSE", "DC", "STORE", "CUSTOMER", "VENDOR", "PORT"],
  companies: ["ACME Corp", "Global Logistics", "Swift Transport", "ABC Shipping", "XYZ Freight"],
  streets: ["Main St", "Oak Ave", "Elm Road", "Maple Dr", "Pine Blvd"],
};

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomNumber(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(daysFromNow: number = 7): string {
  const date = new Date();
  date.setDate(date.getDate() + randomNumber(0, daysFromNow));
  return date.toISOString();
}

function generateGid(prefix: string): string {
  return `${prefix}.${randomNumber(100000, 999999)}`;
}

function generateXid(prefix: string): string {
  return `${prefix}-${randomNumber(1000, 9999)}`;
}

export interface SampleOptions {
  includeOptional?: boolean;
  includeArrays?: boolean;
  arrayLength?: number;
}

export function generateShipmentSample(options: SampleOptions = {}): object {
  const {
    includeOptional = true,
    includeArrays = true,
    arrayLength = 2,
  } = options;

  const shipment: any = {
    Shipment: {
      shipmentGid: generateGid("SHIPMENT"),
      shipmentXid: generateXid("SHP"),
      transportationPlanGid: generateGid("PLAN"),
      totalCost: {
        costAmount: randomNumber(500, 5000),
        currencyCode: randomChoice(SAMPLE_DATA.currencies),
      },
      totalWeight: {
        weightValue: randomNumber(100, 10000),
        weightUom: randomChoice(SAMPLE_DATA.weightUoms),
      },
      totalVolume: {
        volumeValue: randomNumber(10, 500),
        volumeUom: randomChoice(SAMPLE_DATA.volumeUoms),
      },
      shipmentStatusType: randomChoice(SAMPLE_DATA.statuses),
      transportMode: randomChoice(SAMPLE_DATA.transportModes),
      serviceProvider: {
        serviceProviderGid: generateGid("CARRIER"),
        serviceProviderXid: randomChoice(SAMPLE_DATA.companies),
      },
    },
  };

  if (includeArrays) {
    shipment.Shipment.shipmentRefnums = Array.from({ length: arrayLength }, (_, i) => ({
      shipmentRefnumGid: generateGid("REFNUM"),
      shipmentRefnumQualGid: `REF_TYPE_${i + 1}`,
      shipmentRefnumValue: `REF-${randomNumber(10000, 99999)}`,
    }));

    shipment.Shipment.shipmentStops = [
      {
        shipmentStopGid: generateGid("STOP"),
        stopSequenceNum: 1,
        stopType: "PICKUP",
        locationGid: generateGid("LOCATION"),
        earlyDateTime: randomDate(3),
        lateDateTime: randomDate(5),
      },
      {
        shipmentStopGid: generateGid("STOP"),
        stopSequenceNum: 2,
        stopType: "DELIVERY",
        locationGid: generateGid("LOCATION"),
        earlyDateTime: randomDate(7),
        lateDateTime: randomDate(10),
      },
    ];

    if (includeOptional) {
      shipment.Shipment.shipmentRemarks = [
        {
          remarkText: "Handle with care - fragile items",
          remarkQualifierGid: "HANDLING_INSTRUCTION",
        },
      ];
    }
  }

  return shipment;
}

export function generateOrderSample(options: SampleOptions = {}): object {
  const {
    includeOptional = true,
    includeArrays = true,
    arrayLength = 2,
  } = options;

  const order: any = {
    Order: {
      orderGid: generateGid("ORDER"),
      orderXid: generateXid("ORD"),
      orderReleaseGid: generateGid("RELEASE"),
      totalCost: {
        costAmount: randomNumber(1000, 10000),
        currencyCode: randomChoice(SAMPLE_DATA.currencies),
      },
      totalWeight: {
        weightValue: randomNumber(500, 15000),
        weightUom: randomChoice(SAMPLE_DATA.weightUoms),
      },
      totalVolume: {
        volumeValue: randomNumber(50, 1000),
        volumeUom: randomChoice(SAMPLE_DATA.volumeUoms),
      },
      sourceLocationGid: generateGid("LOCATION"),
      destLocationGid: generateGid("LOCATION"),
      earlyPickupDate: randomDate(2),
      latePickupDate: randomDate(3),
      earlyDeliveryDate: randomDate(5),
      lateDeliveryDate: randomDate(7),
      transportMode: randomChoice(SAMPLE_DATA.transportModes),
      serviceLevel: "STANDARD",
    },
  };

  if (includeArrays) {
    order.Order.orderRefnums = Array.from({ length: arrayLength }, (_, i) => ({
      orderRefnumGid: generateGid("REFNUM"),
      orderRefnumQualGid: `PO_NUMBER`,
      orderRefnumValue: `PO-${randomNumber(100000, 999999)}`,
    }));

    order.Order.orderLines = Array.from({ length: arrayLength }, (_, i) => ({
      orderLineGid: generateGid("LINE"),
      lineNumber: i + 1,
      itemGid: generateGid("ITEM"),
      orderedQuantity: randomNumber(1, 100),
      quantityUom: "EA",
      packagedItemGid: generateGid("PKG"),
    }));
  }

  return order;
}

export function generateLocationSample(options: SampleOptions = {}): object {
  const city = randomChoice(SAMPLE_DATA.cities);
  const state = randomChoice(SAMPLE_DATA.states);

  return {
    Location: {
      locationGid: generateGid("LOCATION"),
      locationXid: generateXid("LOC"),
      locationName: `${city} ${randomChoice(SAMPLE_DATA.locationTypes)}`,
      locationType: randomChoice(SAMPLE_DATA.locationTypes),
      addressLines: {
        addressLine1: `${randomNumber(100, 9999)} ${randomChoice(SAMPLE_DATA.streets)}`,
        addressLine2: `Suite ${randomNumber(100, 999)}`,
        city: city,
        stateProvince: state,
        postalCode: `${randomNumber(10000, 99999)}`,
        countryCode3Gid: randomChoice(SAMPLE_DATA.countries),
      },
      timeZone: "America/New_York",
      geoCoordinates: {
        latitude: randomNumber(-90, 90) + Math.random(),
        longitude: randomNumber(-180, 180) + Math.random(),
      },
      contactInfo: {
        contactName: "John Doe",
        phoneNumber: `${randomNumber(100, 999)}-${randomNumber(100, 999)}-${randomNumber(1000, 9999)}`,
        emailAddress: "contact@example.com",
      },
      operatingHours: {
        openTime: "08:00",
        closeTime: "17:00",
        operatingDays: "MON-FRI",
      },
    },
  };
}

export function generateItemSample(options: SampleOptions = {}): object {
  return {
    Item: {
      itemGid: generateGid("ITEM"),
      itemXid: generateXid("ITM"),
      itemDescription: "Sample Product Item",
      commodityGid: generateGid("COMMODITY"),
      packageType: "PALLET",
      unitWeight: {
        weightValue: randomNumber(1, 100),
        weightUom: randomChoice(SAMPLE_DATA.weightUoms),
      },
      unitVolume: {
        volumeValue: randomNumber(1, 50),
        volumeUom: randomChoice(SAMPLE_DATA.volumeUoms),
      },
      hazmatInfo: {
        isHazmat: false,
      },
    },
  };
}

export function generateEquipmentSample(options: SampleOptions = {}): object {
  return {
    Equipment: {
      equipmentGid: generateGid("EQUIPMENT"),
      equipmentXid: generateXid("EQP"),
      equipmentType: "TRUCK",
      equipmentGroupGid: generateGid("GROUP"),
      capacity: {
        weightCapacity: randomNumber(10000, 50000),
        weightUom: "LB",
        volumeCapacity: randomNumber(1000, 5000),
        volumeUom: "CF",
      },
      activeStatus: "ACTIVE",
    },
  };
}

export function generateRateSample(options: SampleOptions = {}): object {
  return {
    Rate: {
      rateGid: generateGid("RATE"),
      rateOfferingGid: generateGid("OFFERING"),
      serviceProviderGid: generateGid("CARRIER"),
      totalCost: {
        costAmount: randomNumber(200, 2000),
        currencyCode: randomChoice(SAMPLE_DATA.currencies),
      },
      transitTime: randomNumber(1, 7),
      transitTimeUom: "DAY",
      rateComponents: [
        {
          componentType: "BASE_RATE",
          costAmount: randomNumber(150, 1500),
          currencyCode: "USD",
        },
        {
          componentType: "FUEL_SURCHARGE",
          costAmount: randomNumber(50, 500),
          currencyCode: "USD",
        },
      ],
    },
  };
}

export function generateInvoiceSample(options: SampleOptions = {}): object {
  return {
    Invoice: {
      invoiceGid: generateGid("INVOICE"),
      invoiceXid: generateXid("INV"),
      invoiceNumber: `INV-${randomNumber(100000, 999999)}`,
      invoiceDate: randomDate(0),
      dueDate: randomDate(30),
      totalAmount: {
        amount: randomNumber(1000, 10000),
        currencyCode: randomChoice(SAMPLE_DATA.currencies),
      },
      invoiceStatus: "PENDING",
      shipmentGid: generateGid("SHIPMENT"),
      serviceProviderGid: generateGid("CARRIER"),
    },
  };
}

export function generateAgentSample(options: SampleOptions = {}): object {
  return {
    Agent: {
      agentGid: generateGid("AGENT"),
      agentXid: generateXid("AGT"),
      agentName: "Automation Agent Example",
      agentType: "WORKFLOW",
      triggerConditions: [
        {
          conditionType: "ORDER_STATUS",
          conditionValue: "PENDING",
        },
      ],
      actions: [
        {
          actionType: "SEND_NOTIFICATION",
          actionConfig: {
            recipient: "manager@example.com",
            template: "ORDER_NOTIFICATION",
          },
        },
        {
          actionType: "UPDATE_STATUS",
          actionConfig: {
            newStatus: "PROCESSING",
          },
        },
      ],
      isActive: true,
    },
  };
}

// Map of available sample generators
export const SAMPLE_GENERATORS: Record<string, (options?: SampleOptions) => object> = {
  Shipment: generateShipmentSample,
  Order: generateOrderSample,
  Location: generateLocationSample,
  Item: generateItemSample,
  Equipment: generateEquipmentSample,
  Rate: generateRateSample,
  Invoice: generateInvoiceSample,
  Agent: generateAgentSample,
};

// Convert JSON to XML
export function jsonToXml(json: object, rootName: string = "root"): string {
  const options = {
    compact: true,
    ignoreComment: true,
    spaces: 2,
  };

  return xmljs.json2xml(JSON.stringify(json), options);
}

// Get list of available object types
export function getAvailableObjectTypes(): string[] {
  return Object.keys(SAMPLE_GENERATORS);
}
