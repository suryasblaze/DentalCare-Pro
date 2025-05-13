// src/features/purchases/types/index.ts

// Based on the purchase_orders table schema + joined supplier name
export interface PurchaseOrder {
  id: string; // UUID
  po_number: string;
  supplier_id: string; // UUID
  supplier_name?: string; // Manually added after fetching if needed, or directly selected
  order_date: string; // ISO date string (YYYY-MM-DD)
  expected_delivery_date?: string | null; // ISO date string or null
  status: 'Pending' | 'Approved' | 'Ordered' | 'Partially Received' | 'Received' | 'Cancelled';
  total_amount?: number | null; // NUMERIC(12, 2)
  notes?: string | null;
  created_by?: string | null; // UUID
  created_at: string; // TIMESTAMPTZ string
  updated_at: string; // TIMESTAMPTZ string
}

// Example type for data fetched including supplier name directly
export interface PurchaseOrderDTO extends Omit<PurchaseOrder, 'supplier_name'>{
  suppliers: { // Assuming Supabase returns the joined table like this
    name: string;
  } | null;
}

export interface PurchaseOrderItemFormValues {
  inventory_item_id: string; // UUID of the inventory item
  description?: string; // Pre-filled from item, but can be overridden
  quantity_ordered: number;
  unit_price: number;
  // subtotal will be calculated
}

export interface CreatePurchaseOrderFormValues {
  supplier_id: string; // UUID of the supplier
  order_date: Date;
  expected_delivery_date?: Date | null;
  notes?: string;
  items: PurchaseOrderItemFormValues[];
}

// For fetching select options
export interface SupplierSelectItem {
  value: string; // supplier.id
  label: string; // supplier.name
}

export interface InventoryItemSelectItem {
  value: string; // inventory_item.id
  label: string; // inventory_item.item_name
  category?: string; // To help with display or filtering
  is_batched?: boolean; // To know if batch details are needed upon receipt
  item_code?: string | null; // Added item_code
}

// --- Urgent Purchase Types ---

export type UrgentPurchaseRequestStatus = 'pending_approval' | 'approved' | 'rejected' | 'draft';

export interface ParsedSlipItem {
  slip_text: string;
  matched_item_id?: string | null; // UUID of inventory_item
  matched_item_name?: string | null;
  quantity?: number | null;
  batch_number?: string | null;
  expiry_date?: string | null; // Consider using Date object after parsing
  confidence?: number | null; // Confidence of this specific item match
}

export interface UrgentPurchaseSlipData {
  items: ParsedSlipItem[];
  invoice_delivery_date?: string | null; // Consider using Date object after parsing
  overall_confidence?: number | null; // Overall confidence of the parse
  raw_text?: string | null; // Full text extracted by OCR
}

export interface UrgentPurchaseItem {
  id?: string; // UUID, if stored separately or for updates
  urgent_purchase_id?: string; // UUID, link to parent
  inventory_item_id: string; // UUID of the inventory item
  slip_text?: string | null; // Original text from slip for this item
  matched_item_name: string; // Name of the matched inventory item
  quantity: number;
  batch_number?: string | null;
  expiry_date?: string | null; // ISO date string (YYYY-MM-DD) or null
  // No unit_price or subtotal as it's a direct stock update
}

export interface UrgentPurchase {
  id: string; // UUID
  slip_image_path?: string | null; // Path in storage
  slip_filename?: string | null;
  invoice_delivery_date?: string | null; // ISO date string (YYYY-MM-DD)
  status: UrgentPurchaseRequestStatus;
  confidence_score?: number | null; // 0-1, overall confidence from AI parsing
  notes?: string | null;
  requested_by_user_id: string; // UUID of user who requested
  requested_at: string; // TIMESTAMPTZ string
  reviewed_by_user_id?: string | null; // UUID of user who reviewed
  reviewed_at?: string | null; // TIMESTAMPTZ string
  reviewer_notes?: string | null;
  target_approval_role?: string | null; // Added for targeted approvals
  updated_at: string; // TIMESTAMPTZ string
  items: UrgentPurchaseItem[]; // Storing items directly or linking to a separate table
}

export interface CreateUrgentPurchaseFormValues {
  slip_file?: File | null; // For direct upload
  slip_image_path?: string | null; // If already uploaded
  invoice_delivery_date?: Date | null;
  notes?: string;
  items: Array<{ // For manual entry or review
    inventory_item_id: string;
    quantity: number;
    batch_number?: string;
    expiry_date?: Date | null;
    slip_text?: string; // For context if reviewing
  }>;
  // Auto-confirm mode might be a system setting or a user choice here
  auto_confirm?: boolean;
}

export interface QuickEntryFormValues {
  inventory_item_id: string;
  quantity: number;
  batch_number?: string | null;
  expiry_date?: Date | null;
}

// For the AI Matching Engine
export interface SlipTextMatchRequest {
  slip_text: string;
  // Potentially add context like category if available
}

export interface SlipTextMatchResponse {
  slip_text: string;
  matched_item_id: string | null; // inventory_item.id
  matched_item_name: string | null;
  confidence: number; // 0-1
}
