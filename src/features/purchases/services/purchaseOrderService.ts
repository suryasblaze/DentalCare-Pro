// src/features/purchases/services/purchaseOrderService.ts
import { supabase } from '@/lib/supabase';
import type { Database } from '../../../../supabase_types'; // Adjusted path assuming supabase_types.ts is at root
import { PurchaseOrderDTO, PurchaseOrder, SupplierSelectItem, InventoryItemSelectItem } from '../types';
import { CreatePurchaseOrderInput, PurchaseOrderItemInput } from '../schemas/purchaseOrderSchemas'; // Corrected import name
import { PurchaseOrderDetailsView, PurchaseOrderItemDetails } from '../pages/PurchaseOrderDetailPage'; // Import detail types
// Removed unused useAuth import
import { v4 as uuidv4 } from 'uuid'; // Need uuid for unique file names

// Define the expected status enum type explicitly
type PurchaseOrderStatus = 'Pending' | 'Approved' | 'Ordered' | 'Partially Received' | 'Received' | 'Cancelled';

export const getPurchaseOrders = async (): Promise<PurchaseOrder[]> => {
  const { data, error } = await supabase
    .from('purchase_orders')
    .select(`
      id,
      po_number,
      order_date,
      expected_delivery_date,
      status,
      total_amount,
      notes,
      created_at,
      updated_at,
      supplier_id,
      created_by,
      suppliers (
        name
      )
    `)
    .order('order_date', { ascending: false });

  if (error) {
    console.error('Error fetching purchase orders:', error);
    throw error;
  }

  // Transform DTO to PurchaseOrder type with explicit status casting
  return (data || []).map((poDTO: any): PurchaseOrder => ({ // Use any for input DTO to avoid initial type conflict
    id: poDTO.id,
    po_number: poDTO.po_number,
    supplier_id: poDTO.supplier_id,
    supplier_name: poDTO.suppliers?.name || 'N/A',
    order_date: poDTO.order_date,
    expected_delivery_date: poDTO.expected_delivery_date,
    status: poDTO.status as PurchaseOrderStatus, // Cast status explicitly
    total_amount: poDTO.total_amount,
    notes: poDTO.notes,
    created_by: poDTO.created_by,
    created_at: poDTO.created_at,
    updated_at: poDTO.updated_at,
  }));
};

export const getSuppliersForSelect = async (): Promise<SupplierSelectItem[]> => {
  // console.log('Attempting to fetch suppliers for select...'); // Keep console logs if helpful for debugging
  const { data, error } = await supabase
    .from('suppliers')
    .select('id, name')
    .order('name');

  if (error) {
    console.error('Error fetching suppliers from Supabase:', error);
    throw error;
  }

  // console.log('Raw data received from Supabase for suppliers:', data);

  if (!data) {
    // console.warn('No data returned for suppliers, but no error. Returning empty array.');
    return [];
  }

  const mappedData = data.map(s => ({ value: s.id, label: s.name }));
  // console.log('Mapped suppliers for select:', mappedData);
  return mappedData;
};

export const getInventoryItemsForSelect = async (): Promise<InventoryItemSelectItem[]> => {
  // console.log('Attempting to fetch inventory items for select...');
  const { data, error } = await supabase
    .from('inventory_items')
    .select('id, item_name, category, is_batched, item_code') // Added item_code
    .order('item_name');

  if (error) {
    console.error('Error fetching inventory items from Supabase:', error);
    throw error; // This will trigger the catch in Promise.all
  }

  // console.log('Raw data received from Supabase for inventory items:', data);

  if (!data) {
    // console.warn('No data returned for inventory items, but no error. Returning empty array.');
    return [];
  }

  // Explicitly type the mapped data to match InventoryItemSelectItem
  const mappedData: InventoryItemSelectItem[] = data.map(i => ({
    value: i.id,
    label: i.item_name,
    category: i.category || undefined,
    is_batched: i.is_batched || false,
    item_code: i.item_code || null, // Added item_code, ensure it's null if missing
  }));
  // console.log('Mapped inventory items for select:', mappedData);
  return mappedData;
};

