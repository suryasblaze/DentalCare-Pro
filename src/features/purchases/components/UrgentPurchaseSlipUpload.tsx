import React, { useState } from 'react';
import { FileUpload } from '@/components/ui/file-upload';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';

interface UrgentPurchaseSlipUploadProps {
  onFileSelect: (file: File | null) => void;
  processing?: boolean; // To show a loading state if the parent is processing the file
  className?: string;
}

export const UrgentPurchaseSlipUpload: React.FC<UrgentPurchaseSlipUploadProps> = ({
  onFileSelect,
  processing = false,
  className,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileChange = (file: File | null) => {
    setSelectedFile(file);
    onFileSelect(file);
    if (file) {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl); // Clean up previous object URL
      }
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(null);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    onFileSelect(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
  };

  return (
    <div className={className}>
      <FileUpload
        onFileChange={handleFileChange}
        accept="image/jpeg, image/png, image/webp, application/pdf"
        maxSize={10} // Max 10MB for slips
        uploading={processing}
        value={selectedFile}
        preview={previewUrl || undefined}
        onRemove={handleRemoveFile}
        id="urgent-purchase-slip-upload"
      />
      {selectedFile && !processing && (
        <Alert className="mt-4">
          <Terminal className="h-4 w-4" />
          <AlertTitle>File Ready</AlertTitle>
          <AlertDescription>
            Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB). Ready for processing.
          </AlertDescription>
        </Alert>
      )}
      {processing && (
         <Alert className="mt-4">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Processing...</AlertTitle>
          <AlertDescription>
            The slip is being uploaded and analyzed. Please wait.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
