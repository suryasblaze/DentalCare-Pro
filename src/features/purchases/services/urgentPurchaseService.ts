import { supabase } from '@/lib/supabase';
import {
  UrgentPurchase,
  UrgentPurchaseItem,
  CreateUrgentPurchaseFormValues, // This might be more UI specific
  ParsedSlipItem, // From OCR processing
  UrgentPurchaseRequestStatus, // Import the new status type
} from '../types';
import { Database } from '../../../../supabase_types';
import { v4 as uuidv4 } from 'uuid';

// Manually define Insert type based on new schema, as supabase_types.ts might not be updated yet.
// Required fields for insert after migration: requested_by_user_id.
// Defaults: id, requested_at, updated_at, status ('draft').
// Optional: slip_image_path, slip_filename, invoice_delivery_date, confidence_score, notes,
//           reviewed_by_user_id, reviewed_at, reviewer_notes.
type UrgentPurchaseInsert = {
  requested_by_user_id: string;
  slip_image_path?: string | null;
  slip_filename?: string | null;
  invoice_delivery_date?: string | null;
  status?: UrgentPurchaseRequestStatus; // Default is 'draft' in DB
  confidence_score?: number | null;
  notes?: string | null;
  target_approval_role?: string | null; // New field for targeted role
  // reviewed fields are typically set on update, not insert
};

// Items are inserted after the header, so urgent_purchase_id is added dynamically
// Manually define Insert type based on actual urgent_purchase_items schema
type UrgentPurchaseItemInsert = {
  inventory_item_id: string;
  matched_item_name: string;
  quantity: number;
  slip_text?: string | null;
  batch_number?: string | null;
  expiry_date?: string | null;
};

export const uploadUrgentPurchaseSlip = async (
  file: File,
  userId?: string // Optional: for creating a user-specific path or for logging
): Promise<{ filePath: string; fileName: string }> => {
  if (!file) {
    throw new Error('No file provided for upload.');
  }

  const fileExtension = file.name.split('.').pop();
  const uniqueFileName = `${uuidv4()}.${fileExtension}`;
  // Store in a general 'urgent_purchase_slips' folder, or user-specific if needed
  const folder = userId ? `urgent_purchase_slips/${userId}` : 'urgent_purchase_slips';
  const filePath = `${folder}/${uniqueFileName}`;

  const { error: uploadError } = await supabase.storage
    .from('urgent-purchase-slip') // Corrected bucket name to singular as per user feedback
    .upload(filePath, file);

  if (uploadError) {
    console.error('Error uploading urgent purchase slip:', uploadError);
    throw uploadError;
  }

  return { filePath, fileName: file.name };
};

export interface CreateUrgentPurchasePayload {
  header: UrgentPurchaseInsert;
  items: UrgentPurchaseItemInsert[];
}

export const createUrgentPurchaseEntry = async (
  payload: CreateUrgentPurchasePayload
): Promise<UrgentPurchase> => {
  // 1. Insert the header
  const { data: newHeaderData, error: headerError } = await supabase
    .from('urgent_purchases' as any) // Use 'as any' to bypass stale supabase_types.ts
    .insert(payload.header as any) // Cast payload.header if its type is also problematic
    .select()
    .single();

  if (headerError || !newHeaderData) {
    console.error('Error creating urgent purchase header:', headerError);
    throw headerError || new Error('Failed to create urgent purchase header.');
  }
  const newHeader = newHeaderData as any; // Cast to any to access properties like id

  // 2. Prepare and insert items
  if (payload.items && payload.items.length > 0) {
    const itemsToInsert = payload.items.map(item => ({
      ...item,
      urgent_purchase_id: newHeader.id, // Link to the created header
    }));

    const { error: itemsError } = await supabase
      .from('urgent_purchase_items' as any) // Use 'as any'
      .insert(itemsToInsert as any[]); // Cast itemsToInsert if necessary

    if (itemsError) {
      console.error('Error creating urgent purchase items:', itemsError);
      // Attempt to rollback header creation if items fail
      await supabase.from('urgent_purchases' as any).delete().match({ id: newHeader.id });
      throw itemsError;
    }
  }

  // Refetch the full urgent purchase with items for return (or construct it)
  // For simplicity, returning the header and assuming items were linked.
  // A more robust version would fetch the complete record.
  // The returned type UrgentPurchase already reflects new schema from types/index.ts
  return {
    ...newHeader, // newHeader should match the structure of UrgentPurchase now
    items: (payload.items || []).map(item => ({
        ...item,
        id: uuidv4(), // Placeholder, actual ID would be from DB if fetched
        urgent_purchase_id: newHeader.id,
        // created_at and updated_at for items are set by DB
    })) as UrgentPurchaseItem[],
  } as unknown as UrgentPurchase; // Changed to unknown first
};

