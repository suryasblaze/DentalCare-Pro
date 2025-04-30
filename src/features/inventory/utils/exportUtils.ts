import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { InventoryItem } from '../types'; // Assuming InventoryItem includes calculated status

// Function to export data to Excel
export const exportToExcel = (data: InventoryItem[], filename: string = 'inventory_export'): void => {
  // Prepare data for worksheet (map to desired columns/order)
  const worksheetData = data.map(item => ({
    'Item Name': item.item_name,
    'Category': item.category,
    'Quantity': item.quantity,
    'Expiry Date': item.expiry_date ? new Date(item.expiry_date).toLocaleDateString() : 'N/A',
    'Supplier Info': item.supplier_info || 'N/A',
    'Purchase Price': item.purchase_price != null ? Number(item.purchase_price) : 'N/A', // Keep as number for Excel
    'Status': item.stock_status, // Use calculated status
    'Low Stock Threshold': item.low_stock_threshold,
    'Created At': new Date(item.created_at).toLocaleString(),
  }));

  // Create worksheet
  const ws = XLSX.utils.json_to_sheet(worksheetData);

  // Optional: Adjust column widths (example)
  const columnWidths = [
    { wch: 30 }, // Item Name
    { wch: 15 }, // Category
    { wch: 10 }, // Quantity
    { wch: 15 }, // Expiry Date
    { wch: 25 }, // Supplier Info
    { wch: 15 }, // Purchase Price
    { wch: 12 }, // Status
    { wch: 20 }, // Low Stock Threshold
    { wch: 20 }, // Created At
  ];
  ws['!cols'] = columnWidths;

  // Create workbook and add worksheet
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Inventory');

  // Trigger download
  XLSX.writeFile(wb, `${filename}.xlsx`);
};

// Function to export data to PDF
export const exportToPdf = (data: InventoryItem[], filename: string = 'inventory_export'): void => {
  const doc = new jsPDF();

  // Define columns for the table
  const tableColumn = [
    "Item Name",
    "Category",
    "Qty", // Abbreviated for space
    "Expiry", // Abbreviated
    "Supplier",
    "Price",
    "Status",
  ];
  // Define rows based on data
  const tableRows = data.map(item => [
    item.item_name,
    item.category,
    item.quantity,
    item.expiry_date ? new Date(item.expiry_date).toLocaleDateString() : 'N/A',
    item.supplier_info || 'N/A',
    item.purchase_price != null ? `$${Number(item.purchase_price).toFixed(2)}` : 'N/A',
    item.stock_status,
  ]);

  // Add title
  doc.setFontSize(18);
  doc.text("Inventory Report", 14, 22);
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 29);


  // Add table using autoTable
  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 35, // Start table below the title
    theme: 'grid', // Optional: 'striped', 'plain'
    headStyles: { fillColor: [22, 160, 133] }, // Example header color
    styles: { fontSize: 8 }, // Adjust font size for table content
    columnStyles: { // Optional: Adjust specific column widths/styles
        0: { cellWidth: 40 }, // Item Name wider
        2: { halign: 'right' }, // Quantity right-aligned
        5: { halign: 'right' }, // Price right-aligned
    }
  });

  // Trigger download
  doc.save(`${filename}.pdf`);
};
