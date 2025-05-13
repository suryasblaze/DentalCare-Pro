// src/features/purchases/services/invoiceService.ts
import { supabase } from '@/lib/supabase';
import { Database } from '../../../../supabase_types'; // Adjusted path to root

// TODO: Regenerate Supabase types if `Database['public']['Tables']['invoices']['Insert']` is missing expected fields.
// Temporary type definition for InvoiceTableInsert assuming expected fields.
// Replace this with the generated type once `supabase_types.ts` is updated.
interface TempInvoiceInsert {
  supplier_id?: string | null; // Assuming it's optional or will be fetched/set
  invoice_number?: string | null; // Common field
  invoice_date?: string | null; // YYYY-MM-DD
  due_date?: string | null; // YYYY-MM-DD
  total_amount?: number | null;
  status?: string | null; // e.g., 'pending', 'paid', 'overdue'
  notes?: string | null;
  purchase_order_id?: string | null; // Already in supabase_types.ts but included for completeness
  invoice_url?: string | null; // For storage path, already in supabase_types.ts as storage_path or similar
  // Supabase auto-generated fields like id, created_at are usually not in Insert type
  file_name?: string; // from supabase_types
  storage_path?: string; // from supabase_types
  uploaded_by_user_id?: string | null; // from supabase_types
  inventory_item_id?: string | null; // from supabase_types
}

export type InvoiceTableInsert = TempInvoiceInsert; // Use temporary type
// export type InvoiceTableInsert = Database['public']['Tables']['invoices']['Insert']; // Original, use when types are fixed
export type InvoiceTableUpdate = Database['public']['Tables']['invoices']['Update']; // Assuming Update might also be affected
export type InvoiceTableRow = Database['public']['Tables']['invoices']['Row'];

const INVOICE_STORAGE_BUCKET = 'purchase_invoices'; // Ensure this bucket exists in Supabase Storage

/**
 * Uploads an invoice file to Supabase Storage.
 * @param file The invoice file to upload.
 * @param poNumber Optional purchase order number to help organize storage path.
 * @returns The path to the uploaded file in storage.
 */
export const uploadInvoiceFile = async (file: File, poNumber?: string): Promise<string> => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${poNumber ? poNumber + '_' : ''}${Date.now()}.${fileExt}`;
  const filePath = `${fileName}`; // Keep it simple at the root of the bucket for now

  const { data, error } = await supabase.storage
    .from(INVOICE_STORAGE_BUCKET)
    .upload(filePath, file, {
      cacheControl: '3600', // Optional: Cache control for the uploaded file
      upsert: false, // Do not overwrite if file with same name exists (timestamp should make it unique)
    });

  if (error) {
    console.error('Error uploading invoice file:', error);
    throw new Error(`Failed to upload invoice file: ${error.message}`);
  }

  if (!data || !data.path) {
    console.error('No path returned from storage upload');
    throw new Error('Failed to upload invoice file: No path returned.');
  }
  
  return data.path;
};


/**
 * Creates a new invoice record in the database.
 * @param invoiceData Data for the new invoice.
 * @returns The created invoice row.
 */
export const createInvoiceRecord = async (
  invoiceData: Omit<InvoiceTableInsert, 'id' | 'created_at' | 'invoice_url'> & { file_path: string, purchase_order_id: string }
): Promise<InvoiceTableRow> => {
  const { data, error } = await supabase
    .from('invoices')
    .insert({
      supplier_id: invoiceData.supplier_id, // This needs to be determined or passed
      invoice_date: invoiceData.invoice_date,
      total_amount: invoiceData.total_amount,
      status: invoiceData.status || 'pending', // Default status
      notes: invoiceData.notes,
      purchase_order_id: invoiceData.purchase_order_id,
      invoice_url: invoiceData.file_path, // Store the storage path as invoice_url
      // created_by will be set by RLS or default if applicable
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating invoice record:', error);
    throw new Error(`Failed to create invoice record: ${error.message}`);
  }
  if (!data) {
    throw new Error('Failed to create invoice record: No data returned.');
  }
  return data;
};

// You might also need functions to get public URL for a stored file if you want to display it
export const getInvoicePublicUrl = (filePath: string): string | null => {
    if (!filePath) return null;
    const { data } = supabase.storage.from(INVOICE_STORAGE_BUCKET).getPublicUrl(filePath);
    return data?.publicUrl || null;
};
