import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase';
import { logQuantityUpdate } from '../services/inventoryLogService'; // Keep this
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/AuthContext';

// Removed itemId prop as this component should process the whole invoice
interface InvoiceUploadProps {
  onUploadComplete?: () => void; // Optional callback after processing
}

const InvoiceUpload: React.FC<InvoiceUploadProps> = ({ onUploadComplete }) => {
  // console.log('InvoiceUpload rendered'); // No itemId needed
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth(); // Get user from AuthContext

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const json: any[] = XLSX.utils.sheet_to_json(sheet);

      const invoiceItems = json.map((row: any) => ({
        item_name: row['Item Name'] || row['item_name'],
        quantity: parseInt(row['Quantity'] || row['quantity'], 10),
      }));

      const userId = user?.id; // Get user ID
      if (!userId) {
          toast({ title: 'Error', description: 'User not logged in.', variant: 'destructive' });
          setLoading(false);
          return;
      }

      const result = await updateQuantitiesFromInvoice(invoiceItems, userId); // Pass only items and userId

      toast({
        title: 'Invoice Processed',
        description: `Successfully updated ${result.updatedCount} items. Skipped ${result.skippedCount} items. Failed ${result.failedCount} items.`,
        // Adjust duration based on results?
      });

      // Call the callback if provided
      onUploadComplete?.();

    } catch (err) {
      console.error(err);
      toast({
        title: 'Error Processing Invoice',
        description: 'Could not parse file or update items.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

// Processes the entire invoice, matching by item_name
const updateQuantitiesFromInvoice = async (
  invoiceItems: { item_name: string; quantity: number }[],
  userId: string
): Promise<{ updatedCount: number; skippedCount: number; failedCount: number }> => {
  console.log('updateQuantitiesFromInvoice called with:', { invoiceItems, userId });
  let updatedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  // 1. Filter out invalid invoice items and get unique names
  const validInvoiceItems = invoiceItems.filter(item => {
      const isValid = item.item_name && typeof item.item_name === 'string' && !isNaN(item.quantity) && item.quantity > 0;
      if (!isValid) {
          console.warn(`Skipping invalid entry from invoice: Name='${item.item_name}', Quantity='${item.quantity}'`);
          skippedCount++;
      }
      return isValid;
  });
  const itemNamesFromInvoice = [...new Set(validInvoiceItems.map(item => item.item_name.trim()))]; // Trim names

  if (itemNamesFromInvoice.length === 0) {
      console.log("No valid items found in the invoice to process.");
      return { updatedCount, skippedCount, failedCount };
  }

  // 2. Fetch existing items from DB matching the names
  console.log(`Fetching existing items for names: ${itemNamesFromInvoice.join(', ')}`);
  const { data: existingItems, error: fetchError } = await supabase
    .from('inventory_items')
    .select('id, item_name, quantity')
    .in('item_name', itemNamesFromInvoice);

  if (fetchError) {
    console.error('Error fetching existing inventory items:', fetchError);
    // Treat all as failed if we can't fetch
    failedCount = validInvoiceItems.length;
    return { updatedCount, skippedCount, failedCount };
  }

  // 3. Create a map for quick lookup (handle potential duplicate names in DB if necessary, here assuming unique)
  const existingItemMap = new Map(existingItems.map(item => [item.item_name, item]));
  console.log('Existing items map:', existingItemMap);

  // 4. Iterate through valid invoice items and prepare updates
  const updatePromises = [];

  for (const invoiceItem of validInvoiceItems) {
    const trimmedName = invoiceItem.item_name.trim();
    const existingItem = existingItemMap.get(trimmedName);

    if (!existingItem) {
      console.warn(`Item "${trimmedName}" from invoice not found in database. Skipping.`);
      skippedCount++;
      continue;
    }

    const oldQuantity = existingItem.quantity ?? 0;
    // const quantityToAdd = invoiceItem.quantity; // No longer needed for calculation
    const newQuantity = invoiceItem.quantity; // Use the quantity from the invoice directly

    console.log(`Preparing update for item ID ${existingItem.id} (${trimmedName}): Setting quantity to ${newQuantity} (was ${oldQuantity})`);

    // Use an async IIFE to handle update and log sequentially with try/catch
    updatePromises.push(
      (async () => {
          try {
              // Attempt DB Update
              const { error: updateError } = await supabase
                  .from('inventory_items')
                  .update({ quantity: newQuantity })
                  .eq('id', existingItem.id)
                  .select() // Add select to potentially get updated data or confirm success
                  .single(); // Use single if expecting one row updated

              if (updateError) {
                  // Throw the error to be caught by the outer catch block
                  throw new Error(`DB update failed: ${updateError.message}`);
              }

              // DB Update successful
              console.log(`Successfully updated item "${trimmedName}" (ID: ${existingItem.id}) to quantity ${newQuantity}`);
              updatedCount++; // Increment success count here

              // Attempt Logging (inside the same try block, after successful update)
              try {
                  await logQuantityUpdate(existingItem.id, oldQuantity, newQuantity, userId);
                  console.log(`Successfully logged update for item ID ${existingItem.id}`);
              } catch (logError: any) {
                  // Log the logging error but don't fail the overall operation for this item
                  console.error(`Failed to log quantity update for item "${trimmedName}" (ID: ${existingItem.id}) after successful DB update:`, logError.message || logError);
                  // Optional: Add a separate counter for logging failures if needed
              }

          } catch (error: any) {
              // Catch errors from DB update or unexpected issues
              console.error(`Error processing item "${trimmedName}" (ID: ${existingItem.id}):`, error.message || error);
              failedCount++; // Increment failed count for this item
              // Ensure updatedCount is not incremented if the DB update failed
              if (updatedCount > 0 && error.message.includes('DB update failed')) {
                 // This check is a bit fragile; ideally, track success state per item
                 // For simplicity, we assume if an error is caught here, updatedCount wasn't incremented for this item yet,
                 // unless the error happened during logging after a successful update.
              }
          }
      })() // Immediately invoke the async function
    );
  }

  // 5. Execute all updates
  await Promise.all(updatePromises);

  console.log('Invoice processing finished.', { updatedCount, skippedCount, failedCount });
  return { updatedCount, skippedCount, failedCount };
};

  return (
    <div className="space-y-2 border p-4 rounded-md shadow-sm">
      <label htmlFor="invoice-upload" className="block text-sm font-medium text-gray-700">
        Upload Invoice (CSV/Excel)
      </label>
      <Input
        id="invoice-upload"
        type="file"
        accept=".csv,.xlsx,.xls"
        onChange={handleFileUpload}
        disabled={loading} // Disable while processing
        className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
      />
      {loading && <p className="text-sm text-blue-600 mt-2">Processing invoice...</p>}
    </div>
  );
};

export default InvoiceUpload;
