import { Database } from '@/lib/database.types';

export type InventoryItemCategory = 'Medicines' | 'Tools' | 'Consumables';
export type StockStatus = 'In Stock' | 'Low Stock' | 'Expired';

// Base type from Supabase generated types
// Assuming 'inventory_items' is the table name you created manually
export type InventoryItemRow = Database['public']['Tables']['inventory_items']['Row'];

// Extended type for frontend use, including calculated status
export interface InventoryItem extends InventoryItemRow {
  stock_status: StockStatus; // This will be calculated on the frontend
}

// Type for creating a new item (omitting id, created_at)
// We'll let the database handle id and created_at
export type NewInventoryItem = Omit<InventoryItemRow, 'id' | 'created_at'>;

// Type for updating an item (making fields optional, omitting id, created_at)
// We only need the fields that are being updated
export type UpdateInventoryItem = Partial<Omit<InventoryItemRow, 'id' | 'created_at'>>;

// Type for inventory item batches
export type InventoryItemBatchRow = Database['public']['Tables']['inventory_item_batches']['Row'];

export interface InventoryItemBatch extends InventoryItemBatchRow {
  // any calculated fields for batches can go here if needed in future
}
