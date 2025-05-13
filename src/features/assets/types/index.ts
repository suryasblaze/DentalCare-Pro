import { Database } from '@/lib/database.types';

// Define specific types for asset properties based on the schema
export type AssetCategory = 'Equipment & Tools' | 'Furniture' | 'IT' | 'Other';
export type AssetStatus = 'Active' | 'Under Maintenance' | 'Retired' | 'Disposed';

// Base type derived from Supabase generated types for the 'assets' table
// Ensure your types in '@/lib/database.types.ts' are updated after migration
export type AssetRow = Database['public']['Tables']['assets']['Row'] & {
  maintenance_interval_months?: number | null;
  responsible_user_id?: string | null;
  // last_serviced_date and next_maintenance_due_date should already be part of the base Row type
  // Disposal fields (added for placeholder until typegen)
  disposal_date?: string | null;
  disposal_reason?: string | null;
  disposal_notes?: string | null;
  salvage_value?: number | null;
};

// Extended type for frontend use (can add calculated fields later if needed)
export interface Asset extends AssetRow {
  // Example: Add a calculated field if needed in the future
  // isMaintenanceDueSoon?: boolean;
  // Ensure new fields are accessible here if not directly on AssetRow after generation
  maintenance_interval_months?: number | null;
  responsible_user_id?: string | null;
  // Disposal fields
  disposal_date?: string | null;
  disposal_reason?: string | null;
  disposal_notes?: string | null;
  salvage_value?: number | null;
}

// Type for creating a new asset (omitting id, created_at)
export type NewAsset = Omit<AssetRow, 'id' | 'created_at'>;

// Type for updating an asset (making fields optional, omitting id, created_at)
export type UpdateAsset = Partial<Omit<AssetRow, 'id' | 'created_at'>>;

// Placeholder types until Supabase types are regenerated after migrations
// TODO: Remove these placeholders after running `supabase gen types typescript ...`
export interface MaintenanceLogRowPlaceholder {
  id: string;
  asset_id: string;
  serviced_by_user_id?: string | null;
  serviced_at: string;
  notes?: string | null;
  previous_last_serviced_date?: string | null;
  previous_next_maintenance_due_date?: string | null;
  new_last_serviced_date: string;
  new_next_maintenance_due_date: string;
  created_at: string;
  maintenance_cost?: number | null; // Added
  invoice_document_id?: string | null; // Added
}

export interface AssetDocumentRowPlaceholder {
  id: string;
  asset_id: string;
  file_name: string;
  file_url: string;
  file_type?: string | null;
  file_size_bytes?: number | null;
  uploaded_at: string;
  uploaded_by_user_id?: string | null;
  description?: string | null;
}

export interface AssetDisposalLogRowPlaceholder {
  id: string;
  asset_id: string;
  disposed_by_user_id?: string | null;
  disposal_recorded_at: string;
  disposal_date: string;
  disposal_reason: string;
  disposal_notes?: string | null;
  salvage_value?: number | null;
  created_at: string;
}

export interface TagPlaceholder {
  id: string;
  name: string;
  color?: string | null;
  created_at: string;
  created_by_user_id?: string | null;
}

export interface AssetTagPlaceholder {
  asset_id: string;
  tag_id: string;
  assigned_at: string;
  assigned_by_user_id?: string | null;
}

// Extend AssetRow and Asset to include tags for easier frontend use
// This would ideally come from Supabase generated types with relationships
export type AssetRowWithTags = AssetRow & { tags?: TagPlaceholder[] };
export type AssetWithTags = Asset & { tags?: TagPlaceholder[] };
