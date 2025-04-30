import React, { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';

interface InvoiceUploadProps {
  itemId: string;
}

const InvoiceUpload: React.FC<InvoiceUploadProps> = ({ itemId }) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${itemId}_${Date.now()}.${fileExt}`;
      const { data, error } = await supabase.storage
        .from('invoices')
        .upload(fileName, file);

      if (error) throw error;

      // Associate the uploaded file with the item
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('item_invoices')
        .insert([
          {
            inventory_item_id: itemId,
            invoice_url: data.path,
            uploaded_by: user.id,
          },
        ]);

      if (invoiceError) throw invoiceError;

      toast({ title: 'Success', description: 'Invoice uploaded successfully.' });
    } catch (err) {
      console.error('Failed to upload invoice:', err);
      toast({
        title: 'Error Uploading Invoice',
        description: err instanceof Error ? err.message : 'Could not upload invoice.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input type="file" onChange={handleFileChange} />
      <button onClick={handleUpload} disabled={uploading}>
        {uploading ? 'Uploading...' : 'Upload Invoice'}
      </button>
    </div>
  );
};

export default InvoiceUpload;
