// src/features/inventory/services/inventoryService.ts

import { supabase } from '@/lib/supabase';
import type { Database } from '../../../../supabase_types'; // Adjusted path assuming supabase_types.ts is at root
import { InventoryItemRow, NewInventoryItem, UpdateInventoryItem } from '../types';
import type { Profile } from '@/types'; // Import Profile type

// Export InventoryLogEntry type for use in components
export type InventoryLogEntry = Database['public']['Tables']['inventory_log']['Row']; // Use Row type for fetched data

// Extended type for log entries with joined details
export interface InventoryLogEntryWithDetails extends InventoryLogEntry {
  inventory_items: {
    item_name: string;
    item_code?: string | null;
  } | null;
  // Temporarily removing profiles join from type, will rely on user_id
  // profiles: {
  //   email?: string | null;
  // } | null;
}

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
  const logEntry: Database['public']['Tables']['inventory_log']['Insert'] = {
    inventory_item_id: newItem.id,
    item_id: null, // Explicitly add item_id as null
    quantity_change: newItem.quantity, // Initial quantity
    change_type: 'initial_stock',
    user_id: (await supabase.auth.getUser()).data.user?.id || null, // Try to get current user
    notes: 'Initial stock set during item creation',
    inventory_item_batch_id: null, // Explicitly set nullable fields
    purchase_order_item_id: null, // Explicitly set nullable fields
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
    const logEntry: Database['public']['Tables']['inventory_log']['Insert'] = {
      inventory_item_id: id,
      item_id: null, // Explicitly add item_id as null
      quantity_change: quantityChange,
      change_type: quantityChange > 0 ? 'add' : 'use', // Simplification; adjust based on your needs
      user_id: (await supabase.auth.getUser()).data.user?.id || null,
      notes: `Quantity updated from ${currentItem.quantity} to ${updates.quantity}`,
      inventory_item_batch_id: null, // Explicitly set nullable fields
      purchase_order_item_id: null, // Explicitly set nullable fields
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

// Fetch inventory logs with filters and joined data
export const getInventoryLogs = async (filters: {
  startDate?: Date;
  endDate?: Date;
  searchTerm?: string;
}): Promise<InventoryLogEntryWithDetails[]> => {
  let query = supabase
    .from('inventory_log')
    .select(`
      *,
      inventory_items (item_name, item_code)
    `) // Removed profiles join for now
    .order('created_at', { ascending: false });

  // Filter for change types related to stock adjustments
  const adjustmentChangeTypes = ['Expired', 'Damaged', 'Lost', 'Stock Count Correction', 'Used', 'Other', 'adjustment']; // 'adjustment' is a general one
  query = query.in('change_type', adjustmentChangeTypes as any[]); // Using 'as any[]' to bypass strict enum type checking for .in()

  if (filters.startDate) {
    query = query.gte('created_at', filters.startDate.toISOString());
  }
  if (filters.endDate) {
    // Add 1 day to endDate to make it inclusive of the end of that day
    const inclusiveEndDate = new Date(filters.endDate);
    inclusiveEndDate.setDate(inclusiveEndDate.getDate() + 1);
    query = query.lt('created_at', inclusiveEndDate.toISOString());
  }

  if (filters.searchTerm) {
    const searchTerm = `%${filters.searchTerm}%`;
    // Using or filter for search term across multiple fields
    // Adjust fields based on what you want to search
    query = query.or(
      `inventory_items.item_name.ilike.${searchTerm},` +
      `inventory_items.item_code.ilike.${searchTerm},` +
      `notes.ilike.${searchTerm},` +
      // `profiles.email.ilike.${searchTerm},` + // Removed search on profiles.email
      `change_type.ilike.${searchTerm}`
    );
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching detailed inventory logs:', error);
    throw new Error(error.message);
  }

  // The cast to any is a workaround if TypeScript struggles with the complex select type.
  // Ideally, generate precise types or use a type helper.
  return (data as any[] as InventoryLogEntryWithDetails[]) || [];
};


// Type for the input payload of the adjust_inventory_item_quantity RPC
interface AdjustInventoryPayload {
    p_inventory_item_id: string;
    p_quantity_change: number;
    p_change_type: Database['public']['Tables']['inventory_log']['Row']['change_type']; // Use the enum type if available, otherwise string
    p_user_id: string;
    p_notes?: string | null;
    p_inventory_item_batch_id?: string | null;
}

// Service function to call the adjust_inventory_item_quantity RPC
export const adjustInventoryQuantity = async (payload: AdjustInventoryPayload): Promise<number> => {
    const { data, error } = await supabase.rpc('adjust_inventory_item_quantity', {
        p_inventory_item_id: payload.p_inventory_item_id,
        p_quantity_change: payload.p_quantity_change,
        p_change_type: payload.p_change_type,
        p_user_id: payload.p_user_id,
        p_notes: payload.p_notes === null ? undefined : payload.p_notes,
        p_inventory_item_batch_id: payload.p_inventory_item_batch_id === null ? undefined : payload.p_inventory_item_batch_id,
    });

    if (error) {
        console.error('Error adjusting inventory quantity via RPC:', error);
        throw error; // Re-throw the error to be caught by the caller
    }

    // The RPC function returns the new quantity
    return data as number;
};

// Type for creating a new adjustment request (frontend payload)
interface CreateAdjustmentRequestPayload {
    inventory_item_id: string;
    inventory_item_batch_id?: string | null;
    quantity_to_decrease: number;
    reason: Database['public']['Tables']['inventory_adjustment_requests']['Row']['reason']; // Use the enum type
    notes: string;
    photo_url?: string | null; // URL after upload
    requested_by_user_id: string;
    custom_approver_emails?: string[] | null;
    approver_role_target?: 'admin' | 'doctor' | null; // Added for assigning approver role
}

// Service function to create a new inventory adjustment request
export const createAdjustmentRequest = async (payload: CreateAdjustmentRequestPayload): Promise<Database['public']['Tables']['inventory_adjustment_requests']['Row']> => {
    const { data, error } = await supabase
        .from('inventory_adjustment_requests')
        .insert({
            inventory_item_id: payload.inventory_item_id,
            inventory_item_batch_id: payload.inventory_item_batch_id,
            quantity_to_decrease: payload.quantity_to_decrease,
            reason: payload.reason as any, // Using 'as any' as a temporary workaround for persistent type error
            notes: payload.notes,
            photo_url: payload.photo_url,
            requested_by_user_id: payload.requested_by_user_id,
            custom_approver_emails: payload.custom_approver_emails,
            approver_role_target: payload.approver_role_target, // Added field
            status: 'pending', // Always starts as pending
        })
        .select('id, inventory_item_id, inventory_item_batch_id, quantity_to_decrease, reason, notes, photo_url, status, requested_by_user_id, requested_at, reviewed_by_user_id, reviewed_at, reviewer_notes, created_at, updated_at, approval_token, approval_token_expires_at, custom_approver_emails, approver_role_target') // Added to select
        .single();

    if (error) {
        console.error('Error creating inventory adjustment request:', error);
        throw error;
    }
    if (!data) {
        throw new Error('Failed to create adjustment request, no data returned.');
    }

    return data;
};

// Placeholder service function to upload adjustment proof photo
// You might want a more generic file upload service
export const uploadAdjustmentPhoto = async (file: File, requestId: string): Promise<string | null> => { // Return type changed to allow null
    const fileExtension = file.name.split('.').pop();
    // Use a unique path, perhaps including the request ID
    const filePath = `inventory_adjustments/${requestId}/${Date.now()}.${fileExtension}`;

    try {
        const { error: uploadError, data: uploadData } = await supabase.storage
            .from('inventory-proofs') // Corrected bucket name
            .upload(filePath, file);

        if (uploadError) {
            console.error('Error uploading adjustment photo (likely CORS or network issue):', uploadError);
            // Not throwing, returning null to allow process to continue without photo
            return null;
        }

        // Construct the public URL or return the path based on your needs
        // This example assumes you store the path and construct URL later or use signed URLs
        // return supabase.storage.from('inventory_proofs').getPublicUrl(filePath).data.publicUrl;
        return filePath; // Return the storage path
    } catch (error) {
        console.error('Exception during photo upload:', error);
        return null; // Return null on any exception during upload
    }
};

// Type for adjustment request with joined data for display
// Ensure AdjustmentRequestDetails includes the new approver_role_target field if it's part of the Row type
// supabase_types.ts should be updated after DB migration for this to be automatic.
// For now, we assume 'approver_role_target' will be part of 'Row'.
export type AdjustmentRequestDetails = Database['public']['Tables']['inventory_adjustment_requests']['Row'] & {
    inventory_items: { item_name: string } | null;
    requester_profile: { first_name: string | null; last_name: string | null } | null;
};

// Service function to fetch pending adjustment requests based on user role and assignments
export const getPendingAdjustmentRequests = async (
    currentUserId: string, 
    currentUserRole: Profile['role']
): Promise<AdjustmentRequestDetails[]> => {
    let query = supabase
        .from('inventory_adjustment_requests')
        .select(`
            *,
            inventory_items ( item_name ),
            requester_profile:profiles!inventory_adjustment_requests_requested_by_user_id_fkey ( first_name, last_name )
        `)
        .eq('status', 'pending')
        .neq('requested_by_user_id', currentUserId); // Always exclude user's own requests

    if (currentUserRole === 'admin') {
        query = query.or(`approver_role_target.eq.admin,approver_role_target.is.null`);
    } else if (currentUserRole === 'owner') {
        query = query.or(`approver_role_target.eq.owner,approver_role_target.is.null`);
    } else if (currentUserRole === 'doctor') {
        query = query.eq('approver_role_target', 'doctor');
    } else {
        // If role is unknown or doesn't have specific approval logic, return no requests
        return [];
    }

    query = query.order('requested_at', { ascending: true });

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching pending adjustment requests:', error);
        throw error;
    }
    return (data as AdjustmentRequestDetails[]) || [];
};

// Service function to fetch a single adjustment request by ID
export const getAdjustmentRequestById = async (requestId: string): Promise<AdjustmentRequestDetails | null> => {
    const { data, error } = await supabase
        .from('inventory_adjustment_requests')
        .select(`
            *,
            inventory_items ( item_name ),
            requester_profile:profiles!inventory_adjustment_requests_requested_by_user_id_fkey ( first_name, last_name )
        `)
        .eq('id', requestId)
        .single();

    if (error) {
        if (error.code === 'PGRST116') { // Not found
            console.log(`Adjustment request with id ${requestId} not found.`);
            return null;
        }
        console.error(`Error fetching adjustment request ${requestId}:`, error);
        throw error;
    }
    return data as AdjustmentRequestDetails | null;
};

// Service function to fetch the most recent pending adjustment request for a user
export const getMostRecentPendingRequestForUser = async (userId: string): Promise<AdjustmentRequestDetails | null> => {
  const { data, error } = await supabase
    .from('inventory_adjustment_requests')
    .select(`
      *,
      inventory_items ( item_name ),
      requester_profile:profiles!inventory_adjustment_requests_requested_by_user_id_fkey ( first_name, last_name )
    `)
    .eq('requested_by_user_id', userId)
    .eq('status', 'pending')
    .order('requested_at', { ascending: false })
    .limit(1)
    .single(); // Expecting one or null

  if (error) {
    if (error.code === 'PGRST116') { // PostgREST error for "Resource Not Found"
      // This is not an error, just means no pending requests found
      return null;
    }
    console.error('Error fetching most recent pending request for user:', error);
    throw error;
  }
  return data as AdjustmentRequestDetails | null;
};

// Service function to fetch adjustment requests for a user, optionally filtered by status
export const getAdjustmentRequestsByUserId = async (
  userId: string, 
  statuses?: Database['public']['Tables']['inventory_adjustment_requests']['Row']['status'][],
  limit: number = 20 // Default limit to 20 requests
): Promise<AdjustmentRequestDetails[]> => {
  let query = supabase
    .from('inventory_adjustment_requests')
    .select(`
      *,
      inventory_items ( item_name ),
      requester_profile:profiles!inventory_adjustment_requests_requested_by_user_id_fkey ( first_name, last_name )
    `)
    .eq('requested_by_user_id', userId);

  if (statuses && statuses.length > 0) {
    query = query.in('status', statuses);
  }

  query = query.order('requested_at', { ascending: false }).limit(limit);

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching adjustment requests for user:', error);
    throw error;
  }
  return (data as AdjustmentRequestDetails[]) || [];
};


