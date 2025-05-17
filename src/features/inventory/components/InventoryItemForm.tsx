import React, { useEffect, useState } from 'react'; // Import useState
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { SubmitHandler } from 'react-hook-form';
import { ScrollArea } from '@/components/ui/scroll-area'; // Import ScrollArea
import { UploadCloudIcon } from 'lucide-react'; // Import the icon

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label'; // Keep Label if used, otherwise remove
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/AuthContext'; // Import useAuth
import { uploadInvoice } from '../services/invoiceService'; // Import uploadInvoice service

import { InventoryItem, NewInventoryItem, UpdateInventoryItem, InventoryItemCategory, InventoryItemRow, StockStatus } from '../types';
import { addInventoryItem, updateInventoryItem } from '../services/inventoryService';


// Validation Schema using Zod (Quantity removed)
const inventoryItemSchema = z.object({
  item_name: z.string().min(1, { message: 'Item name is required' }),
  category: z.enum(['Medicines', 'Tools', 'Consumables'], { required_error: 'Category is required' }),
  supplier_info: z.string().optional().nullable(),
  low_stock_threshold: z.coerce.number().int().min(0, { message: 'Threshold must be 0 or greater' }),
  item_code: z.string().optional().nullable(),
});

// Infer the type from the schema
type InventoryItemFormData = z.infer<typeof inventoryItemSchema>;

interface InventoryItemFormProps {
  itemToEdit?: InventoryItemRow | null;
  onSave: (savedItem: InventoryItemRow) => void;
  onCancel: () => void;
}

const InventoryItemForm: React.FC<InventoryItemFormProps> = ({ itemToEdit, onSave, onCancel }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedInvoiceFile, setSelectedInvoiceFile] = useState<File | null>(null);
  const isEditMode = !!itemToEdit;
  const categories: InventoryItemCategory[] = ['Medicines', 'Tools', 'Consumables'];

  const getValidCategory = (category?: string | null): InventoryItemCategory | undefined => {
      if (category && categories.includes(category as InventoryItemCategory)) {
          return category as InventoryItemCategory;
      }
      return undefined;
  }

  const form = useForm<InventoryItemFormData>({
    resolver: zodResolver(inventoryItemSchema),
    defaultValues: {
      item_name: itemToEdit?.item_name ?? '',
      category: getValidCategory(itemToEdit?.category),
      supplier_info: itemToEdit?.supplier_info ?? '',
      low_stock_threshold: Number(itemToEdit?.low_stock_threshold ?? 10),
      item_code: itemToEdit?.item_code ?? '',
    },
  });

  const { handleSubmit, control, reset } = form;

   useEffect(() => {
     if (itemToEdit) {
       reset({
         item_name: itemToEdit.item_name,
         category: getValidCategory(itemToEdit.category),
         supplier_info: itemToEdit.supplier_info ?? '',
         low_stock_threshold: Number(itemToEdit.low_stock_threshold ?? 10),
         item_code: itemToEdit.item_code ?? '',
       });
     } else {
       reset({
         item_name: '',
         category: undefined,
         supplier_info: '',
         low_stock_threshold: 10,
         item_code: '',
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

    let savedItemRow: InventoryItemRow | null = null;

    try {
      if (isEditMode && itemToEdit) {
        // Prepare update payload (omitting quantity)
        const updatePayload: UpdateInventoryItem = {
           item_name: formData.item_name,
           category: formData.category,
           supplier_info: formData.supplier_info || null,
           low_stock_threshold: formData.low_stock_threshold,
           item_code: formData.item_code || null,
           // photo_url and is_batched might also be updatable depending on requirements
        };
        savedItemRow = await updateInventoryItem(itemToEdit.id, updatePayload);
        toast({ title: 'Success', description: 'Inventory item updated.' });
      } else {
        // Prepare create payload (setting initial quantity to 0)
         const createPayload: NewInventoryItem = {
           item_name: formData.item_name,
           category: formData.category,
           quantity: 0, // Initial quantity is 0
           supplier_info: formData.supplier_info || null,
           low_stock_threshold: formData.low_stock_threshold,
           item_code: formData.item_code || null,
           is_batched: formData.category === 'Medicines', // Example: Default medicines to batched
           photo_url: null, // Explicitly set null if not handled here
           updated_at: null, // Let DB handle this on insert/update
         };
        savedItemRow = await addInventoryItem(createPayload); // Use correct payload
        toast({ title: 'Success', description: 'New inventory item added.' });

        // --- Upload Invoice if selected ---
        if (selectedInvoiceFile && savedItemRow) {
            try {
                console.log(`Uploading invoice for new item ID: ${savedItemRow.id}`);
                // Assuming uploadInvoice service exists and works correctly
                await uploadInvoice(selectedInvoiceFile, user.id, savedItemRow.id);
                toast({ title: 'Invoice Uploaded', description: `Invoice "${selectedInvoiceFile.name}" uploaded successfully.` });
            } catch (uploadError) {
                console.error('Invoice upload failed after item creation:', uploadError);
                toast({
                    title: 'Warning',
                    description: `Item was added, but invoice upload failed: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`,
                    variant: 'default',
                    duration: 7000,
                });
            }
        }
        // --- End Invoice Upload ---
      }

      if (!savedItemRow) {
          throw new Error("Failed to get saved item data.");
      }

      onSave(savedItemRow);
      setSelectedInvoiceFile(null);

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
    <Form {...form}>
      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
        {/* Basic Information Section */}
        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 rounded-md border p-4">
          <h3 className="text-lg font-semibold md:col-span-2">Basic Information</h3>
          <FormField
            control={control}
            name="item_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Item Name *</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Amoxicillin 500mg" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category *</FormLabel>
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

          <FormField
            control={control}
            name="item_code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Item Code/SKU (Optional)</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., MED-001" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="low_stock_threshold"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Low Stock Threshold</FormLabel>
                <FormControl>
                  <Input type="number" min="0" placeholder="10" {...field} value={String(field.value ?? '')} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Supplier Information Section */}
        <div className="md:col-span-2 grid grid-cols-1 gap-4 rounded-md border p-4">
          <h3 className="text-lg font-semibold">Supplier Information</h3>
          <FormField
            control={control}
            name="supplier_info"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Supplier Details (Optional)</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Supplier Name, Contact" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Invoice Upload Section */}
        {!isEditMode && (
          <div className="md:col-span-2 rounded-md border p-4">
            <h3 className="text-lg font-semibold mb-4">Invoice Upload</h3>
            <FormItem>
              <FormLabel>Attach Invoice (Optional)</FormLabel>
              <FormControl>
                <div className="flex items-center justify-center w-full">
                  <label
                    htmlFor="invoice-upload"
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-card hover:bg-muted/50"
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <UploadCloudIcon className="w-8 h-8 mb-4 text-muted-foreground" />
                      <p className="mb-2 text-sm text-muted-foreground">
                        <span className="font-semibold">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-muted-foreground">PDF, DOCX, XLSX, PNG, JPG (MAX. 5MB)</p>
                    </div>
                    <Input
                      id="invoice-upload"
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.jpg,.jpeg,.png"
                      onChange={handleFileChange}
                    />
                  </label>
                </div>
              </FormControl>
              {selectedInvoiceFile && (
                <p className="text-sm text-muted-foreground mt-2 text-center">Selected: {selectedInvoiceFile.name}</p>
              )}
            </FormItem>
          </div>
        )}

        {/* Action Buttons */}
        <div className="md:col-span-2 flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={() => { setSelectedInvoiceFile(null); onCancel(); }}>
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
