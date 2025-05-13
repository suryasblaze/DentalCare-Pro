import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UrgentPurchaseSlipUpload } from './UrgentPurchaseSlipUpload'; // Adjusted path
// Client-side OCR (processUrgentSlipFile, terminateOcrWorker) will be replaced by Edge Function call
// We still need InventoryItemForSearch for client-side fuzzy matching if the Edge Function doesn't do it.
import { InventoryItemForSearch, terminateOcrWorker } from '@/lib/ocr'; // terminateOcrWorker might become irrelevant
import { performFuzzySearch } from '@/lib/fuzzySearch'; // For client-side matching
import { supabase } from '@/lib/supabase'; // Import supabase client
import { UrgentPurchaseSlipData, ParsedSlipItem } from '../types';
import { getInventoryItemsForSelect } from '../services/purchaseOrderService';
import { InventoryItemSelectItem } from '../types';
import {
  uploadUrgentPurchaseSlip,
  createUrgentPurchaseEntry,
  // confirmAndProcessUrgentPurchase, // No longer called directly from form
  submitUrgentPurchaseForApproval, // New service function
  CreateUrgentPurchasePayload
} from '../services/urgentPurchaseService';
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from '@/context/AuthContext';
import { Loader2, CheckCircle, Trash2, PlusCircle } from 'lucide-react';
import { z } from 'zod';

// Schema for Quick Entry Form (copied from UrgentPurchasePage)

const NO_MATCH_SELECT_VALUE = "__NO_MATCH_VALUE__"; // Special value for "No Match" option

const quickEntryItemSchema = z.object({
  inventory_item_id: z.string().min(1, "Item selection is required."),
  quantity: z.number().min(1, "Quantity must be at least 1."),
  batch_number: z.string().optional().nullable(),
  expiry_date: z.date().optional().nullable(),
});
const ALL_APPROVAL_ROLES = ['admin', 'owner', 'doctor'] as const;
type ApprovalRole = typeof ALL_APPROVAL_ROLES[number];

const quickEntrySchema = z.object({
  items: z.array(quickEntryItemSchema).min(1, "At least one item is required."),
  invoice_delivery_date: z.date().optional().nullable(),
  notes: z.string().optional().nullable(),
  target_approval_role: z.string().min(1, "Target approval role is required."),
});
type QuickEntryFormValues = z.infer<typeof quickEntrySchema>;

interface UrgentPurchaseFormProps {
  onClose: () => void;
  onSuccess: () => void; // Callback after successful submission
}

