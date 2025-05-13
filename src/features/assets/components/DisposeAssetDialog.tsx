import React, { useState, useEffect } from 'react';
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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { AssetRow } from '../types';

interface DisposeAssetDialogProps {
  asset: AssetRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void; // Callback on successful operation
}

const DISPOSAL_REASONS = ['Sold', 'Scrapped', 'Donated', 'Stolen', 'Obsolete', 'Other'] as const;
type DisposalReason = typeof DISPOSAL_REASONS[number];

const DisposeAssetDialog: React.FC<DisposeAssetDialogProps> = ({
  asset,
  open,
  onOpenChange,
  onSuccess,
}) => {
  const [disposalDate, setDisposalDate] = useState<Date | undefined>(new Date());
  const [reason, setReason] = useState<DisposalReason | undefined>(undefined);
  const [notes, setNotes] = useState('');
  const [salvageValue, setSalvageValue] = useState<string>(''); // Store as string for input
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Reset form when dialog opens or asset changes
    if (open) {
      setDisposalDate(new Date());
      setReason(undefined);
      setNotes('');
      setSalvageValue('');
    }
  }, [open, asset]);

  const handleSubmit = async () => {
    if (!asset || !asset.id) {
      toast({ title: 'Error', description: 'No asset selected.', variant: 'destructive' });
      return;
    }
    if (!disposalDate) {
      toast({ title: 'Validation Error', description: 'Disposal date is required.', variant: 'destructive' });
      return;
    }
    if (!reason) {
      toast({ title: 'Validation Error', description: 'Disposal reason is required.', variant: 'destructive' });
      return;
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      toast({ title: 'Authentication Error', description: 'Could not get current user.', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      const numericSalvageValue = parseFloat(salvageValue) || 0.00;
      const formattedDisposalDate = format(disposalDate, "yyyy-MM-dd");

      // TODO: Ensure 'dispose_asset' is in generated Supabase types after migration
      const { error: rpcError } = await supabase.rpc('dispose_asset' as any, {
        p_asset_id: asset.id,
        p_disposed_by_user_id: user.id,
        p_disposal_date: formattedDisposalDate,
        p_disposal_reason: reason,
        p_salvage_value: numericSalvageValue,
        p_disposal_notes: notes,
      });

      if (rpcError) throw rpcError;

      toast({ title: 'Success', description: `${asset.asset_name} marked as disposed.` });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error disposing asset:', error);
      toast({
        title: 'Error',
        description: error.message || 'Could not dispose asset.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!asset) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Dispose Asset: {asset.asset_name}</DialogTitle>
        </DialogHeader>
        <div className="py-4 grid gap-4">
          <div>
            <Label htmlFor="disposal-date">Disposal Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !disposalDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {disposalDate ? format(disposalDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={disposalDate}
                  onSelect={setDisposalDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label htmlFor="disposal-reason">Reason</Label>
            <Select onValueChange={(value) => setReason(value as DisposalReason)} value={reason}>
              <SelectTrigger id="disposal-reason">
                <SelectValue placeholder="Select disposal reason" />
              </SelectTrigger>
              <SelectContent>
                {DISPOSAL_REASONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="salvage-value">Salvage Value (₹)</Label>
            <Input
              id="salvage-value"
              type="number"
              value={salvageValue}
              onChange={(e) => setSalvageValue(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div>
            <Label htmlFor="disposal-notes">Notes (Optional)</Label>
            <Textarea
              id="disposal-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter any additional notes about the disposal..."
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={isLoading || !disposalDate || !reason}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Confirm Disposal'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DisposeAssetDialog;