// Define types matching the database table insert structure more closely
type PurchaseOrderInsert = Database['public']['Tables']['purchase_orders']['Insert'];
type PurchaseOrderItemInsert = Database['public']['Tables']['purchase_order_items']['Insert'];


export const createPurchaseOrder = async (
  poData: CreatePurchaseOrderInput,
  userId?: string
): Promise<{ id: string; po_number: string }> => {
  const { data: poNumberData, error: poNumberError } = await supabase.rpc('generate_po_number');
  if (poNumberError || !poNumberData) {
    console.error('Error generating PO number:', poNumberError);
    throw poNumberError || new Error('Failed to generate PO number.');
  }
  const newPoNumber = poNumberData as string;

  // Prepare header payload matching PurchaseOrderInsert type
  const poHeaderPayload: PurchaseOrderInsert = {
    po_number: newPoNumber,
    supplier_id: poData.supplier_id,
    order_date: poData.order_date.toISOString().split('T')[0],
    expected_delivery_date: poData.expected_delivery_date
      ? poData.expected_delivery_date.toISOString().split('T')[0]
      : null,
    notes: poData.notes || null, // Ensure null if empty
    status: 'Pending', // Default status
    created_by: userId || null, // Ensure null if undefined
    // total_amount is calculated by trigger, not inserted here
  };

  const { data: newPo, error: poError } = await supabase
    .from('purchase_orders')
    .insert(poHeaderPayload)
    .select('id, po_number')
    .single();

  if (poError || !newPo) {
    console.error('Error creating purchase order header:', poError);
    throw poError || new Error('Failed to create purchase order header.');
  }

  // Prepare items payload matching PurchaseOrderItemInsert[] type
  const poItemsPayload: PurchaseOrderItemInsert[] = poData.items.map(item => ({
    purchase_order_id: newPo.id, // Now non-optional as newPo.id exists
    inventory_item_id: item.inventory_item_id,
    description: item.description || null, // Ensure null if empty
    quantity_ordered: item.quantity_ordered,
    unit_price: item.unit_price,
    // quantity_received and subtotal are handled by DB/triggers
  }));

  const { error: itemsError } = await supabase
    .from('purchase_order_items')
    .insert(poItemsPayload); // Pass the correctly typed array

  if (itemsError) {
    console.error('Error creating purchase order items:', itemsError);
    // Attempt to rollback PO header creation
    await supabase.from('purchase_orders').delete().match({ id: newPo.id });
    throw itemsError;
  }

  return { id: newPo.id, po_number: newPo.po_number };
};


export const getPurchaseOrderById = async (id: string): Promise<PurchaseOrderDetailsView | null> => {
  const { data: poData, error: poError } = await supabase
    .from('purchase_orders')
    .select(`
      id,
      po_number,
      order_date,
      expected_delivery_date,
      status,
      total_amount,
      notes,
      created_at,
      updated_at,
      supplier_id,
      created_by,
      suppliers ( name )
    `)
    .eq('id', id)
    .single();

  if (poError) {
    console.error(`Error fetching purchase order ${id}:`, poError);
    if (poError.code === 'PGRST116') { // Code for "Not found"
        return null;
    }
    throw poError;
  }
  if (!poData) return null;

  const { data: itemsData, error: itemsError } = await supabase
    .from('purchase_order_items')
    .select(`
      id,
      inventory_item_id,
      description,
      quantity_ordered,
      quantity_received,
      unit_price,
      subtotal,
      inventory_items ( item_name )
    `)
    .eq('purchase_order_id', id);

  if (itemsError) {
    console.error(`Error fetching items for purchase order ${id}:`, itemsError);
    throw itemsError;
  }

  const transformedItems: PurchaseOrderItemDetails[] = (itemsData || []).map((item: any) => ({ // Add null check for itemsData
    id: item.id,
    inventory_item_id: item.inventory_item_id,
    description: item.description || item.inventory_items?.item_name || 'N/A',
    product_name: item.inventory_items?.item_name || 'N/A', // Add product name if needed separately
    quantity_ordered: item.quantity_ordered,
    quantity_received: item.quantity_received,
    unit_price: item.unit_price,
    subtotal: item.subtotal,
  }));

  return {
    ...poData,
    supplier_name: poData.suppliers?.name || 'N/A',
    items: transformedItems,
    status: poData.status as PurchaseOrderStatus, // Cast status here as well
  } as PurchaseOrderDetailsView;
};


