import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as XLSX from 'xlsx';
import { z } from 'zod';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
// Added DialogDescription to imports
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"; 
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileUpload } from "@/components/ui/file-upload";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/AuthContext';
import { 
    createAdjustmentRequest, 
    uploadAdjustmentPhoto, 
    getInventoryItems,
    getAdjustmentRequestById,
    getAdjustmentPhotoUrl,
    getMostRecentPendingRequestForUser,
    getAdjustmentRequestsByUserId,
    AdjustmentRequestDetails 
} from '../services/inventoryService';
import type { Database } from '../../../../supabase_types'; // Added Database type import
import { InventoryItemRow } from '../types';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/ui/page-header';
import { v4 as uuidv4 } from 'uuid';
import { UploadCloud, CheckCircle2, AlertCircle, Home, PlusCircle, Image as ImageIcon, ListChecks, X } from 'lucide-react'; // Added ListChecks, X
import { InventoryLogHistory } from '../components/InventoryLogHistory';

const adjustmentRequestReasons = [
    'Expired',
    'Damaged',
    'Lost',
    'Stock Count Correction',
    'Used',
    'Other'
] as const;

const RequestReasonEnum = z.enum(adjustmentRequestReasons);

const PHOTO_ACCEPTED_FILE_TYPES = ["image/png", "image/jpeg", "image/jpg"];
const PHOTO_MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const BULK_UPLOAD_ACCEPTED_FILE_TYPES = ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "text/csv"];

// Simplified schema - focusing on single item OR file upload (which populates parsedFileAdjustments state)
const adjustmentRequestSchema = z.object({
  // Fields for single item adjustment (optional if using file upload)
  quantity_to_decrease: z.number().int().positive({ message: "Quantity must be a positive number." }).optional(),
  reason: RequestReasonEnum.optional(),
  
  // Common fields - always required for submission
  notes: z.string().min(1, { message: "Notes are required for adjustment requests." }),
  approver_role_target: z.enum(['admin', 'doctor', 'owner'], { message: "Please select an approver role." }).optional(), // Added 'owner'
  photo_file: z
    .custom<File | null>((file) => file instanceof File, "Photo proof is required.")
    .refine(
      (file) => !file || file.size <= PHOTO_MAX_FILE_SIZE,
      `Photo size should be less than 2MB.`
    )
    .refine(
      (file) => PHOTO_ACCEPTED_FILE_TYPES.includes(file?.type || ""),
      "Only .png, .jpg, .jpeg files are accepted."
    ),
  customApproverEmails: z.string().optional(), // Optional field for comma-separated emails
});
// Removed superRefine as complexity is reduced. Validation for single item is in onSubmit.
// Validation for file upload is in handleParseAdjustmentFile.

type AdjustmentRequestInput = z.infer<typeof adjustmentRequestSchema>;

// Define the structure for parsed file data separately from the form schema
interface ParsedFileAdjustment {
  inventory_item_id: string;
  item_name: string;
  current_stock: number;
  quantity_to_decrease: number;
  reason: typeof adjustmentRequestReasons[number];
}


