import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/AuthContext';
import { getInventoryItems, createStockTake, NewStockTakePayload } from '../services/inventoryService'; // InventoryItemRow removed from here
import { InventoryItemRow } from '../types'; // Ensure this is the sole import for InventoryItemRow
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/ui/page-header';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from '@/components/ui/scroll-area';

interface StockTakeEntry {
  physicalCount?: number;
  notes?: string;
}

interface StockTakeData {
  [itemId: string]: StockTakeEntry;
}

export const StockTakePage: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [allItems, setAllItems] = useState<InventoryItemRow[]>([]); // Use InventoryItemRow directly
  const [isLoadingItems, setIsLoadingItems] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stockTakeInputs, setStockTakeInputs] = useState<StockTakeData>({});
  const [globalNotes, setGlobalNotes] = useState<string>("");

  const fetchAllItems = useCallback(async () => {
    setIsLoadingItems(true);
    try {
      const fetchedItems = await getInventoryItems();
      setAllItems(fetchedItems || []);
      // Initialize stockTakeInputs for each item
      const initialInputs: StockTakeData = {};
      (fetchedItems || []).forEach(item => {
        initialInputs[item.id] = { physicalCount: undefined, notes: '' };
      });
      setStockTakeInputs(initialInputs);
    } catch (error) {
      console.error("Failed to fetch inventory items:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to load items for stock take." });
    } finally {
      setIsLoadingItems(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAllItems();
  }, [fetchAllItems]);

  const handleInputChange = (itemId: string, field: keyof StockTakeEntry, value: string | number) => {
    setStockTakeInputs(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: field === 'physicalCount' ? (value === '' ? undefined : parseInt(String(value), 10)) : String(value),
      }
    }));
  };

  const handleSubmitStockTake = async () => {
    if (!user?.id) {
      toast({ variant: "destructive", title: "Error", description: "User not authenticated." });
      return;
    }
    setIsSubmitting(true);

    const stockTakePromises: Promise<any>[] = [];
    let itemsProcessed = 0;

    allItems.forEach(item => {
      const inputData = stockTakeInputs[item.id];
      if (inputData && inputData.physicalCount !== undefined && inputData.physicalCount >= 0) {
        itemsProcessed++;
        const payload: NewStockTakePayload = {
          inventory_item_id: item.id,
          system_quantity_at_count: item.quantity,
          physical_counted_quantity: inputData.physicalCount,
          counted_by_user_id: user.id,
          notes: inputData.notes || globalNotes || null, // Prioritize item notes, then global, then null
        };
        stockTakePromises.push(createStockTake(payload));
      }
    });

    if (itemsProcessed === 0) {
      toast({ variant: "default", title: "No Data", description: "No physical counts entered to submit." });
      setIsSubmitting(false);
      return;
    }

    try {
      await Promise.all(stockTakePromises);
      toast({ title: "Success", description: `${itemsProcessed} stock take entries recorded successfully.` });
      navigate('/inventory');
      fetchAllItems(); // Refresh list and clear inputs
      setGlobalNotes("");
    } catch (error) {
      console.error("Failed to record one or more stock takes:", error);
      toast({
        variant: "destructive",
        title: "Stock Take Submission Failed",
        description: "An error occurred while saving some entries. Please check and try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingItems) {
    return <div className="p-4">Loading inventory items...</div>;
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <PageHeader
        heading="Perform Stock Take"
        text="Enter the physical count for each item. Only items with a physical count will be submitted."
      />
      <div className="mt-6">
        <div className="mb-4">
          <Textarea
            placeholder="Global notes for this stock take session (optional)"
            value={globalNotes}
            onChange={(e) => setGlobalNotes(e.target.value)}
            className="max-w-xl"
            disabled={isSubmitting}
          />
        </div>
        <ScrollArea className="h-[calc(100vh-300px)] border rounded-md"> {/* Adjust height as needed */}
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead className="w-[300px]">Item Name</TableHead>
                <TableHead className="text-right">System Qty</TableHead>
                <TableHead className="w-[150px] text-right">Physical Count</TableHead>
                <TableHead className="w-[250px]">Item Notes (Optional)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allItems.length === 0 && !isLoadingItems ? (
                <TableRow><TableCell colSpan={4} className="text-center">No inventory items found.</TableCell></TableRow>
              ) : (
                allItems.map(item => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.item_name}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        min="0"
                        placeholder="Count"
                        value={stockTakeInputs[item.id]?.physicalCount ?? ''}
                        onChange={(e) => handleInputChange(item.id, 'physicalCount', e.target.value)}
                        className="text-right"
                        disabled={isSubmitting}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        placeholder="Notes for this item"
                        value={stockTakeInputs[item.id]?.notes ?? ''}
                        onChange={(e) => handleInputChange(item.id, 'notes', e.target.value)}
                        disabled={isSubmitting}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
        <div className="mt-6 flex justify-end space-x-3">
          <Button type="button" variant="outline" onClick={() => navigate('/inventory')} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmitStockTake} disabled={isSubmitting || isLoadingItems}>
            {isSubmitting ? 'Submitting Stock Take...' : 'Submit Stock Take'}
          </Button>
        </div>
      </div>
    </div>
  );
};
