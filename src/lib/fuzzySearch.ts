import Fuse from 'fuse.js';

export interface SearchableItem {
  id: string | number; // Assuming ID can be string or number
  name: string;
  // Add any other properties you might want to search on or return
}

export interface FuzzyMatch<T extends SearchableItem> {
  originalOcrItemName: string;
  ocrItemIndex: number; // Index of the item in the OCR results
  bestMatch: T | null;
  bestMatchScore?: number; // Score of the best match (0 is perfect, 1 is no match)
  allMatches: import('fuse.js').FuseResult<T>[];
}

const fuseOptions: import('fuse.js').IFuseOptions<SearchableItem> = {
  // isCaseSensitive: false,
  includeScore: true, // Set to true to get scores
  shouldSort: true,
  // includeMatches: false, // Set to true if you need match details (indices, etc.)
  // findAllMatches: false,
  minMatchCharLength: 2, // Minimum characters to match
  // location: 0,
  threshold: 0.4, // Lower threshold means more strict matching (0.0 = exact, 1.0 = any)
  // distance: 100,
  // useExtendedSearch: false,
  // ignoreLocation: false,
  // ignoreFieldNorm: false,
  // fieldNormWeight: 1,
  keys: [
    "name", // Key to search in
    // "description" // Add other keys if available and relevant
  ]
};

export const performFuzzySearch = <T extends SearchableItem>(
  ocrItemName: string,
  inventoryItems: T[]
): { bestMatch: T | null; bestMatchScore?: number; allMatches: import('fuse.js').FuseResult<T>[] } => {
  if (!ocrItemName || inventoryItems.length === 0) {
    return { bestMatch: null, bestMatchScore: undefined, allMatches: [] };
  }

  const fuse = new Fuse(inventoryItems, fuseOptions);
  const results = fuse.search(ocrItemName);

  if (results.length > 0 && results[0].score !== undefined) {
    // The first result is the best match due to `shouldSort: true`
    return { bestMatch: results[0].item, bestMatchScore: results[0].score, allMatches: results };
  } else if (results.length > 0) { // Fallback if score is somehow undefined but results exist
    return { bestMatch: results[0].item, bestMatchScore: undefined, allMatches: results };
  }
  return { bestMatch: null, bestMatchScore: undefined, allMatches: [] };
};

// Example of how you might process all OCR items
export const matchOcrItemsToInventory = <T extends SearchableItem>(
  ocrItems: { name: string; quantity: number; price: number }[], // From ParsedInvoiceData
  inventoryList: T[]
): FuzzyMatch<T>[] => {
  return ocrItems.map((ocrItem, index) => {
    const { bestMatch, bestMatchScore, allMatches } = performFuzzySearch(ocrItem.name, inventoryList);
    return {
      originalOcrItemName: ocrItem.name,
      ocrItemIndex: index,
      bestMatch,
      bestMatchScore, // Pass the score along
      allMatches,
    };
  });
};
