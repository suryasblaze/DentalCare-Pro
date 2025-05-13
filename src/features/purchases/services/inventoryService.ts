// src/features/purchases/services/inventoryService.ts
import { supabase } from '@/lib/supabase';
import { InventoryItemSelectItem } from '../types'; // Assuming this type is also relevant for general inventory item selection

/**
 * Fetches all inventory items formatted for select inputs or fuzzy searching.
 * TODO: Implement actual Supabase query, filtering, and error handling.
 */
export const getAllInventoryItemsForSelect = async (): Promise<InventoryItemSelectItem[]> => {
  console.log("Attempting to fetch inventory items for select/search...");

  const { data, error } = await supabase
    .from('inventory_items') // Assuming 'inventory_items' is the correct table name
    .select('id, item_name, category, is_batched') // Select necessary fields
    .order('item_name', { ascending: true });

  if (error) {
    console.error('Error fetching inventory items for select:', error);
    throw new Error(`Failed to fetch inventory items: ${error.message}`);
  }

  if (!data) {
    console.warn('No inventory items found for select.');
    return [];
  }

  // Map the fetched data to the InventoryItemSelectItem structure
  // The 'is_batched' field might have been added in a later migration (20250506153200_modify_inventory_items_for_batching.sql)
  // If supabase_types.ts is not up-to-date, `item.is_batched` might cause a type error here.
  // We assume the database schema is correct and includes `is_batched`.
  return data.map(item => ({
    value: item.id, // id is UUID (string)
    label: item.item_name,
    category: item.category, // category is string
    is_batched: item.is_batched ?? false, // Default to false if null/undefined, though schema likely makes it boolean
  }));
};
