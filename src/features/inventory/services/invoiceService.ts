import { supabase } from '@/lib/supabase';
// Correct the import path for Database types
import { Database } from '../../../../supabase_types';

export type InvoiceInsert = Database['public']['Tables']['invoices']['Insert'];
export type InvoiceRow = Database['public']['Tables']['invoices']['Row'];
export type InventoryItemRow = Database['public']['Tables']['inventory_items']['Row'];

// Define a type for the combined invoice and item data
export type InvoiceWithItemName = InvoiceRow & {
  inventory_items: Pick<InventoryItemRow, 'item_name'> | null; // Select 'item_name' from inventory_items
};

/**
 * Uploads an invoice file to Supabase Storage and creates a record in the invoices table.
 * @param file The invoice file to upload.
 * @param userId The ID of the user uploading the file.
 * @param inventoryItemId Optional ID of the inventory item this invoice is associated with (e.g., during creation).
 * @returns The path of the uploaded file in storage.
 * @throws If upload or database insertion fails.
 */
export const uploadInvoice = async (
  file: File,
  userId: string,
  inventoryItemId?: string
): Promise<string> => {
  if (!file) {
    throw new Error('No file provided for upload.');
  }
  if (!userId) {
      throw new Error('User ID is required for upload.');
  }

  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}_${Date.now()}.${fileExt}`;
  const filePath = `invoices/${fileName}`; // Store in a dedicated 'invoices' bucket/folder

  // 1. Upload to Supabase Storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('invoices') // Ensure you have a bucket named 'invoices' in Supabase Storage
    .upload(filePath, file);

  if (uploadError) {
    console.error('Error uploading invoice to storage:', uploadError);
    throw new Error(`Storage upload failed: ${uploadError.message}`);
  }

  console.log('File uploaded successfully to:', uploadData.path);

  // 2. Insert record into the 'invoices' table
  const invoiceRecord: InvoiceInsert = {
    file_name: file.name,
    storage_path: uploadData.path,
    uploaded_by_user_id: userId,
    inventory_item_id: inventoryItemId, // Link to item if provided
  };

  const { data: insertData, error: insertError } = await supabase
    .from('invoices')
    .insert(invoiceRecord)
    .select() // Optionally select the inserted data
    .single(); // Expecting a single row back

  if (insertError) {
    console.error('Error inserting invoice record:', insertError);
    // Attempt to delete the orphaned file from storage if DB insert fails
    await supabase.storage.from('invoices').remove([uploadData.path]);
    console.warn('Orphaned file removed from storage due to DB insert failure:', uploadData.path);
    throw new Error(`Database insert failed: ${insertError.message}`);
  }

  console.log('Invoice record created successfully:', insertData);

  return uploadData.path; // Return the storage path
};

/**
 * Fetches all invoice records from the database, joining with inventory_items to get the item name.
 * Add filtering/pagination as needed for large datasets.
 * @returns {Promise<InvoiceWithItemName[]>} A promise that resolves to an array of invoices with item names.
 */
export const getInvoices = async (): Promise<InvoiceWithItemName[]> => {
    const { data, error } = await supabase
        .from('invoices')
        // Select all columns from invoices and the 'item_name' column from the related inventory_items
        .select(`
            *,
            inventory_items (
                item_name
            )
        `)
        .order('uploaded_at', { ascending: false });

    if (error) {
        console.error('Error fetching invoices with item names:', error);
        throw error;
    }
    return data;
};

/**
 * Generates a signed URL for accessing a private invoice file.
 * Ensure your storage bucket ('invoices') has appropriate RLS policies.
 * @param storagePath The path of the file in Supabase Storage.
 * @param expiresInSeconds The duration the URL should be valid for (default: 60 seconds).
 */
export const getInvoiceDownloadUrl = async (storagePath: string, expiresInSeconds = 60) => {
    const { data, error } = await supabase
        .storage
        .from('invoices')
        .createSignedUrl(storagePath, expiresInSeconds);

    if (error) {
        console.error('Error creating signed URL:', error);
        throw error;
    }
    return data.signedUrl;
};

// Add functions for deleting invoices if needed, respecting RLS policies.
