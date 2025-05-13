import { createWorker, Worker } from 'tesseract.js';

let worker: Worker | null = null;
let workerLoading = false;

const initializeWorker = async () => {
  if (worker) {
    return worker;
  }
  if (workerLoading) {
    // Wait for the worker to be initialized by another call
    return new Promise<Worker>((resolve, reject) => {
      const interval = setInterval(() => {
        if (worker) {
          clearInterval(interval);
          resolve(worker);
        } else if (!workerLoading) { // Worker failed to load
          clearInterval(interval);
          reject(new Error("Tesseract worker initialization failed."));
        }
      }, 100);
    });
  }

  workerLoading = true;
  try {
    // Pass language directly to createWorker, and logger if needed
    const newWorker = await createWorker('eng', undefined, {
      logger: m => console.log(m), // Optional: for logging progress
      // cacheMethod: 'none', // Can be useful for development to ensure fresh downloads
    });
    // No need for separate loadLanguage and initialize if language is passed to createWorker
    // If you need more languages:
    // await newWorker.loadLanguage('eng+fra'); // Example for English and French
    // await newWorker.initialize('eng+fra');
    worker = newWorker;
    workerLoading = false;
    return worker;
  } catch (error) {
    console.error("Failed to initialize Tesseract worker:", error);
    workerLoading = false;
    throw error;
  }
};

export const extractTextFromImage = async (file: File): Promise<string> => {
  // TODO: Implement PDF OCR support. Client-side Tesseract.js does not directly support PDFs.
  // Options:
  // 1. Server-side OCR for PDFs (e.g., Supabase Edge Function with Tesseract or cloud OCR).
  // 2. Client-side PDF to Image conversion (e.g., using pdf.js) then feed images to Tesseract.js.
  // For now, this function will only process images and throw an error for PDFs.
  if (file.type === 'application/pdf') {
    console.warn("Attempted OCR on PDF file. Client-side Tesseract.js does not support PDF directly.");
    // For the purpose of this task, we will simulate an error or a message.
    // In a real scenario, this would either call a PDF processing function or clearly guide the user.
    throw new Error("PDF processing via client-side OCR is not supported. Please use an image file (PNG, JPG) or implement server-side PDF OCR.");
  }

  const currentWorker = await initializeWorker();
  if (!currentWorker) {
    throw new Error("Tesseract worker not available.");
  }

  try {
    const { data: { text } } = await currentWorker.recognize(file);
    return text;
  } catch (error) {
    console.error("Error during OCR processing:", error);
    // Attempt to reinitialize worker on error, as it might have become corrupted
    const oldWorker = worker;
    worker = null; // Reset worker
    workerLoading = false; // Reset loading flag
    if (oldWorker) {
        try {
            await oldWorker.terminate();
        } catch (termError) {
            console.error("Error terminating worker:", termError);
        }
    }
    throw new Error("Failed to extract text using OCR.");
  }
};

// Optional: Function to terminate the worker when no longer needed (e.g., on component unmount or app exit)
export const terminateOcrWorker = async () => {
  if (worker) {
    const currentWorker = worker; // Capture current worker in case it's reassigned
    worker = null; // Set to null before async operation
    workerLoading = false;
    try {
        await currentWorker.terminate();
        console.log("Tesseract worker terminated.");
    } catch (error) {
        console.error("Error terminating Tesseract worker:", error);
    }
  }
};


// --- Urgent Purchase Slip Parsing Logic ---
import { UrgentPurchaseSlipData, ParsedSlipItem } from '@/features/purchases/types'; // Assuming types are here
import { performFuzzySearch, SearchableItem } from '@/lib/fuzzySearch'; // Assuming fuzzySearch is here