// Use the Args type directly from Database types for the payload
type ReceiveItemPayload = Database['public']['Functions']['handle_receive_po_item_batch']['Args'];

export const receivePurchaseOrderItemBatch = async (payload: ReceiveItemPayload): Promise<void> => {
  // Call the RPC. Cast problematic args to 'any' to bypass incorrect type def if necessary.
  const { data, error } = await supabase.rpc('handle_receive_po_item_batch', {
    p_po_item_id: payload.p_po_item_id,
    p_quantity_received: payload.p_quantity_received,
    p_batch_number: payload.p_batch_number as any, // Cast if type def is string instead of string | null
    p_expiry_date: payload.p_expiry_date as any, // Cast if type def is string instead of string | null
    p_purchase_price: payload.p_purchase_price,
    p_received_by_user_id: payload.p_received_by_user_id,
  });

  if (error) {
    console.error('Error receiving PO item batch via RPC:', error);
    throw error;
  }
  // RPC returns batch ID, but we don't use it here, so no return needed.
};

// Function to update the quantity_received on the purchase_order_items table
// This might be redundant if handle_receive_po_item_batch already handles it via trigger/logic
// Keeping it for now, but verify if it's still needed.
export const updatePOItemQuantityReceived = async (poItemId: string, quantityReceivedNow: number): Promise<void> => {
    const { data: currentItem, error: fetchError } = await supabase
        .from('purchase_order_items')
        .select('quantity_received')
        .eq('id', poItemId)
        .single();

    if (fetchError || !currentItem) {
        console.error('Error fetching current PO item quantity:', fetchError);
        throw fetchError || new Error('PO Item not found');
    }

    const newQuantityReceived = (currentItem.quantity_received || 0) + quantityReceivedNow;

    const { error: updateError } = await supabase
        .from('purchase_order_items')
        .update({ quantity_received: newQuantityReceived })
        .eq('id', poItemId);

    if (updateError) {
        console.error('Error updating PO item quantity received:', updateError);
        throw updateError;
    }
};


export const uploadInvoiceForPO = async (
    poId: string,
    poNumber: string,
    file: File,
    userId?: string
): Promise<{ storage_path: string }> => {
    if (!userId) {
        throw new Error("User must be logged in to upload invoices.");
    }
    if (!file) {
        throw new Error("No file selected for upload.");
    }

    const fileExtension = file.name.split('.').pop();
    const uniqueFileName = `${uuidv4()}.${fileExtension}`;
    const filePath = `purchase_invoices/${poNumber}/${uniqueFileName}`;

    // 1. Upload file to Supabase Storage
    const { error: uploadError } = await supabase.storage
        .from('invoices') // Assuming bucket name is 'invoices'
        .upload(filePath, file);

    if (uploadError) {
        console.error('Error uploading invoice file:', uploadError);
        throw uploadError;
    }

    // 2. Create record in the 'invoices' table
    const { error: dbError } = await supabase
        .from('invoices')
        .insert({
            file_name: file.name,
            storage_path: filePath,
            uploaded_by_user_id: userId,
            purchase_order_id: poId,
            // supplier_id, invoice_date, total_amount might be needed depending on schema
        });

    if (dbError) {
        console.error('Error saving invoice record to database:', dbError);
        // Attempt rollback of storage upload
        await supabase.storage.from('invoices').remove([filePath]);
        throw dbError;
    }

    return { storage_path: filePath };
};

// Define a type for the Invoice record for better type safety
type InvoiceRow = Database['public']['Tables']['invoices']['Row'];

// Function to get invoices associated with a PO
export const getInvoicesForPO = async (poId: string): Promise<Partial<InvoiceRow>[]> => { // Return partial rows
    const { data, error } = await supabase
        .from('invoices')
        .select('id, file_name, storage_path, uploaded_at, uploaded_by_user_id') // Select specific fields
        .eq('purchase_order_id', poId)
        .order('uploaded_at', { ascending: false });

    if (error) {
        console.error('Error fetching invoices for PO:', error);
        throw error;
    }
    return data || [];
};

