import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { loadStore, saveStore } from "@/lib/demoStore";
import mammoth from "mammoth";

function detectTxSetsFromFilename(filename: string): string[] {
  const detected: string[] = [];
  const name = filename.toLowerCase();

  const numberMatch = name.match(/\b(204|214|210|990|300|301|310|315|856|850|810|997)\b/g);
  if (numberMatch) {
    detected.push(...numberMatch);
  }

  if (name.includes("load tender") || name.includes("motor carrier load")) detected.push("204");
  if (name.includes("shipment status")) detected.push("214");
  if (name.includes("freight invoice")) detected.push("210");
  if (name.includes("booking")) detected.push("300");
  if (name.includes("warehouse shipping")) detected.push("940");
  if (name.includes("ship notice") || name.includes("asn")) detected.push("856");
  if (name.includes("purchase order")) detected.push("850");

  return [...new Set(detected)];
}

function detectTxSetsFromContent(content: string): string[] {
  const detected: string[] = [];

  const stMatches = content.match(/ST\*(\d{3})/gi);
  if (stMatches) {
    for (const match of stMatches) {
      const txSet = match.split('*')[1];
      if (txSet) detected.push(txSet);
    }
  }

  const docMatches = content.match(/(?:transaction\s+set\s+|set\s+)?(\d{3})(?:\s+\-|\s+motor|:\s+)/gi);
  if (docMatches) {
    for (const match of docMatches) {
      const txSet = match.match(/\d{3}/)?.[0];
      if (txSet) detected.push(txSet);
    }
  }

  return [...new Set(detected)];
}

function extractCarrierFromFilename(filename: string): string {
  const name = filename.toLowerCase();
  if (name.includes('burlington')) return 'Burlington';
  if (name.includes('ryder')) return 'Ryder';
  if (name.includes('logico')) return 'Logico';
  if (name.includes('tqyl')) return 'TQYL';
  return 'industry';
}

async function extractTextFromFile(file: File, buffer: Buffer): Promise<{ text: string; type: string }> {
  const filename = file.name.toLowerCase();

  // PDF files
  if (filename.endsWith('.pdf')) {
    try {
      // Dynamic import to avoid ESM issues
      const pdfParseModule = await import('pdf-parse');
      // @ts-ignore - pdf-parse exports are not properly typed
      const pdfParse = pdfParseModule.default || pdfParseModule;
      const data = await pdfParse(buffer);
      return { text: data.text || '', type: 'PDF' };
    } catch (error) {
      console.error('PDF parsing error:', error);
      throw new Error('Failed to parse PDF file');
    }
  }

  // Word documents (.docx)
  if (filename.endsWith('.docx')) {
    try {
      const result = await mammoth.extractRawText({ buffer });
      return { text: result.value || '', type: 'Word (DOCX)' };
    } catch (error) {
      console.error('DOCX parsing error:', error);
      throw new Error('Failed to parse Word document');
    }
  }

  // Legacy Word documents (.doc) - limited support
  if (filename.endsWith('.doc')) {
    return {
      text: buffer.toString('utf8').replace(/[^\x20-\x7E\n\r]/g, ' '),
      type: 'Word (DOC - legacy)'
    };
  }

  // Text/EDI files (.txt, .edi, .x12)
  if (filename.endsWith('.txt') || filename.endsWith('.edi') || filename.endsWith('.x12')) {
    return { text: buffer.toString('utf8'), type: 'EDI/Text' };
  }

  // Unknown file type - try as text
  return { text: buffer.toString('utf8'), type: 'Unknown (treated as text)' };
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const version = (formData.get('version') as string) || '4010';
    const txSet = (formData.get('txSet') as string) || '';
    const carrier = (formData.get('carrier') as string) || '';
    const notes = (formData.get('notes') as string) || '';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Convert File to Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Extract text based on file type
    const { text: rawText, type: fileType } = await extractTextFromFile(file, buffer);

    if (!rawText || rawText.trim().length === 0) {
      return NextResponse.json({
        error: 'No text could be extracted from the file'
      }, { status: 400 });
    }

    // Auto-detect transaction sets
    const filenameTxSets = detectTxSetsFromFilename(file.name);
    const contentTxSets = detectTxSetsFromContent(rawText);
    const detectedTxSets = [...new Set([...filenameTxSets, ...contentTxSets])];

    const primaryTxSet = txSet || detectedTxSets[0] || '204';
    const allTxSets = detectedTxSets.length > 0 ? detectedTxSets : [primaryTxSet];
    const detectedCarrier = extractCarrierFromFilename(file.name);

    // Save to store
    const store = await loadStore();
    const doc = {
      id: randomUUID(),
      version,
      txSet: primaryTxSet,
      txSets: allTxSets,
      carrier: carrier || detectedCarrier,
      sourceName: file.name,
      notes: notes || `Uploaded ${fileType} file`,
      status: 'processed',
      chunkCount: Math.max(1, Math.ceil(rawText.length / 1200)),
      charCount: rawText.length,
      snippetPreview: rawText.slice(0, 240).trim(),
      createdAt: new Date().toISOString(),
      detectedTxSets: detectedTxSets.join(', '),
    };

    store.edi.docs.unshift(doc);
    await saveStore(store);

    return NextResponse.json({
      success: true,
      doc,
      detectedTxSets,
      fileType,
      textLength: rawText.length,
      message: `${fileType} file uploaded and processed successfully`
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Upload failed'
    }, { status: 500 });
  }
}