// Helper to attempt to parse a date string into YYYY-MM-DD format
const formatDateString = (dateStr: string): string | null => {
  try {
    // Attempt to handle various common formats. This is basic, a robust library might be better.
    // Normalize separators
    const normalizedDateStr = dateStr.replace(/[.\/\s]/g, '-');

    // DD-MM-YYYY or D-M-YYYY
    let match = normalizedDateStr.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (match) {
      const day = match[1].padStart(2, '0');
      const month = match[2].padStart(2, '0');
      return `${match[3]}-${month}-${day}`;
    }

    // YYYY-MM-DD or YYYY-M-D
    match = normalizedDateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (match) {
      const month = match[2].padStart(2, '0');
      const day = match[3].padStart(2, '0');
      return `${match[1]}-${month}-${day}`;
    }
    
    // MM-YY (assuming current century, first day of month) -> YYYY-MM-01
    match = normalizedDateStr.match(/^(\d{1,2})-(\d{2})$/);
    if (match) {
        const currentYear = new Date().getFullYear();
        const century = Math.floor(currentYear / 100) * 100;
        const year = century + parseInt(match[2], 10);
        const month = match[1].padStart(2, '0');
        return `${year}-${month}-01`;
    }

    // DD-MM-YY (assuming current century) -> YYYY-MM-DD
    match = normalizedDateStr.match(/^(\d{1,2})-(\d{1,2})-(\d{2})$/);
    if (match) {
        const currentYear = new Date().getFullYear();
        const century = Math.floor(currentYear / 100) * 100;
        const year = century + parseInt(match[3], 10);
        const month = match[2].padStart(2, '0');
        const day = match[1].padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    
    // Add more formats as needed, e.g., "Jan 01, 2024"
    const parsedDate = new Date(dateStr);
    if (!isNaN(parsedDate.getTime())) {
        return parsedDate.toISOString().split('T')[0];
    }

    console.warn(`Could not parse date string: ${dateStr}`);
    return null;
  } catch (e) {
    console.warn(`Error parsing date string '${dateStr}':`, e);
    return null;
  }
};


export const parseUrgentSlipText = (text: string): Omit<UrgentPurchaseSlipData, 'overall_confidence' | 'items'> & { items: Omit<ParsedSlipItem, 'matched_item_id' | 'matched_item_name' | 'confidence'>[] } => {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 5); // Filter out very short/empty lines
  const parsedItems: Omit<ParsedSlipItem, 'matched_item_id' | 'matched_item_name' | 'confidence'>[] = [];
  let invoiceDeliveryDate: string | null = null;

  // Regex for item lines: (description) (quantity) [optional batch] [optional expiry]
  // This is highly heuristic and will need refinement.
  // Group 1: Item description (non-greedy)
  // Group 2: Quantity (digits)
  // Group 3 (optional): Batch info
  // Group 4 (optional): Expiry info
  const itemPattern = /^(.*?)\s+(\d+)(?:\s+(?:batch|lot|b\.no|b:|l:)\s*([a-z0-9\-/]+))?(?:\s+(?:exp|expiry|use by|e:)\s*([\d\w\s.,/-]+))?/i;
  
  // Regex for general date extraction (invoice/delivery date)
  const generalDatePatterns = [
    /\b(?:date|invoice date|delivery date)[:\s]*(\d{1,2}[-/.\s]\d{1,2}[-/.\s]\d{2,4})\b/i,
    /\b(\d{1,2}[-/.\s]\d{1,2}[-/.\s]\d{2,4})\b/, // More generic date pattern if specific keywords are not found
    /\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[.\s,]*\d{1,2}[,\s]*\d{2,4})\b/i,
  ];

  // Regex for batch numbers
  const batchPattern = /(?:batch|lot|b\.no|b:|l:)\s*([a-z0-9\-/]+)/i;
  // Regex for expiry dates
  const expiryPattern = /(?:exp|expiry|use by|e:)\s*([\d\w\s.,/-]+)/i; // Flexible, will need post-processing

  // First pass: try to find a general invoice/delivery date
  for (const line of lines) {
    for (const pattern of generalDatePatterns) {
      const match = line.match(pattern);
      if (match && match[1]) {
        const formatted = formatDateString(match[1]);
        if (formatted) {
            invoiceDeliveryDate = formatted;
            break;
        }
      }
    }
    if (invoiceDeliveryDate) break;
  }


  lines.forEach(line => {
    // Try to parse as an item line
    // A more robust approach would identify columns or use NLP.
    // This is a simplified line-by-line attempt.

    // Attempt to extract quantity first, as it's often a clear indicator
    // Look for a number that could be quantity, usually not part of a date or complex code.
    // Regex: (description part) (a number as quantity) (rest of the line)
    // Group 1: Description (non-greedy)
    // Group 2: Quantity (one or more digits, not preceded by / or - or . directly, to avoid dates/decimals)
    // Group 3: Remainder of the line (for batch/expiry)
    const qtyItemPattern = /^(.*?)\s+((?<![\d/.-])\d+(?![\d/.-]))\s*(.*)$/i;
    const itemMatch = line.match(qtyItemPattern);

    if (itemMatch) {
      let slip_text = itemMatch[1].trim();
      const quantityStr = itemMatch[2];
      const remainder = itemMatch[3]?.trim() || "";

      const quantity = parseInt(quantityStr, 10);

      if (!isNaN(quantity) && quantity > 0 && slip_text.length > 2) {
        // Clean up slip_text: remove common prefixes/suffixes if they were part of batch/expiry parsing
        slip_text = slip_text.replace(/(?:batch|lot|b\.no|b:|l:|exp|expiry|use by|e:)\s*$/i, "").trim();


        let batch_number: string | undefined = undefined;
        let expiry_date: string | undefined = undefined;

        const batchMatch = remainder.match(batchPattern);
        if (batchMatch && batchMatch[1]) {
          batch_number = batchMatch[1].trim();
          // Remove batch part from remainder to help expiry parsing
          // remainder = remainder.replace(batchMatch[0], "").trim(); 
        }

        const expiryMatch = remainder.match(expiryPattern);
        if (expiryMatch && expiryMatch[1]) {
          const formatted = formatDateString(expiryMatch[1].trim());
          if(formatted) expiry_date = formatted;
        }
        
        // If batch/expiry were not found in remainder, try to find them in the original slip_text part
        // This can happen if the quantity was at the end of the line.
        if (!batch_number) {
            const batchInSlipText = slip_text.match(batchPattern);
            if (batchInSlipText && batchInSlipText[1]) {
                batch_number = batchInSlipText[1].trim();
                slip_text = slip_text.replace(batchInSlipText[0], "").trim();
            }
        }
        if (!expiry_date) {
            const expiryInSlipText = slip_text.match(expiryPattern);
            if (expiryInSlipText && expiryInSlipText[1]) {
                 const formatted = formatDateString(expiryInSlipText[1].trim());
                 if(formatted) expiry_date = formatted;
                 slip_text = slip_text.replace(expiryInSlipText[0], "").trim();
            }
        }


        // Basic filtering: avoid lines that are mostly numbers or too short after extraction
        if (slip_text.length > 2 && !/^\d+$/.test(slip_text)) {
          parsedItems.push({
            slip_text,
            quantity,
            batch_number: batch_number || undefined, // Ensure it's undefined if null/empty
            expiry_date: expiry_date || undefined,
          });
        }
      }
    }
  });

  return {
    invoice_delivery_date: invoiceDeliveryDate,
    items: parsedItems,
    raw_text: text,
  };
};


