import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { SubmitHandler } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label'; // Keep Label for direct use if needed
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox'; // Import Checkbox
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'; // Import FormDescription
import { useToast } from '@/components/ui/use-toast';
import { Textarea } from '@/components/ui/textarea'; // Use Textarea for potentially longer fields like supplier_info

import { Asset, AssetRow, NewAsset, UpdateAsset, AssetCategory, AssetStatus } from '../types';
import { addAsset, updateAsset } from '../services/assetService';

// Validation Schema using Zod for Assets
const assetSchema = z.object({
  asset_name: z.string().min(1, { message: 'Asset name is required' }),
  category: z.enum(['Equipment & Tools', 'Furniture', 'IT', 'Other'], { required_error: 'Category is required' }),
  serial_number: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  purchase_date: z.string().optional().nullable(), // Date string (YYYY-MM-DD)
  purchase_price: z.coerce.number().min(0, { message: 'Price must be 0 or greater' }).optional().nullable(),
  warranty_expiry_date: z.string().optional().nullable(), // Date string (YYYY-MM-DD)
  last_serviced_date: z.string().optional().nullable(), // Date string (YYYY-MM-DD)
  next_maintenance_due_date: z.string().optional().nullable(), // Date string (YYYY-MM-DD)
  status: z.enum(['Active', 'Under Maintenance', 'Retired', 'Disposed'], { required_error: 'Status is required' }),
  supplier_info: z.string().optional().nullable(),
  service_document_url: z.string().url({ message: "Please enter a valid URL" }).optional().nullable(),
  barcode_value: z.string().optional().nullable(),
  requires_maintenance: z.boolean().optional().default(false), // Add requires_maintenance field
  // Tags will be handled separately, not directly part of this Zod schema for the main form
});

// Infer the type from the schema
type AssetFormData = z.infer<typeof assetSchema>;

interface AssetFormProps {
  assetToEdit?: AssetRow | null;
  onSave: (savedAsset: AssetRow) => void; // Callback returns the saved row
  onCancel: () => void;
}

