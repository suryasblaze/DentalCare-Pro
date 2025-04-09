import { z } from 'zod';

/**
 * Enhanced form validation with detailed error messages
 * @param schema Zod schema to validate against
 * @param data Data to validate
 * @returns Validation result with detailed error messages
 */
export function validateFormData<T>(schema: z.ZodType<T>, data: any): {
  success: boolean;
  data?: T;
  errors?: Record<string, string>;
} {
  try {
    const validatedData = schema.parse(data);
    return {
      success: true,
      data: validatedData,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const fieldErrors: Record<string, string> = {};
      
      error.errors.forEach((err) => {
        const field = err.path.join('.');
        fieldErrors[field] = err.message;
      });
      
      return {
        success: false,
        errors: fieldErrors,
      };
    }
    
    return {
      success: false,
      errors: { _form: 'An unexpected error occurred during validation' },
    };
  }
}

/**
 * Safe number conversion with validation
 * @param value String value to convert to number
 * @param fallback Fallback value if conversion fails
 * @returns Converted number or fallback
 */
export function safeNumberConversion(value: string, fallback?: number): number | undefined {
  if (!value || value.trim() === '') {
    return fallback;
  }
  
  const number = parseFloat(value);
  return isNaN(number) ? fallback : number;
}

/**
 * Safely formats a monetary value for display
 * @param value Number to format as currency
 * @param decimals Number of decimal places
 * @returns Formatted currency string
 */
export function formatCurrency(value: number | string | undefined | null, decimals = 2): string {
  if (value === undefined || value === null) {
    return '₹0.00';
  }
  
  const number = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(number)) {
    return '₹0.00';
  }
  
  return `₹${number.toFixed(decimals)}`;
}

/**
 * Safely formats a date string
 * @param dateString Date string to format
 * @param fallback Fallback string if date is invalid
 * @returns Formatted date or fallback
 */
export function safeFormatDate(dateString: string | null | undefined, fallback = 'Not specified'): string {
  if (!dateString) {
    return fallback;
  }
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return fallback;
    }
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch (err) {
    return fallback;
  }
}
