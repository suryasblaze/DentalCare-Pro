import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { AssetRow } from '../types';
import { Database } from '@/lib/database.types'; // For log and document types
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, UploadCloud, FileText, Trash2, Loader2 } from 'lucide-react'; // Added icons
import { MaintenanceLogRowPlaceholder, AssetDocumentRowPlaceholder } from '../types'; // Use placeholder types
import { Button } from '@/components/ui/button'; // Import Button
import { Input } from '@/components/ui/input'; // Import Input for file
import { Badge } from "@/components/ui/badge"; // Import Badge
import { useToast } from '@/components/ui/use-toast'; // Import useToast

// Define types for related data (assuming they exist in database.types.ts after generation)
// Using placeholders until types are regenerated
type MaintenanceLogRow = MaintenanceLogRowPlaceholder;
type AssetDocumentRow = AssetDocumentRowPlaceholder;
type AssetDisposalLogRow = import('../types').AssetDisposalLogRowPlaceholder;
type Tag = import('../types').TagPlaceholder; // Import Tag placeholder type
type AssetRowWithTags = import('../types').AssetRowWithTags; // Import Asset with tags

const AssetDetailPage: React.FC = () => {
  const { assetId } = useParams<{ assetId: string }>();
  const [asset, setAsset] = useState<AssetRowWithTags | null>(null); // Use AssetRowWithTags
  const [maintenanceLog, setMaintenanceLog] = useState<MaintenanceLogRow[]>([]);
  const [documents, setDocuments] = useState<AssetDocumentRow[]>([]);
  const [disposalLog, setDisposalLog] = useState<AssetDisposalLogRow[]>([]);
  // Tags are now part of the asset state if fetched correctly
  // const [tags, setTags] = useState<Tag[]>([]); 
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false); // State for upload indicator
  const fileInputRef = React.useRef<HTMLInputElement>(null); // Ref for file input
  const { toast } = useToast(); // Initialize toast

  const fetchDocuments = async () => {
     if (!assetId) return;
      // Fetch documents - Using type assertion for table name
      // TODO: Remove `as any` after regenerating Supabase types
      const { data: docData, error: docError } = await supabase
        .from('asset_documents' as any)
        .select('*') // Consider selecting specific columns + user email: '*, uploaded_by_user:profiles(email)'
        .eq('asset_id', assetId)
        .order('uploaded_at', { ascending: false });

      if (docError) {
          console.error("Error fetching documents:", docError);
          // Optionally show toast error
      } else {
          setDocuments((docData as unknown as AssetDocumentRow[]) || []);
      }
  };

  useEffect(() => {
    const fetchAssetDetails = async () => {
      if (!assetId) {
        setError('Asset ID is missing.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Fetch asset details including tags
        // TODO: Remove `as any` after regenerating Supabase types for asset_tags and tags
        const { data: assetData, error: assetError } = await supabase
          .from('assets')
          .select(`
            *,
            asset_tags (
              tag_id,
              tags (id, name, color)
            )
          `)
          .eq('id', assetId)
          .single();

        if (assetError) throw assetError;
        
        // Transform fetched data to include tags directly on the asset object
        const assetWithTags = assetData ? {
            ...assetData,
            tags: Array.isArray(assetData.asset_tags) ? assetData.asset_tags.map((at: any) => at.tags).filter(Boolean) : []
        } : null;
        setAsset(assetWithTags as AssetRowWithTags | null);

        // Fetch maintenance log - Using type assertion for table name
        // TODO: Remove `as any` after regenerating Supabase types
        // TODO: Select profile email: .select('*, profiles(email)') - requires RLS setup on profiles for service role
        const { data: logData, error: logError } = await supabase
          .from('maintenance_log' as any)
          .select('*') // Fetching all columns for now
          .eq('asset_id', assetId)
          .order('serviced_at', { ascending: false });

        if (logError) throw logError;
        // Cast through unknown to satisfy TS when types aren't generated
        setMaintenanceLog((logData as unknown as MaintenanceLogRow[]) || []); 

        // Fetch documents - Using type assertion for table name
        // TODO: Remove `as any` after regenerating Supabase types
        const { data: docData, error: docError } = await supabase
          .from('asset_documents' as any)
          .select('*') // Consider selecting specific columns + user email: '*, uploaded_by_user:profiles(email)'
          .eq('asset_id', assetId)
          .order('uploaded_at', { ascending: false });

        if (docError) throw docError;
        setDocuments((docData as unknown as AssetDocumentRow[]) || []);
        
        // Fetch disposal log if asset is disposed
        if (assetData && (assetData.status === 'Disposed' || assetData.status === 'Retired')) {
            // TODO: Remove `as any` after regenerating Supabase types
            const { data: disposalData, error: disposalError } = await supabase
                .from('asset_disposal_log' as any)
                .select('*') // Consider '*, disposed_by_user:profiles(email)'
                .eq('asset_id', assetId)
                .order('disposal_recorded_at', { ascending: false });
            if (disposalError) throw disposalError;
            setDisposalLog((disposalData as unknown as AssetDisposalLogRow[]) || []);
        }


      } catch (err: any) {
        console.error("Failed to fetch asset details:", err);
        setError(err.message || 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    fetchAssetDetails();
  }, [assetId]); // Rerun only if assetId changes

  // Function to handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !assetId) {
      return;
    }
    const file = files[0];
    setIsUploading(true);

    try {
       // Get user
       const { data: { user }, error: userError } = await supabase.auth.getUser();
       if (userError || !user) throw new Error('User not authenticated.');

       // Define storage path
       const filePath = `public/${assetId}/${Date.now()}_${file.name}`; // Unique path

       // Upload file to Supabase Storage (ensure 'asset-documents' bucket exists and has policies set)
       const { error: uploadError } = await supabase.storage
         .from('asset-documents') // BUCKET NAME
         .upload(filePath, file);

       if (uploadError) throw uploadError;

       // Get public URL
       const { data: urlData } = supabase.storage
         .from('asset-documents')
         .getPublicUrl(filePath);

       if (!urlData?.publicUrl) throw new Error('Could not get public URL.');

       // Insert record into asset_documents table
       // TODO: Remove `as any` after regenerating Supabase types
       const { error: insertError } = await supabase
         .from('asset_documents' as any)
         .insert({
           asset_id: assetId,
           file_name: file.name,
           file_url: urlData.publicUrl,
           file_type: file.type,
           file_size_bytes: file.size,
           uploaded_by_user_id: user.id,
         });

       if (insertError) throw insertError;

       toast({ title: 'Success', description: 'Document uploaded successfully.' });
       fetchDocuments(); // Refresh document list

    } catch (err: any) {
        console.error("Error uploading document:", err);
        toast({
            title: 'Upload Error',
            description: err.message || 'Failed to upload document.',
            variant: 'destructive',
        });
    } finally {
        setIsUploading(false);
        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }
  };

  // TODO: Implement handleFileDelete function

  if (loading) {
    return (
      <div className="container mx-auto p-4 md:p-6 space-y-4">
        <Skeleton className="h-8 w-1/4" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4 md:p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!asset) {
    return <div className="container mx-auto p-4 md:p-6">Asset not found.</div>;
  }

  // Helper to format dates
  const formatDate = (dateString: string | null | undefined): string => {
      if (!dateString) return 'N/A';
      try {
          // Attempt to show date and time if it's a timestamp, otherwise just date
          const date = new Date(dateString);
          if (dateString.includes('T')) {
              return date.toLocaleString();
          }
          return date.toLocaleDateString();
      } catch (e) {
          return 'Invalid Date';
      }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <PageHeader heading={`Asset Details: ${asset.asset_name}`} />

      <Card>
        <CardHeader>
          <CardTitle>Asset Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><strong>Name:</strong> {asset.asset_name}</div>
          <div><strong>Category:</strong> {asset.category}</div>
          <div><strong>Serial Number:</strong> {asset.serial_number || 'N/A'}</div>
          <div><strong>Location:</strong> {asset.location || 'N/A'}</div>
          <div><strong>Status:</strong> {asset.status}</div>
          <div><strong>Purchase Date:</strong> {formatDate(asset.purchase_date)}</div>
          <div><strong>Warranty Expiry:</strong> {formatDate(asset.warranty_expiry_date)}</div>
          <div><strong>Supplier Info:</strong> {asset.supplier_info || 'N/A'}</div>
          <div><strong>Maintenance Interval:</strong> {asset.maintenance_interval_months ? `${asset.maintenance_interval_months} months` : 'Not Set'}</div>
          <div><strong>Last Serviced:</strong> {formatDate(asset.last_serviced_date)}</div>
          <div><strong>Next Due:</strong> {formatDate(asset.next_maintenance_due_date)}</div>
          <div><strong>Purchase Cost:</strong> ₹{asset.purchase_price?.toFixed(2) || '0.00'}</div>
          <div className="md:col-span-2">
            <strong>Tags:</strong>
            {asset.tags && asset.tags.length > 0 ? (
              <span className="ml-2">
                {asset.tags.map(tag => (
                  <Badge key={tag.id} variant="secondary" className="mr-1 mb-1" style={tag.color ? { backgroundColor: tag.color, color: '#fff' } : {}}>
                    {tag.name}
                  </Badge>
                ))}
              </span>
            ) : (
              <span className="ml-2 text-muted-foreground">No tags</span>
            )}
            {/* Placeholder for Edit Tags button */}
            {/* <Button size="sm" variant="outline" className="ml-2">Edit Tags</Button> */}
          </div>
          {/* Add Responsible User display if needed, might require joining profiles */}
          {/* <div><strong>Responsible User ID:</strong> {asset.responsible_user_id || 'N/A'}</div> */}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader><CardTitle>Cost Tracking</CardTitle></CardHeader>
        <CardContent>
            {(() => {
                const purchaseCost = asset.purchase_price || 0;
                const totalMaintenanceCost = maintenanceLog.reduce((sum, log) => sum + (log.maintenance_cost || 0), 0);
                const salvageValue = (asset.status === 'Disposed' || asset.status === 'Retired' ? asset.salvage_value || 0 : 0);
                const totalCostOfOwnership = purchaseCost + totalMaintenanceCost - salvageValue;
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><strong>Purchase Cost:</strong> ₹{purchaseCost.toFixed(2)}</div>
                        <div><strong>Total Maintenance Cost:</strong> ₹{totalMaintenanceCost.toFixed(2)}</div>
                        { (asset.status === 'Disposed' || asset.status === 'Retired') && <div><strong>Salvage Value:</strong> ₹{salvageValue.toFixed(2)}</div> }
                        <div><strong>Total Cost of Ownership:</strong> ₹{totalCostOfOwnership.toFixed(2)}</div>
                    </div>
                );
            })()}
        </CardContent>
      </Card>


      {(asset.status === 'Disposed' || asset.status === 'Retired') && asset.disposal_date && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Disposal Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><strong>Disposal Date:</strong> {formatDate(asset.disposal_date)}</div>
            <div><strong>Reason:</strong> {asset.disposal_reason || 'N/A'}</div>
            <div><strong>Salvage Value:</strong> ₹{asset.salvage_value?.toFixed(2) || '0.00'}</div>
            {asset.disposal_notes && <div className="md:col-span-2"><strong>Notes:</strong> {asset.disposal_notes}</div>}
          </CardContent>
        </Card>
      )}

      {/* Maintenance History Component */}
      <Card>
        <CardHeader>
          <CardTitle>Maintenance History</CardTitle>
        </CardHeader>
        <CardContent>
          {maintenanceLog.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Serviced At</th>
                    <th scope="col" className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Cost</th>
                    <th scope="col" className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Invoice</th>
                    <th scope="col" className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                    {/* <th scope="col" className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Serviced By</th> */}
                    <th scope="col" className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Prev. Next Due</th>
                    <th scope="col" className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">New Next Due</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {maintenanceLog.map(log => {
                    const linkedInvoice = documents.find(doc => doc.id === log.invoice_document_id);
                    return (
                      <tr key={log.id}>
                        <td className="px-4 py-2 whitespace-nowrap">{formatDate(log.serviced_at)}</td>
                        <td className="px-4 py-2 whitespace-nowrap">₹{log.maintenance_cost?.toFixed(2) || '0.00'}</td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          {linkedInvoice ? (
                            <a href={linkedInvoice.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                              {linkedInvoice.file_name}
                            </a>
                          ) : (log.invoice_document_id ? 'Invoice not found' : '-')}
                        </td>
                        <td className="px-4 py-2">{log.notes || '-'}</td>
                        {/* TODO: Display user email/name if fetched */}
                        {/* <td className="px-4 py-2 whitespace-nowrap">{log.serviced_by_user_id || 'N/A'}</td> */}
                        <td className="px-4 py-2 whitespace-nowrap">{formatDate(log.previous_next_maintenance_due_date)}</td>
                        <td className="px-4 py-2 whitespace-nowrap">{formatDate(log.new_next_maintenance_due_date)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">No maintenance history recorded.</p>
          )}
        </CardContent>
      </Card>
      
      {/* Disposal Log Component - Show if logs exist */}
      {disposalLog.length > 0 && (
         <Card>
            <CardHeader>
                <CardTitle>Disposal Log</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Recorded At</th>
                                <th scope="col" className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Disposal Date</th>
                                <th scope="col" className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                                <th scope="col" className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Salvage Value (₹)</th>
                                <th scope="col" className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                                {/* <th scope="col" className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Recorded By</th> */}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {disposalLog.map(log => (
                                <tr key={log.id}>
                                    <td className="px-4 py-2 whitespace-nowrap">{formatDate(log.disposal_recorded_at)}</td>
                                    <td className="px-4 py-2 whitespace-nowrap">{formatDate(log.disposal_date)}</td>
                                    <td className="px-4 py-2">{log.disposal_reason}</td>
                                    <td className="px-4 py-2 whitespace-nowrap">₹{log.salvage_value?.toFixed(2) || '0.00'}</td>
                                    <td className="px-4 py-2">{log.disposal_notes || '-'}</td>
                                    {/* <td className="px-4 py-2 whitespace-nowrap">{log.disposed_by_user_id || 'N/A'}</td> */}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </CardContent>
         </Card>
      )}

      {/* Asset Documents Component */}
      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
        </CardHeader>
        <CardContent>
           {documents.length > 0 ? (
            <ul>
              {documents.map(doc => (
                <li key={doc.id}><a href={doc.file_url} target="_blank" rel="noopener noreferrer">{doc.file_name}</a> (Uploaded: {formatDate(doc.uploaded_at)})</li>
              ))}
            </ul>
          ) : (
            <p>No documents uploaded.</p>
          )}
          <div className="mt-4 border-t pt-4">
            <h4 className="font-semibold mb-2">Upload New Document</h4>
            <div className="flex items-center gap-2">
               <Input
                 type="file"
                 ref={fileInputRef}
                 onChange={handleFileUpload}
                 disabled={isUploading}
                 className="flex-grow"
               />
               <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                 {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                 {isUploading ? 'Uploading...' : 'Choose File'}
               </Button>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
};

export default AssetDetailPage;
