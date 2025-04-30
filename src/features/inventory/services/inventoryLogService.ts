import { supabase } from '@/lib/supabase';

export async function logQuantityUpdate(itemId: string, oldQuantity: number, newQuantity: number, updatedBy: string) {
  try {
    const quantityChange = newQuantity - oldQuantity;
    const { data, error } = await supabase
      .from('inventory_log')
      .insert([
        {
          inventory_item_id: itemId,
          quantity_change: quantityChange,
          user_id: updatedBy,
          change_type: 'adjustment',
        },
      ]);

    if (error) throw error;
  } catch (err) {
    console.error('Failed to log quantity update:', err);
  }
}
