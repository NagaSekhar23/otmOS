# EDI Document Mapping Enhancement Plan

## Requirements
1. **UI Enhancement**: Show which transaction types each ingested document applies to
2. **Backend Logic**: Automatically extract/parse transaction types from ingested documents
3. **Search/Filter**: When explaining a specific EDI message, show only relevant docs for that txSet

## Current State
- Local API endpoints in `src/app/api/edi/`
- Demo store at `src/lib/demoStore.ts`
- Documents stored with: version, txSet, carrier, sourceName, notes, rawText
- EDI documents available at: `C:\Users\Jdabbara\Documents\Oracle\EDIdocs\`
  - TQYL_204.edi (sample 204 EDI file)
  - Logico-EDI-OB-204-6010.pdf
  - Burlington 204 Motor Carrier Load Tender.pdf
  - Ryder 204 Motor Carrier Load Tender.pdf
  - edi-204-load-tender.pdf

## Implementation Plan

### Phase 1: Document Ingestion with Auto-Detection
**Goal**: When ingesting a document, automatically detect transaction type(s) from filename and content

**Changes**:
1. Update `src/app/api/edi/docs/route.ts` POST endpoint:
   - Extract transaction types from filename (e.g., "204" from "Burlington 204 Motor Carrier Load Tender.pdf")
   - Parse rawText for EDI transaction identifiers (ST*204, etc.)
   - Store detected txSets as an array instead of single value
   - Add `detectedTxSets` field to document object

2. Update document schema:
```typescript
{
  id: string;
  version: string;
  txSet: string; // primary txSet from ingestion form
  txSets: string[]; // all detected transaction types
  carrier: string;
  sourceName: string;
  notes: string;
  status: string;
  chunkCount: number;
  charCount: number;
  snippetPreview: string;
  createdAt: string;
}
```

### Phase 2: Enhanced UI for Document Ingestion
**Goal**: Better UI to show transaction types when ingesting

**Changes in `src/app/edi/page.tsx`**:
1. Add file upload capability (not just raw text paste)
2. Auto-detect and display transaction types found in document
3. Show badge/chips for detected transaction types
4. Allow manual override/addition of transaction types
5. Add file name parsing helper for common patterns:
   - "204" in filename → Transaction 204
   - "214" in filename → Transaction 214
   - "Motor Carrier Load Tender" → Transaction 204
   - "Shipment Status" → Transaction 214

### Phase 3: Filtered Document Display During Explanation
**Goal**: Show only relevant docs when explaining a specific EDI message

**Changes**:
1. Update `src/app/api/edi/search/route.ts`:
   - Add txSet filter parameter
   - Filter docs to only show those with matching txSets
   - Rank docs by relevance (exact carrier match > industry-wide)

2. Update `src/app/edi/page.tsx`:
   - When explaining an EDI message, automatically search for docs matching current txSet
   - Display filtered docs prominently in a "Relevant Documentation" section
   - Show doc badges indicating: carrier-specific vs industry-wide
   - Add quick links to view full document content

3. Add document detail view:
   - Click on a doc to see full content
   - Highlight segments/codes that match current EDI explanation
   - Show which mappings came from which documents

### Phase 4: Pre-load EDI Documents
**Goal**: Load the 5 EDI 204 documents from `C:\Users\Jdabbara\Documents\Oracle\EDIdocs\`

**Implementation**:
1. Create a seed script or admin route to bulk-import documents
2. Parse each PDF to extract text (or manually extract key sections)
3. Ingest each with proper metadata:
   - Version: 4010 (based on TQYL_204.edi showing 004010)
   - TxSet: 204
   - Carrier: specific (Burlington, Ryder, etc.) or "industry"
   - Auto-detect segments and codes mentioned in the guides

### Phase 5: Mapping Auto-Generation from Documents
**Goal**: Extract segment/element mappings from ingested guide documents

**Changes**:
1. Add pattern matching in `src/app/api/edi/docs/route.ts`:
   - Look for patterns like "B2*03 = SCAC Code"
   - Extract segment definitions, element positions, code meanings
   - Auto-generate mapping entries from document content

2. Link mappings to source documents:
   - Add `sourceDocId` field to mappings
   - Show "from Burlington 204 Guide" in explanation source column

## Implementation Order

### Immediate (Today)
1. ✅ Create this plan document
2. Add file upload to Document Ingestion UI
3. Add auto-detection of txSet from filename
4. Update document schema to support multiple txSets

### Next Session
5. Implement filtered search by txSet
6. Add "Relevant Documentation" section to explanation view
7. Extract text from the 5 PDFs
8. Bulk-import the 5 EDI 204 documents

### Future Enhancement
9. Add document detail modal
10. Implement mapping auto-extraction from guides
11. Add segment highlighting in document viewer
12. Support for 214, 210, 990, etc. transaction types

## Testing Checklist
- [ ] Upload TQYL_204.edi → auto-detects txSet: 204
- [ ] Upload "Burlington 204 Motor Carrier Load Tender.pdf" → detects txSet: 204, carrier: Burlington
- [ ] Explain a 204 EDI message → shows Burlington, Ryder, and industry 204 docs
- [ ] Explain a 214 EDI message → shows NO 204 docs (filtered correctly)
- [ ] Search for "SCAC" → shows mappings and docs mentioning SCAC
- [ ] Save mapping from Burlington guide → source shows "Burlington 204 Guide"

## Files to Modify
1. `src/app/edi/page.tsx` - UI enhancements
2. `src/app/api/edi/docs/route.ts` - Auto-detection logic
3. `src/app/api/edi/search/route.ts` - Filtered search
4. `src/app/api/edi/explain/route.ts` - Show relevant docs during explanation
5. `src/lib/ediApi.ts` - Type definitions
6. `src/lib/demoStore.ts` - Updated document schema
