import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { InventoryItemRow } from '../types';
import InvoiceUpload from './InvoiceUpload';

interface InventoryEditFormProps {
  item: InventoryItemRow;
  onClose: () => void;
}

const InventoryEditForm: React.FC<InventoryEditFormProps> = ({ item, onClose }) => {
  const [quantity, setQuantity] = useState(item.quantity ?? 0);
  const [expiryDate, setExpiryDate] = useState(item.expiry_date ?? '');
  const [purchasePrice, setPurchasePrice] = useState(item.purchase_price ?? 0);
  const { toast } = useToast();

  useEffect(() => {
    setQuantity(item.quantity ?? 0);
    setExpiryDate(item.expiry_date ?? '');
    setPurchasePrice(item.purchase_price ?? 0);
  }, [item]);

  const handleSaveChanges = async () => {
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .update({
          quantity,
          expiry_date: expiryDate,
          purchase_price: purchasePrice,
        })
        .eq('id', item.id);

      if (error) throw error;

      toast({ title: 'Success', description: 'Item updated successfully.' });
      onClose();
    } catch (err) {
      console.error('Failed to update item:', err);
      toast({
        title: 'Error Updating Item',
        description: err instanceof Error ? err.message : 'Could not update item.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-lg font-bold mb-4">Edit Inventory Item</h2>
      <form className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Quantity:</label>
          <input 
            type="number" 
            value={quantity} 
            onChange={(e) => setQuantity(Number(e.target.value))} 
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Expiry Date:</label>
          <input 
            type="date" 
            value={expiryDate} 
            onChange={(e) => setExpiryDate(e.target.value)} 
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Purchase Price:</label>
          <input 
            type="number" 
            value={purchasePrice} 
            onChange={(e) => setPurchasePrice(Number(e.target.value))} 
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
          />
        </div>
        <div>
          <InvoiceUpload itemId={item.id} />
        </div>
        <div className="flex justify-end space-x-2">
          <button 
            type="button" 
            onClick={onClose} 
            className="py-2 px-4 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md"
          >
            Cancel
          </button>
          <button 
            type="button" 
            onClick={handleSaveChanges} 
            className="py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md"
          >
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
};

export default InventoryEditForm;
