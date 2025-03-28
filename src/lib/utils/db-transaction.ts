import { supabase } from '../supabase';

/**
 * Error class for transaction failures
 */
export class TransactionError extends Error {
  public readonly operation: string;
  public readonly partialData: any;
  public readonly originalError: Error;
  
  constructor(operation: string, originalError: Error, partialData?: any) {
    super(`Transaction failed during ${operation}: ${originalError.message}`);
    this.name = 'TransactionError';
    this.operation = operation;
    this.originalError = originalError;
    this.partialData = partialData;
  }
}

/**
 * Transaction result wrapper
 */
export interface TransactionResult<T> {
  success: boolean;
  data?: T;
  error?: TransactionError;
}

/**
 * Executes multiple database operations as a single transaction with rollback support
 * @param operations List of operations to execute in sequence
 * @param rollbackHandlers Optional handlers for rolling back specific operations if needed
 * @returns Transaction result
 */
export async function executeTransaction<T>(
  operations: Array<() => Promise<any>>,
  rollbackHandlers?: Array<(data: any) => Promise<void>>
): Promise<TransactionResult<T>> {
  const results: any[] = [];
  let success = true;
  let error: TransactionError | undefined;
  
  try {
    // Begin transaction
    await supabase.rpc('begin_transaction');
    
    // Execute all operations in sequence
    for (let i = 0; i < operations.length; i++) {
      try {
        const operationResult = await operations[i]();
        results.push(operationResult);
      } catch (err) {
        success = false;
        error = new TransactionError(`Operation ${i}`, err as Error, results);
        
        // Attempt to roll back specific operations if handlers were provided
        if (rollbackHandlers && i > 0) {
          for (let j = i - 1; j >= 0; j--) {
            if (rollbackHandlers[j] && results[j]) {
              try {
                await rollbackHandlers[j](results[j]);
              } catch (rollbackErr) {
                console.error('Rollback failed:', rollbackErr);
              }
            }
          }
        }
        
        throw error;
      }
    }
    
    // Commit the transaction
    await supabase.rpc('commit_transaction');
    
    return {
      success: true,
      data: results.length === 1 ? results[0] : results,
    };
  } catch (err) {
    // Rollback transaction on error
    try {
      await supabase.rpc('rollback_transaction');
    } catch (rollbackErr) {
      console.error('Transaction rollback failed:', rollbackErr);
    }
    
    return {
      success: false,
      error: err instanceof TransactionError ? err : new TransactionError('Unknown', err as Error),
    };
  }
}

/**
 * Wrapper for connection health check and reconnection
 */
export async function checkConnection(): Promise<boolean> {
  try {
    const { data, error } = await supabase.from('clinic_settings').select('id').limit(1);
    
    if (error) {
      console.error('Connection check failed:', error.message);
      return false;
    }
    
    return true;
  } catch (err) {
    console.error('Connection check error:', err);
    return false;
  }
}

/**
 * Attempts to reconnect to Supabase if connection is lost
 */
export async function attemptReconnection(maxRetries = 3): Promise<boolean> {
  let retries = 0;
  
  while (retries < maxRetries) {
    console.log(`Attempting to reconnect (${retries + 1}/${maxRetries})...`);
    
    try {
      // Create a new Supabase client
      const isConnected = await checkConnection();
      
      if (isConnected) {
        console.log('Reconnection successful');
        return true;
      }
    } catch (err) {
      console.error('Reconnection attempt failed:', err);
    }
    
    // Exponential backoff
    const delay = Math.pow(2, retries) * 1000;
    await new Promise(resolve => setTimeout(resolve, delay));
    retries++;
  }
  
  console.error('All reconnection attempts failed');
  return false;
}