export interface InventoryItemForSearch extends SearchableItem {
  // Add any specific fields from your inventory items if needed
  // For example: item_code, category, etc.
  // This should align with what your `performFuzzySearch` expects
  // and what your Supabase query for inventory returns.
  name: string; // Ensure 'name' is present as it's used in fuseOptions
  id: string; // Ensure 'id' is present
}


export const processUrgentSlipFile = async (
  file: File,
  inventoryItems: InventoryItemForSearch[] // Pass the current inventory list
): Promise<UrgentPurchaseSlipData> => {
  const rawText = await extractTextFromImage(file);
  const parsedSlipBase = parseUrgentSlipText(rawText);

  let overallConfidenceSum = 0;
  let matchedItemsCount = 0;

  const finalItems: ParsedSlipItem[] = parsedSlipBase.items.map(item => {
    const { bestMatch, bestMatchScore, allMatches } = performFuzzySearch(item.slip_text, inventoryItems);
    
    let confidence: number | undefined = undefined;

    if (bestMatch && typeof bestMatchScore === 'number') {
      confidence = 1 - bestMatchScore; // Confidence: 1 (perfect) to 0 (no match)
      // Ensure confidence is not negative if score somehow exceeds 1, though Fuse.js scores are 0-1.
      confidence = Math.max(0, Math.min(1, confidence)); 
      overallConfidenceSum += confidence;
      matchedItemsCount++;
    } else if (bestMatch) {
      // Match found but no score (should not happen with includeScore: true, but as a fallback)
      confidence = 0.75; // Assign a default moderate-high confidence
      overallConfidenceSum += confidence;
      matchedItemsCount++;
    } else {
      confidence = 0.1; // Very low confidence if no match at all
    }

    return {
      ...item,
      matched_item_id: bestMatch?.id || null,
      matched_item_name: bestMatch?.name || null,
      confidence: confidence,
    };
  });

  const overall_confidence = matchedItemsCount > 0 ? overallConfidenceSum / matchedItemsCount : 0;

  return {
    ...parsedSlipBase,
    items: finalItems,
    overall_confidence,
  };
};


// --- Old parsing logic (for reference or removal) ---
// The `ParsedInvoiceData` and `parseExtractedText` can be removed if
// `parseUrgentSlipText` and `processUrgentSlipFile` cover all needs.
// For now, keeping it commented out or at the bottom.


export interface ParsedInvoiceData {
    items: { name: string; quantity: number; price: number }[];
    supplier?: string;
    date?: string;
    totalAmount?: number;
}

