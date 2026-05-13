/**
 * EDI Segment and Element Metadata
 * Based on X12 standards for 4010 and 5010
 */

export type EdiElementDef = {
  pos: number;
  name: string;
  description: string;
  dataType?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
};

export type EdiSegmentDef = {
  segment: string;
  name: string;
  description: string;
  loop?: string;
  elements: EdiElementDef[];
};

// Envelope segments - common across all transaction sets
export const ENVELOPE_SEGMENTS: Record<string, EdiSegmentDef> = {
  ISA: {
    segment: 'ISA',
    name: 'Interchange Control Header',
    description: 'Start of interchange envelope',
    loop: 'Interchange Header (ISA/IEA)',
    elements: [
      { pos: 1, name: 'Authorization Information Qualifier', description: 'Code to identify the type of information in the Authorization Information' },
      { pos: 2, name: 'Authorization Information', description: 'Information used for additional identification or authorization of the interchange sender or receiver' },
      { pos: 3, name: 'Security Information Qualifier', description: 'Code to identify the type of information in the Security Information' },
      { pos: 4, name: 'Security Information', description: 'This is used for identifying the security information about the interchange sender or receiver' },
      { pos: 5, name: 'Interchange ID Qualifier', description: 'Qualifier to designate the system/method of code structure used to designate the sender ID element' },
      { pos: 6, name: 'Interchange Sender ID', description: 'Identification code published by the sender for other parties to use' },
      { pos: 7, name: 'Interchange ID Qualifier', description: 'Qualifier to designate the system/method of code structure used to designate the receiver ID element' },
      { pos: 8, name: 'Interchange Receiver ID', description: 'Identification code published by the receiver for other parties to use' },
      { pos: 9, name: 'Interchange Date', description: 'Date of the interchange (YYMMDD)' },
      { pos: 10, name: 'Interchange Time', description: 'Time of the interchange (HHMM)' },
      { pos: 11, name: 'Interchange Control Standards Identifier', description: 'Code to identify the agency responsible for the control standard' },
      { pos: 12, name: 'Interchange Control Version Number', description: 'Version number of the interchange control segments' },
      { pos: 13, name: 'Interchange Control Number', description: 'Unique control number assigned by the interchange sender' },
      { pos: 14, name: 'Acknowledgment Requested', description: 'Code indicating sender is requesting an interchange acknowledgment' },
      { pos: 15, name: 'Usage Indicator', description: 'Code to indicate whether data is test, production or information' },
      { pos: 16, name: 'Component Element Separator', description: 'Delimiter character separating component data elements' },
    ],
  },
  GS: {
    segment: 'GS',
    name: 'Functional Group Header',
    description: 'Start of functional group',
    loop: 'Functional Group (GS/GE)',
    elements: [
      { pos: 1, name: 'Functional Identifier Code', description: 'Code identifying the functional group' },
      { pos: 2, name: 'Application Sender\'s Code', description: 'Code identifying party sending transmission' },
      { pos: 3, name: 'Application Receiver\'s Code', description: 'Code identifying party receiving transmission' },
      { pos: 4, name: 'Date', description: 'Date of functional group (CCYYMMDD)' },
      { pos: 5, name: 'Time', description: 'Time of functional group (HHMM or HHMMSS)' },
      { pos: 6, name: 'Group Control Number', description: 'Assigned number originated by the sender' },
      { pos: 7, name: 'Responsible Agency Code', description: 'Code identifying the issuer of the standard' },
      { pos: 8, name: 'Version / Release / Industry Identifier Code', description: 'Code indicating the version, release, subrelease, and industry identifier' },
    ],
  },
  ST: {
    segment: 'ST',
    name: 'Transaction Set Header',
    description: 'Start of transaction set',
    loop: 'Transaction Set (ST/SE)',
    elements: [
      { pos: 1, name: 'Transaction Set Identifier Code', description: 'Code uniquely identifying a Transaction Set (e.g., 204, 214, 990)' },
      { pos: 2, name: 'Transaction Set Control Number', description: 'Identifying control number assigned by sender' },
    ],
  },
  SE: {
    segment: 'SE',
    name: 'Transaction Set Trailer',
    description: 'End of transaction set',
    loop: 'Transaction Set (ST/SE)',
    elements: [
      { pos: 1, name: 'Number of Included Segments', description: 'Total number of segments included in a transaction set including ST and SE segments' },
      { pos: 2, name: 'Transaction Set Control Number', description: 'Identifying control number that must be unique within the functional group' },
    ],
  },
  GE: {
    segment: 'GE',
    name: 'Functional Group Trailer',
    description: 'End of functional group',
    loop: 'Functional Group (GS/GE)',
    elements: [
      { pos: 1, name: 'Number of Transaction Sets Included', description: 'Total number of transaction sets included in the functional group' },
      { pos: 2, name: 'Group Control Number', description: 'Assigned number originated by the sender; same as GS06' },
    ],
  },
  IEA: {
    segment: 'IEA',
    name: 'Interchange Control Trailer',
    description: 'End of interchange',
    loop: 'Interchange Header (ISA/IEA)',
    elements: [
      { pos: 1, name: 'Number of Included Functional Groups', description: 'Count of the number of functional groups included in the interchange' },
      { pos: 2, name: 'Interchange Control Number', description: 'Unique control number assigned by the interchange sender; same as ISA13' },
    ],
  },
};