// Service function to get a temporary viewable URL for the photo proof
export const getAdjustmentPhotoUrl = async (storagePath: string): Promise<string | null> => {
    if (!storagePath) return null;
    // Use createSignedUrl for potentially private buckets or temporary access
    const { data, error } = await supabase.storage
        .from('inventory-proofs') // Corrected bucket name
        .createSignedUrl(storagePath, 60 * 10); // URL valid for 10 minutes

    if (error) {
        console.error('Error creating signed URL for adjustment photo:', error);
        // Fallback or alternative for public buckets if needed:
        // return supabase.storage.from('inventory_proofs').getPublicUrl(storagePath).data.publicUrl;
        return null;
    }
    return data?.signedUrl || null;
};


// Service function to approve an adjustment request
export const approveAdjustmentRequest = async (requestId: string, reviewerUserId: string, reviewerNotes?: string): Promise<void> => {
    const { error } = await supabase.rpc('process_approved_adjustment', {
        p_request_id: requestId,
        p_reviewer_user_id: reviewerUserId,
        p_reviewer_notes: reviewerNotes === undefined ? null : reviewerNotes // Explicitly pass null if undefined
    });

    if (error) {
        console.error(`Error approving adjustment request ${requestId}:`, error);
        throw error;
    }
};

// Service function to reject an adjustment request
export const rejectAdjustmentRequest = async (requestId: string, reviewerUserId: string, reviewerNotes?: string): Promise<void> => {
    const { error } = await supabase
        .from('inventory_adjustment_requests')
        .update({
            status: 'rejected',
            reviewed_by_user_id: reviewerUserId,
            reviewed_at: new Date().toISOString(),
            reviewer_notes: reviewerNotes
        })
        .eq('id', requestId)
        .eq('status', 'pending'); // Ensure we only reject pending requests

    if (error) {
        console.error(`Error rejecting adjustment request ${requestId}:`, error);
        throw error;
    }
};

