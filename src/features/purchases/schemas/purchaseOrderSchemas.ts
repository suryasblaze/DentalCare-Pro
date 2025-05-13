// src/features/purchases/schemas/purchaseOrderSchemas.ts
import { z } from 'zod';

export const purchaseOrderItemSchema = z.object({
  inventory_item_id: z.string().uuid({ message: "Please select an inventory item." }),
  description: z.string().optional(),
  quantity_ordered: z.number().min(1, { message: "Quantity must be at least 1." }),
  unit_price: z.number().min(0, { message: "Unit price cannot be negative." }),
});

export const createPurchaseOrderSchema = z.object({
  supplier_id: z.string().uuid({ message: "Please select a supplier." }),
  order_date: z.date({
    required_error: "Order date is required.",
    invalid_type_error: "Invalid date format for order date.",
  }),
  expected_delivery_date: z.date().nullable().optional(),
  notes: z.string().optional(),
  items: z.array(purchaseOrderItemSchema).min(1, { message: "Please add at least one item to the purchase order." }),
  invoice_file: z
    .custom<File | null>((file) => file === undefined || file === null || file instanceof File, "Invalid file format")
    .refine(
      (file) => !file || file.size <= (5 * 1024 * 1024), // 5MB
      `File size should be less than 5MB.`
    )
    .refine(
      (file) => !file || ["application/pdf", "image/png", "image/jpeg", "image/jpg"].includes(file.type),
      "Only .pdf, .png, .jpg, .jpeg files are accepted."
    )
    .optional()
    .nullable(),
});

export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderSchema>;
export type PurchaseOrderItemInput = z.infer<typeof purchaseOrderItemSchema>;
