import React, { useState, useEffect } from 'react'; // Import useEffect
import { Check, Clock, Trash2, X, RotateCcw, Calendar as CalendarIcon } from 'lucide-react'; 
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
  estimatedVisitDate?: string | null; // New prop for estimated visit date
}

export function TreatmentItem({ 
  treatment, 
  onStatusChange, 
  onDelete,
  loading = false,
  estimatedVisitDate, // Destructure the new prop
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
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${color}`}>
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
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${color}`}>
        {priority}
      </span>
    );
  };
  
  // Ensure treatment object exists before trying to access its properties
  if (!treatment) {
    return <div className="text-center text-sm text-gray-500 py-4">No treatment data.</div>;
  }

  const handleBookAppointment = () => {
    console.log(`Book appointment for treatment ID: ${treatment.id}, Estimated Date: ${estimatedVisitDate}`);
    // TODO: Implement actual navigation to appointment booking page/modal
  };

  // Safely parse cost to a number
  const costString = String(treatment.cost || '0'); // Ensure treatment.cost is converted to string, default to '0'
  const costAsNumber = parseFloat(costString);
  const displayCost = isNaN(costAsNumber) ? 0 : costAsNumber;

  return (
    <div className="bg-white shadow-md rounded-lg mb-3 transition-all hover:shadow-lg">
      <div className="px-5 py-4">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h4 className="font-semibold text-md text-gray-800 group-hover:text-blue-600 transition-colors duration-200">{treatment.type}</h4>
            <p className="text-sm text-gray-600 mt-0.5">{treatment.description}</p>
          </div>
          <div className="flex items-center space-x-2 shrink-0 ml-4">
            {renderStatusBadge(treatment.status)}
            {treatment.priority && renderPriorityBadge(treatment.priority)}
          </div>
        </div>
        <div className="flex items-center text-xs text-gray-500 mt-3 pt-3 border-t border-gray-200">
          {/* Display Estimated Visit Date */}
          {estimatedVisitDate && (
            <>
              <CalendarIcon className="mr-1.5 h-3.5 w-3.5 text-gray-400" />
              <span className="font-medium">Est. Visit:</span>
              <span className="ml-1">{estimatedVisitDate}</span>
              <span className="mx-2 text-gray-300">|</span>
            </>
          )}
          <Clock className="mr-1.5 h-3.5 w-3.5 text-gray-400" />
          <span className="font-medium">Duration:</span>
          <span className="ml-1">{elapsedTimeDisplay}</span>
          {treatment.time_gap && (
            <>
              <span className="mx-2 text-gray-300">|</span>
              <span className="font-medium">Next visit in:</span>
              <span className="ml-1">{treatment.time_gap}</span>
            </>
          )}
        </div>
      </div>
      <div className="bg-gray-50 px-5 py-3 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-gray-700">
            Cost: <span className="text-gray-900">{formatCurrency(displayCost, 'USD')}</span>
          </div>
          <div className="flex items-center space-x-2">
            {/* "Book Appointment" button is intentionally REMOVED from here */}
            {treatment.status === 'pending' && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  title="Mark this treatment as completed"
                  onClick={() => onStatusChange(treatment.id, 'completed')}
                  disabled={loading || showDeleteConfirm} // Disable if loading or delete dialog is open
                >
                  {loading && !showDeleteConfirm ? ( // Show loader only if this action is loading
                    <Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> 
                  ) : (
                    <Check className="h-3 w-3 mr-1.5" />
                  )}
                  Mark Complete
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  title="Cancel this treatment"
                  onClick={() => onStatusChange(treatment.id, 'cancelled')}
                  disabled={loading || showDeleteConfirm}
                >
                  {loading && !showDeleteConfirm ? (
                    <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                  ) : (
                    <X className="h-3 w-3 mr-1.5" />
                  )}
                  Cancel
                </Button>
              </>
            )}

            {/* Reopen: Show only if status is 'completed' or 'cancelled' */}
            {(treatment.status === 'completed' || treatment.status === 'cancelled') && ( 
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                title="Reopen this treatment (set to pending)"
                onClick={() => onStatusChange(treatment.id, 'pending')} // Set back to pending
                disabled={loading || showDeleteConfirm}
              >
                {loading && !showDeleteConfirm ? (
                  <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                ) : (
                  <RotateCcw className="h-3 w-3 mr-1.5" /> // Reopen icon
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
                  className="text-xs"
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
      </div>
    </div>
  );
}
