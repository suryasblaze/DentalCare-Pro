// src/features/assets/types.ts
export type AssetCategory = 'IT_EQUIPMENT' | 'FURNITURE' | 'VEHICLE' | 'MACHINERY' | 'BUILDING' | 'OTHER';
export type AssetStatus = 'Active' | 'Under Maintenance' | 'Retired' | 'Disposed' | 'Needs Repair';

export interface Tag {
  id: string; // or number, depending on your DB
  name: string;
  color?: string; // Optional color for the tag
}

// Base Asset structure from DB
export interface Asset {
  id: string; // UUID
  asset_name: string;
  category: AssetCategory | null;
  serial_number?: string | null;
  model_number?: string | null;
  manufacturer?: string | null;
  location?: string | null;
  department?: string | null;
  assigned_to_user_id?: string | null; // UUID of a user
  purchase_date?: string | null; // ISO date string
  purchase_cost?: number | null;
  warranty_expiry_date?: string | null; // ISO date string
  supplier_info?: string | null;
  notes?: string | null;
  status: AssetStatus | null;
  last_serviced_date?: string | null; // ISO date string
  next_maintenance_due_date?: string | null; // ISO date string
  maintenance_interval_value?: number | null; // **** NEW ****
  maintenance_interval_unit?: 'days' | 'weeks' | 'months' | 'years' | null; // **** NEW ****
  image_url?: string | null;
  document_ids?: string[] | null; // Array of UUIDs for related documents
  created_at?: string; // ISO date string
  updated_at?: string; // ISO date string
  custom_fields?: Record<string, any> | null; // For any other custom data
}

// AssetRow is typically what you use for table display, might be identical to Asset or a subset
export type AssetRow = Asset;

// For displaying assets with their tags joined
export interface AssetRowWithTags extends AssetRow {
  tags: Tag[];
  // asset_tags might be an intermediate join table structure if you fetch it directly
  // For simplicity, we assume tags are directly processed into the AssetRowWithTags
}

// Placeholder if you were using it specifically, otherwise Tag is likely what you need
export interface TagPlaceholder extends Tag {}
