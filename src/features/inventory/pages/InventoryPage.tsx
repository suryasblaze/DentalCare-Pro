import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter, // Although form has its own buttons, Dialog needs structure
  DialogClose,  // For potential manual close if needed
} from '@/components/ui/dialog';
import { PageHeader } from '@/components/ui/page-header'; // Use named import
import InventoryList from '../components/InventoryList';
import InventoryItemForm from '../components/InventoryItemForm';
import InventoryAIInsights from '../components/InventoryAIInsights';
import { InventoryItem, InventoryItemRow, InventoryItemCategory } from '../types'; 
import { PlusCircle, Search, FileDown, Bot as IconAI } from 'lucide-react'; 
import { Input } from '@/components/ui/input'; 
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'; 
import { exportToExcel, exportToPdf } from '../utils/exportUtils';
import InventoryReports from '../components/InventoryReports';
import InvoiceUpload from '../components/InvoiceUpload'; // Import the bulk upload component

const InventoryPage: React.FC = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItemRow | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<InventoryItemCategory | 'all'>('all');
  const [filteredData, setFilteredData] = useState<InventoryItem[]>([]); // State for filtered data
  // State to trigger list refresh after save/delete
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showAIInsights, setShowAIInsights] = useState(false); // State to manage AI Insights visibility

  const handleAddItemClick = () => {
    setEditingItem(null); // Ensure we are adding, not editing
    setIsDialogOpen(true);
  };

  const handleEditItemClick = (item: InventoryItemRow) => {
    setEditingItem(item);
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingItem(null); // Clear editing state when dialog closes
  };

  const handleSave = (savedItem: InventoryItem) => {
    // savedItem includes the calculated status, but list fetches/calculates its own
    console.log('Item saved:', savedItem);
    handleDialogClose();
    setRefreshTrigger(prev => prev + 1); // Increment trigger to refresh list
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Use heading and text props for PageHeader */}
      <PageHeader
        heading="Inventory Management"
        text="Track medicines, tools, and consumables."
        className="flex items-center justify-between" // Add class for layout
      >
         <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
                 <Button onClick={handleAddItemClick}>
                   <PlusCircle className="mr-2 h-4 w-4" /> Add New Item
                 </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]"> {/* Adjust width as needed */}
                <DialogHeader>
                <DialogTitle>{editingItem ? 'Edit Inventory Item' : 'Add New Inventory Item'}</DialogTitle>
                {/* Optional: <DialogDescription>...</DialogDescription> */}
                </DialogHeader>
                {/* Render form inside Dialog */}
                <InventoryItemForm
                    itemToEdit={editingItem}
                    onSave={handleSave}
                    onCancel={handleDialogClose}
                 />
                 {/* DialogFooter might not be needed if form has Cancel/Save */}
            </DialogContent>
        </Dialog>
        {/* Add the custom class for styling */}
        <Button variant="outline" onClick={() => setShowAIInsights(!showAIInsights)} className="ai-insights-button">
          <IconAI className="mr-2 h-4 w-4" /> {showAIInsights ? 'Hide AI Insights' : 'Show AI Insights'}
        </Button>
      </PageHeader>

      {/* Add Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by item name..."
            className="pl-8 sm:w-full" // Adjust width as needed
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select
           value={categoryFilter}
           onValueChange={(value) => setCategoryFilter(value as InventoryItemCategory | 'all')}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="Medicines">Medicines</SelectItem>
            <SelectItem value="Tools">Tools</SelectItem>
            <SelectItem value="Consumables">Consumables</SelectItem>
          </SelectContent>
        </Select>
        {/* Add Export Buttons */}
        <Button
            variant="outline"
            onClick={() => exportToExcel(filteredData)}
            disabled={filteredData.length === 0}
            className="w-full sm:w-auto"
        >
            <FileDown className="mr-2 h-4 w-4" /> Export Excel
        </Button>
         <Button
            variant="outline"
            onClick={() => exportToPdf(filteredData)}
            disabled={filteredData.length === 0}
            className="w-full sm:w-auto"
        >
            <FileDown className="mr-2 h-4 w-4" /> Export PDF
        </Button>
      </div>

      {/* --- Add Bulk Invoice Upload Section --- */}
      <div className="mt-4 mb-6"> {/* Add some margin */}
          <InvoiceUpload onUploadComplete={() => setRefreshTrigger(prev => prev + 1)} />
      </div>
      {/* --- End Bulk Invoice Upload Section --- */}


      {/* AI Insights will be conditionally rendered here */}

      {showAIInsights && <InventoryAIInsights />}
      <InventoryList
        onEditItem={handleEditItemClick}
        refreshTrigger={refreshTrigger}
        searchTerm={searchTerm}
        categoryFilter={categoryFilter}
        onDataFiltered={setFilteredData} // Pass callback to receive filtered data
      />
    </div>
  );
};

export default InventoryPage;
