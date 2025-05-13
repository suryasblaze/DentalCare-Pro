// src/features/purchases/pages/PurchaseOrderDetailPage.tsx
import React, { useEffect, useState, useCallback } from 'react'; // Added useCallback
import { useParams, useNavigate, Link } from 'react-router-dom';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PurchaseOrder, PurchaseOrderItemFormValues, InventoryItemSelectItem } from '../types'; // Added InventoryItemSelectItem
import {
    getPurchaseOrderById,
    getInventoryItemsForSelect,
    getInvoicesForPO,
    uploadInvoiceForPO,
    getInvoiceDownloadUrl,
    updatePurchaseOrderStatus // Import the new service function
} from '../services/purchaseOrderService'; // Import all needed services
import { useToast } from "@/components/ui/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, Download, Edit, FileUp, Link as LinkIcon, PackageCheck, UploadCloud, CheckCircle, Send } from 'lucide-react'; // Added icons
import { ReceiveItemDialog } from '../components/ReceiveItemDialog'; // Import the dialog
import { useAuth } from '@/context/AuthContext'; // Import useAuth
import { Input } from '@/components/ui/input'; // Import Input for file upload
import { Label } from '@/components/ui/label'; // Import Label

// Type for associated invoices (adjust based on actual data structure)
interface AssociatedInvoice {
    id: string;
    file_name: string;
    storage_path: string;
    uploaded_at: string;
}

// Placeholder type for detailed PO item, adjust as needed
export interface PurchaseOrderItemDetails extends PurchaseOrderItemFormValues {
  id: string; // PO Item ID
  product_name?: string; // Fetched from inventory_items if description is not enough
  quantity_received: number;
  subtotal: number;
}

export interface PurchaseOrderDetailsView extends PurchaseOrder {
  items: PurchaseOrderItemDetails[];
  // supplier_name is already in PurchaseOrder type
}


const PurchaseOrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth(); // Get user

  const [poDetails, setPoDetails] = useState<PurchaseOrderDetailsView | null>(null);
  const [inventoryItems, setInventoryItems] = useState<InventoryItemSelectItem[]>([]); // State for inventory items list
  const [associatedInvoices, setAssociatedInvoices] = useState<AssociatedInvoice[]>([]); // State for invoices
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false); // State for upload loading
  const [isApproving, setIsApproving] = useState(false); // State for approve button loading
  const [isConfirming, setIsConfirming] = useState(false); // State for confirm button loading
  const [error, setError] = useState<string | null>(null);

  // Use useCallback for fetch function to avoid re-creation on every render
  const fetchAllDetails = useCallback(async (poId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      // Fetch PO details, inventory items, and invoices concurrently
      const [poData, itemsData, invoiceData] = await Promise.all([
        getPurchaseOrderById(poId),
        getInventoryItemsForSelect(), // Needed for ReceiveItemDialog logic
        getInvoicesForPO(poId)
      ]);

      if (poData) {
        setPoDetails(poData);
      } else {
        setError("Purchase order not found.");
        setPoDetails(null);
      }
      setInventoryItems(itemsData);
      setAssociatedInvoices(invoiceData);

    } catch (err) {
      console.error(err);
      setError("Failed to fetch purchase order details or related data.");
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not load purchase order details, items, or invoices.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]); // toast is stable, no need for id here as it's passed in

  useEffect(() => {
    if (id) {
      fetchAllDetails(id);
    } else {
      setError("Purchase Order ID is missing.");
      setIsLoading(false);
    }
  }, [id, fetchAllDetails]); // Depend on id and the memoized fetch function

  // Handler for successful item receipt
  const handleReceiveSuccess = () => {
    if (id) {
      toast({ title: "Item Received", description: "Refreshing PO details..." });
      fetchAllDetails(id); // Refetch data
    }
  };

  // Handler for invoice upload
  const handleInvoiceUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file || !id || !poDetails?.po_number || !user?.id) {
          toast({ variant: "destructive", title: "Upload Error", description: "Missing required information for upload." });
          return;
      }

      // Basic file type check (example)
      if (!['application/pdf', 'image/png', 'image/jpeg'].includes(file.type)) {
          toast({ variant: "destructive", title: "Invalid File Type", description: "Please upload a PDF, PNG, or JPG file." });
          return;
      }

      setIsUploading(true);
      try {
          await uploadInvoiceForPO(id, poDetails.po_number, file, user.id);
          toast({ title: "Success", description: `Invoice "${file.name}" uploaded.` });
          // Refetch invoices after successful upload
          const invoiceData = await getInvoicesForPO(id);
          setAssociatedInvoices(invoiceData);
      } catch (error) {
          console.error("Invoice upload failed:", error);
          toast({ variant: "destructive", title: "Upload Failed", description: (error as Error)?.message || "Could not upload invoice." });
      } finally {
          setIsUploading(false);
          // Reset file input if needed (can be tricky)
          event.target.value = '';
      }
  };

  // Handler for approving the PO
  const handleApproveOrder = async () => {
    if (!id || !poDetails) return;
    setIsApproving(true);
    try {
      // In a real app, call a service: await approvePurchaseOrder(id);
      // For now, simulate success and refetch
      console.log(`Simulating approval for PO ID: ${id}`);
      // Simulate backend update by directly changing status for immediate UI feedback
      // and then refetching for consistency (or rely solely on refetch)
      setPoDetails(prev => prev ? { ...prev, status: 'Approved' } : null); // Optimistic update
      toast({ title: "PO Approved", description: `Purchase Order ${poDetails.po_number} has been approved.` });
      // Removed fetchAllDetails(id) to let optimistic update persist for demo
    } catch (error) {
      console.error("Failed to approve PO:", error);
      toast({ variant: "destructive", title: "Approval Failed", description: (error as Error)?.message || "Could not approve purchase order." });
    } finally {
      setIsApproving(false);
    }
  };

  // Handler for confirming/sending the PO (marking as Ordered)
  const handleConfirmOrder = async () => {
    if (!id || !poDetails) return;
    setIsConfirming(true);
    try {
      // Call the service to update status in the database
      await updatePurchaseOrderStatus(id, 'Ordered');
      
      // Update local state AFTER successful DB update
      setPoDetails(prev => prev ? { ...prev, status: 'Ordered' } : null); 
      toast({ title: "PO Confirmed", description: `Purchase Order ${poDetails.po_number} has been marked as Ordered.` });
      
      // Optionally refetch all details to ensure consistency, though local update might suffice
      // fetchAllDetails(id); 
    } catch (error) {
      console.error("Failed to confirm PO:", error);
      toast({ variant: "destructive", title: "Confirmation Failed", description: (error as Error)?.message || "Could not confirm purchase order." });
      // Optional: Revert optimistic update if needed, or refetch to get actual state
      // fetchAllDetails(id); 
    } finally {
      setIsConfirming(false);
    }
  };

  // Handler for invoice download
  const handleInvoiceDownload = async (invoice: AssociatedInvoice) => {
      try {
          const url = await getInvoiceDownloadUrl(invoice.storage_path);
          if (url) {
              // Open in new tab or trigger download
              window.open(url, '_blank');
          } else {
              toast({ variant: "destructive", title: "Download Error", description: "Could not get download link." });
          }
      } catch (error) {
          console.error("Download failed:", error);
          toast({ variant: "destructive", title: "Download Failed", description: "Could not get download link." });
      }
  };


  const getStatusBadgeVariant = (status?: PurchaseOrder['status']): "default" | "secondary" | "destructive" | "outline" => {
    if (!status) return 'outline';
    switch (status) {
      case 'Pending': return 'outline';
      case 'Approved': return 'default'; 
      case 'Ordered': return 'secondary';
      case 'Partially Received': return 'default';
      // For 'Received', we'll handle custom styling directly on the Badge component
      case 'Received': return 'default'; // Fallback, actual styling will be via className
      case 'Cancelled': return 'destructive';
      default: return 'outline';
    }
  };

  if (isLoading) return <div className="container mx-auto p-4">Loading purchase order details...</div>;
  if (error) return <div className="container mx-auto p-4 text-red-500 flex items-center"><AlertCircle className="mr-2"/> {error}</div>;
  if (!poDetails) return <div className="container mx-auto p-4">Purchase order not found.</div>;

  // Update logic for when items can be received
  const canReceiveItems = poDetails.status === 'Ordered' || poDetails.status === 'Partially Received';
  const canApprove = poDetails.status === 'Pending';
  // Assuming 'Confirm' means to mark as 'Ordered'. This button appears if PO is 'Approved'.
  // Or, if no approval step, it might appear if 'Pending'. For now, let's assume it follows 'Approved'.
  const canConfirm = poDetails.status === 'Approved';


  return (
    <div className="container mx-auto p-4 space-y-6">
      <PageHeader
        heading={`Purchase Order: ${poDetails.po_number}`}
        text={`Details for PO from ${poDetails.supplier_name}`}
      >
        {/* Action buttons moved to the bottom */}
      </PageHeader>

      {/* Order Summary Card */}
      <Card>
        {/* ... (CardHeader and CardContent as before) ... */}
         <CardHeader>
          <CardTitle>Order Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-4">
          <div><span className="font-semibold">PO Number:</span> {poDetails.po_number}</div>
          <div><span className="font-semibold">Supplier:</span> {poDetails.supplier_name}</div>
          <div><span className="font-semibold">Order Date:</span> {new Date(poDetails.order_date).toLocaleDateString()}</div>
          <div><span className="font-semibold">Expected Delivery:</span> {poDetails.expected_delivery_date ? new Date(poDetails.expected_delivery_date).toLocaleDateString() : 'N/A'}</div>
          <div>
            <span className="font-semibold">Status:</span>{' '}
            <Badge 
              variant={getStatusBadgeVariant(poDetails.status)}
              className={poDetails.status === 'Received' ? 'bg-green-500 hover:bg-green-600 text-white' : ''}
            >
              {poDetails.status}
            </Badge>
          </div>
          <div><span className="font-semibold">Total Amount:</span> {poDetails.total_amount?.toLocaleString('en-IN', { style: 'currency', currency: 'INR' }) || 'N/A'}</div>
          {poDetails.notes && <div className="md:col-span-3"><span className="font-semibold">Notes:</span> {poDetails.notes}</div>}
        </CardContent>
      </Card>

      <Separator />

      {/* Section for Invoices */}
      <Card>
        <CardHeader>
          <CardTitle>Associated Invoices</CardTitle>
          <CardDescription>Manage invoices related to this purchase order.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            {/* Invoice List */}
            {associatedInvoices.length > 0 ? (
                <ul className="list-disc pl-5 space-y-2">
                    {associatedInvoices.map(invoice => (
                        <li key={invoice.id} className="flex justify-between items-center">
                            <span>{invoice.file_name} <span className="text-xs text-muted-foreground">({new Date(invoice.uploaded_at).toLocaleString()})</span></span>
                            <Button variant="outline" size="sm" onClick={() => handleInvoiceDownload(invoice)}>
                                <Download className="mr-2 h-4 w-4" /> Download
                            </Button>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-sm text-muted-foreground">No invoices uploaded yet.</p>
            )}

            {/* Invoice Upload */}
            <div className="mt-4">
                <Label htmlFor="invoice-upload" className="mb-2 block">Upload New Invoice (PDF, PNG, JPG)</Label>
                <Input
                    id="invoice-upload"
                    type="file"
                    accept=".pdf, image/png, image/jpeg"
                    onChange={handleInvoiceUpload}
                    disabled={isUploading || poDetails.status === 'Cancelled'}
                    className="max-w-sm"
                />
                {isUploading && <p className="text-sm text-muted-foreground mt-2 flex items-center"><UploadCloud className="animate-pulse mr-1 h-4 w-4"/> Uploading...</p>}
            </div>
        </CardContent>
      </Card>

      <Separator />

      {/* New Section for Receiving Items */}
      {canReceiveItems && (
        <Card>
          <CardHeader>
            <CardTitle>Receive Items</CardTitle>
            <CardDescription>Record received quantities for items in this purchase order.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {poDetails.items.filter(item => (item.quantity_ordered - item.quantity_received) > 0).length > 0 ? (
              poDetails.items.map((item) => {
                const remainingQuantity = item.quantity_ordered - item.quantity_received;
                const inventoryItemInfo = inventoryItems.find(invItem => invItem.value === item.inventory_item_id);
                
                if (remainingQuantity <= 0) {
                  return null; // Don't show fully received items here
                }

                return (
                  <div key={`receive-${item.id}`} className="flex justify-between items-center p-2 border rounded-md">
                    <div>
                      <p className="font-medium">{item.description || item.product_name}</p>
                      <p className="text-sm text-muted-foreground">
                        Ordered: {item.quantity_ordered}, Received: {item.quantity_received}, Remaining: {remainingQuantity}
                      </p>
                    </div>
                    <ReceiveItemDialog
                      poItem={item}
                      purchaseOrderId={poDetails.id}
                      poNumber={poDetails.po_number}
                      inventoryItemInfo={inventoryItemInfo}
                      remainingQuantity={remainingQuantity}
                      onReceiveSuccess={handleReceiveSuccess}
                    >
                      <Button variant="default" size="sm" className="bg-blue-500 hover:bg-blue-600 text-white"> 
                        <PackageCheck className="mr-1 h-4 w-4" /> Receive
                      </Button>
                    </ReceiveItemDialog>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground">All items have been fully received or no items are pending receipt.</p>
            )}
          </CardContent>
        </Card>
      )}
      
      <Separator />

      {/* Order Items Table - Actions column will be simplified */}
      <div className="mt-8">
        <PageHeader heading="Order Items Summary" />
        <Table className="mt-4">
          <TableHeader>
            <TableRow>
              <TableHead>Item Description</TableHead>
              <TableHead className="text-right">Ordered</TableHead>
              <TableHead className="text-right">Received</TableHead>
              <TableHead className="text-right">Remaining</TableHead>
              <TableHead className="text-right">Unit Price</TableHead>
              <TableHead className="text-right">Subtotal</TableHead>
              {/* Optional: Keep Actions column for other things, or remove if only for receive */}
              {/* <TableHead className="text-center">Status</TableHead> */} 
            </TableRow>
          </TableHeader>
          <TableBody>
            {poDetails.items.map((item) => {
              const remainingQuantity = item.quantity_ordered - item.quantity_received;
              return (
                <TableRow key={item.id}>
                  <TableCell>{item.description || item.product_name}</TableCell>
                  <TableCell className="text-right">{item.quantity_ordered}</TableCell>
                  <TableCell className="text-right">{item.quantity_received}</TableCell>
                  <TableCell className="text-right font-medium">{remainingQuantity}</TableCell>
                  <TableCell className="text-right">{item.unit_price.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</TableCell>
                  <TableCell className="text-right">{item.subtotal.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</TableCell>
                  {/* <TableCell className="text-center">
                    {remainingQuantity <= 0 ? (
                       <Badge variant={'default'} className="text-xs">Fully Received</Badge>
                    ) : (
                       <Badge variant={'outline'} className="text-xs">Pending Receipt</Badge>
                    )}
                  </TableCell> */}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-between items-center mt-6">
        <div> {/* Container for action buttons */}
          {canApprove && (
            <Button 
              onClick={handleApproveOrder} 
              disabled={isApproving || isLoading} 
              variant="default" // Using "default" which is often green or primary color
              className="bg-green-500 hover:bg-green-600 text-white" // More explicit green styling
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              {isApproving ? 'Approving...' : 'Approve Order'}
            </Button>
          )}
          {canConfirm && (
            <Button 
              onClick={handleConfirmOrder} 
              disabled={isConfirming || isLoading}
              variant="default" // Or another appropriate variant like "secondary"
            >
              <Send className="mr-2 h-4 w-4" />
              {isConfirming ? 'Confirming...' : 'Confirm & Mark Ordered'}
            </Button>
          )}
        </div>
        <Button variant="outline" onClick={() => navigate('/purchases')}>
          Back to Purchase Orders
        </Button>
      </div>
    </div>
  );
};

export default PurchaseOrderDetailPage;