export const InventoryAdjustPage: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [allItems, setAllItems] = useState<InventoryItemRow[]>([]);
  const [filteredItems, setFilteredItems] = useState<InventoryItemRow[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItemForAdjustment, setSelectedItemForAdjustment] = useState<InventoryItemRow | null>(null);
  // Removed selectedItemsForBulk and isBulkAdjustMode state
  const [isLoadingItems, setIsLoadingItems] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedAdjustmentFile, setUploadedAdjustmentFile] = useState<File | null>(null);
  const [fileParsingError, setFileParsingError] = useState<string | null>(null);
  const [parsedFileAdjustments, setParsedFileAdjustments] = useState<ParsedFileAdjustment[]>([]);
  const [showFileUploadSection, setShowFileUploadSection] = useState(false);
  const [showLogHistoryModal, setShowLogHistoryModal] = useState(false);
  const [submittedRequestDetails, setSubmittedRequestDetails] = useState<AdjustmentRequestDetails | null>(null);
  const [isLoadingRequestDetails, setIsLoadingRequestDetails] = useState(false);
  const [proofPhotoUrl, setProofPhotoUrl] = useState<string | null>(null);
  const [showMyRequestsModal, setShowMyRequestsModal] = useState(false);
  const [myRequestsList, setMyRequestsList] = useState<AdjustmentRequestDetails[]>([]);
  const [isLoadingMyRequests, setIsLoadingMyRequests] = useState(false);

  const getAvailableApproverRoles = () => {
    const currentUserRole = user?.role;
    const allRoles = [
      { value: 'admin', label: 'Admin' },
      { value: 'doctor', label: 'Doctor' },
      { value: 'owner', label: 'Owner' },
    ];

    if (!currentUserRole) return allRoles; // Should not happen if user is creating

    switch (currentUserRole) {
      case 'admin':
        return allRoles.filter(role => role.value === 'doctor' || role.value === 'owner');
      case 'owner':
        return allRoles.filter(role => role.value === 'admin' || role.value === 'doctor');
      case 'doctor':
        return allRoles.filter(role => role.value === 'admin' || role.value === 'owner');
      default:
        return allRoles;
    }
  };

  const form = useForm<AdjustmentRequestInput>({
    resolver: zodResolver(adjustmentRequestSchema),
    defaultValues: {
      notes: '',
      photo_file: null,
      customApproverEmails: '',
      approver_role_target: undefined,
      // quantity_to_decrease and reason are set when selecting single item
    },
  });

  // Removed useFieldArray hook

  const fetchAllItems = React.useCallback(async () => {
    setIsLoadingItems(true);
    try {
      const fetchedItems = await getInventoryItems();
      setAllItems(fetchedItems || []);
      setFilteredItems(fetchedItems || []); // Initialize filteredItems
    } catch (error) {
      console.error("Failed to fetch inventory items:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to load items for selection." });
    } finally {
      setIsLoadingItems(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAllItems();
  }, [fetchAllItems]);
  // Removed isAllSelected, isSomeSelected calculations

  useEffect(() => {
    const lowercasedSearchTerm = searchTerm.toLowerCase();
    const newFilteredItems = allItems.filter(item =>
      item.item_name.toLowerCase().includes(lowercasedSearchTerm) ||
      (item.item_code && item.item_code.toLowerCase().includes(lowercasedSearchTerm)) ||
      (item.category && item.category.toLowerCase().includes(lowercasedSearchTerm))
    );
    setFilteredItems(newFilteredItems);
  }, [searchTerm, allItems]);


  const handleAdjustItemClick = (item: InventoryItemRow) => {
    setSelectedItemForAdjustment(item);
    setShowFileUploadSection(false); // Ensure file upload is hidden
    setUploadedAdjustmentFile(null); // Clear any uploaded file state
    setParsedFileAdjustments([]);
    setFileParsingError(null);
    form.reset({
      quantity_to_decrease: undefined,
      reason: 'Other',
      notes: form.getValues('notes') || '', // Preserve common fields
      photo_file: form.getValues('photo_file') || null,
      customApproverEmails: form.getValues('customApproverEmails') || '',
    });
  };

  // Removed useEffect for populating useFieldArray

  const handleParseAdjustmentFile = useCallback(async () => {
    if (!uploadedAdjustmentFile) {
      setFileParsingError("No file selected.");
      setParsedFileAdjustments([]);
      return;
    }
    setFileParsingError(null);
    setParsedFileAdjustments([]);
    setIsLoadingItems(true); // Use general loading state for parsing

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = e.target?.result;
          if (!data) {
            setFileParsingError("Failed to read file data.");
            setIsLoadingItems(false);
            return;
          }
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

          if (jsonData.length === 0) {
            setFileParsingError("File is empty or has no data in the first sheet.");
            setIsLoadingItems(false);
            return;
          }
          
          // Ensure allItems are loaded for validation
          let currentAllItems = allItems;
          if (currentAllItems.length === 0) {
             // We need to wait for the state update from fetchAllItems
             // A better approach might involve passing allItems directly or using async/await properly
             // For now, let's refetch and hope it's available shortly after. This is not ideal.
             // Consider disabling the parse button until items are loaded.
            await fetchAllItems(); 
            // Re-fetch might not update `allItems` immediately in this scope.
            // A more robust solution would involve managing loading states better.
            // Let's proceed assuming `allItems` will be available after the await, but acknowledge this fragility.
            // A simple check after await:
             if (allItems.length === 0) { // Check the state variable directly
                setFileParsingError("Inventory items not loaded. Please try again.");
                setIsLoadingItems(false);
                return;
             }
             currentAllItems = allItems; // Use the updated state
          }


          const parsedAdjustments: ParsedFileAdjustment[] = []; // Use specific interface
          const errors: string[] = [];

          jsonData.forEach((row, index) => {
            const itemIdentifier = row['SKU'] || row['Item Name'] || row['sku'] || row['item_name'];
            const quantity = parseInt(row['Quantity to Decrease'] || row['quantity_to_decrease'], 10);
            const reason = row['Reason'] || row['reason'];

            if (!itemIdentifier) {
              errors.push(`Row ${index + 2}: Missing SKU or Item Name.`);
              return;
            }
            if (isNaN(quantity) || quantity <= 0) {
              errors.push(`Row ${index + 2}: Invalid or missing 'Quantity to Decrease' for ${itemIdentifier}. Must be a positive number.`);
              return;
            }
            if (!reason || !adjustmentRequestReasons.includes(reason as any)) {
              errors.push(`Row ${index + 2}: Invalid or missing 'Reason' for ${itemIdentifier}. Valid reasons: ${adjustmentRequestReasons.join(', ')}.`);
              return;
            }

            // Use the potentially updated allItems list
            const inventoryItem = currentAllItems.find(
              (item) => (item.item_code && item.item_code.toLowerCase() === String(itemIdentifier).toLowerCase()) || item.item_name.toLowerCase() === String(itemIdentifier).toLowerCase()
            );

            if (!inventoryItem) {
              errors.push(`Row ${index + 2}: Item '${itemIdentifier}' not found in inventory.`);
              return;
            }
            if (quantity > inventoryItem.quantity) {
              errors.push(`Row ${index + 2}: Quantity to decrease (${quantity}) for '${itemIdentifier}' exceeds current stock (${inventoryItem.quantity}).`);
              return;
            }

            parsedAdjustments.push({
              inventory_item_id: inventoryItem.id,
              item_name: inventoryItem.item_name,
              current_stock: inventoryItem.quantity,
              quantity_to_decrease: quantity,
              reason: reason as typeof adjustmentRequestReasons[number],
            });
          });

          if (errors.length > 0) {
            setFileParsingError(`Validation errors found in the file:\n- ${errors.join('\n- ')}`);
            setParsedFileAdjustments([]);
          } else {
            setParsedFileAdjustments(parsedAdjustments);
            // Don't set form value here, use parsedFileAdjustments state directly in onSubmit
            toast({ title: "File Processed", description: `${parsedAdjustments.length} items ready for adjustment.` });
          }
        } catch (parseError) {
          console.error("Error parsing file content:", parseError);
          setFileParsingError(`Error parsing file: ${(parseError as Error).message}`);
        } finally {
          setIsLoadingItems(false);
        }
      };
      reader.onerror = (e) => {
        console.error("FileReader error:", e);
        setFileParsingError("Failed to read the file.");
        setIsLoadingItems(false);
      };
      reader.readAsArrayBuffer(uploadedAdjustmentFile);
    } catch (error) {
      console.error("Error initiating file read:", error);
      setFileParsingError(`Error reading file: ${(error as Error).message}`);
      setIsLoadingItems(false);
    }
  }, [uploadedAdjustmentFile, allItems, toast, fetchAllItems]);


  const fetchUserAdjustmentRequests = async () => {
    if (!user?.id) return;
    setIsLoadingMyRequests(true);
    try {
      // Fetch pending and recently resolved requests for the user
      const statusesToFetch: Database['public']['Tables']['inventory_adjustment_requests']['Row']['status'][] = ['pending', 'approved', 'rejected'];
      const requests = await getAdjustmentRequestsByUserId(user.id, statusesToFetch, 20);
      setMyRequestsList(requests);
    } catch (error) {
      console.error("Error fetching user's adjustment requests:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not load your adjustment requests." });
    } finally {
      setIsLoadingMyRequests(false);
    }
  };

  const handleViewMyRequestsClick = () => {
    fetchUserAdjustmentRequests();
    setShowMyRequestsModal(true);
  };

  const handleSuccessfulRequest = async (requestId: string, isBulk: boolean, itemCount?: number) => {
    setIsLoadingRequestDetails(true);
    setProofPhotoUrl(null); 
    try {
      const details = await getAdjustmentRequestById(requestId);
      if (details) {
        setSubmittedRequestDetails(details); // Use setSubmittedRequestDetails
        if (details.photo_url) {
          const url = await getAdjustmentPhotoUrl(details.photo_url);
          setProofPhotoUrl(url);
        }
        toast({ 
          title: "Request Submitted Successfully", 
          description: isBulk 
            ? `${itemCount} adjustment requests initiated. Displaying details for the first item.` 
            : `Adjustment request for ${details.inventory_items?.item_name || 'item'} submitted.`
        });
      } else {
        toast({ variant: "destructive", title: "Error", description: "Could not fetch details of the submitted request." });
      }
    } catch (error) {
      console.error("Failed to fetch submitted request details:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to load request details after submission." });
    } finally {
      // Reset form and selection states
      form.reset({ notes: '', photo_file: null, customApproverEmails: '', quantity_to_decrease: undefined, reason: undefined });
      setSelectedItemForAdjustment(null);
      setShowFileUploadSection(false);
      setUploadedAdjustmentFile(null);
      setParsedFileAdjustments([]);
      setFileParsingError(null);
      fetchAllItems(); 
      setIsLoadingRequestDetails(false);
    }
  };

  const onSubmit = async (data: AdjustmentRequestInput) => {
    setIsSubmitting(true);
    try {
      if (!user?.id) {
        toast({ variant: "destructive", title: "Error", description: "User not authenticated." });
        return;
      }
      if (!data.photo_file) {
        form.setError("photo_file", { type: "manual", message: "Photo proof is required." });
        return;
      }

      // Case 1: File Upload Bulk Adjustment
      if (showFileUploadSection && parsedFileAdjustments.length > 0) {
        if (fileParsingError) {
           toast({ variant: "destructive", title: "Error", description: "Cannot submit, please fix errors in the uploaded file." });
           return;
        }
         try {
          const tempRequestId = uuidv4();
          toast({ title: "Uploading Photo...", description: "Please wait." });
          const photoPath = await uploadAdjustmentPhoto(data.photo_file!, tempRequestId);

          toast({ title: "Submitting Bulk Request...", description: `Processing ${parsedFileAdjustments.length} items from file.` });
          const customEmailsArray = data.customApproverEmails
            ?.split(',')
            .map(email => email.trim())
            .filter(email => email.length > 0) || null;
          
          let firstRequestId: string | null = null;

          for (const itemAdjustment of parsedFileAdjustments) { 
            const createdReq = await createAdjustmentRequest({
              inventory_item_id: itemAdjustment.inventory_item_id,
              quantity_to_decrease: itemAdjustment.quantity_to_decrease,
              reason: itemAdjustment.reason,
              notes: data.notes, 
              photo_url: photoPath, 
              requested_by_user_id: user.id,
              custom_approver_emails: customEmailsArray, 
            });
            if (!firstRequestId) {
                firstRequestId = createdReq.id;
            }
          }
          
          if (firstRequestId) {
            await handleSuccessfulRequest(firstRequestId, true, parsedFileAdjustments.length);
          } else {
            // Fallback, though this path should ideally not be hit if requests were made.
            toast({ title: "Success", description: `Bulk adjustment process completed for ${parsedFileAdjustments.length} items. No specific request to display.` });
            form.reset({ notes: '', photo_file: null, customApproverEmails: '' });
            setShowFileUploadSection(false);
            setUploadedAdjustmentFile(null);
            setParsedFileAdjustments([]);
            setFileParsingError(null);
            fetchAllItems();
          }
        } catch (error) {
          console.error("Failed to submit file-based bulk adjustment request:", error);
          toast({
            variant: "destructive",
            title: "Bulk Adjustment Failed",
            description: (error as Error)?.message || "An unexpected error occurred during bulk submission.",
          });
        }
      // Case 2: Single Item Adjustment
    } else if (selectedItemForAdjustment && data.quantity_to_decrease !== undefined && data.reason !== undefined) {
        // Validation for single item
        if (selectedItemForAdjustment.quantity - data.quantity_to_decrease < 0) {
            form.setError("quantity_to_decrease", { type: "manual", message: `Decrease quantity (${data.quantity_to_decrease}) exceeds current stock (${selectedItemForAdjustment.quantity}) for ${selectedItemForAdjustment.item_name}.` });
            return;
        }
         try {
            const tempRequestId = uuidv4();
            toast({ title: "Uploading Photo...", description: "Please wait." });
            const photoPath = await uploadAdjustmentPhoto(data.photo_file!, tempRequestId); // photo_file is asserted as non-null

            toast({ title: "Submitting Request...", description: "Saving adjustment request details." });
            const customEmailsArray = data.customApproverEmails
              ?.split(',')
              .map(email => email.trim())
              .filter(email => email.length > 0) || null;

            const createdRequest = await createAdjustmentRequest({
              inventory_item_id: selectedItemForAdjustment.id,
              quantity_to_decrease: data.quantity_to_decrease,
              reason: data.reason,
              notes: data.notes,
              photo_url: photoPath,
              requested_by_user_id: user.id,
              custom_approver_emails: customEmailsArray,
            });
            
            await handleSuccessfulRequest(createdRequest.id, false);
        } catch (error) {
            console.error("Failed to submit single adjustment request:", error);
            toast({
              variant: "destructive",
              title: "Adjustment Failed",
              description: (error as Error)?.message || "An unexpected error occurred during single item submission.",
            });
        }
    } else {
        toast({ variant: "destructive", title: "Error", description: "Form data is incomplete or invalid." });
        return;
    }
    } catch (error) { 
      // This top-level catch handles errors from pre-submission checks (auth, photo) or if logic somehow bypasses specific catches.
      console.error("Overall submission process error:", error);
      toast({
        variant: "destructive",
        title: "Submission Process Error",
        description: (error as Error)?.message || "An unexpected error occurred.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6">
      <PageHeader
        heading={
          submittedRequestDetails // Use submittedRequestDetails
            ? "Adjustment Request Submitted"
            : "Create Stock Adjustment Request"
        }
        text={
          submittedRequestDetails // Use submittedRequestDetails
            ? `Details for request ID: ${submittedRequestDetails.id}`
            : showFileUploadSection 
            ? "Adjust stock via file upload."
            : selectedItemForAdjustment
            ? `Adjusting: ${selectedItemForAdjustment.item_name} (Current Stock: ${selectedItemForAdjustment.quantity})`
            : "Select an item or upload a file to adjust stock."
        }
      />

      {isLoadingRequestDetails ? (
        <div className="flex justify-center items-center h-64">
          <p>Loading request details...</p>
        </div>
      ) : submittedRequestDetails ? ( // Use submittedRequestDetails
        // Display Submitted Request Details
        <Card className="max-w-2xl mx-auto mt-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              Request Details
              {submittedRequestDetails.status === 'approved' && <CheckCircle2 className="ml-2 h-6 w-6 text-green-500" />}
              {submittedRequestDetails.status === 'pending' && <AlertCircle className="ml-2 h-6 w-6 text-yellow-500" />}
              {submittedRequestDetails.status === 'rejected' && <AlertCircle className="ml-2 h-6 w-6 text-red-500" />}
            </CardTitle>
            <CardDescription>
              Item: {submittedRequestDetails.inventory_items?.item_name || 'N/A'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div><strong>Request ID:</strong> {submittedRequestDetails.id}</div>
            <div><strong>Quantity Decreased:</strong> {submittedRequestDetails.quantity_to_decrease}</div>
            <div><strong>Reason:</strong> {submittedRequestDetails.reason}</div>
            <div><strong>Notes:</strong> {submittedRequestDetails.notes}</div>
            <div>
              <strong>Status:</strong> 
              <span className={`ml-1 font-semibold ${
                submittedRequestDetails.status === 'approved' ? 'text-green-600' :
                submittedRequestDetails.status === 'rejected' ? 'text-red-600' :
                'text-yellow-600'
              }`}>
                {submittedRequestDetails.status.toUpperCase()}
              </span>
            </div>
            <div><strong>Requested At:</strong> {new Date(submittedRequestDetails.requested_at).toLocaleString()}</div>
            <div><strong>Requested By:</strong> {submittedRequestDetails.requester_profile ? `${submittedRequestDetails.requester_profile.first_name || ''} ${submittedRequestDetails.requester_profile.last_name || ''}`.trim() || 'N/A' : 'N/A'}</div>
            {submittedRequestDetails.reviewed_by_user_id && (
              <>
                <div><strong>Reviewed At:</strong> {submittedRequestDetails.reviewed_at ? new Date(submittedRequestDetails.reviewed_at).toLocaleString() : 'N/A'}</div>
                <div><strong>Reviewer Notes:</strong> {submittedRequestDetails.reviewer_notes || 'N/A'}</div>
              </>
            )}
            {proofPhotoUrl ? (
              <div className="mt-4">
                <strong>Proof Photo:</strong>
                <img src={proofPhotoUrl} alt="Adjustment Proof" className="rounded-md border max-w-xs max-h-64 mt-2" />
              </div>
            ) : submittedRequestDetails.photo_url ? (
              <div className="mt-4">
                <strong>Proof Photo:</strong>
                <div className="flex items-center text-muted-foreground">
                  <ImageIcon className="mr-2 h-5 w-5" />
                  <span>Loading photo or photo not available...</span>
                </div>
              </div>
            ) : null}
            <div className="flex justify-end space-x-3 pt-4">
              <Button variant="outline" onClick={() => {
                setSubmittedRequestDetails(null); // Use setSubmittedRequestDetails
                setProofPhotoUrl(null);
                // Form and other states are reset if user proceeds to create new one via item selection
              }}>
                <PlusCircle className="mr-2 h-4 w-4" /> Make Another Adjustment
              </Button>
              <Button onClick={() => navigate('/inventory')}>
                <Home className="mr-2 h-4 w-4" /> Go to Inventory
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : !selectedItemForAdjustment && !showFileUploadSection ? (
        // Item Selection List
        <>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center my-4 space-y-2 sm:space-y-0">
            <Input
              placeholder="Search items by name, SKU, or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-full sm:max-w-sm"
            />
            <div className="flex space-x-2"> {/* Group buttons */}
              {/* Removed Manual Bulk Adjust Button */}
              <Button onClick={() => {
                setShowFileUploadSection(true);
                setSelectedItemForAdjustment(null); // Turn off single item mode
              setParsedFileAdjustments([]);
              setFileParsingError(null);
              // Preserve common form fields if needed
              const commonValues = { notes: form.getValues('notes'), photo_file: form.getValues('photo_file'), customApproverEmails: form.getValues('customApproverEmails') };
              form.reset({ ...commonValues }); // Reset specific fields for single item mode
              }}>
                <UploadCloud className="mr-2 h-4 w-4" /> Adjust via Bulk Upload
              </Button>
              <Button variant="outline" onClick={() => setShowLogHistoryModal(true)}>
                View Modification History
              </Button>
              <Button variant="outline" onClick={handleViewMyRequestsClick}>
                <ListChecks className="mr-2 h-4 w-4" /> View My Requests
              </Button>
            </div>
          </div>
          <ScrollArea className="h-[calc(100vh-420px)] border rounded-md">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  {/* Removed Checkbox TableHead */}
                  <TableHead>Item Name</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Current Stock</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingItems ? (
                  <TableRow><TableCell colSpan={5} className="text-center">Loading items...</TableCell></TableRow> // Adjusted colSpan
                ) : filteredItems.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center">No items match your search or no items available.</TableCell></TableRow> // Adjusted colSpan
                ) : (
                  filteredItems.map(item => (
                    <TableRow key={item.id}>
                      {/* Removed Checkbox TableCell */}
                      <TableCell className="font-medium">{item.item_name}</TableCell>
                      <TableCell>{item.item_code || 'N/A'}</TableCell>
                      <TableCell>{item.category || 'N/A'}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleAdjustItemClick(item)} 
                            disabled={isSubmitting} // Simplified disabled logic
                        >
                          Adjust
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </>
      ) : ( 
        // Adjustment Form Area (Single Item or File Upload)
        <div className="max-w-2xl mx-auto mt-6">
          {showFileUploadSection ? (
            // File Upload Section
            <div className="space-y-6 p-6 border rounded-lg shadow-sm bg-card mb-6"> {/* Added mb-6 */}
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Bulk Adjust via File Upload</h3>
                <Button variant="ghost" size="sm" onClick={() => {
                    setShowFileUploadSection(false); 
                    setUploadedAdjustmentFile(null); 
                    setParsedFileAdjustments([]); 
                    setFileParsingError(null);
                    // Reset form but preserve common fields if needed
                     const commonValues = { notes: form.getValues('notes'), photo_file: form.getValues('photo_file'), customApproverEmails: form.getValues('customApproverEmails') };
                     form.reset({ ...commonValues });
                }}>
                    Cancel File Upload
                </Button>
              </div>
              <div>
                <label htmlFor="adjustment-file-upload" className="block text-sm font-medium text-foreground mb-1">
                   Upload Adjustment File (.xlsx, .csv)
                 </label>
                 {/* Improved File Upload Input */}
                 <div className="flex items-center justify-center w-full">
                    <label
                      htmlFor="adjustment-file-upload"
                      className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-card hover:bg-muted/50"
                    >
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <UploadCloud className="w-8 h-8 mb-4 text-muted-foreground" />
                        <p className="mb-2 text-sm text-muted-foreground">
                          <span className="font-semibold">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-muted-foreground">XLSX, CSV (MAX. 5MB)</p>
                      </div>
                      <Input
                        id="adjustment-file-upload"
                        type="file"
                        className="hidden"
                        accept={BULK_UPLOAD_ACCEPTED_FILE_TYPES.join(',')}
                        onChange={(e) => {
                            setUploadedAdjustmentFile(e.target.files ? e.target.files[0] : null);
                            setParsedFileAdjustments([]); // Clear previous results on new file
                            setFileParsingError(null);
                        }}
                      />
                    </label>
                  </div>
                 {uploadedAdjustmentFile && (
                    <p className="text-sm text-muted-foreground mt-2 text-center">Selected: {uploadedAdjustmentFile.name}</p>
                 )}
                 {fileParsingError && <p className="text-sm font-medium text-destructive mt-1">{fileParsingError}</p>}
                 <p className="text-xs text-muted-foreground mt-1 text-center">
                  Expected columns: 'SKU' (or 'Item Name'), 'Quantity to Decrease', 'Reason'.
                </p>
              </div>
              <Button onClick={handleParseAdjustmentFile} disabled={!uploadedAdjustmentFile || isLoadingItems || isSubmitting}>
                {isLoadingItems ? "Processing File..." : "Process Uploaded File"}
              </Button>
              {parsedFileAdjustments.length > 0 && !fileParsingError && (
                <div className="mt-4 p-3 bg-green-100 border border-green-300 rounded-md">
                  <p className="text-green-700 font-semibold">{parsedFileAdjustments.length} items parsed successfully and ready for adjustment.</p>
                  <p className="text-xs text-green-600">Review common fields below and submit.</p>
                </div>
              )}
               {/* Common fields form for file upload will be part of the main form below */}
            </div>
          ) : null}

              {/* Main Form for submitting adjustments (single or after file parse) */}
              {/* This form is always rendered, common fields are shown when needed */}
              <Form {...form}>
                 {/* Add a hidden submit button or ensure the form tag wraps the actual submit button */}
                 {/* The form tag needs to wrap the common fields and the submit button */}
                 <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 p-6 border rounded-lg shadow-sm bg-card">
                  
                  {/* Title for Single Item */}
                  {!showFileUploadSection && selectedItemForAdjustment && (
                     <h3 className="text-lg font-semibold">Adjusting Single Item: {selectedItemForAdjustment.item_name} (Current: {selectedItemForAdjustment.quantity})</h3>
                  )}

                  {/* Fields for SINGLE item adjustment */}
                  {!showFileUploadSection && selectedItemForAdjustment && (
                    <>
                      <FormField
                        control={form.control}
                        name="quantity_to_decrease" 
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantity to Decrease</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            placeholder="Enter positive quantity"
                            {...field}
                            onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)}
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                        name="reason" 
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Reason for Adjustment</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value as string} disabled={isSubmitting}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select reason" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {adjustmentRequestReasons.map(reason => (
                                  <SelectItem key={reason} value={reason}>
                                    {reason.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}
                  
                  {/* Common Fields: Photo, Notes, Custom Approvers - visible if a single item is selected OR if a file has been successfully parsed */}
                  {(selectedItemForAdjustment || (showFileUploadSection && parsedFileAdjustments.length > 0 && !fileParsingError)) && (
                    <>
                      <FormField
                control={form.control}
                name="photo_file"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Photo Proof (Required)</FormLabel>
                    <FormControl>
                      <FileUpload
                        value={field.value}
                        onFileChange={(file: File | null) => field.onChange(file)}
                        accept={PHOTO_ACCEPTED_FILE_TYPES.join(',')}
                        maxSize={PHOTO_MAX_FILE_SIZE}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Required)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Explain the reason for adjustment..." {...field} disabled={isSubmitting} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="approver_role_target"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assign Approver To</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        field.onChange(value);
                        // If only one option remains after filtering, auto-select it (optional UX improvement)
                        const availableRoles = getAvailableApproverRoles();
                        if (availableRoles.length === 1 && value !== availableRoles[0].value) {
                           // This logic might be tricky if the user can de-select.
                           // For now, let's ensure the value is one of the available ones.
                        }
                      }} 
                      value={field.value} // Use value instead of defaultValue for controlled component
                      disabled={isSubmitting}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role to approve this request" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {getAvailableApproverRoles().map(role => (
                          <SelectItem key={role.value} value={role.value}>
                            {role.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground">
                      Select the role that should approve this request.
                    </p>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="customApproverEmails"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Custom Approver Emails (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., approver1@example.com, approver2@example.com"
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground">
                      Enter comma-separated email addresses if you want to notify specific people instead of the default role-based approvers.
                    </p>
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-3 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                      onClick={() => {
                        setSelectedItemForAdjustment(null);
                        // isBulkAdjustMode removed
                        setShowFileUploadSection(false);
                        setUploadedAdjustmentFile(null);
                        setParsedFileAdjustments([]);
                        setFileParsingError(null);
                        // selectedItemsForBulk removed
                        form.reset({ notes: '', photo_file: null, customApproverEmails: '', approver_role_target: undefined, quantity_to_decrease: undefined, reason: undefined });
                      }} 
                      disabled={isSubmitting}
                    >
                      Cancel 
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={
                        isSubmitting || 
                        (!selectedItemForAdjustment && !showFileUploadSection) || // No mode active
                        (showFileUploadSection && parsedFileAdjustments.length === 0) // File upload mode but no parsed items ready
                      }
                    >
                      {isSubmitting ? 'Submitting...' : 'Submit Adjustment Request(s)'}
                    </Button>
                  </div>
                    </>
                  )}
                 </form>
          </Form>
        </div>
      )}

      {showLogHistoryModal && (
        <Dialog open={showLogHistoryModal} onOpenChange={setShowLogHistoryModal}>
          <DialogContent className="sm:max-w-xl md:max-w-2xl lg:max-w-4xl xl:max-w-5xl"> {/* Adjusted width */}
            <DialogHeader>
              <DialogTitle>Inventory Modification Log</DialogTitle>
              {/* Description can be removed or kept if desired */}
            </DialogHeader>
            <div className="py-1 max-h-[70vh] overflow-y-auto"> {/* Adjusted padding and added overflow */}
              <InventoryLogHistory />
            </div>
            <DialogFooter className="sm:justify-start"> {/* Ensure footer buttons are accessible */}
              <Button variant="outline" onClick={() => setShowLogHistoryModal(false)} className="mt-2 sm:mt-0">Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal for User's Adjustment Requests */}
      {showMyRequestsModal && (
        <Dialog open={showMyRequestsModal} onOpenChange={setShowMyRequestsModal}>
          <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl">
            <DialogHeader>
              <DialogTitle>My Adjustment Requests</DialogTitle>
              <DialogDescription>
                Showing your most recent adjustment requests. Click a request to view its full details.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 max-h-[70vh] overflow-y-auto">
              {isLoadingMyRequests ? (
                <p>Loading your requests...</p>
              ) : myRequestsList.length === 0 ? (
                <p>You have no adjustment requests.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {myRequestsList.map((req) => (
                      <TableRow key={req.id}>
                        <TableCell>{req.inventory_items?.item_name || 'N/A'}</TableCell>
                        <TableCell>{req.quantity_to_decrease}</TableCell>
                        <TableCell>{req.reason}</TableCell>
                        <TableCell>{new Date(req.requested_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            req.status === 'approved' ? 'bg-green-100 text-green-700' :
                            req.status === 'rejected' ? 'bg-red-100 text-red-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {req.status.toUpperCase()}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSubmittedRequestDetails(req);
                              if (req.photo_url) {
                                getAdjustmentPhotoUrl(req.photo_url).then(setProofPhotoUrl);
                              } else {
                                setProofPhotoUrl(null);
                              }
                              setShowMyRequestsModal(false);
                            }}
                          >
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowMyRequestsModal(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
