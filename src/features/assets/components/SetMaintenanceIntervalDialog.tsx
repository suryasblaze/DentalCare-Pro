import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { AssetRowWithTags } from '../types';

interface SetMaintenanceIntervalDialogProps {
  asset: AssetRowWithTags;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onIntervalSet: () => void; // Callback after successful update
}

type IntervalUnit = 'days' | 'weeks' | 'months' | 'years';

export const SetMaintenanceIntervalDialog: React.FC<SetMaintenanceIntervalDialogProps> = ({
  asset,
  isOpen,
  onOpenChange,
  onIntervalSet,
}) => {
  const { toast } = useToast();
  const [intervalValue, setIntervalValue] = useState<number | ''>(asset.maintenance_interval_value || '');
  const [intervalUnit, setIntervalUnit] = useState<IntervalUnit | undefined>(
    asset.maintenance_interval_unit as IntervalUnit || undefined
  );
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIntervalValue(asset.maintenance_interval_value || '');
    setIntervalUnit(asset.maintenance_interval_unit as IntervalUnit || undefined);
  }, [asset, isOpen]);

  const handleSave = async () => {
    if (intervalValue === '' || !intervalUnit) {
      toast({
        title: "Validation Error",
        description: "Please provide both interval period and unit.",
        variant: "destructive",
      });
      return;
    }
    if (intervalValue <= 0) {
        toast({
            title: "Validation Error",
            description: "Interval period must be positive.",
            variant: "destructive",
        });
        return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('assets')
        .update({
          maintenance_interval_value: intervalValue,
          maintenance_interval_unit: intervalUnit,
        })
        .eq('id', asset.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Maintenance interval for ${asset.asset_name} updated.`,
      });
      onIntervalSet();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error updating interval",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Set Maintenance Interval</DialogTitle>
          <DialogDescription>
            Configure the maintenance interval for asset: <strong>{asset.asset_name}</strong>.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="intervalValue" className="text-right">
              Interval Period
            </Label>
            <Input
              id="intervalValue"
              type="number"
              value={intervalValue}
              onChange={(e) => setIntervalValue(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
              className="col-span-3"
              min="1"
              placeholder="e.g., 3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="intervalUnit" className="text-right">
              Interval
            </Label>
            <Select
              value={intervalUnit}
              onValueChange={(value) => setIntervalUnit(value as IntervalUnit)}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select unit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="days">Days</SelectItem>
                <SelectItem value="weeks">Weeks</SelectItem>
                <SelectItem value="months">Months</SelectItem>
                <SelectItem value="years">Years</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Interval'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
