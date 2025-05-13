// src/features/purchases/components/ReceiveItemDialog.tsx
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose, // Import DialogClose
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label"; // Label is used by FormLabel
import { Calendar } from "@/components/ui/calendar";
import { FileUpload } from "@/components/ui/file-upload"; // Import FileUpload
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Import Select
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { PurchaseOrderItemDetails } from '../pages/PurchaseOrderDetailPage'; // Use the detailed type
import { InventoryItemSelectItem } from '../types'; // Need this to check is_batched
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { receivePurchaseOrderItemBatch, updatePOItemQuantityReceived } from '../services/purchaseOrderService';
import { useAuth } from '@/context/AuthContext';
import { extractTextFromImage, parseExtractedText, ParsedInvoiceData, terminateOcrWorker } from '@/lib/ocr'; // Import OCR functions
import { SearchableItem, FuzzyMatch, matchOcrItemsToInventory } from '@/lib/fuzzySearch'; // Import fuzzy search
// Assume a service function exists to get all inventory items for select
import { getAllInventoryItemsForSelect } from '../services/inventoryService'; // Placeholder
import { uploadInvoiceFile, createInvoiceRecord } from '../services/invoiceService'; // Import invoice services
import { getPurchaseOrderById } from '../services/purchaseOrderService'; // For fetching PO supplier_id

// Schema for the receiving form
const ACCEPTED_FILE_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const receiveItemSchema = z.object({
  quantity_received_now: z.number().min(1, "Quantity must be at least 1"),
  batch_number: z.string().optional(),
  expiry_date: z.date().nullable().optional(),
  // purchase_price: z.number().min(0).optional(), // Price usually comes from PO item
  invoice_file: z
    .custom<File | null>((file) => file instanceof File || file === null || file === undefined, "Invalid file format")
    .refine(
      (file) => !file || file.size <= MAX_FILE_SIZE,
      `File size should be less than 5MB.`
    )
    .refine(
      (file) => !file || ACCEPTED_FILE_TYPES.includes(file.type),
      "Only .pdf, .png, .jpg, .jpeg files are accepted."
    )
    .optional()
    .nullable(),
});
type ReceiveItemInput = z.infer<typeof receiveItemSchema>;

interface ReceiveItemDialogProps {
  poItem: PurchaseOrderItemDetails;
  purchaseOrderId: string; // Added prop
  poNumber: string; // Added prop
  inventoryItemInfo?: InventoryItemSelectItem; // Pass info about whether item is batched
  remainingQuantity: number;
  onReceiveSuccess: () => void; // Callback to refresh data on parent page
  children: React.ReactNode; // To wrap the trigger button
}

