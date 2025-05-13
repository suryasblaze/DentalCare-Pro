// src/features/purchases/pages/CreatePurchaseOrderPage.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { createPurchaseOrderSchema, CreatePurchaseOrderInput, PurchaseOrderItemInput } from '../schemas/purchaseOrderSchemas';
import { getSuppliersForSelect, getInventoryItemsForSelect, createPurchaseOrder } from '../services/purchaseOrderService';
import { SupplierSelectItem, InventoryItemSelectItem } from '../types';
import { CalendarIcon, PlusCircle, Trash2, UploadCloudIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from '@/context/AuthContext'; // To get current user ID
import { FileUpload } from '@/components/ui/file-upload'; // For invoice upload
// Removed client-side OCR imports: extractTextFromImage, parseExtractedText, ParsedInvoiceData, terminateOcrWorker
import { supabase } from '@/lib/supabase'; // Import Supabase client
import { SearchableItem, FuzzyMatch, matchOcrItemsToInventory, performFuzzySearch } from '@/lib/fuzzySearch';
import { Separator } from '@/components/ui/separator';
import { uploadInvoiceFile, createInvoiceRecord } from '../services/invoiceService'; // Import invoice services

const CreatePurchaseOrderPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth(); // Get user from auth context

  const [suppliers, setSuppliers] = useState<SupplierSelectItem[]>([]);
  const [inventoryItemsForSelect, setInventoryItemsForSelect] = useState<InventoryItemSelectItem[]>([]); // Renamed for clarity
  const [inventoryForSearch, setInventoryForSearch] = useState<SearchableItem[]>([]); // For fuzzy search
  const [isSubmitting, setIsSubmitting] = useState(false);

  // OCR State
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  
  // Define types for data returned by the new ocr-invoice-parser Edge Function
  interface ParsedInvoiceItemFromAI {
    description: string;
    quantity: number | null;
    unit_price: number | null;
  }
  interface ParsedInvoiceDataFromAI {
    supplier_name?: string | null;
    invoice_date?: string | null;
    total_amount?: number | null;
    items: ParsedInvoiceItemFromAI[];
    raw_text?: string | null;
  }
  // This will store the direct response from the AI/Edge Function
  const [rawOcrData, setRawOcrData] = useState<ParsedInvoiceDataFromAI | null>(null);

  // This will store the items enhanced with client-side fuzzy matching for UI editing
  interface EditableOcrItem extends ParsedInvoiceItemFromAI {
    inventoryItemId?: string | null; // Matched inventory item ID
    matchDetails?: FuzzyMatch<SearchableItem>; // Details of the fuzzy match
  }
  interface EditableOcrDataState extends Omit<ParsedInvoiceDataFromAI, 'items'> {
    items: EditableOcrItem[];
    matchedSupplier?: SearchableItem | null; 
  }
  const [editableOcrData, setEditableOcrData] = useState<EditableOcrDataState | null>(null);


  const form = useForm<CreatePurchaseOrderInput>({
    resolver: zodResolver(createPurchaseOrderSchema),
    defaultValues: {
      supplier_id: '',
      order_date: new Date(),
      expected_delivery_date: null,
      notes: '',
      items: [{ inventory_item_id: '', quantity_ordered: 1, unit_price: 0, description: '' }],
      invoice_file: null,
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "items",
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [supplierData, itemData] = await Promise.all([
          getSuppliersForSelect(),
          getInventoryItemsForSelect(), // This fetches InventoryItemSelectItem[]
        ]);
        setSuppliers(supplierData);
        setInventoryItemsForSelect(itemData); // itemData now includes item_code
        // Prepare inventoryForSearch for fuzzy matching
        setInventoryForSearch(itemData.map(item => ({ id: item.value, name: item.label })));
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error fetching data",
          description: "Could not load suppliers or inventory items.",
        });
      }
    };
    fetchData();
  }, [toast]);

  const onSubmit = async (data: CreatePurchaseOrderInput) => {
    if (!user?.id) {
        toast({ variant: "destructive", title: "Authentication Error", description: "User ID not found." });
        return;
    }
    setIsSubmitting(true);
    try {
      const createdPo = await createPurchaseOrder(data, user.id); // Assuming this returns the created PO object or at least id and po_number
      toast({
        title: "Purchase Order Created",
        description: `PO #${createdPo.po_number} has been successfully created.`,
      });

      // If an invoice was processed (rawOcrData would exist), link it
      if (data.invoice_file && rawOcrData) {
        try {
          toast({ title: "Processing Invoice", description: "Uploading invoice file..." });
          const filePath = await uploadInvoiceFile(data.invoice_file, createdPo.po_number);

          await createInvoiceRecord({
            file_path: filePath,
            purchase_order_id: createdPo.id,
            supplier_id: data.supplier_id, // Use the supplier_id from the form (which might have been OCR pre-filled)
            invoice_date: rawOcrData.invoice_date ? new Date(rawOcrData.invoice_date).toISOString().split('T')[0] : null, // Corrected: invoice_date
            total_amount: rawOcrData.total_amount, // Corrected: total_amount
            notes: `Invoice auto-linked from AI OCR. AI OCR Supplier: ${rawOcrData.supplier_name || 'N/A'}. AI OCR Date: ${rawOcrData.invoice_date || 'N/A'}. AI OCR Total: ${rawOcrData.total_amount || 'N/A'}`, // Corrected properties
            file_name: data.invoice_file.name, // Add file_name if your TempInvoiceInsert or actual schema needs it
            // storage_path is filePath
          });
          toast({ title: "Invoice Linked", description: `Invoice ${data.invoice_file.name} linked to PO #${createdPo.po_number}.` });
        } catch (invoiceError) {
          console.error("Failed to link invoice to PO:", invoiceError);
          toast({
            variant: "destructive",
            title: "Invoice Linking Failed",
            description: (invoiceError as Error)?.message || "Could not link the uploaded invoice to the PO.",
          });
          // PO creation was successful, but invoice linking failed. Navigate to PO details anyway or show specific error.
        }
      }

      navigate(`/purchases/${createdPo.id}`); // Navigate to the new PO's detail page
    } catch (error) {
      console.error("Failed to create PO:", error);
      toast({
        variant: "destructive",
        title: "Failed to create Purchase Order",
        description: (error as Error)?.message || "An unexpected error occurred.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInventoryItemChange = (itemIndex: number, itemId: string) => {
    const selectedItem: InventoryItemSelectItem | undefined = inventoryItemsForSelect.find(item => item.value === itemId);
    if (selectedItem) {
      update(itemIndex, {
        ...form.getValues(`items.${itemIndex}`),
        inventory_item_id: itemId,
        description: selectedItem.label, // Pre-fill description
        // unit_price: selectedItem.default_purchase_price || 0, // If you have a default price
      });
    }
  };

  const handleInvoiceFileChange = async (file: File | null) => {
    form.setValue('invoice_file', file, { shouldValidate: true });
    setEditableOcrData(null);
    setRawOcrData(null);

    if (file) {
      setIsOcrProcessing(true);
      toast({ title: "Processing Invoice", description: "Extracting data via AI, please wait..." });
      try {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onloadend = async () => {
          const image_data_url = reader.result as string;

          // Call the new Edge Function
          const { data: functionResponse, error: functionError } = await supabase.functions.invoke(
            'ocr-invoice-parser', // Name of the new Edge Function
            // Send as an array, even for a single image
            { body: { image_data_urls: [image_data_url], file_type: file.type } } 
          );

          if (functionError) {
            throw functionError;
          }
          
          const parsedResult: ParsedInvoiceDataFromAI = functionResponse;
          setRawOcrData(parsedResult);

          // Match supplier (client-side fuzzy match)
          const supplierSearchable = suppliers.map(s => ({ id: s.value, name: s.label }));
          const supplierMatch = parsedResult.supplier_name 
            ? performFuzzySearch(parsedResult.supplier_name, supplierSearchable) 
            : null;

          // Match items (client-side fuzzy match)
          // Adapt matchOcrItemsToInventory or create a new version if item structure is different
          // For now, assuming performFuzzySearch can be used per item.
          const itemsToEdit: EditableOcrItem[] = (parsedResult.items || []).map(ocrItem => {
            const { bestMatch, allMatches, bestMatchScore } = performFuzzySearch(ocrItem.description, inventoryForSearch);
            return {
              ...ocrItem, // description, quantity, unit_price from AI
              inventoryItemId: bestMatch?.id.toString() || null,
              matchDetails: { // Constructing FuzzyMatch like object
                originalOcrItemName: ocrItem.description,
                ocrItemIndex: -1, // Index might not be relevant here or manage differently
                bestMatch: bestMatch,
                bestMatchScore: bestMatchScore,
                allMatches: allMatches
              },
            };
          });
          
          setEditableOcrData({
            ...parsedResult, // supplier_name, invoice_date, total_amount from AI
            items: itemsToEdit,
            matchedSupplier: supplierMatch?.bestMatch || null,
          });

          toast({ title: "Invoice Scanned by AI", description: "Review extracted data below to pre-fill form." });
          setIsOcrProcessing(false);
        };
        reader.onerror = (error) => {
          console.error("File reading error:", error);
          toast({ variant: "destructive", title: "File Error", description: "Could not read file for OCR." });
          setIsOcrProcessing(false);
        };

      } catch (error: any) {
        console.error("AI OCR processing failed:", error);
        toast({ variant: "destructive", title: "AI OCR Error", description: error.message || "Failed to process invoice with AI." });
        setIsOcrProcessing(false);
      }
      // No terminateOcrWorker needed as it's server-side
    }
  };

  const applyOcrDataToForm = () => {
    if (!editableOcrData) return;

    // Apply supplier
    if (editableOcrData.matchedSupplier?.id) {
      form.setValue('supplier_id', editableOcrData.matchedSupplier.id.toString(), { shouldValidate: true });
    }
    // Apply date
    if (editableOcrData.invoice_date) { // Use invoice_date from new structure
      try {
        const parsedDate = new Date(editableOcrData.invoice_date);
        if (!isNaN(parsedDate.getTime())) {
            form.setValue('order_date', parsedDate, { shouldValidate: true });
        } else {
            toast({variant: "destructive", title: "Invalid Date", description: "AI OCR extracted an invalid date format."})
        }
      } catch (e) {
         toast({variant: "destructive", title: "Date Error", description: "Could not parse AI OCR date."})
      }
    }

    // Apply items
    if (editableOcrData.items.length > 0) {
      fields.forEach((_, index) => remove(index)); 
      editableOcrData.items.forEach(ocrItem => {
        append({
          inventory_item_id: ocrItem.inventoryItemId || '',
          description: ocrItem.inventoryItemId
            ? inventoryItemsForSelect.find(inv => inv.value === ocrItem.inventoryItemId)?.label || ocrItem.description
            : ocrItem.description,
          quantity_ordered: ocrItem.quantity || 1,
          unit_price: ocrItem.unit_price || 0, // Use unit_price from new structure
        });
      });
    }
    toast({title: "OCR Data Applied", description: "Form has been pre-filled with data from invoice."});
    setEditableOcrData(null); // Clear OCR data after applying
  };


  return (
    <div className="container mx-auto p-4">
      <PageHeader
        heading="Create New Purchase Order"
        text="Fill in the details to create a new purchase order."
      />
      <Form {...form}> {/* Moved Form provider to wrap everything that uses its context */}
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 mt-6">

          {/* Invoice Upload Section - Now inside <Form> context */}
          <div className="my-6 p-6 border rounded-lg shadow-sm">
            <h3 className="text-xl font-semibold mb-4">Upload Invoice (Optional)</h3>
            <FormField
              control={form.control}
              name="invoice_file"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Invoice Document</FormLabel> {/* Reverted label */}
                  <FormControl>
                    <FileUpload
                      value={field.value}
                      onFileChange={handleInvoiceFileChange}
                      accept="image/png,image/jpeg,image/jpg,application/pdf" // Re-added PDF
                      maxSize={5}
                      disabled={isOcrProcessing}
                      // {...field} // Keep removed - handled by onFileChange
                    />
                  </FormControl>
                  <FormDescription>
                    Upload an invoice image (PNG, JPG) or PDF. OCR pre-fill currently only supports images.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            {isOcrProcessing && <p className="text-sm text-muted-foreground mt-2">Processing invoice...</p>}
            {editableOcrData && !isOcrProcessing && (
              <div className="mt-4 p-4 border rounded-md bg-muted/50 space-y-3">
                <h4 className="text-lg font-medium">Extracted Invoice Data:</h4>
                {editableOcrData.matchedSupplier && <p>Supplier: {editableOcrData.matchedSupplier.name} (Matched by AI & Fuzzy Search)</p>}
                {!editableOcrData.matchedSupplier && editableOcrData.supplier_name && <p>Supplier (AI OCR): {editableOcrData.supplier_name}</p>}
                {editableOcrData.invoice_date && <p>Date: {editableOcrData.invoice_date}</p>}
                {editableOcrData.total_amount && <p>Total: {editableOcrData.total_amount}</p>}
                <p className="font-medium mt-2">Items ({editableOcrData.items.length}):</p>
                <ul className="list-disc pl-5 text-sm">
                  {editableOcrData.items.slice(0,5).map((item: EditableOcrItem, idx: number) => ( // item is now ParsedInvoiceItemFromAI based
                    <li key={idx}>
                      {item.description} (Qty: {item.quantity ?? 'N/A'}, Price: {item.unit_price ?? 'N/A'})
                      {item.inventoryItemId && inventoryItemsForSelect.find(i => i.value === item.inventoryItemId) &&
                        <span className="text-green-600 ml-2">(Matched: {inventoryItemsForSelect.find(i => i.value === item.inventoryItemId)?.label})</span>}
                      {!item.inventoryItemId && <span className="text-orange-600 ml-2">(No direct match)</span>}
                    </li>
                  ))}
                  {editableOcrData.items.length > 5 && <li>...and more</li>}
                </ul>
                <Button type="button" onClick={applyOcrDataToForm} className="mt-3">Apply OCR Data to Form</Button>
              </div>
            )}
          </div>
          <Separator className="my-8"/>

          {/* Main PO Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="supplier_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Supplier</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a supplier" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {suppliers.map(supplier => (
                        <SelectItem key={supplier.value} value={supplier.value}>
                          {supplier.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="order_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Order Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            new Date(field.value).toLocaleDateString()
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="expected_delivery_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Expected Delivery Date (Optional)</FormLabel>
                   <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            new Date(field.value).toLocaleDateString()
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value || undefined} // Handle null
                        onSelect={field.onChange}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes (Optional)</FormLabel>
                <FormControl>
                  <Textarea placeholder="Any additional notes for this purchase order" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-4">
            <Label className="text-lg font-semibold">Order Items</Label>
            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 border p-4 rounded-md relative">
                <div className="md:col-span-4">
                  <FormField
                    control={form.control}
                    name={`items.${index}.inventory_item_id`}
                    render={({ field: itemField }) => (
                      <FormItem>
                        <FormLabel>Item</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            itemField.onChange(value);
                            handleInventoryItemChange(index, value);
                          }}
                          defaultValue={itemField.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select an item" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {inventoryItemsForSelect.map(item => (
                              <SelectItem key={item.value} value={item.value}>
                                {item.label} {item.category ? `(${item.category})` : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {/* Display Item Code if item is selected */}
                        {(() => {
                          const selectedItemId = form.getValues(`items.${index}.inventory_item_id`);
                          const selectedItemData = inventoryItemsForSelect.find(item => item.value === selectedItemId);
                          return selectedItemData?.item_code ? (
                            <p className="text-xs text-muted-foreground mt-1">Code: {selectedItemData.item_code}</p>
                          ) : null;
                        })()}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="md:col-span-3">
                   <FormField
                    control={form.control}
                    name={`items.${index}.description`}
                    render={({ field: descField }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Input placeholder="Item description" {...descField} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="md:col-span-2">
                  <FormField
                    control={form.control}
                    name={`items.${index}.quantity_ordered`}
                    render={({ field: qtyField }) => (
                      <FormItem>
                        <FormLabel>Quantity</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="Qty" {...qtyField} onChange={e => qtyField.onChange(parseInt(e.target.value,10) || 0)} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="md:col-span-2">
                  <FormField
                    control={form.control}
                    name={`items.${index}.unit_price`}
                    render={({ field: priceField }) => (
                      <FormItem>
                        <FormLabel>Unit Price</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="Price" {...priceField} onChange={e => priceField.onChange(parseFloat(e.target.value) || 0)} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="md:col-span-1 flex items-end">
                  {fields.length > 1 && (
                    <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() => append({ inventory_item_id: '', quantity_ordered: 1, unit_price: 0, description: '' })}
            >
              <PlusCircle className="mr-2 h-4 w-4" /> Add Item
            </Button>
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => navigate('/purchases')} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Purchase Order'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default CreatePurchaseOrderPage;
