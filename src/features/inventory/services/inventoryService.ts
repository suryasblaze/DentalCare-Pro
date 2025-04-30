// src/features/inventory/services/inventoryService.ts

import { supabase } from '@/lib/supabase';
import { Database } from '@/lib/database.types';
import { InventoryItemRow, NewInventoryItem, UpdateInventoryItem } from '../types';

// Export InventoryLogEntry type for use in components
export type InventoryLogEntry = Database['public']['Tables']['inventory_log']['Row']; // Use Row type for fetched data

const TABLE_NAME = 'inventory_items';

// Fetch all inventory items
export const getInventoryItems = async (): Promise<InventoryItemRow[]> => {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .order('created_at', { ascending: false }); // Default sort by newest

  if (error) {
    console.error('Error fetching inventory items:', error);
    throw new Error(error.message);
  }
  return data || [];
};

// Fetch a single inventory item by ID
export const getInventoryItemById = async (id: string): Promise<InventoryItemRow | null> => {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    // Handle cases where the item might not be found gracefully
    if (error.code === 'PGRST116') { // PostgREST error code for "Resource Not Found"
        console.log(`Inventory item with id ${id} not found.`);
        return null;
    }
    console.error(`Error fetching inventory item ${id}:`, error);
    throw new Error(error.message);
  }
  return data;
};


// Add a new inventory item with logging
export const addInventoryItem = async (item: NewInventoryItem): Promise<InventoryItemRow> => {
  // First, insert the new item
  const { data: newItem, error: insertError } = await supabase
    .from(TABLE_NAME)
    .insert([item])
    .select()
    .single();

  if (insertError) {
    console.error('Error adding inventory item:', insertError);
    throw new Error(insertError.message);
  }
  if (!newItem) {
    throw new Error('Failed to add inventory item, no data returned.');
  }

  // Log the initial stock addition
  const logEntry: Omit<InventoryLogEntry, 'id' | 'created_at'> = {
    inventory_item_id: newItem.id,
    quantity_change: newItem.quantity, // Initial quantity
    change_type: 'initial_stock',
    user_id: (await supabase.auth.getUser()).data.user?.id || null, // Try to get current user
    notes: 'Initial stock set during item creation'
  };

  const { error: logError } = await supabase
    .from('inventory_log')
    .insert([logEntry]);

  if (logError) {
    console.error('Error logging initial inventory stock:', logError);
    // Not throwing here as the item is already added, but you might want to handle this differently
  }

  return newItem;
};

// Update an existing inventory item with logging
export const updateInventoryItem = async (id: string, updates: UpdateInventoryItem): Promise<InventoryItemRow> => {
  // First, fetch the current item state
  const currentItem = await getInventoryItemById(id);
  if (!currentItem) {
    throw new Error(`Inventory item ${id} not found.`);
  }

  // Check if quantity is being updated
  if (updates.quantity !== undefined && updates.quantity !== currentItem.quantity) {
    const quantityChange = updates.quantity - currentItem.quantity;

    // Log the quantity change
    const logEntry: Omit<InventoryLogEntry, 'id' | 'created_at'> = {
      inventory_item_id: id,
      quantity_change: quantityChange,
      change_type: quantityChange > 0 ? 'add' : 'use', // Simplification; adjust based on your needs
      user_id: (await supabase.auth.getUser()).data.user?.id || null,
      notes: `Quantity updated from ${currentItem.quantity} to ${updates.quantity}`
    };

    const { error: logError } = await supabase
      .from('inventory_log')
      .insert([logEntry]);

    if (logError) {
      console.error('Error logging inventory quantity change:', logError);
      // Again, not throwing as the update is already done, but consider handling this case
    }
  }

  // Now, perform the update
  const { data: updatedItem, error: updateError } = await supabase
    .from(TABLE_NAME)
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (updateError) {
    console.error(`Error updating inventory item ${id}:`, updateError);
    throw new Error(updateError.message);
  }
  if (!updatedItem) {
    throw new Error(`Failed to update inventory item ${id}, no data returned.`);
  }

  return updatedItem;
};

// Delete an inventory item
export const deleteInventoryItem = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from(TABLE_NAME)
    .delete()
    .eq('id', id);

  if (error) {
    console.error(`Error deleting inventory item ${id}:`, error);
    throw new Error(error.message);
  }
};

// --- Placeholder for future advanced features ---

// Example: Function to fetch items needing reorder (low stock)
export const getLowStockItems = async (): Promise<InventoryItemRow[]> => {
    // This requires comparing quantity with low_stock_threshold
    // Supabase doesn't directly support column-to-column comparison in .lt()/.lte()
    // Option 1: Fetch all and filter client-side (simpler for small datasets)
    // Option 2: Create a Database Function/View for more complex server-side filtering

    // Using Option 1 for now:
    const allItems = await getInventoryItems();
    return allItems.filter(item => item.quantity <= item.low_stock_threshold);
}

// Example: Function to fetch expired items
export const getExpiredItems = async (): Promise<InventoryItemRow[]> => {
    const today = new Date().toISOString().split('T')[0]; // Get YYYY-MM-DD format
    const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .not('expiry_date', 'is', null) // Only consider items with an expiry date
        .lte('expiry_date', today)
        .order('expiry_date', { ascending: true });

    if (error) {
        console.error('Error fetching expired items:', error);
        throw new Error(error.message);
    }
    return data || [];
}

// Fetch inventory log entries within a date range
export const getInventoryLogEntries = async (startDate: string, endDate: string): Promise<InventoryLogEntry[]> => {
    const { data, error } = await supabase
        .from('inventory_log')
        .select('*')
        .gte('created_at', startDate) // Greater than or equal to start date
        .lte('created_at', endDate)   // Less than or equal to end date
        .order('created_at', { ascending: true }); // Order chronologically

    if (error) {
        console.error('Error fetching inventory log entries:', error);
        throw new Error(error.message);
    }
    // Ensure the returned data matches the exported Row type
    return (data as Database['public']['Tables']['inventory_log']['Row'][]) || [];
};
