import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, X, ZoomIn } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ImageUploadPreviewProps {
  id: string;
  accept: string;
  label: string;
  files: File[];
  onFilesChange: (files: File[]) => void;
  maxFiles?: number;
}

export function ImageUploadPreview({
  id,
  accept,
  label,
  files,
  onFilesChange,
  maxFiles = 10
}: ImageUploadPreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const newFiles = [...files, ...selectedFiles].slice(0, maxFiles);
    onFilesChange(newFiles);
  };

  const handleRemove = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    onFilesChange(newFiles);
  };

  const handlePreview = (file: File) => {
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const closePreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {/* Upload Area */}
        <div className="border-2 border-dashed rounded-lg p-4 text-center">
          <input
            type="file"
            accept={accept}
            className="hidden"
            id={id}
            onChange={handleFileChange}
            multiple
          />
          <label
            htmlFor={id}
            className="cursor-pointer flex flex-col items-center"
          >
            <Upload className="h-8 w-8 mb-2" />
            <span>{label}</span>
            <span className="text-sm text-muted-foreground mt-1">
              {files.length}/{maxFiles} files
            </span>
          </label>
        </div>

        {/* Preview Grid */}
        <div className="grid grid-cols-2 gap-2">
          {files.map((file, index) => (
            <Card key={index} className="relative group">
              <CardContent className="p-2">
                {file.type.startsWith('image/') ? (
                  <img
                    src={URL.createObjectURL(file)}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-24 object-cover rounded"
                    onLoad={(e) => {
                      const target = e.target as HTMLImageElement;
                      URL.revokeObjectURL(target.src);
                    }}
                  />
                ) : (
                  <div className="w-full h-24 bg-muted flex items-center justify-center rounded">
                    <span className="text-sm text-muted-foreground">
                      {file.name}
                    </span>
                  </div>
                )}
                <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {file.type.startsWith('image/') && (
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handlePreview(file)}
                    >
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handleRemove(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Preview Dialog */}
      <Dialog open={!!previewUrl} onOpenChange={() => closePreview()}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Image Preview</DialogTitle>
          </DialogHeader>
          {previewUrl && (
            <img
              src={previewUrl}
              alt="Preview"
              className="w-full h-auto"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 