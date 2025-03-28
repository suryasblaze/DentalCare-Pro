import { useState, useCallback } from 'react';
import { validateFormData } from '../utils/validation';
import { z } from 'zod';

/**
 * Hook for form validation with Zod schemas
 * @param schema Zod schema to validate against
 * @returns Validation utilities
 */
export function useFormValidation<T>(schema: z.ZodType<T>) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const validate = useCallback(
    (data: any): { isValid: boolean; data?: T } => {
      const result = validateFormData(schema, data);
      
      if (!result.success) {
        setErrors(result.errors || {});
        return { isValid: false };
      }
      
      setErrors({});
      return { isValid: true, data: result.data };
    },
    [schema]
  );
  
  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);
  
  const clearFieldError = useCallback((fieldName: string) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  }, []);
  
  const setFieldError = useCallback((fieldName: string, message: string) => {
    setErrors(prev => ({
      ...prev,
      [fieldName]: message
    }));
  }, []);
  
  return {
    errors,
    validate,
    clearErrors,
    clearFieldError,
    setFieldError,
    hasErrors: Object.keys(errors).length > 0
  };
}