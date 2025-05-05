import React, { useEffect, useState } from 'react'; // Import useState
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { SubmitHandler } from 'react-hook-form'; // Remove FieldValues again
import { ScrollArea } from '@/components/ui/scroll-area'; // Import ScrollArea

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/AuthContext'; // Import useAuth
import { uploadInvoice } from '../services/invoiceService'; // Import uploadInvoice service

import { InventoryItem, NewInventoryItem, UpdateInventoryItem, InventoryItemCategory, InventoryItemRow, StockStatus } from '../types';
import { addInventoryItem, updateInventoryItem } from '../services/inventoryService';

// Helper function to calculate stock status
const calculateStockStatus = (item: InventoryItemRow): StockStatus => {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize today's date to midnight for comparison

  if (item.expiry_date) {
    const expiryDate = new Date(item.expiry_date);
     expiryDate.setHours(0, 0, 0, 0); // Normalize expiry date
    if (expiryDate < today) {
      return 'Expired';
    }
  }
  // Use nullish coalescing as quantity/threshold might be null if DB schema changed unexpectedly
  if ((item.quantity ?? 0) <= (item.low_stock_threshold ?? 0)) {
    return 'Low Stock';
  }
  return 'In Stock';
};


// Validation Schema using Zod
const inventoryItemSchema = z.object({
  item_name: z.string().min(1, { message: 'Item name is required' }),
  category: z.enum(['Medicines', 'Tools', 'Consumables'], { required_error: 'Category is required' }), // Add 'Tools'
  quantity: z.coerce.number().int().min(0, { message: 'Quantity must be 0 or greater' }),
  expiry_date: z.string().optional().nullable(), // Optional date string (YYYY-MM-DD)
  supplier_info: z.string().optional().nullable(),
  purchase_price: z.coerce.number().min(0, { message: 'Price must be 0 or greater' }).optional().nullable(),
  low_stock_threshold: z.coerce.number().int().min(0, { message: 'Threshold must be 0 or greater' }),
});

// Infer the type from the schema
type InventoryItemFormData = z.infer<typeof inventoryItemSchema>;

interface InventoryItemFormProps {
  itemToEdit?: InventoryItemRow | null; // Use InventoryItemRow from DB
  onSave: (savedItem: InventoryItem) => void; // Callback expects calculated status
  onCancel: () => void;
}

