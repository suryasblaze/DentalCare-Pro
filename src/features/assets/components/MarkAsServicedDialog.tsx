import React, { useState, useEffect } from 'react'; // Added useEffect
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input'; // For cost input
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // For invoice selection
import { Loader2 } from "lucide-react";
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { AssetRow, AssetDocumentRowPlaceholder } from '../types';

interface MarkAsServicedDialogProps {
  asset: AssetRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void; // Callback on successful operation
}

const MarkAsServicedDialog: React.FC<MarkAsServicedDialogProps> = ({
  asset,
  open,
  onOpenChange,
  onSuccess,
}) => {
  const [notes, setNotes] = useState('');
  const [maintenanceCost, setMaintenanceCost] = useState<string>('');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | undefined>(undefined);
  const [assetDocuments, setAssetDocuments] = useState<AssetDocumentRowPlaceholder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingDocs, setIsFetchingDocs] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchDocs = async () => {
      if (asset?.id && open) {
        setIsFetchingDocs(true);
        // TODO: Remove `as any` after regenerating Supabase types
        const { data, error } = await supabase
          .from('asset_documents' as any)
          .select('id, file_name')
          .eq('asset_id', asset.id)
          .order('uploaded_at', { ascending: false });
        
        if (error) {
          console.error("Error fetching asset documents for dialog:", error);
          toast({ title: "Error", description: "Could not load documents for invoice selection.", variant: "destructive" });
        } else {
          setAssetDocuments((data as unknown as AssetDocumentRowPlaceholder[]) || []); // Cast through unknown
        }
        setIsFetchingDocs(false);
      } else if (!open) {
        setAssetDocuments([]); // Clear when dialog closes
      }
    };

    fetchDocs();
  }, [asset, open, toast]);
  
  useEffect(() => {
    // Reset form when dialog opens or asset changes
    if (open) {
      setNotes('');
      setMaintenanceCost('');
      setSelectedInvoiceId(undefined);
    }
  }, [open, asset]);


  const handleSubmit = async () => {
    if (!asset || !asset.id) {
      toast({ title: 'Error', description: 'No asset selected.', variant: 'destructive' });
      return;
    }
    if (!asset.maintenance_interval_months || asset.maintenance_interval_months <= 0) {
        toast({
            title: 'Configuration Error',
            description: 'Maintenance interval is not set for this asset. Please edit the asset to set a valid maintenance interval.',
            variant: 'destructive',
        });
        return;
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
        toast({ title: 'Authentication Error', description: 'Could not get current user. Please ensure you are logged in.', variant: 'destructive' });
        return;
    }
    const servicedByUserId = user.id;
    const cost = parseFloat(maintenanceCost) || 0.00;

    setIsLoading(true);
    try {
      // Note: 'mark_asset_as_serviced' needs to be in your generated Supabase types for full type safety.
      // If you see a type error here, run `supabase gen types typescript ...` after applying the DB migration.
      const { error: rpcError } = await supabase.rpc('mark_asset_as_serviced' as any, { // Added `as any` for now
        p_asset_id: asset.id,
        p_serviced_by_user_id: servicedByUserId,
        p_service_notes: notes,
        p_maintenance_cost: cost,
        p_invoice_document_id: selectedInvoiceId || null,
      });

      if (rpcError) throw rpcError;

      toast({ title: 'Success', description: `${asset.asset_name} marked as serviced.` });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error marking asset as serviced:', error);
      toast({
        title: 'Error',
        description: error.message || 'Could not mark asset as serviced.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!asset) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mark as Serviced: {asset.asset_name}</DialogTitle>
        </DialogHeader>
        <div className="py-4 grid gap-4">
          <div>
            <p><strong>Asset:</strong> {asset.asset_name}</p>
            <p><strong>Last Serviced:</strong> {asset.last_serviced_date ? new Date(asset.last_serviced_date).toLocaleDateString() : 'N/A'}</p>
            <p><strong>Next Due:</strong> {asset.next_maintenance_due_date ? new Date(asset.next_maintenance_due_date).toLocaleDateString() : 'N/A'}</p>
          </div>
          
          <div>
            <Label htmlFor="maintenance-cost">Maintenance Cost (₹)</Label>
            <Input
              id="maintenance-cost"
              type="number"
              value={maintenanceCost}
              onChange={(e) => setMaintenanceCost(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div>
            <Label htmlFor="invoice-document">Link Invoice (Optional)</Label>
            <Select onValueChange={setSelectedInvoiceId} value={selectedInvoiceId}>
              <SelectTrigger id="invoice-document" disabled={isFetchingDocs || assetDocuments.length === 0}>
                <SelectValue placeholder={isFetchingDocs ? "Loading documents..." : (assetDocuments.length === 0 ? "No documents available" : "Select an invoice")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {assetDocuments.map(doc => (
                  <SelectItem key={doc.id} value={doc.id}>{doc.file_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {assetDocuments.length === 0 && !isFetchingDocs && <p className="text-xs text-muted-foreground mt-1">Upload documents on the asset detail page first.</p>}
          </div>

          <div>
            <Label htmlFor="service-notes">Service Notes (Optional)</Label>
            <Textarea
              id="service-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter any notes about the service performed..."
            />
          </div>

           {(!asset.maintenance_interval_months || asset.maintenance_interval_months <= 0) && (
             <p className="text-sm text-destructive">
               Warning: Maintenance interval is not set for this asset. The next due date cannot be calculated automatically. Please edit the asset to set a maintenance interval.
             </p>
           )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={isLoading || !asset.maintenance_interval_months || asset.maintenance_interval_months <= 0}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Confirm Service'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MarkAsServicedDialog;