export const parseExtractedText = (text: string): ParsedInvoiceData => {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line !== '');
    const parsedData: ParsedInvoiceData = { items: [] };

    // Improved regex patterns
    const datePatterns = [
        /\b(\d{1,2}[-/.\s]\d{1,2}[-/.\s]\d{2,4})\b/, // DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
        /\b(\d{4}[-/.\s]\d{1,2}[-/.\s]\d{1,2})\b/, // YYYY/MM/DD
        /\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[.\s,]*\d{1,2}[,\s]*\d{2,4})\b/i, // Jan 01, 2024 or January 1, 2024
    ];
    const supplierKeywords = ['supplier', 'vendor', 'from:', 'invoice from', 'sold by'];
    const totalKeywords = ['total', 'grand total', 'amount due', 'total amount', 'balance due'];
    // Item pattern: (description) (qty) (price) - trying to be more flexible
    const itemPattern = /^(.*?)\s+([\d,]+)\s+([\d,]*\.?\d+)$/;


    // Attempt to find supplier
    for (const line of lines) {
        for (const keyword of supplierKeywords) {
            if (line.toLowerCase().includes(keyword)) {
                let potentialSupplier = line.toLowerCase().split(keyword)[1]?.trim();
                if (potentialSupplier?.startsWith(':')) potentialSupplier = potentialSupplier.substring(1).trim();
                if (potentialSupplier && potentialSupplier.length > 2) { // Basic check
                    parsedData.supplier = potentialSupplier.split(',')[0].trim(); // Take first part if comma separated
                    break;
                }
            }
        }
        if (parsedData.supplier) break;
    }
     // If no specific keyword match, take the first non-empty line as a possible supplier (very heuristic)
    if (!parsedData.supplier && lines.length > 0) {
        const firstLine = lines[0];
        if (!datePatterns.some(p => p.test(firstLine)) && !firstLine.toLowerCase().includes("invoice")) {
            if (/\b(ltd|inc|llc|co)\b/i.test(firstLine) || /^[a-zA-Z\s&]+$/.test(firstLine.split(',')[0].trim())) {
                 parsedData.supplier = firstLine.split(',')[0].trim();
            }
        }
    }


    // Attempt to find date
    for (const line of lines) {
        for (const pattern of datePatterns) {
            const match = line.match(pattern);
            if (match && match[1]) {
                parsedData.date = match[1];
                break;
            }
        }
        if (parsedData.date) break;
    }

    // Attempt to find total amount
    let potentialTotals: { value: number, line: string }[] = [];
    lines.forEach(line => {
        for (const keyword of totalKeywords) {
            if (line.toLowerCase().includes(keyword)) {
                const numbers = line.match(/[\d,]+\.?\d*/g);
                if (numbers) {
                    numbers.forEach(numStr => {
                        potentialTotals.push({ value: parseFloat(numStr.replace(/,/g, '')), line });
                    });
                }
            }
        }
    });
    if (potentialTotals.length > 0) {
        potentialTotals.sort((a, b) => b.value - a.value);
        parsedData.totalAmount = potentialTotals[0].value;
    }

    // Item Parsing Logic (simplified from previous attempts for brevity, ensure it matches original intent)
    const itemKeywords = ['description', 'item', 'product', 'service', 'qty', 'quantity', 'price', 'unit price', 'amount', 'subtotal'];
    const numberPattern = /([\d,]*\.?\d+)/g;

    lines.forEach((line, lineIndex) => {
        const lowerLine = line.toLowerCase();
        const words = lowerLine.split(/\s+/);
        const keywordWords = words.filter(word => itemKeywords.includes(word));

        if ((keywordWords.length / words.length > 0.4 && words.length < 6) || /^[\d\s.,$€£\-+()%]+$/.test(line.trim()) || line.length < 10) {
             return; // Skip potential headers/footers or non-item lines
        }

        const numberMatches = Array.from(line.matchAll(numberPattern));
        if (numberMatches.length >= 2) { // Expecting at least quantity and price
            const priceMatch = numberMatches[numberMatches.length - 1];
            const qtyMatch = numberMatches[numberMatches.length - 2];
            const priceStr = priceMatch[0].replace(/,/g, '');
            const qtyStr = qtyMatch[0].replace(/,/g, '');
            const price = parseFloat(priceStr);
            const quantity = parseInt(qtyStr, 10);

            if (!isNaN(price) && !isNaN(quantity) && quantity.toString() === qtyStr && !qtyStr.includes('.')) {
                const qtyIndex = qtyMatch.index;
                if (qtyIndex !== undefined && qtyIndex > 0) {
                    let name = line.substring(0, qtyIndex).trim().replace(/[.,:;]$/, '').trim();
                    if (name.length > 2) {
                        parsedData.items.push({ name, quantity, price });
                    }
                }
            }
        }
    });

    if (parsedData.items.length === 0 && lines.length > 0) {
        console.warn("OCR parsing (old logic) did not find structured item lines. Raw lines:", lines);
    }
    console.log("Parsed OCR Data (Old Logic - Restored):", parsedData);
    return parsedData;
};