const InventoryItemForm: React.FC<InventoryItemFormProps> = ({ itemToEdit, onSave, onCancel }) => {
  const { toast } = useToast();
  const { user } = useAuth(); // Get user context
  const [selectedInvoiceFile, setSelectedInvoiceFile] = useState<File | null>(null); // State for the invoice file
  const isEditMode = !!itemToEdit;
  // Use the full category list from the type definition
  const categories: InventoryItemCategory[] = ['Medicines', 'Tools', 'Consumables'];

  // Helper to safely cast category string to enum type
  const getValidCategory = (category?: string | null): InventoryItemCategory | undefined => {
      if (category && categories.includes(category as InventoryItemCategory)) {
          return category as InventoryItemCategory;
      }
      return undefined;
  }

  // Format date for input type="date"
  const formatDateForInput = (dateString: string | null | undefined): string | undefined => {
      if (!dateString) return undefined;
      try {
          return new Date(dateString).toISOString().split('T')[0];
      } catch (e) {
          return undefined; // Handle invalid date string gracefully
      }
  };

  const form = useForm<InventoryItemFormData>({
    resolver: zodResolver(inventoryItemSchema),
    defaultValues: {
      item_name: itemToEdit?.item_name ?? '',
      category: getValidCategory(itemToEdit?.category), // Use helper
      quantity: Number(itemToEdit?.quantity ?? 0),
      expiry_date: formatDateForInput(itemToEdit?.expiry_date),
      supplier_info: itemToEdit?.supplier_info ?? '', // Use empty string
      purchase_price: itemToEdit?.purchase_price ? Number(itemToEdit.purchase_price) : null,
      low_stock_threshold: Number(itemToEdit?.low_stock_threshold ?? 10),
    },
  });

  // Explicitly type handleSubmit and control
  const { handleSubmit, control, reset } = form;

   // Reset form if itemToEdit changes
   useEffect(() => {
     if (itemToEdit) {
       reset({
         item_name: itemToEdit.item_name,
         category: getValidCategory(itemToEdit.category), // Use helper
         quantity: Number(itemToEdit.quantity ?? 0),
         expiry_date: formatDateForInput(itemToEdit.expiry_date),
         supplier_info: itemToEdit.supplier_info ?? '',
         purchase_price: itemToEdit.purchase_price ? Number(itemToEdit.purchase_price) : null,
         low_stock_threshold: Number(itemToEdit.low_stock_threshold ?? 10),
       });
     } else {
       // Reset to default empty/initial values when adding new
       reset({
         item_name: '',
         category: undefined,
         quantity: 0,
         expiry_date: '',
         supplier_info: '',
         purchase_price: null,
         low_stock_threshold: 10,
       });
     }
   }, [itemToEdit, reset]);

   const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
       if (event.target.files && event.target.files[0]) {
           setSelectedInvoiceFile(event.target.files[0]);
       } else {
           setSelectedInvoiceFile(null);
       }
   };


  const onSubmit: SubmitHandler<InventoryItemFormData> = async (formData) => {
    if (!user) {
        toast({ title: 'Error', description: 'You must be logged in to save items.', variant: 'destructive' });
        return;
    }

    let savedItemRow: InventoryItemRow | null = null; // Initialize as null

    try {
      const dataToSave = {
        ...formData,
        // Ensure null for empty optional fields if needed by DB/type
        expiry_date: formData.expiry_date || null, // Ensure null if empty string
        supplier_info: formData.supplier_info || null, // Ensure null if empty string
        purchase_price: formData.purchase_price ?? null,
      };

      if (isEditMode && itemToEdit) {
        savedItemRow = await updateInventoryItem(itemToEdit.id, dataToSave as UpdateInventoryItem);
        toast({ title: 'Success', description: 'Inventory item updated.' });
      } else {
        savedItemRow = await addInventoryItem(dataToSave as NewInventoryItem);
        toast({ title: 'Success', description: 'New inventory item added.' });

        // --- Upload Invoice if selected ---
        if (selectedInvoiceFile && savedItemRow) {
            try {
                console.log(`Uploading invoice for new item ID: ${savedItemRow.id}`);
                await uploadInvoice(selectedInvoiceFile, user.id, savedItemRow.id);
                toast({ title: 'Invoice Uploaded', description: `Invoice "${selectedInvoiceFile.name}" uploaded successfully.` });
            } catch (uploadError) {
                console.error('Invoice upload failed after item creation:', uploadError);
                // Show a warning toast, but don't fail the whole operation as the item was created
                toast({
                    title: 'Warning',
                    description: `Item was added, but invoice upload failed: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`,
                    variant: 'default', // Use default or warning variant
                    duration: 7000, // Longer duration for warning
                });
            }
        }
        // --- End Invoice Upload ---

      }

      // Ensure savedItemRow is not null before proceeding
      if (!savedItemRow) {
          throw new Error("Failed to get saved item data.");
      }

      // Calculate status and create the full InventoryItem object
      const finalItem: InventoryItem = {
        ...savedItemRow,
        stock_status: calculateStockStatus(savedItemRow),
      };

      onSave(finalItem); // Pass back the item with calculated status
      setSelectedInvoiceFile(null); // Clear file input state on success

    } catch (error) {
      console.error('Failed to save inventory item:', error);
      toast({
        title: 'Error',
        description: `Failed to save item: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    }
  };

  return (
    // Pass the correctly typed form instance
    <Form {...form}>
      {/* Pass the correctly typed onSubmit handler */}
      {/* Make the form flex column to contain scroll area and buttons */}
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full">
        {/* Wrap form fields in ScrollArea */}
        <ScrollArea className="flex-grow pr-6"> {/* Add padding-right for scrollbar */}
          <div className="space-y-4"> {/* Add inner div for spacing */}
            <FormField
              control={control as any} // Cast control to any as workaround
              name="item_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Item Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Amoxicillin 500mg" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control as any} // Cast control to any as workaround
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select onValueChange={field.onChange} value={field.value ?? ''} defaultValue={field.value ?? ''}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <FormField
            control={control as any} // Cast control to any as workaround
            name="quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quantity</FormLabel>
                <FormControl>
                  {/* Ensure value is string for input */}
                  <Input type="number" min="0" placeholder="0" {...field} value={String(field.value ?? '')} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control as any} // Cast control to any as workaround
            name="low_stock_threshold"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Low Stock Threshold</FormLabel>
                <FormControl>
                   {/* Ensure value is string for input */}
                  <Input type="number" min="0" placeholder="10" {...field} value={String(field.value ?? '')} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Row for Expiry Date and Purchase Price */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={control as any} // Cast control to any as workaround
            name="expiry_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Expiry Date (Optional)</FormLabel>
              <FormControl>
                 {/* Use type="date" for native date picker */}
                <Input type="date" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
          />

          <FormField
            control={control as any} // Cast control to any as workaround
            name="purchase_price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Purchase Price (Optional)</FormLabel>
              <FormControl>
                 {/* Ensure value is string for input */}
                <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} value={String(field.value ?? '')} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
          />
        </div> {/* Close Expiry/Price row */}

        {/* Row for Supplier Info and Attach Invoice */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start"> {/* Use items-start for alignment */}
          <FormField
            control={control as any} // Cast control to any as workaround
            name="supplier_info"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Supplier Info (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Supplier Name, Contact" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
          />

          {/* Add Invoice Upload Field - Only show when ADDING new item */}
          {!isEditMode && (
            <FormItem className="md:pt-[28px]"> {/* Add padding-top on medium screens to align with label */}
                {/* <FormLabel>Attach Invoice (Optional)</FormLabel> */} {/* Label removed for better alignment */}
                <FormControl>
                    <Input
                        type="file"
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.jpg,.jpeg,.png" // Define acceptable file types
                        onChange={handleFileChange}
                        className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                </FormControl>
                {selectedInvoiceFile && (
                    <p className="text-xs text-muted-foreground mt-1">Selected: {selectedInvoiceFile.name}</p>
                )}
                {/* No FormMessage needed unless you add specific validation */}
            </FormItem>
          )}
        </div> {/* Close Supplier/Invoice row */}
          </div> {/* Close inner spacing div */}
        </ScrollArea> {/* Close ScrollArea */}

        {/* Buttons container - keep outside ScrollArea, prevent shrinking */}
        <div className="flex justify-end space-x-2 pt-4 flex-shrink-0">
          <Button type="button" variant="outline" onClick={() => { setSelectedInvoiceFile(null); onCancel(); }}> {/* Clear file on cancel */}
            Cancel
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Saving...' : (isEditMode ? 'Update Item' : 'Add Item')}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default InventoryItemForm;