// New function to submit a draft for approval
export const submitUrgentPurchaseForApproval = async (
  urgentPurchaseId: string,
  userId: string // Ensure this user is the one who created it
): Promise<UrgentPurchase> => {
  // First, verify the user is the requester and current status is 'draft'
  const { data: currentPurchaseData, error: fetchError } = await supabase
    .from('urgent_purchases' as any)
    .select('requested_by_user_id, status')
    .eq('id', urgentPurchaseId)
    .single();

  if (fetchError || !currentPurchaseData) {
    console.error('Error fetching urgent purchase for submission:', fetchError);
    throw fetchError || new Error('Urgent purchase not found for submission.');
  }
  const currentPurchase = currentPurchaseData as any; // Cast to access properties

  if (currentPurchase.requested_by_user_id !== userId) {
    throw new Error('User not authorized to submit this purchase for approval.');
  }
  if (currentPurchase.status !== 'draft') {
    throw new Error(`Urgent purchase is not in draft state (current: ${currentPurchase.status}).`);
  }

  const { data: updatedPurchaseData, error: updateError } = await supabase
    .from('urgent_purchases' as any)
    .update({ status: 'pending_approval', updated_at: new Date().toISOString() } as any)
    .eq('id', urgentPurchaseId)
    .select() // Select all fields to match UrgentPurchase
    .single();

  if (updateError || !updatedPurchaseData) {
    console.error('Error submitting urgent purchase for approval:', updateError);
    throw updateError || new Error('Failed to submit urgent purchase for approval.');
  }
  return updatedPurchaseData as unknown as UrgentPurchase; // Changed to unknown first
};

// New function for an approver to approve a request
export const approveUrgentPurchase = async (
  urgentPurchaseId: string,
  approverId: string,
  reviewerNotes?: string
): Promise<UrgentPurchase> => {
  const { data: updatedPurchaseData, error } = await supabase
    .from('urgent_purchases' as any)
    .update({
      status: 'approved',
      reviewed_by_user_id: approverId,
      reviewed_at: new Date().toISOString(),
      reviewer_notes: reviewerNotes,
      updated_at: new Date().toISOString(),
    } as any)
    .eq('id', urgentPurchaseId)
    .eq('status', 'pending_approval') // Ensure it's pending before approving
    .select() // Select all fields
    .single();

  if (error || !updatedPurchaseData) {
    console.error('Error approving urgent purchase:', error);
    throw error || new Error('Failed to approve urgent purchase or not found/not pending.');
  }
  const updatedPurchase = updatedPurchaseData as unknown as UrgentPurchase; // Changed to unknown first
  // After approval, trigger the processing of items
  await processApprovedUrgentPurchaseItems(updatedPurchase.id, approverId); // Pass approverId as userId for logs

  return updatedPurchase; // This is now correctly typed as UrgentPurchase
};