// Type for the data returned by verify_adjustment_approval_token RPC
// This should match the TABLE definition in the RPC
export interface VerifiedAdjustmentRequestDetails {
    id: string;
    inventory_item_id: string;
    inventory_item_batch_id: string | null;
    quantity_to_decrease: number;
    reason: Database['public']['Tables']['inventory_adjustment_requests']['Row']['reason'];
    notes: string;
    photo_url: string | null;
    status: Database['public']['Tables']['inventory_adjustment_requests']['Row']['status'];
    requested_by_user_id: string;
    requested_at: string;
    item_name: string | null;
    requester_name: string | null;
}

// Service function to verify token and fetch request details
export const verifyAndGetAdjustmentRequest = async (requestId: string, token: string): Promise<VerifiedAdjustmentRequestDetails | null> => {
    const { data, error } = await supabase.rpc('verify_adjustment_approval_token', {
        p_request_id: requestId,
        p_raw_token: token
    });

    if (error) {
        console.error('Error verifying adjustment token:', error);
        // Don't throw, let the component handle "not found" or "invalid token"
        return null; 
    }
    // RPC returns an array of rows, even if it's just one
    return data && data.length > 0 ? data[0] as VerifiedAdjustmentRequestDetails : null;
};

// --- Stock Take Service Functions ---

