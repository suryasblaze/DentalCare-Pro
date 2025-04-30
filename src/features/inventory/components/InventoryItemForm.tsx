import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { FieldValues, SubmitHandler } from 'react-hook-form'; // Import SubmitHandler

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/components/ui/use-toast'; // For showing feedback

import { InventoryItem, NewInventoryItem, UpdateInventoryItem, InventoryItemCategory, InventoryItemRow, StockStatus } from '../types'; // Import InventoryItemRow, StockStatus
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
  category: z.enum(['Medicines', 'Tools', 'Consumables'], { required_error: 'Category is required' }),
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
  onCancel: () => void; // Callback to close the form/modal
}

const InventoryItemForm: React.FC<InventoryItemFormProps> = ({ itemToEdit, onSave, onCancel }) => {
  const { toast } = useToast();
  // Use itemToEdit (InventoryItemRow) directly
  const isEditMode = !!itemToEdit;
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


  // Explicitly type the onSubmit handler parameter
  const onSubmit: SubmitHandler<InventoryItemFormData> = async (formData) => {
    try {
      let savedItemRow: InventoryItemRow; // Item returned from DB
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
      }

      // Calculate status and create the full InventoryItem object
      const finalItem: InventoryItem = {
        ...savedItemRow,
        stock_status: calculateStockStatus(savedItemRow),
      };

      onSave(finalItem); // Pass back the item with calculated status

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
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={control} // Pass the correctly typed control
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
          control={control} // Pass the correctly typed control
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
            control={control} // Pass the correctly typed control
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
            control={control} // Pass the correctly typed control
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


        <FormField
          control={control} // Pass the correctly typed control
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
          control={control} // Pass the correctly typed control
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

        <FormField
          control={control} // Pass the correctly typed control
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

        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
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