// New function for an approver to reject a request
export const rejectUrgentPurchase = async (
  urgentPurchaseId: string,
  approverId: string,
  reviewerNotes: string // Notes are mandatory for rejection
): Promise<UrgentPurchase> => {
  if (!reviewerNotes || reviewerNotes.trim() === '') {
    throw new Error('Reviewer notes are required for rejecting an urgent purchase.');
  }
  const { data: updatedPurchaseData, error } = await supabase
    .from('urgent_purchases' as any)
    .update({
      status: 'rejected',
      reviewed_by_user_id: approverId,
      reviewed_at: new Date().toISOString(),
      reviewer_notes: reviewerNotes,
      updated_at: new Date().toISOString(),
    } as any)
    .eq('id', urgentPurchaseId)
    .eq('status', 'pending_approval') // Ensure it's pending before rejecting
    .select() // Select all fields
    .single();

  if (error || !updatedPurchaseData) {
    console.error('Error rejecting urgent purchase:', error);
    throw error || new Error('Failed to reject urgent purchase or not found/not pending.');
  }
  return updatedPurchaseData as unknown as UrgentPurchase; // Changed to unknown first
};


// Renamed and refactored from confirmAndProcessUrgentPurchase
// This function is now called internally after a purchase is 'approved'.
const processApprovedUrgentPurchaseItems = async (
  urgentPurchaseId: string,
  processorUserId: string // User ID of the approver or system user processing
): Promise<void> => {
  const { data: urgentPurchaseData, error: fetchError } = await supabase
    .from('urgent_purchases' as any)
    .select(`
      *,
      urgent_purchase_items (*)
    `)
    .eq('id', urgentPurchaseId)
    .eq('status', 'approved') // Ensure it's approved before processing items
    .single();

  if (fetchError || !urgentPurchaseData) {
    console.error(`Error fetching approved urgent purchase ${urgentPurchaseId} for item processing:`, fetchError);
    throw fetchError || new Error('Approved urgent purchase not found or not in correct state for item processing.');
  }
  const urgentPurchase = urgentPurchaseData as any; // Cast to access properties

  if (!urgentPurchase.urgent_purchase_items || urgentPurchase.urgent_purchase_items.length === 0) {
    console.log(`No items to process for urgent purchase ${urgentPurchaseId}.`);
    // Optionally update status to 'Completed' or similar if no items.
    // For now, it remains 'approved'.
    return;
  }

  const itemsToProcess = urgentPurchase.urgent_purchase_items as UrgentPurchaseItem[];

  for (const item of itemsToProcess) {
    let batchIdToAdjust: string | null = null;
    let changeType: Database['public']['Enums']['inventory_change_type'];

    const { data: inventoryItemData, error: itemDataError } = await supabase
      .from('inventory_items' as any) // Cast for safety
      .select('is_batched')
      .eq('id', item.inventory_item_id)
      .single();

    if (itemDataError || !inventoryItemData) {
        console.error(`Inventory item ${item.inventory_item_id} not found for urgent purchase item ${item.id}`);
        throw itemDataError || new Error(`Inventory item ${item.inventory_item_id} not found.`);
    }
    const invItem = inventoryItemData as any;

    if (invItem.is_batched && item.batch_number) {
      changeType = 'BATCH_STOCK_IN';
      const { data: existingBatchData, error: batchFetchError } = await supabase
        .from('inventory_item_batches' as any) // Cast for safety
        .select('id')
        .eq('inventory_item_id', item.inventory_item_id)
        .eq('batch_number', item.batch_number)
        .maybeSingle();

      if (batchFetchError) {
        console.error('Error fetching batch:', batchFetchError);
        throw batchFetchError;
      }
      const existingBatch = existingBatchData as any;

      if (existingBatch) {
        batchIdToAdjust = existingBatch.id;
      } else {
        const batchToInsert = { // Explicitly define object to avoid type issues
          inventory_item_id: item.inventory_item_id,
          batch_number: item.batch_number,
          expiry_date: item.expiry_date || null,
          quantity_on_hand: 0,
          purchase_price_at_receipt: 0,
        };
        const { data: newBatchData, error: batchInsertError } = await supabase
          .from('inventory_item_batches' as any) // Cast for safety
          .insert(batchToInsert as any)
          .select('id')
          .single();

        if (batchInsertError || !newBatchData) {
          console.error('Error creating new batch:', batchInsertError);
          throw batchInsertError || new Error('Failed to create new batch.');
        }
        batchIdToAdjust = (newBatchData as any).id;
      }
    } else {
      changeType = 'add';
    }

    // Call adjust_inventory_item_quantity RPC
    const { error: adjustError } = await supabase.rpc('adjust_inventory_item_quantity', {
      p_inventory_item_id: item.inventory_item_id,
      p_quantity_change: item.quantity,
      p_change_type: changeType,
      p_user_id: processorUserId, // Corrected: Use the processor's ID
      p_notes: `Urgent purchase approved: ${urgentPurchase.id}. Slip: ${urgentPurchase.slip_filename || 'N/A'}`, // Corrected: Notes
      p_inventory_item_batch_id: batchIdToAdjust === null ? undefined : batchIdToAdjust, // Handle null to undefined
    });

    if (adjustError) {
      console.error(`Error adjusting inventory for item ${item.inventory_item_id}:`, adjustError);
      // Consider marking the urgent purchase with a 'ProcessingFailed' status
      await supabase
        .from('urgent_purchases' as any)
        .update({ status: 'rejected', reviewer_notes: `Item processing failed: ${(adjustError as Error).message}` } as any)
        .eq('id', urgentPurchaseId);
      throw adjustError;
    }
  }

  // All items processed successfully.
  // Optionally, update status to 'Completed' or 'Processed' if desired.
  // For now, it remains 'approved', indicating approval was granted and items were actioned.
  // If a distinct "completed" state is needed:
  // const { error: finalStatusUpdateError } = await supabase
  //   .from('urgent_purchases')
  //   .update({ status: 'completed', updated_at: new Date().toISOString() }) // Assuming 'completed' is in UrgentPurchaseRequestStatus
  //   .eq('id', urgentPurchaseId);
  // if (finalStatusUpdateError) {
  //   console.error('Error updating urgent purchase to completed status:', finalStatusUpdateError);
  //   // Non-critical, log and continue
  // }
  console.log(`Successfully processed items for approved urgent purchase ${urgentPurchaseId}`);
};