// Type for creating a new stock take record
export type NewStockTakePayload = Omit<Database['public']['Tables']['stock_takes']['Insert'], 'id' | 'created_at' | 'updated_at' | 'variance' | 'counted_at'> & {
    counted_at?: string; // Optional, defaults to now() in DB
};
export type StockTakeRow = Database['public']['Tables']['stock_takes']['Row'];

// Service function to create a new stock take entry
export const createStockTake = async (payload: NewStockTakePayload): Promise<StockTakeRow> => {
    const { data, error } = await supabase
        .from('stock_takes')
        .insert(payload)
        .select()
        .single();

    if (error) {
        console.error('Error creating stock take entry:', error);
        throw error;
    }
    if (!data) {
        throw new Error('Failed to create stock take entry, no data returned.');
    }
    return data;
};

// Service function to fetch stock take entries, possibly with item details
export type StockTakeDetails = StockTakeRow & {
    inventory_items?: { item_name?: string; unit?: string } | null;
    counter_profile?: { first_name?: string | null; last_name?: string | null } | null;
};

export const getStockTakes = async (filters?: {
    itemId?: string;
    startDate?: string;
    endDate?: string;
    includeItemDetails?: boolean; // Note: filter flags are now unused in select, but kept for potential future logic
    includeUserDetails?: boolean;
}): Promise<StockTakeDetails[]> => {
    // Always select the base fields and the potential joined fields
    // This simplifies the query and might help with type inference issues.
    const selectString = `
        *,
        inventory_items (item_name, unit),
        counter_profile:profiles!stock_takes_counted_by_user_id_fkey (first_name, last_name)
    `;

    let query = supabase.from('stock_takes').select(selectString);

    if (filters?.itemId) {
        query = query.eq('inventory_item_id', filters.itemId);
    }
    if (filters?.startDate) {
        query = query.gte('counted_at', filters.startDate);
    }
    if (filters?.endDate) {
        // Add 1 day to endDate to make it inclusive of the whole day
        const inclusiveEndDate = new Date(filters.endDate);
        inclusiveEndDate.setDate(inclusiveEndDate.getDate() + 1);
        query = query.lt('counted_at', inclusiveEndDate.toISOString().split('T')[0]);
    }

    query = query.order('counted_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching stock takes:', error);
        throw error;
    }
    // If 'data' is not null, it should conform to StockTakeDetails[]
    // This cast assumes the select string correctly populates the nested structures.
    return (data as StockTakeDetails[] | null) || [];
};

// Service function to update a stock take entry (e.g., to mark variance as resolved)
export const updateStockTake = async (id: string, updates: Partial<Pick<StockTakeRow, 'notes' | 'is_variance_resolved'>>): Promise<StockTakeRow> => {
    const { data, error } = await supabase
        .from('stock_takes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error(`Error updating stock take ${id}:`, error);
        throw error;
    }
    if (!data) {
        throw new Error(`Failed to update stock take ${id}, no data returned.`);
    }
    return data;
};
