import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from "@/components/ui/dialog";
import DentalChart, { InitialToothState, DentalChartHandle, ToothCondition } from './DentalChart'; // Import DentalChart and its types

// Define a type for the data structure this component will handle
// It maps tooth ID (number) to an object containing its conditions
export type ToothConditionsMap = Record<number, { conditions: ToothCondition[] }>;

interface ToothSelectorProps {
  /** The currently selected tooth numbers and their conditions */
  value?: ToothConditionsMap; // Changed from number[]
  /** Callback function when the selection changes */
  onChange?: (selectedTeethState: ToothConditionsMap) => void; // Changed signature
  /** Placeholder text for the button when no teeth are selected */
  placeholder?: string;
  /** Optional flag to disable the selector */
  disabled?: boolean;
}

const ToothSelector: React.FC<ToothSelectorProps> = ({
  value = {}, // Default to empty object
  onChange,
  placeholder = "Select Teeth...",
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  // Temporary state to hold the full chart state within the dialog
  // Initialize based on the incoming value prop
  const [tempChartState, setTempChartState] = useState<ToothConditionsMap>(value);
  const dentalChartRef = useRef<DentalChartHandle>(null); // Ref for DentalChart

  // Update temporary state whenever the external value prop changes
  useEffect(() => {
    // Always sync temp state with the external value prop when it changes.
    // The DentalChart component's key prop handles resetting its display when the dialog opens.
    setTempChartState(value);
  }, [value]); // Depend only on the value prop

  // Format the initial state for the DentalChart component based on ToothConditionsMap
  const formatInitialState = (currentValue: ToothConditionsMap): InitialToothState => {
    const initialState: InitialToothState = {};
    Object.entries(currentValue).forEach(([idStr, data]) => {
      const id = parseInt(idStr, 10);
      if (!isNaN(id)) {
        // Mark tooth as selected if it exists in the map, pass conditions
        initialState[id] = { 
          isSelected: true, 
          conditions: data.conditions // Pass conditions array
        }; 
      }
    });
    return initialState;
  };

  const handleConfirmSelection = () => {
    // Get the latest full state directly from the DentalChart ref
    if (dentalChartRef.current) {
      const finalChartData = dentalChartRef.current.getTeethData();
      
      // Filter the data to include only selected teeth and their conditions
      const selectedTeethMap: ToothConditionsMap = {};
      Object.entries(finalChartData).forEach(([idStr, toothData]) => {
        if (toothData.isSelected) {
          selectedTeethMap[parseInt(idStr, 10)] = { conditions: toothData.conditions };
        }
      });

      onChange?.(selectedTeethMap); // Pass the filtered map
      setTempChartState(selectedTeethMap); // Update temp state to match confirmed state
    } else {
      console.error("DentalChart ref not available to get data.");
      // Fallback or error handling: maybe pass the last known temp state?
      // onChange?.(tempChartState); // Or handle error appropriately
    }
    setIsOpen(false);
  };

  const handleCancel = () => {
    // Resetting temp state is handled by useEffect when isOpen changes to false
    setIsOpen(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (disabled) return;
    setIsOpen(open);
    // Resetting temp state on close is handled by useEffect
  };

  // Prepare the display text for selected teeth IDs
  const selectedTeethIds = Object.keys(value).map(Number).sort((a, b) => a - b);
  const selectedTeethText = selectedTeethIds.length > 0
    ? `Selected: ${selectedTeethIds.join(', ')}`
    : '';

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="flex items-center gap-1.5"
            disabled={disabled}
            type="button" // Ensure it doesn't submit forms by default
          >
            {/* Using a simple text smiley for now, replace with an icon if available */}
            <span role="img" aria-label="tooth icon">🦷</span>
            {placeholder}
          </Button>
          {selectedTeethText && (
            <span className="text-sm text-muted-foreground">{selectedTeethText}</span>
          )}
        </div>
      </DialogTrigger>
      <DialogContent className="max-w-4xl"> {/* Adjust width as needed */}
        <DialogHeader>
          <DialogTitle>Select Affected Teeth</DialogTitle>
          {/* Add DialogDescription for accessibility */}
          <DialogDescription>
            Use the interactive chart below to select or deselect teeth. Click Confirm to save your selection.
          </DialogDescription>
        </DialogHeader>

        {/* Render DentalChart inside the dialog */}
        {/* We add a key prop based on isOpen to force re-mount/reset state when dialog opens */}
        {/* Alternatively, manage reset via useEffect inside DentalChart or explicitly */}
        <DentalChart
          key={isOpen ? 'open' : 'closed'} // Force re-render on open to respect initialState
          ref={dentalChartRef}
          // Pass the initial state derived from the temp state
          initialState={formatInitialState(tempChartState)} 
          // Remove onToothSelect - state is managed internally by DentalChart and read via ref
          readOnly={false} // Ensure chart is interactive
        />

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>Cancel</Button>
          <Button onClick={handleConfirmSelection}>Confirm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

ToothSelector.displayName = "ToothSelector";

export default ToothSelector;