const AssetForm: React.FC<AssetFormProps> = ({ assetToEdit, onSave, onCancel }) => {
  const { toast } = useToast();
  const isEditMode = !!assetToEdit;
  const categories: AssetCategory[] = ['Equipment & Tools', 'Furniture', 'IT', 'Other'];
  const statuses: AssetStatus[] = ['Active', 'Under Maintenance', 'Retired', 'Disposed'];

  // Helper to safely cast category string to enum type
  const getValidCategory = (category?: string | null): AssetCategory | undefined => {
      if (category && categories.includes(category as AssetCategory)) {
          return category as AssetCategory;
      }
      return undefined;
  }

   // Helper to safely cast status string to enum type
   const getValidStatus = (status?: string | null): AssetStatus | undefined => {
      if (status && statuses.includes(status as AssetStatus)) {
          return status as AssetStatus;
      }
      return undefined;
  }

  // Format date for input type="date"
  const formatDateForInput = (dateString: string | null | undefined): string | undefined => {
      if (!dateString) return undefined;
      try {
          return new Date(dateString).toISOString().split('T')[0];
      } catch (e) {
          return undefined;
      }
  };

  const form = useForm<AssetFormData>({
    resolver: zodResolver(assetSchema),
    defaultValues: {
      asset_name: assetToEdit?.asset_name ?? '',
      category: getValidCategory(assetToEdit?.category),
      serial_number: assetToEdit?.serial_number ?? '',
      location: assetToEdit?.location ?? '',
      purchase_date: formatDateForInput(assetToEdit?.purchase_date),
      purchase_price: assetToEdit?.purchase_price ? Number(assetToEdit.purchase_price) : null,
      warranty_expiry_date: formatDateForInput(assetToEdit?.warranty_expiry_date),
      last_serviced_date: formatDateForInput(assetToEdit?.last_serviced_date),
      next_maintenance_due_date: formatDateForInput(assetToEdit?.next_maintenance_due_date),
      status: getValidStatus(assetToEdit?.status) ?? 'Active', // Default to 'Active' for new assets
      supplier_info: assetToEdit?.supplier_info ?? '',
      service_document_url: assetToEdit?.service_document_url ?? '',
      barcode_value: assetToEdit?.barcode_value ?? '',
      requires_maintenance: assetToEdit?.requires_maintenance ?? false, // Add default value
    },
  });

  const { handleSubmit, control, reset } = form;

   // Reset form if assetToEdit changes
   useEffect(() => {
     if (assetToEdit) {
       reset({
        asset_name: assetToEdit.asset_name,
        category: getValidCategory(assetToEdit.category),
        serial_number: assetToEdit.serial_number ?? '',
        location: assetToEdit.location ?? '',
        purchase_date: formatDateForInput(assetToEdit.purchase_date),
        purchase_price: assetToEdit.purchase_price ? Number(assetToEdit.purchase_price) : null,
        warranty_expiry_date: formatDateForInput(assetToEdit.warranty_expiry_date),
        last_serviced_date: formatDateForInput(assetToEdit.last_serviced_date),
        next_maintenance_due_date: formatDateForInput(assetToEdit.next_maintenance_due_date),
        status: getValidStatus(assetToEdit.status),
        supplier_info: assetToEdit.supplier_info ?? '',
        service_document_url: assetToEdit.service_document_url ?? '',
        barcode_value: assetToEdit.barcode_value ?? '',
        requires_maintenance: assetToEdit.requires_maintenance ?? false, // Reset requires_maintenance
       });
     } else {
       // Reset to default empty/initial values when adding new
       reset({
        asset_name: '',
        category: undefined,
        serial_number: '',
        location: '',
        purchase_date: '',
        purchase_price: null,
        warranty_expiry_date: '',
        last_serviced_date: '',
        next_maintenance_due_date: '',
        status: 'Active', // Default status
        supplier_info: '',
        service_document_url: '',
        barcode_value: '',
        requires_maintenance: false, // Reset requires_maintenance for new asset
       });
     }
   }, [assetToEdit, reset]);


  const onSubmit: SubmitHandler<AssetFormData> = async (formData) => {
    try {
      let savedAsset: AssetRow;
      // Prepare data, service function handles null conversion for empty strings
      const dataToSave = { ...formData };

      if (isEditMode && assetToEdit) {
        savedAsset = await updateAsset(assetToEdit.id, dataToSave as UpdateAsset);
        toast({ title: 'Success', description: 'Asset updated.' });
      } else {
        savedAsset = await addAsset(dataToSave as NewAsset);
        toast({ title: 'Success', description: 'New asset added.' });
      }
      onSave(savedAsset); // Pass back the saved asset row

    } catch (error) {
      console.error('Failed to save asset:', error);
      toast({
        title: 'Error',
        description: `Failed to save asset: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    }
  };

  return (
    <Form {...form}>
      {/* Use grid for horizontal layout, 2 columns on medium screens */}
      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
        {/* Asset Name */}
        <FormField
          control={control}
          name="asset_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Asset Name *</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Dental Chair Unit X1" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Category */}
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

        {/* Serial Number */}
        <FormField
          control={control}
          name="serial_number"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Serial Number</FormLabel>
              <FormControl>
                <Input placeholder="Asset Serial Number" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Location */}
        <FormField
          control={control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Location</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Room 3, North Branch" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Status */}
        <FormField
          control={control}
          name="status"
          render={({ field }) => (
             <FormItem>
              <FormLabel>Status *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value ?? ''} defaultValue={field.value ?? ''}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select asset status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {statuses.map((stat) => (
                    <SelectItem key={stat} value={stat}>
                      {stat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Warranty Expiry - Moved up to balance columns */}
         <FormField
            control={control}
            name="warranty_expiry_date"
            render={({ field }) => (
             <FormItem>
                <FormLabel>Warranty Expiry</FormLabel>
                <FormControl>
                  <Input type="date" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
            </FormItem>
            )}
        />

        {/* Requires Maintenance Checkbox - Spans full width */}
        <FormField
          control={control}
          name="requires_maintenance"
          render={({ field }) => (
            <FormItem className="md:col-span-2"> {/* Span both columns */}
                {/* Keep the bordered box for visual grouping */}
                <div className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Requires Maintenance
                    </FormLabel>
                    <FormDescription>
                      Check this box if the asset currently requires maintenance.
                    </FormDescription>
                  </div>
                </div>
                {/* No FormMessage needed for checkbox typically */}
            </FormItem>
          )}
        />

        {/* Purchase Details - Spans full width */}
        <div className="md:col-span-2 space-y-2"> {/* Span both columns */}
            <Label>Purchase Details</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-md border p-4"> {/* Nested grid */}
                <FormField
                    control={control}
                    name="purchase_date"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Date</FormLabel>
                        <FormControl>
                        <Input type="date" {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={control}
                    name="purchase_price"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Price</FormLabel>
                        <FormControl>
                        <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} value={String(field.value ?? '')} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            </div>
        </div>


        {/* Maintenance Dates - Spans full width */}
        <div className="md:col-span-2 space-y-2"> {/* Span both columns */}
            <Label>Maintenance Details</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-md border p-4"> {/* Nested grid */}
                <FormField
                    control={control}
                    name="last_serviced_date"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Last Serviced</FormLabel>
                        <FormControl>
                        <Input type="date" {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={control}
                    name="next_maintenance_due_date"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Next Due</FormLabel>
                        <FormControl>
                        <Input type="date" {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            </div>
        </div>

        {/* Supplier Info - Spans full width */}
        <FormField
          control={control}
          name="supplier_info"
          render={({ field }) => (
            <FormItem className="md:col-span-2"> {/* Span both columns */}
              <FormLabel>Supplier Info</FormLabel>
              <FormControl>
                <Textarea placeholder="Supplier name, contact, notes..." {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Service Document URL */}
        <FormField
            control={control}
            name="service_document_url"
            render={({ field }) => (
             <FormItem>
                <FormLabel>Service Doc URL</FormLabel>
                <FormControl>
                  <Input type="url" placeholder="https://example.com/invoice.pdf" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
            </FormItem>
            )}
        />

        {/* Barcode */}
        <FormField
            control={control}
            name="barcode_value"
            render={({ field }) => (
             <FormItem>
                <FormLabel>Barcode/QR</FormLabel>
                <FormControl>
                  <Input placeholder="Scan or enter code" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
            </FormItem>
            )}
        />

        {/* Tags Management Placeholder - Spans full width */}
        <div className="md:col-span-2 space-y-2 pt-2">
          <Label>Tags</Label>
          <div className="p-4 border rounded-md min-h-[60px] text-muted-foreground">
            {/* 
              Placeholder for Tag Management UI.
              This would typically involve:
              1. Fetching all existing tags.
              2. A multi-select combobox (e.g., from Shadcn UI or a library like react-select).
              3. Ability to create new tags on the fly.
              4. Storing selected tag IDs in component state.
              5. On form submit, after saving the asset, update the asset_tags junction table.
                 - For new assets: insert into asset_tags.
                 - For existing assets: delete old asset_tags, then insert new ones.
                 This logic would likely reside in the assetService.ts or be handled here.
            */}
            Tag management UI will be implemented here. (e.g., Multi-select combobox)
          </div>
        </div>


        {/* Action Buttons - Spans full width */}
        <div className="md:col-span-2 flex justify-end space-x-2 pt-4"> {/* Span both columns */}
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Saving...' : (isEditMode ? 'Update Asset' : 'Add Asset')}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default AssetForm;
