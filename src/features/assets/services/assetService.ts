import { supabase } from '@/lib/supabase';
import { AssetRow, NewAsset, UpdateAsset } from '../types';

const TABLE_NAME = 'assets';

// Fetch all assets
export const getAssets = async (): Promise<AssetRow[]> => {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .order('created_at', { ascending: false }); // Default sort by newest

  if (error) {
    console.error('Error fetching assets:', error);
    throw new Error(error.message);
  }
  return data || [];
};

// Fetch a single asset by ID
export const getAssetById = async (id: string): Promise<AssetRow | null> => {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') { // Resource Not Found
        console.log(`Asset with id ${id} not found.`);
        return null;
    }
    console.error(`Error fetching asset ${id}:`, error);
    throw new Error(error.message);
  }
  return data;
};


// Add a new asset
export const addAsset = async (asset: NewAsset): Promise<AssetRow> => {
  // Explicitly set empty strings to null for optional text fields
  const assetData: NewAsset = {
    ...asset,
    serial_number: asset.serial_number || null,
    location: asset.location || null,
    supplier_info: asset.supplier_info || null,
    service_document_url: asset.service_document_url || null,
    barcode_value: asset.barcode_value || null,
    // Dates and numbers should be handled by the form (e.g., using ?? null)
  };

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .insert([assetData]) // Use cleaned data
    .select()
    .single();

  if (error) {
    console.error('Error adding asset:', error);
    // Provide more specific error feedback if possible (e.g., unique constraint violation)
    if (error.code === '23505') { // Unique violation code
        throw new Error(`Failed to add asset. ${error.details || 'A unique value (like Serial Number or Barcode) might already exist.'}`);
    }
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error('Failed to add asset, no data returned.');
  }
  return data;
};

// Update an existing asset
export const updateAsset = async (id: string, updates: UpdateAsset): Promise<AssetRow> => {
   // Explicitly set empty strings to null for optional text fields being updated
   const updateData = { ...updates };

   if (updateData.serial_number === '') {
       updateData.serial_number = null;
   }
   if (updateData.location === '') {
       updateData.location = null;
   }
   if (updateData.supplier_info === '') {
       updateData.supplier_info = null;
   }
   if (updateData.service_document_url === '') {
       updateData.service_document_url = null;
   }
   if (updateData.barcode_value === '') {
       updateData.barcode_value = null;
   }
   // Dates and numbers should be handled by the form (e.g., using ?? null)

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .update(updateData) // Use cleaned data
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error(`Error updating asset ${id}:`, error);
    if (error.code === '23505') { // Unique violation code
        if (error.details.includes('serial_number')) {
            throw new Error('Failed to update asset. The provided Serial Number already exists.');
        } else if (error.details.includes('barcode_value')) {
            throw new Error('Failed to update asset. The provided Barcode/QR Code Value already exists.');
        } else {
            throw new Error(`Failed to update asset. ${error.details || 'A unique value (like Serial Number or Barcode) might already exist.'}`);
        }
    }
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error(`Failed to update asset ${id}, no data returned.`);
  }
  return data;
};

// Delete an asset
export const deleteAsset = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from(TABLE_NAME)
    .delete()
    .eq('id', id);

  if (error) {
    console.error(`Error deleting asset ${id}:`, error);
    throw new Error(error.message);
  }
};

// --- Placeholder for future asset-specific functions ---

// Example: Function to fetch assets due for maintenance soon
export const getAssetsNeedingMaintenance = async (daysThreshold: number = 30): Promise<AssetRow[]> => {
    const today = new Date();
    const thresholdDate = new Date(today);
    thresholdDate.setDate(today.getDate() + daysThreshold);
    const formattedThresholdDate = thresholdDate.toISOString().split('T')[0]; // YYYY-MM-DD

    const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .not('next_maintenance_due_date', 'is', null)
        .lte('next_maintenance_due_date', formattedThresholdDate)
        .in('status', ['Active', 'Under Maintenance']) // Only consider active/in-maintenance assets
        .order('next_maintenance_due_date', { ascending: true });

    if (error) {
        console.error('Error fetching assets needing maintenance:', error);
        throw new Error(error.message);
    }
    return data || [];
}
