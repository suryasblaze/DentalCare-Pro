import { Database } from '@/lib/database.types';

// Define specific types for asset properties based on the schema
export type AssetCategory = 'Equipment' | 'Furniture' | 'IT' | 'Other';
export type AssetStatus = 'Active' | 'Under Maintenance' | 'Retired' | 'Disposed';

// Base type derived from Supabase generated types for the 'assets' table
// Ensure your types in '@/lib/database.types.ts' are updated after migration
export type AssetRow = Database['public']['Tables']['assets']['Row'];

// Extended type for frontend use (can add calculated fields later if needed)
export interface Asset extends AssetRow {
  // Example: Add a calculated field if needed in the future
  // isMaintenanceDueSoon?: boolean;
}

// Type for creating a new asset (omitting id, created_at)
export type NewAsset = Omit<AssetRow, 'id' | 'created_at'>;

// Type for updating an asset (making fields optional, omitting id, created_at)
export type UpdateAsset = Partial<Omit<AssetRow, 'id' | 'created_at'>>;
