# SQL Builder Improvements

_Analysis completed: 2026-05-11_

## Current State

The SQL Builder has a working foundation with:
- Base table selection
- FK-based join suggestions from augmented data dictionary
- Field selection from base and joined tables
- Template-based query generation (SELECT, COUNT, GID, DATE-RANGE)
- Manual join condition editing

## Issues Identified

### 1. Join Condition Logic (CRITICAL)
**Location:** `src/app/database/sql-builder/page.tsx:89`

**Problem:**
```typescript
condition: `t.${rel.fieldName} = ${alias}.${rel.targetTable}_GID`,
```

Assumes target table primary key is always `<TABLE_NAME>_GID`. This pattern works for many OTM tables but is not universal.

**Impact:** Generated join conditions may reference non-existent columns, causing SQL errors.

**Fix Needed:** 
- Look up the actual primary key field from the target table's field list
- Fallback to `<TABLE>_GID` pattern if PK field can't be determined
- Consider adding explicit PK metadata to the data dictionary index

### 2. Table Alias Collisions (HIGH)
**Location:** `src/app/database/sql-builder/page.tsx:86`

**Problem:**
```typescript
const alias = rel.targetTable.toLowerCase().slice(0, 1);
```

Using only the first letter causes collisions. Example: joining CURRENCY, CONTACT, CONTAINER all get alias "c".

**Impact:** SQL syntax errors when multiple tables with same initial letter are joined.

**Fix Needed:**
- Use a counter-based alias system (j1, j2, j3) - already partially implemented in `addJoin` function (line 144)
- OR: Use first 3-4 characters + counter for readability (e.g., `curr1`, `cont1`)

### 3. No Join Ranking/Prioritization (MEDIUM)
**Location:** `src/app/database/sql-builder/page.tsx:79-99`

**Problem:** All join suggestions appear in arbitrary order with no prioritization.

**Impact:** Users must scan through all suggestions to find commonly-needed joins like LOCATION, SHIPMENT, ORDER_RELEASE.

**Fix Needed:**
- Add ranking score based on:
  - Common relationship types (GID fields, not XID/aliass)
  - Table importance (SHIPMENT, LOCATION, etc. rank higher)
  - Field name patterns (prefer SOURCE_LOCATION_GID over USER_DEFINED1_ICON_GID)
- Display highest-ranked suggestions first
- Consider grouping: "Common Joins" vs "All Available Joins"

### 4. Limited Join Context (MEDIUM)
**Location:** `src/app/database/sql-builder/page.tsx:195-204`

**Problem:** UI only shows `<TABLE_NAME> — <join_condition>` with no context about which field drives the relationship.

**Impact:** Users can't quickly understand "why" a join is being suggested or which business relationship it represents.

**Fix Needed:**
- Show the source field name prominently: "via CURRENCY_GID → CURRENCY"
- Add relationship description/context where available
- Consider icons or badges for relationship types (1:1, 1:many, etc.)

### 5. Joined Table Field Selection UX (MEDIUM)
**Location:** `src/app/database/sql-builder/page.tsx:256-282`

**Problem:** 
- Each joined table shows up to 40 fields with no search/filter
- Fields limited to 40 but no explanation shown
- All joined table fields in one long scrollable section

**Impact:** Hard to find specific fields in tables with many columns (like SHIPMENT with 150+ fields).

**Fix Needed:**
- Add per-joined-table field search
- Show field count badge (e.g., "showing 40 of 87 fields")
- Consider collapsible sections per joined table
- Add "common fields" preset (GID, XID, dates, status fields)

### 6. Join Suggestion Display Issues (LOW)
**Location:** `src/app/database/sql-builder/page.tsx:192-208`

**Problem:**
- Shows first 12 suggestions only (line 194) but dropdown has all
- Dropdown and card list are somewhat redundant
- No visual indication if a suggestion is already added

**Fix Needed:**
- Show "Already added" badge on suggestions that are in joinedTables
- Improve layout: either dropdown OR card list, not both
- If keeping both, make dropdown more compact and cards more informative

### 7. Template WHERE Clause Logic (LOW)
**Location:** `src/app/database/sql-builder/page.tsx:113-116`

**Problem:** Template-specific WHERE clauses only apply if whereText is empty, but placeholders like `<DOMAIN.XID>` and DATE '2024-01-01' are not helpful defaults.

**Impact:** Users must manually edit placeholder values instead of having them pre-filled or parameterized.

**Fix Needed:**
- Add input fields for template parameters (e.g., GID value, date range)
- Generate WHERE clause from parameter inputs
- Keep manual WHERE textarea for advanced users

## Recommended Implementation Order

### Phase 1: Fix Critical Issues (Immediate)
1. ✅ Fix join condition logic to look up actual PK fields
2. ✅ Fix table alias collision using consistent counter-based system
3. ✅ Test with INVOICE table (31 relationships) to verify rendering

### Phase 2: Improve Join UX (High Priority)
4. Add join ranking/prioritization
5. Improve join context display (show source field prominently)
6. Add "Already added" indicator to suggestions

### Phase 3: Improve Field Selection (Medium Priority)
7. Add per-joined-table field search
8. Show field count badges
9. Add collapsible joined table sections
10. Add "common fields" quick-select

### Phase 4: Polish (Lower Priority)
11. Improve template parameter inputs
12. Consolidate dropdown vs card list display
13. Add relationship type indicators
14. Add join preview (show sample data or cardinality)

## Testing Checklist

Before considering SQL Builder complete:
- [ ] Test INVOICE table (31 relationships) - joins render correctly
- [ ] Test SHIPMENT table (93 relationships) - joins render correctly
- [ ] Test ORDER_RELEASE table (83 relationships) - joins render correctly
- [ ] Add 3+ joins with same first letter - no alias conflicts
- [ ] Select fields from base + 3 joined tables - SQL is valid
- [ ] Copy SQL and run in actual OTM database - verify syntax
- [ ] Test all 4 templates (SELECT, COUNT, GID, DATE-RANGE)
- [ ] Test manual join condition editing
- [ ] Test field search within base table
- [ ] Test handoff from Table Explorer via querystring

## Notes

Per PROJECT_BRIEF.md:
> "We have much room improve in SQL builder - lets revisit it"

This document captures the revisit findings and improvement roadmap.