export const UrgentPurchaseForm: React.FC<UrgentPurchaseFormProps> = ({ onClose, onSuccess }) => {
  const { toast } = useToast();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'slip_upload' | 'quick_entry'>('slip_upload');
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [isProcessingSlip, setIsProcessingSlip] = useState(false);
  const [ocrData, setOcrData] = useState<UrgentPurchaseSlipData | null>(null);
  const [editableOcrItems, setEditableOcrItems] = useState<ParsedSlipItem[]>([]);
  const [targetRoleForSlip, setTargetRoleForSlip] = useState<string>('');
  
  const [inventoryItemsForSelect, setInventoryItemsForSelect] = useState<InventoryItemSelectItem[]>([]);
  const [inventoryForSearch, setInventoryForSearch] = useState<InventoryItemForSearch[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availableApprovalRoles = ALL_APPROVAL_ROLES.filter(role => role !== user?.role);

  // Quick Entry Form setup
  const quickEntryForm = useForm<QuickEntryFormValues>({
    resolver: zodResolver(quickEntrySchema),
    defaultValues: {
      items: [{ inventory_item_id: '', quantity: 1, batch_number: '', expiry_date: null }],
      invoice_delivery_date: new Date(),
      notes: '',
      target_approval_role: '',
    },
  });
  const { fields: quickEntryFields, append: quickEntryAppend, remove: quickEntryRemove } = useFieldArray({
    control: quickEntryForm.control,
    name: "items",
  });

  // Fetch inventory on mount
  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const items = await getInventoryItemsForSelect();
        setInventoryItemsForSelect(items);
        setInventoryForSearch(items.map(item => ({ id: item.value, name: item.label, item_code: item.item_code })));
      } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "Could not load inventory items." });
      }
    };
    fetchInventory();
  }, [toast]);

  // Terminate OCR worker on unmount or tab change away from slip upload
  // This might become irrelevant if client-side OCR is fully removed.
  // useEffect(() => {
  //   return () => {
  //     if (activeTab === 'slip_upload') {
  //       terminateOcrWorker();
  //     }
  //   };
  // }, [activeTab]);

  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelected = async (file: File | null) => {
    setSlipFile(file);
    setOcrData(null); // Clear previous OCR data
    setEditableOcrItems([]); // Clear previous items
    if (file) {
      setIsProcessingSlip(true);
      try {
        const image_data_url = await fileToDataUrl(file);
        
        // Invoke the Supabase Edge Function
        const { data: functionResponse, error: functionError } = await supabase.functions.invoke(
          'ocr-slip-parser', // Name of your Edge Function
          // Send as an array, even for a single image
          { body: { image_data_urls: [image_data_url], file_type: file.type } } 
        );

        if (functionError) {
          throw functionError;
        }
        
        // The Edge function should return data compatible with UrgentPurchaseSlipData (excluding client-side matches)
        const parsedDataFromServer: Omit<UrgentPurchaseSlipData, 'items'> & { items: Omit<ParsedSlipItem, 'matched_item_id' | 'matched_item_name' | 'confidence'>[] } = functionResponse;

        // Now, perform client-side fuzzy matching for inventory items
        let overallConfidenceSum = 0;
        let matchedItemsCount = 0;

        const itemsWithClientMatching: ParsedSlipItem[] = parsedDataFromServer.items.map(serverItem => {
          const { bestMatch, bestMatchScore } = performFuzzySearch(serverItem.slip_text, inventoryForSearch);
          let itemConfidence: number | undefined = undefined;

          if (bestMatch && typeof bestMatchScore === 'number') {
            itemConfidence = 1 - bestMatchScore;
            itemConfidence = Math.max(0, Math.min(1, itemConfidence));
            overallConfidenceSum += itemConfidence;
            matchedItemsCount++;
          } else if (bestMatch) {
            itemConfidence = 0.75; // Fallback confidence
            overallConfidenceSum += itemConfidence;
            matchedItemsCount++;
          } else {
            itemConfidence = 0.1;
          }
          
          return {
            ...serverItem,
            matched_item_id: bestMatch?.id as string || null,
            matched_item_name: bestMatch?.name || null,
            confidence: itemConfidence,
          };
        });
        
        const finalOverallConfidence = matchedItemsCount > 0 
            ? overallConfidenceSum / matchedItemsCount 
            : (parsedDataFromServer.overall_confidence || 0); // Use server confidence if no client matches or prefer server's

        const finalOcrData: UrgentPurchaseSlipData = {
            ...parsedDataFromServer,
            items: itemsWithClientMatching,
            overall_confidence: finalOverallConfidence,
        };

        setOcrData(finalOcrData);
        setEditableOcrItems(finalOcrData.items.map(item => ({ ...item })));
        toast({ title: "Slip Processed by Server", description: "Review the extracted items below." });

      } catch (error: any) {
        console.error("Error processing slip with Edge Function:", error);
        toast({ 
          variant: "destructive", 
          title: "Processing Error", 
          description: error.message || "Failed to process slip using server function." 
        });
      } finally {
        setIsProcessingSlip(false);
      }
    }
  };

  const handleOcrItemChange = (index: number, field: keyof ParsedSlipItem, value: any) => {
    const newItems = [...editableOcrItems];
    if (field === 'matched_item_id') {
      if (value === NO_MATCH_SELECT_VALUE || value === '') {
        (newItems[index] as any)[field] = null; // Store null if "No Match" or empty is selected
        newItems[index].matched_item_name = null;
      } else {
        (newItems[index] as any)[field] = value;
        const selectedInventoryItem = inventoryForSearch.find(inv => inv.id === value);
        newItems[index].matched_item_name = selectedInventoryItem?.name || null;
      }
    } else {
      (newItems[index] as any)[field] = value;
    }
    setEditableOcrItems(newItems);
  };
  
  const handleRemoveOcrItem = (index: number) => {
    setEditableOcrItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmitSlipData = async () => {
    if (!user || !user.id) {
      toast({ variant: "destructive", title: "Authentication Error", description: "User not logged in." });
      return;
    }
    if (!ocrData || editableOcrItems.length === 0) {
      toast({ variant: "destructive", title: "No Data", description: "No items to submit." });
      return;
    }
    if (!targetRoleForSlip) {
      toast({ variant: "destructive", title: "Validation Error", description: "Please select a target approval role." });
      return;
    }
    setIsSubmitting(true);
    try {
      let slipFilePath: string | undefined = undefined;
      let slipFileName: string | undefined = undefined;

      if (slipFile) {
        const uploadResult = await uploadUrgentPurchaseSlip(slipFile, user.id);
        slipFilePath = uploadResult.filePath;
        slipFileName = uploadResult.fileName;
      }

      const payload: CreateUrgentPurchasePayload = {
        header: {
          slip_image_path: slipFilePath || null,
          slip_filename: slipFileName || null,
          invoice_delivery_date: ocrData.invoice_delivery_date ? ocrData.invoice_delivery_date : null,
          status: 'draft', // Initial status is draft
          confidence_score: ocrData.overall_confidence,
          notes: `Urgent purchase via slip upload. OCR Confidence: ${((ocrData.overall_confidence || 0) * 100).toFixed(0)}%`,
          requested_by_user_id: user.id, // Changed from created_by
          target_approval_role: targetRoleForSlip,
        },
        items: editableOcrItems
          .filter(item => item.matched_item_id && (item.quantity || 0) > 0)
          .map(item => ({
            inventory_item_id: item.matched_item_id!,
            slip_text: item.slip_text,
            matched_item_name: item.matched_item_name || 'Unknown Item',
            quantity: item.quantity || 0,
            batch_number: item.batch_number || null,
            expiry_date: item.expiry_date || null,
          })),
      };
      
      if (payload.items.length === 0) {
        toast({ variant: "destructive", title: "No Valid Items", description: "No items with matched inventory ID and quantity > 0." });
        setIsSubmitting(false);
        return;
      }

      const createdEntry = await createUrgentPurchaseEntry(payload);
      
      // After creating as draft, submit it for approval
      if (createdEntry && createdEntry.id) {
        await submitUrgentPurchaseForApproval(createdEntry.id, user.id);
        toast({ title: "Urgent Purchase Submitted", description: `Request ID: ${createdEntry.id} submitted for approval.` });
        onSuccess(); // Call success callback (closes dialog, refreshes list)
      } else {
        throw new Error("Failed to get ID from created entry for submission.");
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Submission Error", description: error.message || "Failed to submit urgent purchase for approval." });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleSubmitQuickEntry = async (values: QuickEntryFormValues) => {
    if (!user || !user.id) {
      toast({ variant: "destructive", title: "Authentication Error", description: "User not logged in." });
      return;
    }
    setIsSubmitting(true);
    try {
        const payload: CreateUrgentPurchasePayload = {
            header: {
                invoice_delivery_date: values.invoice_delivery_date ? values.invoice_delivery_date.toISOString().split('T')[0] : null,
                status: 'draft', // Initial status is draft
                notes: values.notes || 'Urgent purchase via Quick Entry.',
                requested_by_user_id: user.id, // Changed from created_by
                confidence_score: null,
                target_approval_role: values.target_approval_role,
            },
            items: values.items.map(item => {
                const inventoryItem = inventoryForSearch.find(i => i.id === item.inventory_item_id);
                return {
                    inventory_item_id: item.inventory_item_id,
                    matched_item_name: inventoryItem?.name || 'Unknown Item',
                    quantity: item.quantity,
                    batch_number: item.batch_number || null,
                    expiry_date: item.expiry_date ? item.expiry_date.toISOString().split('T')[0] : null,
                    slip_text: `Quick Entry: ${inventoryItem?.name}`,
                };
            }),
        };

        const createdEntry = await createUrgentPurchaseEntry(payload);
        
        // After creating as draft, submit it for approval
        if (createdEntry && createdEntry.id) {
            await submitUrgentPurchaseForApproval(createdEntry.id, user.id);
            toast({ title: "Quick Entry Submitted", description: `Request ID: ${createdEntry.id} submitted for approval.` });
            quickEntryForm.reset();
            onSuccess(); // Call success callback
        } else {
            throw new Error("Failed to get ID from created quick entry for submission.");
        }
    } catch (error: any) {
        toast({ variant: "destructive", title: "Quick Entry Error", description: error.message || "Failed to submit quick entry for approval." });
    } finally {
        setIsSubmitting(false);
    }
  };

  // Render the form using Tabs
  return (
    <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="slip_upload">Upload Slip/Invoice</TabsTrigger>
        <TabsTrigger value="quick_entry">Quick Manual Entry</TabsTrigger>
      </TabsList>

      {/* Slip Upload Tab Content */}
      <TabsContent value="slip_upload">
        <Card className="border-0 shadow-none">
          <CardHeader>
            <CardTitle>Upload Delivery Slip or Invoice</CardTitle>
            <CardDescription>Upload an image (PNG, JPG). PDF support requires server-side OCR.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 max-h-[60vh] overflow-y-auto pr-2"> {/* Added max-height and scroll */}
            <UrgentPurchaseSlipUpload onFileSelect={handleFileSelected} processing={isProcessingSlip} />

            {isProcessingSlip && (
              <div className="flex items-center text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing slip...</div>
            )}

            {ocrData && !isProcessingSlip && ( // Show role selector even if no items, but OCR data exists
              <div className="mt-4">
                <Label htmlFor="targetRoleSlip">Send Approval To*</Label>
                <Select value={targetRoleForSlip} onValueChange={setTargetRoleForSlip}>
                  <SelectTrigger id="targetRoleSlip">
                    <SelectValue placeholder="Select role for approval..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableApprovalRoles.map(role => (
                      <SelectItem key={role} value={role}>
                        {role.charAt(0).toUpperCase() + role.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!targetRoleForSlip && isSubmitting && <p className="text-xs text-destructive mt-1">Target approval role is required.</p>}
              </div>
            )}

            {ocrData && editableOcrItems.length > 0 && !isProcessingSlip && (
              <div className="space-y-3 mt-4">
                <h3 className="text-md font-semibold">Review Extracted Items (Confidence: {((ocrData.overall_confidence || 0) * 100).toFixed(0)}%)</h3>
                {ocrData.invoice_delivery_date && <p className="text-sm">Detected Invoice/Delivery Date: {ocrData.invoice_delivery_date}</p>}
                
                {editableOcrItems.map((item, index) => (
                  <Card key={index} className="p-3 space-y-2 bg-muted/50 border">
                    {/* Adjusted grid layout for potentially better alignment */}
                    <div className="grid grid-cols-6 gap-3 items-end"> 
                      <div className="col-span-6 sm:col-span-3 md:col-span-2">
                        <Label htmlFor={`ocr-item-name-${index}`} className="text-xs">Slip Text</Label>
                        <Input id={`ocr-item-name-${index}`} value={item.slip_text || ''} onChange={(e) => handleOcrItemChange(index, 'slip_text', e.target.value)} className="h-8 text-sm" />
                      </div>
                      <div className="col-span-6 sm:col-span-3 md:col-span-2">
                          <Label htmlFor={`ocr-item-inventory-${index}`} className="text-xs">Matched Item</Label>
                          <Select
                              value={item.matched_item_id || ''} // Keep empty string here to show placeholder if no match
                              onValueChange={(value) => handleOcrItemChange(index, 'matched_item_id', value)}
                          >
                              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select item..." /></SelectTrigger>
                              <SelectContent>
                                  {/* Option for user to explicitly select "No Match" or clear selection */}
                                  <SelectItem value={NO_MATCH_SELECT_VALUE} className="text-sm"><em>No Match / Clear Selection</em></SelectItem>
                                  {inventoryItemsForSelect.map(invItem => (
                                      <SelectItem key={invItem.value} value={invItem.value} className="text-sm">
                                          {invItem.label} {invItem.item_code ? `(${invItem.item_code})` : ''}
                                      </SelectItem>
                                  ))}
                              </SelectContent>
                          </Select>
                          {item.confidence !== undefined && item.confidence !== null && <p className="text-xs mt-1">Match Confidence: {((item.confidence || 0) * 100).toFixed(0)}%</p>}
                      </div>
                       <div className="col-span-3 sm:col-span-2 md:col-span-1">
                        <Label htmlFor={`ocr-item-qty-${index}`} className="text-xs">Quantity</Label>
                        <Input id={`ocr-item-qty-${index}`} type="number" value={item.quantity || 0} onChange={(e) => handleOcrItemChange(index, 'quantity', parseInt(e.target.value) || 0)} className="h-8 text-sm" />
                      </div>
                       <div className="col-span-3 sm:col-span-2 md:col-span-1">
                        <Label htmlFor={`ocr-item-batch-${index}`} className="text-xs">Batch No.</Label>
                        <Input id={`ocr-item-batch-${index}`} value={item.batch_number || ''} onChange={(e) => handleOcrItemChange(index, 'batch_number', e.target.value)} className="h-8 text-sm" />
                      </div>
                       <div className="col-span-3 sm:col-span-2 md:col-span-1">
                        <Label htmlFor={`ocr-item-expiry-${index}`} className="text-xs">Expiry Date</Label>
                         <Input id={`ocr-item-expiry-${index}`} type="date" placeholder="YYYY-MM-DD" value={item.expiry_date || ''} onChange={(e) => handleOcrItemChange(index, 'expiry_date', e.target.value)} className="h-8 text-sm" />
                      </div>
                      <div className="col-span-3 sm:col-span-2 md:col-span-1 flex items-end justify-end">
                          <Button variant="ghost" size="icon" onClick={() => handleRemoveOcrItem(index)} className="text-destructive h-8 w-8">
                              <Trash2 className="h-4 w-4" />
                          </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
          <div className="flex justify-end space-x-2 p-4 border-t">
             <Button variant="outline" onClick={onClose}>Cancel</Button>
             <Button onClick={handleSubmitSlipData} disabled={isProcessingSlip || isSubmitting || !ocrData || editableOcrItems.length === 0}>
               {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
               Submit for Approval
             </Button>
          </div>
        </Card>
      </TabsContent>

      {/* Quick Entry Tab Content */}
      <TabsContent value="quick_entry">
        <Card className="border-0 shadow-none">
          <CardHeader>
            <CardTitle>Quick Manual Entry</CardTitle>
            <CardDescription>Manually add items to stock.</CardDescription>
          </CardHeader>
          <form onSubmit={quickEntryForm.handleSubmit(handleSubmitQuickEntry)}>
            <CardContent className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                      <Label htmlFor="target_approval_role_quick">Send Approval To*</Label>
                      <Controller
                          name="target_approval_role"
                          control={quickEntryForm.control}
                          render={({ field, fieldState }) => (
                              <>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                      <SelectTrigger id="target_approval_role_quick">
                                          <SelectValue placeholder="Select role..." />
                                      </SelectTrigger>
                                      <SelectContent>
                                          {availableApprovalRoles.map(role => (
                                              <SelectItem key={role} value={role}>
                                                  {role.charAt(0).toUpperCase() + role.slice(1)}
                                              </SelectItem>
                                          ))}
                                      </SelectContent>
                                  </Select>
                                  {fieldState.error && <p className="text-xs text-destructive mt-1">{fieldState.error.message}</p>}
                              </>
                          )}
                      />
                  </div>
                  <div>
                      <Label htmlFor="quick-invoice-date">Invoice/Delivery Date (Optional)</Label>
                      <Controller
                          name="invoice_delivery_date"
                          control={quickEntryForm.control}
                          render={({ field }) => (
                              <Input 
                                  type="date" 
                                  value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''} 
                                  onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)}
                                  className="h-9"
                              />
                          )}
                      />
                  </div>
                  <div>
                      <Label htmlFor="quick-notes">Notes (Optional)</Label>
                      <Textarea id="quick-notes" {...quickEntryForm.register("notes")} />
                  </div>
              </div>
              
              <h4 className="text-md font-semibold pt-4">Items</h4>
              {quickEntryFields.map((field, index) => (
                  <Card key={field.id} className="p-3 space-y-2 bg-muted/50">
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-end">
                          <div className="sm:col-span-2 md:col-span-2">
                              <Label htmlFor={`qitem-inventory-${index}`} className="text-xs">Inventory Item*</Label>
                              <Controller
                                  name={`items.${index}.inventory_item_id`}
                                  control={quickEntryForm.control}
                                  render={({ field: controllerField, fieldState }) => (
                                      <>
                                      <Select value={controllerField.value || ''} onValueChange={controllerField.onChange}>
                                          <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select item..." /></SelectTrigger>
                                          <SelectContent>
                                              {inventoryItemsForSelect.map(invItem => (
                                                  <SelectItem key={invItem.value} value={invItem.value} className="text-sm">
                                                      {invItem.label} {invItem.item_code ? `(${invItem.item_code})` : ''}
                                                  </SelectItem>
                                              ))}
                                          </SelectContent>
                                      </Select>
                                      {fieldState.error && <p className="text-xs text-destructive mt-1">{fieldState.error.message}</p>}
                                      </>
                                  )}
                              />
                          </div>
                           <div>
                              <Label htmlFor={`qitem-qty-${index}`} className="text-xs">Quantity*</Label>
                              <Controller
                                  name={`items.${index}.quantity`}
                                  control={quickEntryForm.control}
                                  render={({ field: controllerField, fieldState }) => (
                                      <>
                                      <Input id={`qitem-qty-${index}`} type="number" value={controllerField.value || 0} onChange={e => controllerField.onChange(parseInt(e.target.value, 10) || 0)} className="h-8 text-sm" />
                                      {fieldState.error && <p className="text-xs text-destructive mt-1">{fieldState.error.message}</p>}
                                      </>
                                  )}
                              />
                          </div>
                          <div>
                              <Label htmlFor={`qitem-batch-${index}`} className="text-xs">Batch No.</Label>
                              <Controller
                                  name={`items.${index}.batch_number`}
                                  control={quickEntryForm.control}
                                  render={({ field }) => <Input id={`qitem-batch-${index}`} {...field} value={field.value || ''} className="h-8 text-sm" />}
                              />
                          </div>
                          <div>
                              <Label htmlFor={`qitem-expiry-${index}`} className="text-xs">Expiry Date</Label>
                              <Controller
                                  name={`items.${index}.expiry_date`}
                                  control={quickEntryForm.control}
                                  render={({ field }) => (
                                      <Input 
                                          type="date" 
                                          value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''} 
                                          onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)}
                                          className="h-8 text-sm"
                                      />
                                  )}
                              />
                          </div>
                          <div className="flex items-center justify-end">
                              {quickEntryFields.length > 1 && (
                                  <Button type="button" variant="ghost" size="icon" onClick={() => quickEntryRemove(index)} className="text-destructive h-8 w-8">
                                      <Trash2 className="h-4 w-4" />
                                  </Button>
                              )}
                          </div>
                      </div>
                  </Card>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => quickEntryAppend({ inventory_item_id: '', quantity: 1, batch_number: '', expiry_date: null })}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Item
              </Button>

            </CardContent>
            <div className="flex justify-end space-x-2 p-4 border-t">
               <Button variant="outline" onClick={onClose}>Cancel</Button>
               <Button type="submit" disabled={isSubmitting}>
                 {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                 Submit for Approval
               </Button>
            </div>
          </form>
        </Card>
      </TabsContent>
    </Tabs>
  );
};
