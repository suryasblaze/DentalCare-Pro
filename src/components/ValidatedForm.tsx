import React, { useState } from 'react';
import { z } from 'zod';
import { FormFieldError } from './ui/form-field-error';
import { validateFormData } from '@/lib/utils/validation';
import { Button } from './ui/button';
import { Loader2 } from 'lucide-react';

interface ValidatedFormProps<T extends z.ZodTypeAny> {
  schema: T;
  initialValues: z.infer<T>;
  onSubmit: (values: z.infer<T>) => Promise<void> | void;
  children: React.ReactNode | ((props: {
    values: z.infer<T>;
    errors: Record<string, string>;
    handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
    getError: (fieldName: string) => string | undefined;
    clearError: (fieldName: string) => void;
  }) => React.ReactNode);
  submitLabel?: string;
  className?: string;
  loading?: boolean;
}

/**
 * A form component with built-in validation using Zod
 */
export function ValidatedForm<T extends z.ZodTypeAny>({
  schema,
  initialValues,
  onSubmit,
  children,
  submitLabel = 'Submit',
  className,
  loading = false,
}: ValidatedFormProps<T>) {
  const [values, setValues] = useState<z.infer<T>>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    // Convert value based on input type
    let convertedValue: any = value;
    
    if (type === 'number') {
      convertedValue = value === '' ? null : Number(value);
    } else if (type === 'checkbox') {
      convertedValue = (e.target as HTMLInputElement).checked;
    }
    
    setValues(prev => ({
      ...prev,
      [name]: convertedValue
    }));
    
    // Clear error when field is edited
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };
  
  const getError = (fieldName: string) => errors[fieldName];
  
  const clearError = (fieldName: string) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    const result = validateFormData(schema, values);
    
    if (!result.success) {
      setErrors(result.errors || {});
      return;
    }
    
    setSubmitting(true);
    setErrors({});
    
    try {
      await onSubmit(result.data!);
    } catch (error) {
      console.error('Form submission error:', error);
      
      // Set form-level error
      setErrors(prev => ({
        ...prev,
        _form: error instanceof Error ? error.message : 'An error occurred'
      }));
    } finally {
      setSubmitting(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className={className}>
      {typeof children === 'function'
        ? children({ values, errors, handleChange, getError, clearError })
        : children}
        
      {errors._form && <FormFieldError message={errors._form} className="mb-4" />}
      
      <Button 
        type="submit" 
        disabled={submitting || loading}
        className="mt-4"
      >
        {(submitting || loading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {submitLabel}
      </Button>
    </form>
  );
}