// Function to get a specific urgent purchase by ID (e.g., for review page)
export const getUrgentPurchaseById = async (id: string): Promise<UrgentPurchase | null> => {
  const { data: purchaseData, error } = await supabase
    .from('urgent_purchases' as any)
    .select(`
      id,
      slip_image_path,
      slip_filename,
      invoice_delivery_date,
      status,
      confidence_score,
      notes,
      requested_by_user_id,
      requested_at,
      reviewed_by_user_id,
      reviewed_at,
      reviewer_notes,
      updated_at,
      urgent_purchase_items (*)
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error(`Error fetching urgent purchase ${id}:`, error);
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  if (!purchaseData) return null;
  const data = purchaseData as any; // Cast to access properties

  // Ensure the structure matches UrgentPurchase, especially items
  return {
    ...data,
    items: data.urgent_purchase_items || [],
  } as unknown as UrgentPurchase; // Changed to unknown first
};

// Function to list urgent purchases
export const listUrgentPurchases = async (filters?: { status?: UrgentPurchaseRequestStatus, requested_by_user_id?: string }): Promise<UrgentPurchase[]> => {
    let query = supabase
    .from('urgent_purchases' as any)
    .select(`
      id,
      slip_filename,
      invoice_delivery_date,
      status,
      requested_by_user_id,
      requested_at,
      updated_at,
      target_approval_role,
      reviewed_by_user_id,
      reviewed_at,
      reviewer_notes
    `) // Added review fields
    .order('updated_at', { ascending: false }); // Order by updated_at for history

    if (filters?.status) {
        query = query.eq('status', filters.status);
    }
    if (filters?.requested_by_user_id) {
        query = query.eq('requested_by_user_id', filters.requested_by_user_id);
    }

    const { data: purchaseData, error } = await query;

    if (error) {
        console.error('Error fetching urgent purchases list:', error);
        throw error;
    }
    const data = (purchaseData || []) as any[];
    // Map to ensure items array exists, even if empty, to match UrgentPurchase type
    return data.map(up => ({ ...up, items: [] } as unknown as UrgentPurchase));
};
