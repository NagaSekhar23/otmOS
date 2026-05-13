/**
 * Upload 214 EDI Documents to Production
 */

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');

const PRODUCTION_URL = 'https://otmos-web-mocha.vercel.app';
const EDI_DOCS_PATH = 'C:\\Users\\Jdabbara\\Documents\\Oracle\\EDIdocs\\214';

async function uploadFile(filePath, fileName) {
  console.log(`\n📤 Uploading: ${fileName}...`);

  const formData = new FormData();
  formData.append('file', fs.createReadStream(filePath));
  formData.append('version', '4010');
  formData.append('txSet', '214');
  formData.append('carrier', 'industry');
  formData.append('notes', 'Uploaded 214 Shipment Status implementation guide');

  try {
    const response = await fetch(`${PRODUCTION_URL}/api/edi/upload`, {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Upload failed: ${error}`);
    }

    const result = await response.json();
    console.log(`✅ Success: ${fileName}`);
    console.log(`   File Type: ${result.fileType}`);
    console.log(`   Text Length: ${result.textLength?.toLocaleString()} chars`);
    console.log(`   Detected TxSets: ${result.detectedTxSets?.join(', ') || 'none'}`);
    return result;
  } catch (error) {
    console.error(`❌ Failed: ${fileName}`);
    console.error(`   Error: ${error.message}`);
    throw error;
  }
}

async function upload214Docs() {
  console.log('🚀 Uploading 214 EDI Documents to Production...\n');
  console.log(`📁 Source: ${EDI_DOCS_PATH}`);
  console.log(`🌐 Target: ${PRODUCTION_URL}\n`);

  if (!fs.existsSync(EDI_DOCS_PATH)) {
    console.error(`❌ Path not found: ${EDI_DOCS_PATH}`);
    return;
  }

  const files = fs.readdirSync(EDI_DOCS_PATH);
  let successCount = 0;
  let failCount = 0;

  for (const file of files) {
    const filePath = path.join(EDI_DOCS_PATH, file);
    const stats = fs.statSync(filePath);

    if (!stats.isFile()) continue;

    try {
      await uploadFile(filePath, file);
      successCount++;
    } catch (error) {
      failCount++;
    }
  }

  console.log(`\n✨ Upload Complete!`);
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log(`\n🔗 View at: ${PRODUCTION_URL}/edi`);
}

upload214Docs().catch(console.error);