// Transaction Set 204 - Motor Carrier Load Tender
export const TX_204_SEGMENTS: Record<string, EdiSegmentDef> = {
  B2: {
    segment: 'B2',
    name: 'Beginning Segment for Shipment Information Transaction',
    description: 'Identifies the beginning of the shipment information transaction set',
    loop: 'Heading',
    elements: [
      { pos: 1, name: 'Tariff Service Code', description: 'Code for tariff service offered' },
      { pos: 2, name: 'Standard Carrier Alpha Code', description: 'Standard Carrier Alpha Code (SCAC)' },
      { pos: 3, name: 'Standard Point Location Code', description: 'Standard Point Location Code or SPLC' },
      { pos: 4, name: 'Shipment Identification Number', description: 'Unique shipment identification number' },
      { pos: 5, name: 'Weight Unit Code', description: 'Code specifying the weight unit (e.g., L=Pounds, K=Kilograms)' },
      { pos: 6, name: 'Shipment Method of Payment', description: 'Code identifying shipment method of payment (PP=Prepaid, CC=Collect)' },
      { pos: 7, name: 'Shipment Qualifier', description: 'Code identifying the shipment qualifier' },
    ],
  },
  B2A: {
    segment: 'B2A',
    name: 'Set Purpose',
    description: 'Indicates the purpose of the transaction set',
    loop: 'Heading',
    elements: [
      { pos: 1, name: 'Transaction Set Purpose Code', description: 'Code identifying purpose of transaction set (00=Original, 05=Replace, 01=Cancellation)' },
      { pos: 2, name: 'Application Type', description: 'Code identifying application type' },
    ],
  },
  L11: {
    segment: 'L11',
    name: 'Business Instructions and Reference Number',
    description: 'Reference information and instructions applicable to shipment',
    loop: 'Heading',
    elements: [
      { pos: 1, name: 'Reference Identification', description: 'Reference information as defined for a particular transaction' },
      { pos: 2, name: 'Reference Identification Qualifier', description: 'Code qualifying the reference identification (TN=Transaction Reference Number, BM=Bill of Lading Number)' },
      { pos: 3, name: 'Description', description: 'Free-form description to clarify the reference' },
    ],
  },
  G62: {
    segment: 'G62',
    name: 'Date/Time',
    description: 'Date and/or time, or period of time',
    loop: 'Heading',
    elements: [
      { pos: 1, name: 'Date Qualifier', description: 'Code specifying type of date or time (10=Requested Ship Date, 68=Requested Delivery Date, 64=Ship Not Before)' },
      { pos: 2, name: 'Date', description: 'Date expressed as CCYYMMDD' },
      { pos: 3, name: 'Time Qualifier', description: 'Code specifying type of time (I=Appointment Time)' },
      { pos: 4, name: 'Time', description: 'Time expressed in 24-hour clock time (HHMM or HHMMSS)' },
      { pos: 5, name: 'Time Code', description: 'Code identifying the time zone (LT=Local Time, UT=Universal Time)' },
    ],
  },
  N1: {
    segment: 'N1',
    name: 'Name',
    description: 'Identifying information for a party',
    loop: 'Name (N1)',
    elements: [
      { pos: 1, name: 'Entity Identifier Code', description: 'Code identifying an organizational entity (SH=Shipper, CN=Consignee, BT=Bill-to Party)' },
      { pos: 2, name: 'Name', description: 'Free-form name' },
      { pos: 3, name: 'Identification Code Qualifier', description: 'Code designating the system/method of code structure' },
      { pos: 4, name: 'Identification Code', description: 'Code identifying a party or location' },
    ],
  },
  N2: {
    segment: 'N2',
    name: 'Additional Name Information',
    description: 'Additional name information',
    loop: 'Name (N1)',
    elements: [
      { pos: 1, name: 'Name', description: 'Free-form name' },
      { pos: 2, name: 'Name', description: 'Free-form name (continuation)' },
    ],
  },
  N3: {
    segment: 'N3',
    name: 'Address Information',
    description: 'Address information',
    loop: 'Name (N1)',
    elements: [
      { pos: 1, name: 'Address Information', description: 'Address line 1' },
      { pos: 2, name: 'Address Information', description: 'Address line 2' },
    ],
  },
  N4: {
    segment: 'N4',
    name: 'Geographic Location',
    description: 'City, state, postal code, and country',
    loop: 'Name (N1)',
    elements: [
      { pos: 1, name: 'City Name', description: 'Free-form city name' },
      { pos: 2, name: 'State or Province Code', description: 'Code for state or province' },
      { pos: 3, name: 'Postal Code', description: 'Code defining international postal zone' },
      { pos: 4, name: 'Country Code', description: 'Code identifying the country' },
    ],
  },
  G61: {
    segment: 'G61',
    name: 'Contact',
    description: 'Contact information',
    loop: 'Name (N1)',
    elements: [
      { pos: 1, name: 'Contact Function Code', description: 'Code identifying the contact function (IC=Information Contact, SH=Shipper)' },
      { pos: 2, name: 'Name', description: 'Free-form contact name' },
      { pos: 3, name: 'Communication Number Qualifier', description: 'Code identifying the type of communication number (TE=Telephone, EM=Email)' },
      { pos: 4, name: 'Communication Number', description: 'Complete communication number including country, area, and extension as needed' },
    ],
  },
  S5: {
    segment: 'S5',
    name: 'Stop Off Details',
    description: 'Stop off details for shipment',
    loop: 'Stop Off Details (S5)',
    elements: [
      { pos: 1, name: 'Stop Sequence Number', description: 'Sequential stop number' },
      { pos: 2, name: 'Stop Reason Code', description: 'Code identifying type of stop (CL=Loading Stop, CU=Unloading Stop)' },
      { pos: 3, name: 'Weight', description: 'Weight' },
      { pos: 4, name: 'Weight Unit Code', description: 'Code specifying the weight unit' },
      { pos: 5, name: 'Number of Units Shipped', description: 'Number of units shipped' },
      { pos: 6, name: 'Unit or Basis for Measurement Code', description: 'Code specifying the unit or basis of measurement' },
    ],
  },
  AT8: {
    segment: 'AT8',
    name: 'Shipment Weight, Packaging and Quantity Data',
    description: 'Weight, packaging, and quantity information for shipment',
    loop: 'Stop Off Details (S5)',
    elements: [
      { pos: 1, name: 'Weight Qualifier', description: 'Code defining the type of weight (G=Gross Weight, N=Actual Net Weight, E=Estimated Weight)' },
      { pos: 2, name: 'Weight Unit Code', description: 'Code specifying the weight unit (L=Pounds, K=Kilograms)' },
      { pos: 3, name: 'Weight', description: 'Numeric value of weight' },
      { pos: 4, name: 'Lading Quantity', description: 'Number of units (pieces) of the lading commodity' },
      { pos: 5, name: 'Lading Quantity', description: 'Number of units (alternate)' },
      { pos: 6, name: 'Volume Unit Qualifier', description: 'Code specifying the units in which volume is expressed' },
      { pos: 7, name: 'Volume', description: 'Value of volume' },
    ],
  },
  OID: {
    segment: 'OID',
    name: 'Order Identification Detail',
    description: 'Order identification and related information',
    loop: 'Order Identification Detail (OID)',
    elements: [
      { pos: 1, name: 'Reference Identification', description: 'Reference information' },
      { pos: 2, name: 'Purchase Order Number', description: 'Purchase order number' },
      { pos: 3, name: 'Reference Identification Qualifier', description: 'Code qualifying reference identification' },
      { pos: 4, name: 'Unit or Basis for Measurement Code', description: 'Code specifying the unit (PC=Piece, EA=Each)' },
      { pos: 5, name: 'Quantity', description: 'Numeric quantity' },
      { pos: 6, name: 'Weight Unit Code', description: 'Code specifying weight unit (L=Pounds, K=Kilograms, E=Each)' },
      { pos: 7, name: 'Weight', description: 'Numeric weight value' },
      { pos: 8, name: 'Volume Unit Qualifier', description: 'Code specifying volume unit (E=Each)' },
      { pos: 9, name: 'Volume', description: 'Numeric volume value' },
    ],
  },
  L5: {
    segment: 'L5',
    name: 'Description, Marks and Numbers',
    description: 'Description, marks, and numbers for lading commodity',
    loop: 'Order Identification Detail (OID)',
    elements: [
      { pos: 1, name: 'Lading Line Item Number', description: 'Sequential number identifying the lading line item' },
      { pos: 2, name: 'Lading Description', description: 'Description of lading commodity' },
      { pos: 3, name: 'Commodity Code', description: 'Code identifying commodity' },
      { pos: 4, name: 'Commodity Code Qualifier', description: 'Code qualifying commodity code' },
      { pos: 5, name: 'Packaging Code', description: 'Code identifying packaging form (N=Not Packaged, PLT=Pallet)' },
    ],
  },
  L3: {
    segment: 'L3',
    name: 'Total Weight and Charges',
    description: 'Total weight and charges for shipment',
    loop: 'Total Weight and Charges',
    elements: [
      { pos: 1, name: 'Weight', description: 'Total shipment weight' },
      { pos: 2, name: 'Weight Qualifier', description: 'Code defining type of weight (G=Gross, N=Net, E=Estimated)' },
      { pos: 3, name: 'Freight Rate', description: 'Rate per unit of weight' },
      { pos: 4, name: 'Rate/Value Qualifier', description: 'Code qualifying the rate/value' },
      { pos: 5, name: 'Charge', description: 'Total charges amount' },
      { pos: 6, name: 'Advances', description: 'Total advances amount' },
      { pos: 7, name: 'Prepaid Amount', description: 'Prepaid charges amount' },
      { pos: 8, name: 'Special Charge or Allowance Code', description: 'Code identifying special charge/allowance' },
      { pos: 9, name: 'Volume', description: 'Total volume' },
      { pos: 10, name: 'Volume Unit Qualifier', description: 'Code specifying volume unit (E=Each, X=Cubic Feet)' },
      { pos: 11, name: 'Lading Quantity', description: 'Total number of units' },
      { pos: 12, name: 'Weight Unit Code', description: 'Code specifying weight unit (L=Pounds, K=Kilograms, E=Each)' },
    ],
  },
};

