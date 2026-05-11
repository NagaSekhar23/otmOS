# otmOS

otmOS is a web-based operations toolbox for Oracle Transportation Management (OTM) teams.

It is designed to bring together the workflows that typically live across spreadsheets, static documentation, test harnesses, and one-off scripts into a single product for integration work, validation, troubleshooting, and QA.

## What otmOS includes
- **Integration Tools** — validate and repair OTM XML, generate XPath/JSONPath, and inspect payload structure
- **Database Tools** — explore the OTM data dictionary, inspect schema metadata, and build SQL with relationship guidance
- **OTM QA** — manage test discovery, cycles, and run history through a backend-driven QA runner
- **Order & EDI workflows** — foundation for order generation/posting and EDI explanation/enrichment

## Current state
otmOS is being built as a **Next.js frontend** with supporting backend services for execution-heavy and secret-sensitive workflows.

Implemented today:
- shared application shell and navigation
- XML Validator with XSD validation and OTM-specific business-rule checks
- XML repair flow for common corrections
- XPath Generator, JSON Validator, and JSONPath Generator
- OTM data dictionary explorer and table explorer
- SQL Builder foundation with relationship-aware join suggestions
- QA management UI structure for tests, cycles, runs, and settings

## Product direction
otmOS is intended to become a practical day-to-day workspace for OTM analysts, QA teams, and integration engineers.

Guiding principles:
- **deployable** in a modern web architecture
- **secure** through server-side handling of secrets and execution
- **useful** for real operational workflows, not just demos
- **extensible** as additional services and tools come online

## Roadmap
### Near term
1. **SQL Builder improvements**
   - improve join suggestion quality and ranking
   - make multi-table query building more intuitive
   - better expose FK and relationship context in the UI

2. **Database Tools expansion**
   - deepen relationship browsing
   - improve subject-area grouping
   - speed up schema exploration for analysts

3. **XML Validator refinement**
   - expand OTM semantic rule coverage
   - improve repair suggestions and result clarity

### Next phases
1. **QA Runner backend integration**
   - complete backend contract usage for tests, cycles, and runs
   - surface logs, artifacts, and execution status more clearly

2. **EDI service integration**
   - explain and enrich EDI payloads
   - support mappings, document ingestion, and searchable knowledge

3. **Order service integration**
   - generate order payloads
   - validate imports
   - post to non-production OTM environments through managed APIs

## Architecture
- **Frontend:** Next.js
- **Backend services:** remote APIs/workers for QA execution, EDI processing, and order workflows
- **Deployment direction:** Vercel-friendly frontend with service-based execution

## Run locally
```bash
npm install
npm run dev
```

## Status
otmOS is in active development. The frontend is already useful for integration and data exploration workflows, with broader service-backed capabilities continuing to evolve.
