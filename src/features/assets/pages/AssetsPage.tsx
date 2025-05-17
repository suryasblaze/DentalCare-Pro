// src/features/assets/pages/AssetsPage.tsx

import React, { useState, useCallback, useEffect } from 'react'; // Added useEffect back
import { PlusCircle, Wrench, Archive as ArchiveIcon, Tag as TagIcon } from 'lucide-react'; // Added Wrench, ArchiveIcon, TagIcon

import { PageHeader } from '@/components/ui/page-header'; 
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import AssetList from '../components/AssetList';
import AssetForm from '../components/AssetForm';
import MarkAsServicedDialog from '../components/MarkAsServicedDialog';
import DisposeAssetDialog from '../components/DisposeAssetDialog'; // Import Dispose dialog
import { AssetRow, AssetCategory, AssetStatus, TagPlaceholder } from '../types'; 
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase'; // Import supabase for fetching tags
// Removed duplicate React import line was here

const AssetsPage: React.FC = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [assetToEdit, setAssetToEdit] = useState<AssetRow | null>(null);
  const [selectedAssetForService, setSelectedAssetForService] = useState<AssetRow | null>(null);
  const [isMarkAsServicedDialogOpen, setIsMarkAsServicedDialogOpen] = useState(false);
  const [selectedAssetForDisposal, setSelectedAssetForDisposal] = useState<AssetRow | null>(null); // State for disposal
  const [isDisposeAssetDialogOpen, setIsDisposeAssetDialogOpen] = useState(false); // State for disposal dialog
  const [refreshTrigger, setRefreshTrigger] = useState(0); // To trigger list refresh
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<AssetCategory | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<AssetStatus | 'all'>('all');
  const [tagFilter, setTagFilter] = useState<string | 'all'>('all'); // State for tag filter
  const [allTags, setAllTags] = useState<TagPlaceholder[]>([]); // State for all available tags
  const [filteredData, setFilteredData] = useState<AssetRow[]>([]); // For potential export

  useEffect(() => {
    // Fetch all tags for the filter dropdown
    const fetchTags = async () => {
      // TODO: Remove `as any` after regenerating Supabase types
      const { data, error } = await supabase.from('tags' as any).select('id, name').order('name');
      if (error) {
        console.error("Error fetching tags:", error);
      } else {
        setAllTags((data as unknown as TagPlaceholder[]) || []); // Cast through unknown
      }
    };
    fetchTags();
  }, []);

  const handleOpenForm = (asset?: AssetRow) => {
    setAssetToEdit(asset || null);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setAssetToEdit(null); // Clear editing state
  };
  
  const handleOpenMarkAsServicedDialog = (asset: AssetRow) => {
    setSelectedAssetForService(asset);
    setIsMarkAsServicedDialogOpen(true);
  };

  const handleOpenDisposeAssetDialog = (asset: AssetRow) => {
    setSelectedAssetForDisposal(asset);
    setIsDisposeAssetDialogOpen(true);
  };

  const handleAssetUpdateSuccess = () => { // Generic handler for service/disposal success
    setRefreshTrigger(prev => prev + 1);
  };

  const handleSave = (savedAsset: AssetRow) => {
    console.log('Asset saved:', savedAsset);
    handleCloseForm();
    setRefreshTrigger(prev => prev + 1); // Increment to trigger refresh
  };

  // Debounce search input if needed for performance
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    // Trigger refresh immediately or after debounce
    setRefreshTrigger(prev => prev + 1);
  };

  const handleCategoryChange = (value: string) => {
     setCategoryFilter(value as AssetCategory | 'all');
     setRefreshTrigger(prev => prev + 1);
  };

   const handleStatusChange = (value: string) => {
     setStatusFilter(value as AssetStatus | 'all');
     setRefreshTrigger(prev => prev + 1);
  };

  const handleTagChange = (value: string) => {
    setTagFilter(value); // value will be tag.id or 'all'
    setRefreshTrigger(prev => prev + 1);
  };

  // Callback for AssetList to update data for export
   const handleDataFiltered = useCallback((data: AssetRow[]) => {
        setFilteredData(data);
        // console.log("Filtered data received in page:", data); // For debugging
    }, []);

   // TODO: Implement export functionality using filteredData
   const handleExport = () => {
       console.log("Exporting data:", filteredData);
       // Add export logic here (e.g., using a library like xlsx or papaparse)
       alert("Export functionality not yet implemented.");
   };


  return (
    <div className="container mx-auto p-4 md:p-6">
      <PageHeader heading="Asset Management" /> {/* Use 'heading' prop */}

      <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
         {/* Search and Filters */}
          <div className="flex flex-col md:flex-row gap-2 flex-grow">
             <Input
                placeholder="Search by name or serial..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="max-w-sm"
             />
             <Select value={categoryFilter} onValueChange={handleCategoryChange}>
                <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="Filter by Category" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {/* Dynamically list categories if needed */}
                    <SelectItem value="Equipment">Equipment</SelectItem>
                    <SelectItem value="Furniture">Furniture</SelectItem>
                    <SelectItem value="IT">IT</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
             </Select>
              <Select value={statusFilter} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="Filter by Status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                     {/* Dynamically list statuses if needed */}
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Under Maintenance">Under Maintenance</SelectItem>
                    <SelectItem value="Retired">Retired</SelectItem>
                    <SelectItem value="Disposed">Disposed</SelectItem>
                </SelectContent>
             </Select>
             {/* Tag Filter Dropdown */}
             <Select value={tagFilter} onValueChange={handleTagChange}>
                <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="Filter by Tag" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Tags</SelectItem>
                    {allTags.map(tag => (
                        <SelectItem key={tag.id} value={tag.id}>{tag.name}</SelectItem>
                    ))}
                </SelectContent>
             </Select>
         </div>

         {/* Action Buttons */}
         <div className="flex gap-2">
             {/* <Button onClick={handleExport} variant="outline">Export</Button> */}
             <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogTrigger asChild>
                    <Button onClick={() => handleOpenForm()}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add New Asset
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{assetToEdit ? 'Edit Asset' : 'Add New Asset'}</DialogTitle>
                    </DialogHeader>
                    <AssetForm
                        assetToEdit={assetToEdit}
                        onSave={handleSave}
                        onCancel={handleCloseForm}
                    />
                </DialogContent>
            </Dialog>
         </div>
      </div>

      <AssetList
        // onEditAsset={handleOpenForm} // Removed as edit from list is disabled
        onMarkAsServiced={handleOpenMarkAsServicedDialog}
        onDisposeAsset={handleOpenDisposeAssetDialog}
        // tagFilter={tagFilter} // Pass tag filter to AssetList
        refreshTrigger={refreshTrigger}
        searchTerm={searchTerm}
        categoryFilter={categoryFilter}
        statusFilter={statusFilter}
        onDataFiltered={handleDataFiltered}
      />

      {selectedAssetForService && (
        <MarkAsServicedDialog
          asset={selectedAssetForService}
          open={isMarkAsServicedDialogOpen}
          onOpenChange={setIsMarkAsServicedDialogOpen}
          onSuccess={handleAssetUpdateSuccess}
        />
      )}

      {selectedAssetForDisposal && (
        <DisposeAssetDialog
          asset={selectedAssetForDisposal}
          open={isDisposeAssetDialogOpen}
          onOpenChange={setIsDisposeAssetDialogOpen}
          onSuccess={handleAssetUpdateSuccess}
        />
      )}
    </div>
  );
};

export default AssetsPage;