// Transaction Set 214 - Shipment Status
export const TX_214_SEGMENTS: Record<string, EdiSegmentDef> = {
  B10: {
    segment: 'B10',
    name: 'Beginning Segment for Transportation Carrier Shipment Status Message',
    description: 'Identifies the beginning of the shipment status transaction',
    loop: 'Heading',
    elements: [
      { pos: 1, name: 'Reference Identification', description: 'Shipment identification number' },
      { pos: 2, name: 'Shipment Identification Number', description: 'Unique shipment identifier' },
      { pos: 3, name: 'Standard Carrier Alpha Code', description: 'SCAC of the carrier reporting status' },
      { pos: 4, name: 'Inquiry Request Number', description: 'Reference number for inquiry' },
    ],
  },
  L11: {
    segment: 'L11',
    name: 'Business Instructions and Reference Number',
    description: 'Reference information for shipment status',
    loop: 'Heading',
    elements: [
      { pos: 1, name: 'Reference Identification', description: 'Reference number' },
      { pos: 2, name: 'Reference Identification Qualifier', description: 'Code qualifying reference (BM=Bill of Lading, PRO=Progressive Number)' },
    ],
  },
  MS3: {
    segment: 'MS3',
    name: 'Interline Information',
    description: 'Carrier and routing information',
    loop: 'Heading',
    elements: [
      { pos: 1, name: 'Standard Carrier Alpha Code', description: 'SCAC of carrier' },
      { pos: 2, name: 'Routing Sequence Code', description: 'Routing sequence identifier' },
      { pos: 3, name: 'City Name', description: 'City name for routing' },
      { pos: 4, name: 'Standard Point Location Code', description: 'SPLC for location' },
    ],
  },
  AT7: {
    segment: 'AT7',
    name: 'Shipment Status Details',
    description: 'Current status of the shipment',
    loop: 'Detail - Shipment Status',
    elements: [
      { pos: 1, name: 'Shipment Status Code', description: 'Code indicating shipment status (AF=Shipment Accepted, D1=Departed, X3=Arrived at Delivery, OA=Out for Delivery)' },
      { pos: 2, name: 'Shipment Status or Appointment Reason Code', description: 'Reason for status or appointment' },
      { pos: 3, name: 'Shipment Appointment Status Code', description: 'Status of appointment' },
      { pos: 4, name: 'Shipment Status or Appointment Reason Code', description: 'Additional reason code' },
      { pos: 5, name: 'Date', description: 'Date of status event (CCYYMMDD)' },
      { pos: 6, name: 'Time', description: 'Time of status event (HHMM or HHMMSS)' },
      { pos: 7, name: 'Time Code', description: 'Time zone qualifier (LT=Local Time, UT=Universal)' },
    ],
  },
  MS1: {
    segment: 'MS1',
    name: 'Equipment, Shipment, or Real Property Location',
    description: 'Geographic location of equipment or shipment',
    loop: 'Detail - Shipment Status',
    elements: [
      { pos: 1, name: 'City Name', description: 'City where equipment/shipment is located' },
      { pos: 2, name: 'State or Province Code', description: 'State/province code' },
      { pos: 3, name: 'Country Code', description: 'Country code' },
    ],
  },
  CD3: {
    segment: 'CD3',
    name: 'Carton (Package) Detail',
    description: 'Package-level detail information',
    loop: 'Detail - Carton',
    elements: [
      { pos: 1, name: 'Weight Qualifier', description: 'Code defining weight type (G=Gross, N=Net)' },
      { pos: 2, name: 'Weight', description: 'Package weight' },
      { pos: 3, name: 'Zone', description: 'Zone identifier' },
      { pos: 4, name: 'Service Standard', description: 'Service level standard' },
      { pos: 5, name: 'Service Level Code', description: 'Code for service level' },
    ],
  },
  K1: {
    segment: 'K1',
    name: 'Remarks',
    description: 'Free-form remarks or special instructions',
    loop: 'Heading',
    elements: [
      { pos: 1, name: 'Free-Form Message', description: 'Free-form text message for remarks or instructions' },
    ],
  },
  LX: {
    segment: 'LX',
    name: 'Assigned Number',
    description: 'Reference number or sequence number',
    loop: 'Detail - Status',
    elements: [
      { pos: 1, name: 'Assigned Number', description: 'Sequential or reference number assigned to this detail' },
    ],
  },
  G62: {
    segment: 'G62',
    name: 'Date/Time',
    description: 'Date and/or time, or period of time',
    loop: 'Name (N1)',
    elements: [
      { pos: 1, name: 'Date Qualifier', description: 'Code specifying type of date (86=Ship Not Before, 17=Estimated Delivery, 10=Requested Ship Date)' },
      { pos: 2, name: 'Date', description: 'Date expressed as CCYYMMDD' },
      { pos: 3, name: 'Time Qualifier', description: 'Code specifying type of time (E=Estimated)' },
      { pos: 4, name: 'Time', description: 'Time expressed in 24-hour clock time (HHMMSS)' },
    ],
  },
};

