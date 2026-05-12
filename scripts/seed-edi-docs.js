/**
 * Seed EDI Documents
 *
 * This script loads EDI implementation guides from the EDIdocs folder
 * and ingests them into the demo store.
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '.data');
const STORE_PATH = path.join(DATA_DIR, 'otmos-demo-store.json');
const EDI_DOCS_PATH = 'C:\\Users\\Jdabbara\\Documents\\Oracle\\EDIdocs';

function loadStore() {
  try {
    const raw = fs.readFileSync(STORE_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {
      qa: {
        config: { baseUrl: '', username: '', browser: 'chrome' },
        tests: [],
        runs: [],
        cycles: [],
      },
      edi: {
        mappings: [],
        docs: [],
      },
      orders: {
        results: [],
      },
    };
  }
}

function saveStore(store) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
}

function detectTxSetsFromFilename(filename) {
  const detected = [];
  const name = filename.toLowerCase();

  // Direct number patterns
  const numberMatches = name.match(/\b(204|214|210|990|300|301|310|315|856|850|810|997)\b/g);
  if (numberMatches) {
    detected.push(...numberMatches);
  }

  // Descriptive names
  if (name.includes('load tender') || name.includes('motor carrier load')) detected.push('204');
  if (name.includes('shipment status')) detected.push('214');
  if (name.includes('freight invoice')) detected.push('210');

  return [...new Set(detected)];
}

function detectTxSetsFromContent(content) {
  const detected = [];

  // Look for ST*XXX segments
  const stMatches = content.match(/ST\*(\d{3})/gi);
  if (stMatches) {
    for (const match of stMatches) {
      const txSet = match.split('*')[1];
      if (txSet) detected.push(txSet);
    }
  }

  return [...new Set(detected)];
}

function extractCarrierFromFilename(filename) {
  const name = filename.toLowerCase();
  if (name.includes('burlington')) return 'Burlington';
  if (name.includes('ryder')) return 'Ryder';
  if (name.includes('logico')) return 'Logico';
  if (name.includes('tqyl')) return 'TQYL';
  return 'industry';
}

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

async function seedEdiDocs() {
  console.log('🌱 Seeding EDI Documents...\n');

  if (!fs.existsSync(EDI_DOCS_PATH)) {
    console.error(`❌ EDI docs path not found: ${EDI_DOCS_PATH}`);
    return;
  }

  const store = loadStore();
  const files = fs.readdirSync(EDI_DOCS_PATH);
  let ingestedCount = 0;

  for (const file of files) {
    const filePath = path.join(EDI_DOCS_PATH, file);
    const stats = fs.statSync(filePath);

    if (!stats.isFile()) continue;

    // Skip PDFs for now (would need PDF parsing)
    if (file.toLowerCase().endsWith('.pdf')) {
      console.log(`⏭️  Skipping PDF: ${file} (manual text extraction needed)`);
      continue;
    }

    const rawText = fs.readFileSync(filePath, 'utf-8');
    const filenameTxSets = detectTxSetsFromFilename(file);
    const contentTxSets = detectTxSetsFromContent(rawText);
    const detectedTxSets = [...new Set([...filenameTxSets, ...contentTxSets])];
    const primaryTxSet = detectedTxSets[0] || '204';
    const carrier = extractCarrierFromFilename(file);

    const doc = {
      id: generateId(),
      version: '4010',
      txSet: primaryTxSet,
      txSets: detectedTxSets.length > 0 ? detectedTxSets : [primaryTxSet],
      carrier,
      sourceName: file,
      notes: `Auto-imported from ${EDI_DOCS_PATH}`,
      status: 'processed',
      chunkCount: Math.max(1, Math.ceil(rawText.length / 1200)),
      charCount: rawText.length,
      snippetPreview: rawText.slice(0, 240),
      createdAt: new Date().toISOString(),
      detectedTxSets: detectedTxSets.join(', '),
    };

    // Check if already exists
    const exists = store.edi.docs.some(d => d.sourceName === file);
    if (exists) {
      console.log(`⏭️  Already exists: ${file}`);
      continue;
    }

    store.edi.docs.unshift(doc);
    ingestedCount++;

    console.log(`✅ Ingested: ${file}`);
    console.log(`   Carrier: ${carrier}`);
    console.log(`   Detected TxSets: ${detectedTxSets.join(', ') || 'none'}`);
    console.log(`   Size: ${rawText.length.toLocaleString()} chars\n`);
  }

  saveStore(store);
  console.log(`\n✨ Complete! Ingested ${ingestedCount} new documents.`);
  console.log(`📊 Total documents in store: ${store.edi.docs.length}`);
}

seedEdiDocs().catch(console.error);
