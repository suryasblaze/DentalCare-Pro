import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { Upload, X, FilePlus, File, Trash2, Loader2 } from 'lucide-react';

interface FileUploadProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onFileChange?: (file: File | null) => void;
  accept?: string;
  maxSize?: number; // in MB
  className?: string;
  uploading?: boolean;
  value?: File | null;
  preview?: string;
  onRemove?: () => void;
}

const FileUpload = React.forwardRef<HTMLInputElement, FileUploadProps>(
  ({ className, onFileChange, accept, maxSize = 5, uploading = false, value, preview, onRemove, ...props }, ref) => {
    const [dragActive, setDragActive] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const handleDrag = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (e.type === "dragenter" || e.type === "dragover") {
        setDragActive(true);
      } else if (e.type === "dragleave") {
        setDragActive(false);
      }
    };
    
    const validateFile = (file: File): boolean => {
      // Check file size
      if (file.size > maxSize * 1024 * 1024) {
        setError(`File size exceeds ${maxSize}MB limit.`);
        return false;
      }
      
      // Check file type if accept is provided
      if (accept) {
        const acceptedTypes = accept.split(',').map(type => type.trim());
        const fileType = file.type;
        const fileName = file.name;
        const fileExtension = fileName.split('.').pop()?.toLowerCase();
        
        const isAccepted = acceptedTypes.some(type => {
          if (type.startsWith('.')) {
            // Check by extension
            return `.${fileExtension}` === type;
          } else if (type.includes('*')) {
            // Handle wildcards like image/*
            const [category] = type.split('/');
            return fileType.startsWith(`${category}/`);
          } else {
            // Exact match
            return type === fileType;
          }
        });
        
        if (!isAccepted) {
          setError('File type not supported.');
          return false;
        }
      }
      
      setError(null);
      return true;
    };
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0] || null;
      
      if (file && !validateFile(file)) {
        if (onFileChange) onFileChange(null);
        return;
      }
      
      if (onFileChange) onFileChange(file);
    };
    
    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        const file = e.dataTransfer.files[0];
        
        if (validateFile(file)) {
          if (onFileChange) onFileChange(file);
        }
      }
    };
    
    const renderPreview = () => {
      if (!value && !preview) return null;
      
      const fileUrl = preview || (value ? URL.createObjectURL(value) : null);
      const fileName = value?.name || 'File';
      const fileType = value?.type || '';
      
      const isImage = fileType.startsWith('image/') || (preview && /\.(jpg|jpeg|png|gif|webp)$/i.test(preview));
      
      return (
        <div className="mt-2 relative">
          <div className="flex items-center p-2 border rounded-md bg-muted">
            {isImage && fileUrl ? (
              <div className="relative w-16 h-16 mr-3 overflow-hidden rounded">
                <img src={fileUrl} alt="Preview" className="object-cover w-full h-full" />
              </div>
            ) : (
              <File className="w-12 h-12 mr-3 text-muted-foreground" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{fileName}</p>
              <p className="text-xs text-muted-foreground">
                {value?.size ? `${(value.size / 1024 / 1024).toFixed(2)} MB` : ''}
              </p>
            </div>
            {onRemove && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={onRemove}
                type="button"
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      );
    };
    
    return (
      <div className={cn("space-y-2", className)}>
        {!(value || preview) && (
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer",
              dragActive ? "border-primary bg-primary/5" : "border-input",
              error && "border-destructive"
            )}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => document.getElementById(props.id || 'file-upload')?.click()}
          >
            {uploading ? (
              <Loader2 className="w-10 h-10 mb-4 text-muted-foreground animate-spin" />
            ) : (
              <Upload className="w-10 h-10 mb-4 text-muted-foreground" />
            )}
            <p className="text-sm font-medium">Drag and drop or click to upload</p>
            <p className="text-xs text-muted-foreground mt-1">
              {accept ? `Supported formats: ${accept}` : 'All files are supported'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Max size: {maxSize}MB
            </p>
            {error && <p className="text-xs text-destructive mt-2">{error}</p>}
          </div>
        )}
        
        <input
          id={props.id || 'file-upload'}
          type="file"
          className="hidden"
          onChange={handleChange}
          ref={ref}
          accept={accept}
          disabled={uploading}
          {...props}
        />
        
        {renderPreview()}
        
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  }
);

FileUpload.displayName = 'FileUpload';

export { FileUpload };