export function getSegmentMetadata(segment: string, txSet: string): EdiSegmentDef | null {
  // Check envelope segments first
  if (ENVELOPE_SEGMENTS[segment]) {
    return ENVELOPE_SEGMENTS[segment];
  }

  // Check transaction-specific segments
  if (txSet === '204' && TX_204_SEGMENTS[segment]) {
    return TX_204_SEGMENTS[segment];
  }

  if (txSet === '214' && TX_214_SEGMENTS[segment]) {
    return TX_214_SEGMENTS[segment];
  }

  return null;
}

export function getLoopContext(segment: string, prevLoop: string = ''): string {
  const meta = ENVELOPE_SEGMENTS[segment];
  if (meta?.loop) return meta.loop;

  // For transaction segments, maintain loop context
  if (segment === 'N1') return 'Name (N1)';
  if (['N2', 'N3', 'N4', 'G61'].includes(segment)) return prevLoop.includes('Name') ? prevLoop : 'Name (N1)';
  if (segment === 'S5') return 'Stop Off Details (S5)';
  if (['AT8', 'G62'].includes(segment) && prevLoop.includes('Stop Off')) return prevLoop;
  if (segment === 'OID') return 'Order Identification Detail (OID)';
  if (segment === 'L5' && prevLoop.includes('Order')) return prevLoop;
  if (['B2', 'B2A', 'L11'].includes(segment)) return 'Heading';
  if (segment === 'L3') return 'Total Weight and Charges';

  return 'Detail';
}