// Function to get a temporary signed URL for downloading an invoice
export const getInvoiceDownloadUrl = async (storagePath: string): Promise<string | null> => {
    const { data, error } = await supabase.storage
        .from('invoices')
        .createSignedUrl(storagePath, 60 * 5); // URL valid for 5 minutes

    if (error) {
        console.error('Error creating signed URL:', error);
        return null;
    }
    return data?.signedUrl || null;
};

// Function to update the status of a Purchase Order
export const updatePurchaseOrderStatus = async (poId: string, newStatus: PurchaseOrderStatus): Promise<void> => {
    const { error } = await supabase
        .from('purchase_orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() }) // Also update updated_at
        .eq('id', poId);

    if (error) {
        console.error(`Error updating purchase order ${poId} status to ${newStatus}:`, error);
        throw error;
    }
};
/**
 * Sets a maintenance interval for a purchase order item
 * @param poItemId The ID of the purchase order item
 * @param interval The maintenance interval details
 * @param userId Optional user ID of who set the interval
 */
export const setMaintenanceInterval = async (
  poItemId: string,
  interval: MaintenanceInterval,
  userId?: string
): Promise<void> => {
  if (!poItemId) {
    throw new Error("Purchase order item ID is required");
  }
  
  // First, get the purchase order item to ensure it exists
  const { data: poItem, error: fetchError } = await supabase
    .from('purchase_order_items')
    .select('id, inventory_item_id')
    .eq('id', poItemId)
    .single();
    
  if (fetchError || !poItem) {
    console.error('Error fetching purchase order item:', fetchError);
    throw fetchError || new Error('Purchase order item not found');
  }
  
  // Update the inventory item with maintenance interval information
  const { error: updateError } = await supabase
    .from('inventory_items')
    .update({
      maintenance_interval: interval,
      maintenance_interval_set_by: userId || null,
      maintenance_interval_set_at: new Date().toISOString(),
      next_maintenance_due_date: calculateNextMaintenanceDate(interval)
    })
    .eq('id', poItem.inventory_item_id);
    
  if (updateError) {
    console.error('Error setting maintenance interval:', updateError);
    throw updateError;
  }
};

/**
 * Calculates the next maintenance date based on the interval
 * @param interval The maintenance interval
 * @returns ISO string date for the next maintenance
 */
const calculateNextMaintenanceDate = (interval: MaintenanceInterval): string => {
  const now = new Date();
  const { interval_value, interval_unit } = interval;
  
  switch (interval_unit) {
    case 'days':
      now.setDate(now.getDate() + interval_value);
      break;
    case 'weeks':
      now.setDate(now.getDate() + (interval_value * 7));
      break;
    case 'months':
      now.setMonth(now.getMonth() + interval_value);
      break;
    case 'years':
      now.setFullYear(now.getFullYear() + interval_value);
      break;
  }
  
  return now.toISOString().split('T')[0]; // Return YYYY-MM-DD format
};

/**
 * Gets all inventory items that are due for maintenance
 * @param daysWarning Optional number of days in advance to include items approaching maintenance
 * @returns Array of inventory items due for maintenance
 */
export const getItemsDueForMaintenance = async (daysWarning: number = 7): Promise<any[]> => {
  const warningDate = new Date();
  warningDate.setDate(warningDate.getDate() + daysWarning);
  const warningDateStr = warningDate.toISOString().split('T')[0];
  
  const { data, error } = await supabase
    .from('inventory_items')
    .select(`
      id,
      item_name,
      item_code,
      category,
      next_maintenance_due_date,
      maintenance_interval,
      purchase_order_items (
        purchase_order_id,
        purchase_orders (
          po_number
        )
      )
    `)
    .not('next_maintenance_due_date', 'is', null)
    .lte('next_maintenance_due_date', warningDateStr)
    .order('next_maintenance_due_date');
    
  if (error) {
    console.error('Error fetching items due for maintenance:', error);
    throw error;
  }
  
  return data || [];
};