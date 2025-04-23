import React, { useState, useEffect } from 'react'; // Import useEffect
import { Check, Clock, Trash2, X, RotateCcw } from 'lucide-react'; 
import { Button } from '@/components/ui/button'; 
import { Loader2 } from 'lucide-react';
import { formatDistanceStrict, differenceInSeconds } from 'date-fns'; // Import date-fns functions
import { formatCurrency } from '@/lib/utils/validation';
// Import AlertDialog components (should now be available)
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"; 

interface TreatmentItemProps {
  treatment: any;
  onStatusChange: (id: string, status: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  loading?: boolean;
}

export function TreatmentItem({ 
  treatment, 
  onStatusChange, 
  onDelete,
  loading = false,
}: TreatmentItemProps) {
  // State for delete confirmation dialog
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  // State for displaying elapsed time
  const [elapsedTimeDisplay, setElapsedTimeDisplay] = useState<string>('N/A');

  // --- Timer Logic ---
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    const calculateAndSetDisplay = () => {
      const startTime = treatment.actual_start_time ? new Date(treatment.actual_start_time) : null;
      const endTime = treatment.actual_end_time ? new Date(treatment.actual_end_time) : null;

      if (endTime && startTime) {
        // If ended, calculate final duration and clear interval
        if (intervalId) clearInterval(intervalId);
        setElapsedTimeDisplay(formatDistanceStrict(endTime, startTime));
      } else if (startTime) {
        // If started but not ended, calculate running duration
        const now = new Date();
        const secondsElapsed = differenceInSeconds(now, startTime);
        
        // Format seconds into HH:MM:SS or similar
        const hours = Math.floor(secondsElapsed / 3600);
        const minutes = Math.floor((secondsElapsed % 3600) / 60);
        const seconds = secondsElapsed % 60;
        setElapsedTimeDisplay(
          `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
        );
      } else {
        // If not started, show estimated duration or N/A
        setElapsedTimeDisplay(formatEstimatedDuration(treatment.estimated_duration));
        if (intervalId) clearInterval(intervalId); // Clear interval if treatment resets
      }
    };

    // Initial calculation
    calculateAndSetDisplay();

    // Set up interval only if treatment is running (started, not ended)
    if (treatment.actual_start_time && !treatment.actual_end_time) {
      intervalId = setInterval(calculateAndSetDisplay, 1000); // Update every second
    }

    // Cleanup function to clear interval on unmount or dependency change
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [treatment.actual_start_time, treatment.actual_end_time, treatment.estimated_duration]); // Rerun effect if these change
  // --- End Timer Logic ---


  // Helper function to format the ESTIMATED duration (from interval type)
  const formatEstimatedDuration = (intervalValue: any): string => {
    // Log the received value and its type for debugging
    console.log("Received intervalValue:", intervalValue, "Type:", typeof intervalValue); 

    if (!intervalValue) {
      return 'N/A';
    }

    // Handle PostgreSQL interval object format (e.g., { minutes: 30, hours: 1 })
    // This might be how Supabase client returns interval types sometimes.
    if (typeof intervalValue === 'object' && intervalValue !== null) {
      // Extract parts, defaulting to 0 if undefined
      const { days = 0, hours = 0, minutes = 0, seconds = 0 } = intervalValue;
      let formatted = '';
      if (days > 0) formatted += `${days} day${days > 1 ? 's' : ''} `;
      if (hours > 0) formatted += `${hours} hour${hours > 1 ? 's' : ''} `;
      if (minutes > 0) formatted += `${minutes} minute${minutes > 1 ? 's' : ''} `;
      // Optionally add seconds display: 
      // if (seconds > 0) formatted += `${seconds} second${seconds > 1 ? 's' : ''}`;
      
      // Return N/A if all relevant parts are 0
      return formatted.trim() || 'N/A'; 
    }

    // Handle string format (e.g., "00:30:00", "30 minutes", "1 day 02:00:00")
    if (typeof intervalValue === 'string') {
      try {
        // Attempt to parse HH:MM:SS string format first
        if (typeof intervalValue === 'string' && /^\d{2}:\d{2}:\d{2}$/.test(intervalValue)) {
          const parts = intervalValue.split(':').map(Number);
          const hours = parts[0] || 0;
          const minutes = parts[1] || 0;
          const seconds = parts[2] || 0; // Parse seconds

          if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) { // Check seconds parsing too
             console.warn(`Could not parse HH:MM:SS interval: ${intervalValue}`);
             return intervalValue; // Return original if parsing fails
          }

          let formatted = '';
          if (hours > 0) formatted += `${hours} hour${hours > 1 ? 's' : ''} `;
          if (minutes > 0) formatted += `${minutes} minute${minutes > 1 ? 's' : ''} `;
          if (seconds > 0 && hours === 0 && minutes === 0) { // Only show seconds if hours and minutes are 0
            formatted += `${seconds} second${seconds > 1 ? 's' : ''}`;
          }
          
          // Return N/A only if all parts are effectively zero
          return formatted.trim() || 'N/A'; 
        }
        // If not HH:MM:SS string, assume it might be a descriptive string like "30 minutes"
        // or potentially the object format if the primary check failed somehow.
        // For simplicity, return the string directly if it's not HH:MM:SS.
        return intervalValue;

      } catch (e) {
        console.error("Error parsing interval string:", intervalValue, e);
        return intervalValue; // Fallback to original string on error
      }
    }

    // Fallback if type is unexpected
    console.warn("Unexpected interval value type:", typeof intervalValue, intervalValue);
    return 'Invalid Duration'; 
  };

  // Render status badge with appropriate color
  const renderStatusBadge = (status: string) => {
    let color = 'bg-gray-100 text-gray-800'; // Initialize color
    
    switch (status) {
      case 'pending':
        color = 'bg-purple-100 text-purple-800';
        break;
      case 'completed':
        color = 'bg-green-100 text-green-800';
        break;
      case 'cancelled':
        color = 'bg-red-100 text-red-800';
        break;
    }
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${color}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };
  
  // Render priority badge with appropriate color
  const renderPriorityBadge = (priority: string) => {
    let color = 'bg-gray-100 text-gray-800'; // Initialize color
    
    switch (priority) {
      case 'low':
        color = 'bg-green-100 text-green-800';
        break;
      case 'medium':
        color = 'bg-yellow-100 text-yellow-800';
        break;
      case 'high':
        color = 'bg-red-100 text-red-800';
        break;
    }
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${color}`}>
        {priority}
      </span>
    );
  };
  
  // Ensure treatment object exists before trying to access its properties
  if (!treatment) {
    return null; // Or return some placeholder/loading state
  }

  return (
    <div className="border rounded-lg p-4">
      <div className="flex justify-between items-start">
        <div>
          <h4 className="font-medium">{treatment.type}</h4>
          <p className="text-sm text-muted-foreground">{treatment.description}</p>
        </div>
        <div className="flex items-center gap-2">
          {renderStatusBadge(treatment.status)}
          {treatment.priority && renderPriorityBadge(treatment.priority)}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        <div className="flex items-center gap-2">
          <span className="text-sm">Cost: {formatCurrency(treatment.cost)}</span>
        </div>
        
        {/* Display the running/final duration */}
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          {/* Display the elapsedTimeDisplay state which holds either running time or final/estimated duration */}
          <p className="text-sm">Duration: {elapsedTimeDisplay}</p> 
        </div>
      </div>
      
      <div className="flex justify-end gap-2 mt-4">
        {/* Mark Complete: Show only if status is 'pending' */}
        {treatment.status === 'pending' && (
          <Button
            variant="outline"
            size="sm"
            title="Mark this treatment as completed"
            onClick={() => onStatusChange(treatment.id, 'completed')}
            disabled={loading || showDeleteConfirm} // Disable if loading or delete dialog is open
          >
            {loading && !showDeleteConfirm ? ( // Show loader only if this action is loading
              <Loader2 className="h-3 w-3 mr-1 animate-spin" /> 
            ) : (
              <Check className="h-3 w-3 mr-1" />
            )}
            Mark Complete
          </Button>
        )}
        
        {/* Cancel: Show only if status is 'pending' */}
        {treatment.status === 'pending' && ( 
          <Button
            variant="outline"
            size="sm"
            title="Cancel this treatment"
            onClick={() => onStatusChange(treatment.id, 'cancelled')}
            disabled={loading || showDeleteConfirm}
          >
            {loading && !showDeleteConfirm ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <X className="h-3 w-3 mr-1" />
            )}
            Cancel
          </Button>
        )}

        {/* Reopen: Show only if status is 'completed' or 'cancelled' */}
        {(treatment.status === 'completed' || treatment.status === 'cancelled') && ( 
          <Button
            variant="outline"
            size="sm"
            title="Reopen this treatment (set to pending)"
            onClick={() => onStatusChange(treatment.id, 'pending')} // Set back to pending
            disabled={loading || showDeleteConfirm}
          >
            {loading && !showDeleteConfirm ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <RotateCcw className="h-3 w-3 mr-1" /> // Reopen icon
            )}
            Reopen
          </Button>
        )}
        
        {/* Delete Button with Confirmation Dialog */}
        {/* Keep Delete always available unless loading */}
        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              size="sm"
              title="Delete this treatment permanently"
              disabled={loading} // Only disable based on general loading, not dialog state
            >
              {/* Show loader specifically if delete is in progress? Requires more state */}
              <Trash2 className="h-3 w-3" /> 
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the treatment: "{treatment.type}".
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => onDelete(treatment.id)} 
                disabled={loading}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                 {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                 Yes, delete treatment
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