export const ReceiveItemDialog: React.FC<ReceiveItemDialogProps> = ({
  poItem,
  purchaseOrderId, // Destructure new prop
  poNumber, // Destructure new prop
  inventoryItemInfo,
  remainingQuantity,
  onReceiveSuccess,
  children
}) => {
  const { toast } = useToast();
  const { user } = useAuth(); // Get current user
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOcrProcessing, setIsOcrProcessing] = useState(false); // For OCR loading state
  const [rawOcrData, setRawOcrData] = useState<ParsedInvoiceData | null>(null); // To store raw OCR results
  
  // Define the type for a single item from ParsedInvoiceData
  type ParsedInvoiceItem = ParsedInvoiceData['items'][number];

  // This is the type for items in our editableOcrData state
  interface EditableOcrItem extends ParsedInvoiceItem {
    inventoryItemId?: string | null;
    matchDetails?: FuzzyMatch<SearchableItem>;
  }

  // This is the type for the entire editableOcrData state object
  interface EditableOcrDataState extends Omit<ParsedInvoiceData, 'items'> {
    items: EditableOcrItem[];
  }
  const [editableOcrData, setEditableOcrData] = useState<EditableOcrDataState | null>(null);

  const [inventoryForSearch, setInventoryForSearch] = useState<SearchableItem[]>([]);
  const [isFetchingInventory, setIsFetchingInventory] = useState(false);

  const isBatched = inventoryItemInfo?.is_batched ?? false; // Default to false if info not available

  const form = useForm<ReceiveItemInput>({
    resolver: zodResolver(receiveItemSchema.refine(data => data.quantity_received_now <= remainingQuantity, {
        message: `Quantity cannot exceed remaining quantity (${remainingQuantity})`,
        path: ["quantity_received_now"],
    }).refine(data => !isBatched || (data.batch_number && data.batch_number.trim() !== ''), {
        message: "Batch number is required for batched items.",
        path: ["batch_number"],
    }).refine(data => !isBatched || data.expiry_date, { // Assuming expiry is mandatory for batched items
        message: "Expiry date is required for batched items.",
        path: ["expiry_date"],
     })),
     defaultValues: {
       quantity_received_now: remainingQuantity > 0 ? 1 : 0, // Start with 1 if items are remaining
       batch_number: '',
       expiry_date: null,
       invoice_file: null,
    },
  });

  useEffect(() => {
    // Fetch inventory items when dialog opens
    const fetchInventory = async () => {
      if (isOpen && inventoryForSearch.length === 0) {
        setIsFetchingInventory(true);
        try {
          // Replace with actual service call:
          // const items = await getAllInventoryItemsForSelect();
          // For now, using placeholder data. Ensure your service returns SearchableItem compatible objects.
          const itemsFromService: InventoryItemSelectItem[] = await getAllInventoryItemsForSelect();
          setInventoryForSearch(itemsFromService.map(item => ({ id: item.value, name: item.label })));

        } catch (error) {
          console.error("Failed to fetch inventory items for search:", error);
          toast({ variant: "destructive", title: "Error", description: "Could not load inventory items for matching." });
        } finally {
          setIsFetchingInventory(false);
        }
      }
    };

    fetchInventory();

    // Reset form when dialog opens or item changes
    if (isOpen) {
        form.reset({
            quantity_received_now: remainingQuantity > 0 ? 1 : 0,
            batch_number: '',
            expiry_date: null,
            invoice_file: null,
        });
        setRawOcrData(null); 
        setEditableOcrData(null);
    } else {
        if (!isOcrProcessing) {
            terminateOcrWorker();
        }
    }
  }, [isOpen, remainingQuantity, form, isOcrProcessing, toast]); // inventoryForSearch not needed in dep array for fetch on open


  const onSubmit = async (formData: ReceiveItemInput) => { // Changed 'data' to 'formData' for clarity
    setIsSubmitting(true);

    if (!user || !user.id) { // Added a more robust check for user and user.id
      toast({ variant: "destructive", title: "Authentication Error", description: "User ID not found. Cannot record receipt." });
      setIsSubmitting(false);
      return;
    }

    try {
      let purchasePriceForReceipt = poItem.unit_price;

      // If OCR data is confirmed, find the matched item and use its price for the current PO item
      if (editableOcrData && editableOcrData.items) {
        const matchedOcrItem = editableOcrData.items.find(
          item => item.inventoryItemId === poItem.inventory_item_id
        );
        if (matchedOcrItem) {
          purchasePriceForReceipt = matchedOcrItem.price;
          toast({
            title: "Price Note",
            description: `Using confirmed invoice price (${purchasePriceForReceipt}) for this receipt of "${poItem.description}".`,
            duration: 4000,
          });
        }
      }

      // Step 1: Call the RPC to create batch and log entry
      await receivePurchaseOrderItemBatch({
        p_po_item_id: poItem.id,
        p_quantity_received: formData.quantity_received_now,
        p_batch_number: formData.batch_number || null,
        p_expiry_date: formData.expiry_date ? formData.expiry_date.toISOString().split('T')[0] : null,
        p_purchase_price: purchasePriceForReceipt, // Use potentially OCR'd price
        p_received_by_user_id: user.id,
      });

      // Step 2: REMOVED - The RPC function handle_receive_po_item_batch already updates this.
      // await updatePOItemQuantityReceived(poItem.id, formData.quantity_received_now);

      // Handle invoice_file upload and OCR processing (linking invoice record)
      let processedOcrData: ParsedInvoiceData | null = null;
      if (formData.invoice_file && !editableOcrData) { // If file present but not yet confirmed by user via editable form
        setIsOcrProcessing(true);
        toast({ title: "Processing Invoice", description: "Extracting text from invoice, please wait..." });
        try {
          const text = await extractTextFromImage(formData.invoice_file);
          const parsedOcrResult = parseExtractedText(text);
          setRawOcrData(parsedOcrResult);

          // Perform fuzzy matching
          const matchedItems = matchOcrItemsToInventory(parsedOcrResult.items, inventoryForSearch);
          
          const itemsToEdit: EditableOcrItem[] = parsedOcrResult.items.map((ocrItem, index) => {
            const matchDetail = matchedItems.find(m => m.ocrItemIndex === index);
            return {
              ...ocrItem,
              inventoryItemId: matchDetail?.bestMatch?.id.toString() || null,
              matchDetails: matchDetail,
            };
          });

          setEditableOcrData({ ...parsedOcrResult, items: itemsToEdit });
          
          console.log("OCR Parsed Data:", parsedOcrResult);
          console.log("Fuzzy Matched Items:", itemsToEdit);
          toast({ title: "Invoice Processed", description: "Review extracted and matched data below. Confirm to proceed." });
          
          setIsOcrProcessing(false);
          setIsSubmitting(false); // Stop submission until user confirms OCR data
          return; 
        } catch (ocrError) {
          console.error("OCR Error or Matching Error:", ocrError);
          toast({ variant: "destructive", title: "Processing Failed", description: (ocrError as Error).message });
          setIsOcrProcessing(false);
          setIsSubmitting(false);
          return;
        }
      }
      
      // If we are here, either no invoice was uploaded, or OCR data has been processed and confirmed.
      if (editableOcrData && formData.invoice_file) {
        console.log("Confirmed OCR Data, attempting to upload invoice and create record:", editableOcrData);
        toast({title: "Processing Confirmed Invoice", description: "Uploading file and creating invoice record..."});
        try {
          const filePath = await uploadInvoiceFile(formData.invoice_file, poNumber); 
          
          let poSupplierId: string | null | undefined = null;
          try {
            const parentPo = await getPurchaseOrderById(purchaseOrderId); // Fetch PO details
            if (parentPo) {
              poSupplierId = parentPo.supplier_id;
            } else {
              toast({variant: "destructive", title: "Warning", description: "Could not fetch PO details to link supplier to invoice. Supplier will be unlinked."})
            }
          } catch (fetchPoError) {
             console.error("Failed to fetch PO for supplier ID:", fetchPoError);
             toast({variant: "destructive", title: "Warning", description: "Error fetching PO details for invoice supplier linking."})
          }
          
          await createInvoiceRecord({
            file_path: filePath,
            purchase_order_id: purchaseOrderId, 
            supplier_id: poSupplierId, // Use fetched supplier_id from the PO
            invoice_date: editableOcrData.date ? new Date(editableOcrData.date).toISOString().split('T')[0] : null, 
            total_amount: editableOcrData.totalAmount,
            notes: `Invoice uploaded for PO: ${poNumber}. OCR Supplier: ${editableOcrData.supplier || 'N/A'}. OCR Date: ${editableOcrData.date || 'N/A'}. OCR Total: ${editableOcrData.totalAmount || 'N/A'}`, 
            // file_name and storage_path are part of TempInvoiceInsert but should be covered by filePath logic
            // invoice_url is set to filePath in createInvoiceRecord
          });
          toast({title: "Invoice Saved", description: `Invoice for PO ${poNumber} processed and saved.`}); // Use poNumber prop

        } catch (invoiceError) {
          console.error("Failed to upload invoice or create record:", invoiceError);
          toast({
            variant: "destructive",
            title: "Invoice Processing Failed",
            description: (invoiceError as Error).message || "Could not save the invoice details.",
          });
          // Decide if we should still proceed with item receipt if invoice fails
        }
      }


      toast({ title: "Success", description: `${formData.quantity_received_now} units of "${poItem.description}" received.` });
      onReceiveSuccess(); // Refresh parent data
      setIsOpen(false); // Close dialog
    } catch (error) {
      console.error("Failed to receive items or process invoice:", error);
      // Ensure isSubmitting is reset on error
      toast({ 
        variant: "destructive", 
        title: "Error Receiving Items", 
        description: (error as Error)?.message || "An unexpected error occurred while recording received items." 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Receive Item: {poItem.description}</DialogTitle>
          <DialogDescription>
            Record quantity received for this item. Ordered: {poItem.quantity_ordered}, Received: {poItem.quantity_received}, Remaining: {remainingQuantity}.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="quantity_received_now"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantity Receiving Now</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      max={remainingQuantity}
                      {...field}
                      onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="invoice_file"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Upload Invoice (Optional)</FormLabel>
                  <FormControl>
                    <FileUpload
                      value={field.value}
                      onFileChange={async (file: File | null) => { // Changed prop to onFileChange and explicitly typed file
                        field.onChange(file); // Update form state first
                        setEditableOcrData(null); // Clear any previous editable OCR data if file changes
                        setRawOcrData(null); // Clear raw OCR data
                        if (file) {
                          // OCR processing will now happen on submit if editableOcrData is not yet set
                          // Or, we can trigger it here to show a preview immediately as before
                          setIsOcrProcessing(true);
                          toast({ title: "Scanning Invoice", description: "Extracting text, please wait..." });
                          try {
                            const text = await extractTextFromImage(file);
                            const parsedOcrResult = parseExtractedText(text);
                            setRawOcrData(parsedOcrResult);
                            
                            // Perform fuzzy matching
                            const matchedItems = matchOcrItemsToInventory(parsedOcrResult.items, inventoryForSearch);
                            const itemsToEdit: EditableOcrItem[] = parsedOcrResult.items.map((ocrItem, index) => {
                                const matchDetail = matchedItems.find(m => m.ocrItemIndex === index);
                                return {
                                ...ocrItem,
                                inventoryItemId: matchDetail?.bestMatch?.id.toString() || null,
                                matchDetails: matchDetail,
                                };
                            });
                            setEditableOcrData({ ...parsedOcrResult, items: itemsToEdit });

                            // Attempt to pre-fill quantity if a unique match for the current PO item is found
                            const currentPoItemInventoryId = poItem.inventory_item_id;
                            const matchedOcrItemForCurrentPoItem = itemsToEdit.find(
                              item => item.inventoryItemId === currentPoItemInventoryId
                            );

                            if (matchedOcrItemForCurrentPoItem && itemsToEdit.filter(i => i.inventoryItemId === currentPoItemInventoryId).length === 1) {
                              // If a unique match is found, pre-fill the quantity
                              // Ensure it doesn't exceed remaining quantity
                              const ocrQuantity = matchedOcrItemForCurrentPoItem.quantity;
                              const newQuantity = Math.min(ocrQuantity, remainingQuantity);
                              if (newQuantity > 0 && form.getValues("quantity_received_now") !== newQuantity) {
                                form.setValue("quantity_received_now", newQuantity, { shouldValidate: true });
                                toast({ title: "Quantity Pre-filled", description: `Quantity for "${poItem.description}" pre-filled from invoice.`});
                              }
                            }
                            
                            console.log("Live OCR Parsed Data:", parsedOcrResult);
                            console.log("Fuzzy Matched Items on change:", itemsToEdit);
                            toast({ title: "Invoice Scanned", description: "Review extracted and matched data below."});
                          } catch (ocrError) {
                            console.error("OCR Error on change:", ocrError);
                            toast({ variant: "destructive", title: "OCR Failed", description: (ocrError as Error).message });
                            setEditableOcrData(null); 
                          } finally {
                            setIsOcrProcessing(false);
                          }
                        } else {
                           setEditableOcrData(null); // Clear if file is removed
                           setRawOcrData(null);
                        }
                      }}
                      accept={ACCEPTED_FILE_TYPES.join(',')}
                      maxSize={MAX_FILE_SIZE}
                      disabled={isOcrProcessing || isSubmitting} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {isOcrProcessing && <p className="text-sm text-muted-foreground text-center py-4">Processing invoice, please wait...</p>}

            {editableOcrData && !isOcrProcessing && (
              <div className="space-y-4 p-4 border rounded-md mt-4">
                <h4 className="text-md font-semibold mb-2">Confirm or Edit Extracted Invoice Data</h4>
                
                {/* Editable Supplier */}
                <FormItem>
                  <FormLabel>Invoice Supplier</FormLabel>
                  <FormControl>
                    <Input 
                      value={editableOcrData.supplier || ''}
                      onChange={(e) => setEditableOcrData(prev => prev ? {...prev, supplier: e.target.value} : null)}
                      placeholder="Supplier from invoice"
                    />
                  </FormControl>
                </FormItem>

                {/* Editable Date */}
                <FormItem>
                  <FormLabel>Invoice Date</FormLabel>
                  <FormControl>
                    <Input 
                      value={editableOcrData.date || ''}
                      onChange={(e) => setEditableOcrData(prev => prev ? {...prev, date: e.target.value} : null)}
                      placeholder="Date from invoice (e.g., YYYY-MM-DD)"
                    />
                  </FormControl>
                </FormItem>

                {/* Editable Total Amount */}
                <FormItem>
                  <FormLabel>Invoice Total Amount</FormLabel>
                  <FormControl>
                    <Input 
                      type="number"
                      value={editableOcrData.totalAmount || ''}
                      onChange={(e) => setEditableOcrData(prev => prev ? {...prev, totalAmount: parseFloat(e.target.value) || undefined} : null)}
                      placeholder="Total amount from invoice"
                    />
                  </FormControl>
                </FormItem>

                {/* Editable Items with Fuzzy Matching */}
                <div className="space-y-2">
                  <FormLabel>Invoice Items (Matched)</FormLabel>
                  {isFetchingInventory && <p className="text-sm text-muted-foreground">Loading inventory for matching...</p>}
                  {!isFetchingInventory && editableOcrData.items.map((item: EditableOcrItem, index: number) => ( // Explicitly type item and index
                    <div key={index} className="p-3 border rounded-md space-y-2 bg-slate-50 dark:bg-slate-800">
                      <FormItem>
                        <FormLabel className="text-xs">OCR Item Name</FormLabel>
                        <Input 
                          value={item.name} // Should now correctly access 'name'
                          onChange={(e) => {
                            const newItems = editableOcrData.items.map((it, idx) => 
                              idx === index ? { ...it, name: e.target.value } : it
                            );
                            setEditableOcrData(prev => prev ? {...prev, items: newItems} : null);
                          }}
                          placeholder="Item Name from Invoice"
                          className="text-sm"
                        />
                      </FormItem>
                      <div className="grid grid-cols-2 gap-2">
                        <FormItem>
                          <FormLabel className="text-xs">Qty</FormLabel>
                          <Input 
                            type="number"
                            value={item.quantity} // Should now correctly access 'quantity'
                            onChange={(e) => {
                              const newItems = editableOcrData.items.map((it, idx) => 
                                idx === index ? { ...it, quantity: parseInt(e.target.value) || 0 } : it
                              );
                              setEditableOcrData(prev => prev ? {...prev, items: newItems} : null);
                            }}
                            placeholder="Qty"
                            className="text-sm"
                          />
                        </FormItem>
                        <FormItem>
                          <FormLabel className="text-xs">Price (Unit)</FormLabel>
                          <Input 
                            type="number"
                            value={item.price} // Should now correctly access 'price'
                            onChange={(e) => {
                              const newItems = editableOcrData.items.map((it, idx) => 
                                idx === index ? { ...it, price: parseFloat(e.target.value) || 0 } : it
                              );
                              setEditableOcrData(prev => prev ? {...prev, items: newItems} : null);
                            }}
                            placeholder="Price"
                            className="text-sm"
                          />
                        </FormItem>
                      </div>
                      <FormItem>
                        <FormLabel className="text-xs">Match to Inventory Item</FormLabel>
                        <Select
                          value={item.inventoryItemId || ""}
                          onValueChange={(selectedInventoryId) => {
                            const newItems = [...editableOcrData.items];
                            newItems[index].inventoryItemId = selectedInventoryId === "NO_MATCH" ? null : selectedInventoryId;
                            setEditableOcrData(prev => prev ? {...prev, items: newItems} : null);
                          }}
                        >
                          <SelectTrigger className="text-sm">
                            <SelectValue placeholder="Select inventory match..." />
                          </SelectTrigger>
                          <SelectContent>
                            {item.matchDetails?.bestMatch && (
                              <SelectItem value={item.matchDetails.bestMatch.id.toString()}>
                                Best: {item.matchDetails.bestMatch.name}
                              </SelectItem>
                            )}
                            {inventoryForSearch
                              .filter(invItem => invItem.id !== item.matchDetails?.bestMatch?.id) // Don't repeat best match
                              .map(invItem => (
                                <SelectItem key={invItem.id} value={invItem.id.toString()}>
                                  {invItem.name}
                                </SelectItem>
                            ))}
                            <SelectItem value="NO_MATCH">No Match / Manual Entry</SelectItem>
                            {/* TODO: Option to "Create new item from OCR data" */}
                          </SelectContent>
                        </Select>
                        {item.matchDetails && item.matchDetails.allMatches.length > 1 && !item.inventoryItemId && (
                            <p className="text-xs text-muted-foreground mt-1">
                                Other possible matches: {item.matchDetails.allMatches.slice(1,3).map(m => m.item.name).join(', ')}
                            </p>
                        )}
                      </FormItem>
                    </div>
                  ))}
                  {editableOcrData.items.length === 0 && <p className="text-xs text-muted-foreground">No items found or parsed from invoice.</p>}
                </div>
              </div>
            )}

            {isBatched && !editableOcrData && ( 
              <>
                <FormField
                  control={form.control}
                  name="batch_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Batch Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter batch number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="expiry_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Expiry Date</FormLabel>
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
                                <span>Pick expiry date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value || undefined}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}
            <DialogFooter>
               <DialogClose asChild>
                 <Button type="button" variant="outline" disabled={isSubmitting || isOcrProcessing}>Cancel</Button>
               </DialogClose>
              <Button type="submit" disabled={isSubmitting || isOcrProcessing || remainingQuantity <= 0}>
                {isSubmitting ? 'Saving Receipt...' : (isOcrProcessing ? 'Processing Invoice...' : 'Confirm Receipt')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
