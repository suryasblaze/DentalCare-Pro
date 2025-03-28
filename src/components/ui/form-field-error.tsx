import React from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FormFieldErrorProps {
  message?: string;
  className?: string;
}

/**
 * Standardized form field error component
 */
export function FormFieldError({ message, className }: FormFieldErrorProps) {
  if (!message) return null;
  
  return (
    <div className={cn("flex items-center gap-1 text-destructive text-sm mt-1", className)}>
      <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
}