import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Button } from '@/components/ui/button';
// No longer using Badge for tooltip content
// import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"; // Import Tooltip components
import { cn } from '@/lib/utils';
import TeethDiagram from '/public/teethselectdiagram.svg?react'; // Import SVG as React component

// Define types for tooth data and conditions - Exporting for external use
export type ToothCondition =
  | 'healthy'
  | 'decayed'
  | 'filled'
  | 'missing'
  | 'treatment-planned' // General plan
  | 'root-canal' // Specific treatment
  | 'extraction' // Specific treatment
  | 'crown' // Specific treatment
  | 'has-treatment-before' // History
  | 'recommended-to-be-treated'; // Recommendation

// Helper function to get tooth name (simplified)
const getToothName = (id: number): string => {
  // Basic mapping - could be expanded or use a library
  const names: Record<number, string> = {
    11: 'UR Central Incisor', 12: 'UR Lateral Incisor', 13: 'UR Canine', 14: 'UR 1st Premolar', 15: 'UR 2nd Premolar', 16: 'UR 1st Molar', 17: 'UR 2nd Molar', 18: 'UR 3rd Molar',
    21: 'UL Central Incisor', 22: 'UL Lateral Incisor', 23: 'UL Canine', 24: 'UL 1st Premolar', 25: 'UL 2nd Premolar', 26: 'UL 1st Molar', 27: 'UL 2nd Molar', 28: 'UL 3rd Molar',
    31: 'LR Central Incisor', 32: 'LR Lateral Incisor', 33: 'LR Canine', 34: 'LR 1st Premolar', 35: 'LR 2nd Premolar', 36: 'LR 1st Molar', 37: 'LR 2nd Molar', 38: 'LR 3rd Molar',
    41: 'LL Central Incisor', 42: 'LL Lateral Incisor', 43: 'LL Canine', 44: 'LL 1st Premolar', 45: 'LL 2nd Premolar', 46: 'LL 1st Molar', 47: 'LL 2nd Molar', 48: 'LL 3rd Molar',
    // Primary teeth (simplified names)
    51: 'UR Primary Central Incisor', 52: 'UR Primary Lateral Incisor', 53: 'UR Primary Canine', 54: 'UR Primary 1st Molar', 55: 'UR Primary 2nd Molar',
    61: 'UL Primary Central Incisor', 62: 'UL Primary Lateral Incisor', 63: 'UL Primary Canine', 64: 'UL Primary 1st Molar', 65: 'UL Primary 2nd Molar',
    71: 'LR Primary Central Incisor', 72: 'LR Primary Lateral Incisor', 73: 'LR Primary Canine', 74: 'LR Primary 1st Molar', 75: 'LR Primary 2nd Molar',
    81: 'LL Primary Central Incisor', 82: 'LL Primary Lateral Incisor', 83: 'LL Primary Canine', 84: 'LL Primary 1st Molar', 85: 'LL Primary 2nd Molar',
  };
  return names[id] || `Tooth ${id}`;
};


interface ToothData {
  id: number; // FDI Notation number
  conditions: ToothCondition[]; // Changed from single condition to array
  isPrimary: boolean;
  isSelected: boolean;
}

// Type for initial data passed via props - Exporting for external use
export type InitialToothState = Partial<Record<number, { conditions?: ToothCondition[]; isSelected?: boolean }>>; // Updated to conditions array

interface DentalChartProps {
  initialState?: InitialToothState;
  onToothSelect?: (selectedTeeth: number[]) => void; // Pass array of selected IDs
  readOnly?: boolean; // Optional prop to disable selection
  // No onConfirm needed here if using ref approach
}

// Define handle type for useImperativeHandle
export interface DentalChartHandle {
  getTeethData: () => Record<number, ToothData>;
}

// Define colors based on the second screenshot's legend/buttons
const conditionColors: Record<ToothCondition | 'selected', string> = {
    healthy: '#10B981', // Green color for healthy
    decayed: '#DC2626', // Red
    filled: '#6B7280', // Gray
    missing: 'transparent', // Missing - handled by stroke
    'treatment-planned': '#F97316', // Orange
    'root-canal': '#8B5CF6', // Violet
    extraction: '#EF4444', // Red (Maybe add X marker later)
    crown: '#F59E0B', // Amber
    'has-treatment-before': '#3B82F6', // Blue
    'recommended-to-be-treated': '#FBBF24', // Yellow
    selected: '#BFDBFE', // Fallback color, not used for fill now
};

// Updated initial state generator for multiple conditions
const generateInitialTeeth = (initialState?: InitialToothState): Record<number, ToothData> => {
    const teeth: Record<number, ToothData> = {};
    const defaultConditions: ToothCondition[] = ['healthy']; // Default to healthy
    const defaultSelected = false;

    // Helper to get initial conditions or default
    const getInitialConditions = (id: number): ToothCondition[] => {
        const conditions = initialState?.[id]?.conditions;
        // Ensure it's an array and not empty, otherwise default
        return Array.isArray(conditions) && conditions.length > 0 ? conditions : defaultConditions;
    };

    // Permanent teeth (11-48)
    for (let i = 11; i <= 18; i++) teeth[i] = { id: i, conditions: getInitialConditions(i), isPrimary: false, isSelected: initialState?.[i]?.isSelected ?? defaultSelected };
    for (let i = 21; i <= 28; i++) teeth[i] = { id: i, conditions: getInitialConditions(i), isPrimary: false, isSelected: initialState?.[i]?.isSelected ?? defaultSelected };
    for (let i = 31; i <= 38; i++) teeth[i] = { id: i, conditions: getInitialConditions(i), isPrimary: false, isSelected: initialState?.[i]?.isSelected ?? defaultSelected };
    for (let i = 41; i <= 48; i++) teeth[i] = { id: i, conditions: getInitialConditions(i), isPrimary: false, isSelected: initialState?.[i]?.isSelected ?? defaultSelected };

    // Primary teeth (51-85)
    for (let i = 51; i <= 55; i++) teeth[i] = { id: i, conditions: getInitialConditions(i), isPrimary: true, isSelected: initialState?.[i]?.isSelected ?? defaultSelected };
    for (let i = 61; i <= 65; i++) teeth[i] = { id: i, conditions: getInitialConditions(i), isPrimary: true, isSelected: initialState?.[i]?.isSelected ?? defaultSelected };
    for (let i = 71; i <= 75; i++) teeth[i] = { id: i, conditions: getInitialConditions(i), isPrimary: true, isSelected: initialState?.[i]?.isSelected ?? defaultSelected };
    for (let i = 81; i <= 85; i++) teeth[i] = { id: i, conditions: getInitialConditions(i), isPrimary: true, isSelected: initialState?.[i]?.isSelected ?? defaultSelected };

    // Apply specific conditions/selection from initialState
    if (initialState) {
        for (const toothIdStr in initialState) {
            const toothId = parseInt(toothIdStr, 10);
            const state = initialState[toothId];
            if (!isNaN(toothId) && state) {
                // Ensure tooth exists before updating
                if (!teeth[toothId]) {
                    const isPrimary = (toothId >= 51 && toothId <= 55) || (toothId >= 61 && toothId <= 65) || (toothId >= 71 && toothId <= 75) || (toothId >= 81 && toothId <= 85);
                    teeth[toothId] = { id: toothId, conditions: defaultConditions, isPrimary: isPrimary, isSelected: defaultSelected };
                }
                // Update conditions if provided and valid
                if (Array.isArray(state.conditions) && state.conditions.length > 0) {
                    teeth[toothId].conditions = state.conditions;
                } else if (state.conditions !== undefined) {
                    // Handle case where initialState might provide empty array or non-array
                    console.warn(`DentalChart: Invalid 'conditions' in initialState for tooth ${toothId}. Using default.`);
                    teeth[toothId].conditions = defaultConditions;
                }
                // Update selection if provided
                if (state.isSelected !== undefined) {
                    teeth[toothId].isSelected = state.isSelected;
                }
            }
        }
    }
    return teeth;
};

// Define available conditions matching the second screenshot's buttons
const availableConditions: { label: string; value: ToothCondition }[] = [
  { label: 'Healthy', value: 'healthy' },
  { label: 'Decayed', value: 'decayed' },
  { label: 'Filled', value: 'filled' },
  { label: 'Missing', value: 'missing' },
  { label: 'Planned Tx', value: 'treatment-planned' },
  { label: 'Root Canal', value: 'root-canal' },
  { label: 'Extraction', value: 'extraction' },
  { label: 'Crown', value: 'crown' },
  { label: 'Prior Tx', value: 'has-treatment-before' },
  { label: 'Recommend Tx', value: 'recommended-to-be-treated' },
];

// Define the component using forwardRef, accepting props and ref
const DentalChart = forwardRef<DentalChartHandle, DentalChartProps>(({ initialState, onToothSelect, readOnly = false }, ref) => {
  const [teethData, setTeethData] = useState<Record<number, ToothData>>(() => generateInitialTeeth(initialState));
  const [selectedConditions, setSelectedConditions] = useState<ToothCondition[]>([]);
  const [hoveredToothId, setHoveredToothId] = useState<number | null>(null); // State for hover
  const [processedSelectedTeeth, setProcessedSelectedTeeth] = useState<Set<number>>(new Set()); // Track teeth selected after condition applied
  // State for CLICK-based tooltip (persists on click)
  const [activeTooltipData, setActiveTooltipData] = useState<{
    id: number;
    name: string;
    conditions: ToothCondition[];
    top: number;
    left: number;
  } | null>(null);
  // State for HOVER/CLICK-based tooltip position (updates on move/click)
  const [tooltipTriggerPosition, setTooltipTriggerPosition] = useState<{ top: number; left: number; } | null>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null); // Ref for the SVG container

  // Update internal state if initialState prop changes (run only once on mount for now)
  useEffect(() => {
     console.log("DentalChart: useEffect for initialState triggered. Prop value:", initialState); // Add log here
     const initialTeeth = generateInitialTeeth(initialState);
     console.log("DentalChart: Regenerated initialTeeth based on prop:", initialTeeth); // Add log here
     setTeethData(initialTeeth);
     // Extract selected IDs from the potentially updated initialState
     const currentSelectedIds = Object.entries(initialTeeth)
        .filter(([, data]) => data.isSelected)
        .map(([id]) => parseInt(id, 10));
     // Notify parent about initial selection if needed (though usually done on interaction)
      // onToothSelect?.(currentSelectedIds);
     // Notify parent about initial selection if needed (though usually done on interaction)
      // onToothSelect?.(currentSelectedIds);
  }, [initialState]); // <-- Dependency array updated to [initialState]

  // --- Expose getTeethData via ref ---
  useImperativeHandle(ref, () => ({
    getTeethData: () => {
      // Return the state directly. Parent component reads this immediately for saving.
      // Avoids type loss from JSON deep copy.
      return teethData;
    }
  }));

  // --- Helper Functions for Interaction ---
  // Memoize helper function to find the parent <g> element for a tooth
  const getToothGroupFromElement = useCallback((target: SVGElement | EventTarget | null): SVGGElement | null => {
    let element = target as SVGElement;
    while (element && element.tagName !== 'svg') {
      if (element.tagName === 'g' && element.id.startsWith('ID_')) {
        const toothIdStr = element.id.substring(3);
        const toothId = parseInt(toothIdStr, 10);
        // Check if it's a valid tooth ID we manage
        if (!isNaN(toothId) && teethData[toothId]) {
           return element as SVGGElement;
        }
      }
      element = element.parentNode as SVGElement;
    }
    return null;
  }, [teethData]); // Dependency: teethData

  // Memoize helper function to get the tooth ID from an element
  const getToothIdFromElement = useCallback((target: SVGElement | EventTarget | null): number | null => {
    const groupElement = getToothGroupFromElement(target);
    if (groupElement) {
        const toothIdStr = groupElement.id.substring(3);
        return parseInt(toothIdStr, 10);
    }
    return null;
  }, [getToothGroupFromElement]); // Dependency: getToothGroupFromElement

  // --- Tooth Interaction Logic ---

  // Handles toggling the selection state of a tooth
  const toggleToothSelection = useCallback((toothId: number) => {
    if (readOnly) return;

    // Calculate the next state without setting it yet
    const currentTooth = teethData[toothId];
    if (!currentTooth) return;
    const nextSelectedState = !currentTooth.isSelected;

    // Calculate the next list of selected IDs based on the *intended* next state
    const nextSelectedIds = Object.entries(teethData)
      .filter(([idStr, data]) => {
        const id = parseInt(idStr, 10);
        if (id === toothId) {
          return nextSelectedState; // Use the next state for the clicked tooth
        }
        return data.isSelected; // Use the current state for other teeth
      })
      .map(([idStr]) => parseInt(idStr, 10));

    // Call the parent prop immediately with the calculated next IDs
    onToothSelect?.(nextSelectedIds);

    // Now update the internal state
    const updatedToothData = {
      ...teethData,
      [toothId]: { ...currentTooth, isSelected: nextSelectedState }
    };
    setTeethData(updatedToothData);

    // --- Tooltip Logic (Click) ---
    if (nextSelectedState) {
      // Tooth SELECTED: Set active tooltip data (persists)
      const groupElement = svgContainerRef.current?.querySelector(`#ID_${toothId}`) as SVGGElement | null;
      if (groupElement && svgContainerRef.current) {
        const containerRect = svgContainerRef.current.getBoundingClientRect();
        const toothRect = groupElement.getBoundingClientRect();
        // Adjust top position to be closer to the vertical center of the tooth
        const relativeTop = toothRect.top - containerRect.top + toothRect.height / 2 + svgContainerRef.current.scrollTop;
        // Keep relativeLeft calculation centered horizontally
        const relativeLeft = toothRect.left - containerRect.left + toothRect.width / 2 + svgContainerRef.current.scrollLeft;


        const newActiveData = {
          id: toothId,
          name: getToothName(toothId),
          conditions: updatedToothData[toothId].conditions,
          top: relativeTop,
          left: relativeLeft,
        };
        setActiveTooltipData(newActiveData);
        // Also update the trigger position for immediate feedback
        setTooltipTriggerPosition({ top: relativeTop, left: relativeLeft });
      } else {
         setActiveTooltipData(null);
         setTooltipTriggerPosition(null); // Clear position if element not found
      }
    } else {
      // Tooth DESELECTED: Clear active tooltip data
      setActiveTooltipData(null);
      // If not hovering over this tooth anymore, also clear trigger position
      if (hoveredToothId !== toothId) {
          setTooltipTriggerPosition(null);
      }
    }
    // --- End Tooltip Logic (Click) ---


    // When a tooth is toggled, it's no longer considered "processed"
    setProcessedSelectedTeeth(prevSet => {
        const newSet = new Set(prevSet);
        newSet.delete(toothId); // Remove from processed set regardless of new state
        return newSet;
    });

  }, [readOnly, onToothSelect, teethData, hoveredToothId]); // Added hoveredToothId dependency

  // Applies the currently selected conditions to all selected teeth
  const applySelectedConditions = useCallback(() => {
    if (readOnly || selectedConditions.length === 0) return;

    const newlyProcessedIds = new Set<number>();
    let conditionsChangedForActiveTooltip = false; // Flag to track change for active tooltip
    let finalConditionsForActiveTooltip: ToothCondition[] | undefined; // Store the final conditions

    setTeethData(prevData => {
      const newData = { ...prevData };
      let changed = false;

      Object.keys(newData).forEach(idStr => {
        const id = parseInt(idStr, 10);
        const tooth = newData[id];

        if (tooth.isSelected) {
          let currentConditions = [...tooth.conditions];
          let conditionsUpdated = false;

          // Add new conditions, avoiding duplicates and 'healthy' if others exist
          selectedConditions.forEach(condToAdd => {
            if (!currentConditions.includes(condToAdd)) {
              currentConditions.push(condToAdd);
              conditionsUpdated = true;
            }
          });

          // Remove 'healthy' if other conditions were added
          if (conditionsUpdated && currentConditions.length > 1) {
            currentConditions = currentConditions.filter(c => c !== 'healthy');
          }

          // If only 'healthy' was selected to be added, ensure it's the only one
          if (selectedConditions.length === 1 && selectedConditions[0] === 'healthy') {
             currentConditions = ['healthy'];
             conditionsUpdated = true; // Mark as updated even if it was already healthy
          }

          // If 'missing' is added, it should be the only condition
          if (selectedConditions.includes('missing')) {
              currentConditions = ['missing'];
              conditionsUpdated = true;
          }


          if (conditionsUpdated) {
            // Keep tooth selected after applying conditions
            newData[id] = { ...tooth, conditions: currentConditions, isSelected: true };
            newlyProcessedIds.add(id); // Mark this tooth as processed in this run
            changed = true;

            // Check if this is the active tooltip tooth and if its conditions changed
            if (activeTooltipData && id === activeTooltipData.id) {
               // Compare *new* currentConditions with the conditions stored in activeTooltipData
               if (JSON.stringify(currentConditions) !== JSON.stringify(activeTooltipData.conditions)) {
                   conditionsChangedForActiveTooltip = true;
                   finalConditionsForActiveTooltip = currentConditions; // Store the new conditions
               }
            }
          } else if (tooth.isSelected) {
            // If conditions didn't change but tooth was selected, mark it as processed too
            newlyProcessedIds.add(id);
          }
        }
      });

      if (changed) {
        // Notify parent
        const selectedIds = Object.values(newData)
            .filter(t => t.isSelected)
            .map(t => t.id);
        onToothSelect?.(selectedIds);
      }

      return newData; // Return the updated state
    });

    // Update tooltip state *after* the main state update, if necessary
    if (conditionsChangedForActiveTooltip && finalConditionsForActiveTooltip) {
        const newConditions = finalConditionsForActiveTooltip; // Use the stored final conditions
        setActiveTooltipData(prev => prev ? { ...prev, conditions: newConditions } : null);
    }

    // Add the newly processed teeth to the state set
    setProcessedSelectedTeeth(prevSet => new Set([...prevSet, ...newlyProcessedIds]));

    // Clear selected conditions after applying
    setSelectedConditions([]);

  }, [readOnly, selectedConditions, onToothSelect, teethData, activeTooltipData]); // Dependencies remain the same


  // Combined click handler for the SVG container
  const handleSvgClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (readOnly) return;

    const toothId = getToothIdFromElement(event.target);

    if (toothId !== null) {
        // Applying conditions is done via the "Apply to Selected Teeth" button.
        // Clicking a tooth *only* toggles its selection state now.
        toggleToothSelection(toothId);
    }
  }, [readOnly, toggleToothSelection, getToothIdFromElement]); // Dependencies updated

  // --- Hover Handlers ---
  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (readOnly) return;

    const groupElement = getToothGroupFromElement(event.target);
    let currentHoveredId: number | null = null;

    if (groupElement) {
        const toothIdStr = groupElement.dataset.toothId;
        if (toothIdStr) {
            const toothId = parseInt(toothIdStr, 10);
            currentHoveredId = toothId;
            const toothData = teethData[toothId];

            if (toothData && svgContainerRef.current) {
                const containerRect = svgContainerRef.current.getBoundingClientRect();
                const toothRect = groupElement.getBoundingClientRect();
                 // Adjust top position to be closer to the vertical center of the tooth
                const relativeTop = toothRect.top - containerRect.top + toothRect.height / 2 + svgContainerRef.current.scrollTop;
                // Keep relativeLeft calculation centered horizontally
                const relativeLeft = toothRect.left - containerRect.left + toothRect.width / 2 + svgContainerRef.current.scrollLeft;

                // Update trigger position for hover
                setTooltipTriggerPosition({ top: relativeTop, left: relativeLeft });
            } else {
                 // Clear position if data missing
                 if (!activeTooltipData || activeTooltipData.id !== toothId) { // Don't clear if it's the active clicked tooth
                    setTooltipTriggerPosition(null);
                 }
            }
        }
    }

    // Update hoveredToothId state
    setHoveredToothId(currentHoveredId);

    // If no tooth group found on hover, clear trigger position unless a tooth is actively selected
    if (!currentHoveredId && !activeTooltipData) {
        setTooltipTriggerPosition(null);
    }

  }, [readOnly, getToothGroupFromElement, teethData, activeTooltipData]); // Added activeTooltipData dependency

  const handlePointerLeave = useCallback(() => {
    // Clear hover state
    setHoveredToothId(null);
    // Clear trigger position ONLY if no tooth is actively selected for tooltip
    if (!activeTooltipData) {
        setTooltipTriggerPosition(null);
    }
  }, [activeTooltipData]); // Added activeTooltipData dependency
  // --- End Hover Handlers ---


  // --- Effect for Visual Updates (CSS Classes, Data Attributes) ---
  useEffect(() => {
    const mainSvgElement = svgContainerRef.current?.querySelector('svg');
    if (!mainSvgElement) return;

    // We no longer need to check for <defs> as the gradient is removed.

    // Clear previous dynamic elements if necessary (dots, numbers) - though they are removed below
    mainSvgElement.querySelectorAll('.condition-indicator-dot').forEach(el => el.remove());
    mainSvgElement.querySelectorAll('.tooth-number-text').forEach(el => el.remove());


    Object.entries(teethData).forEach(([idStr, toothData]) => {
      const id = parseInt(idStr, 10);
      const groupElement = mainSvgElement.querySelector(`#ID_${id}`) as SVGGElement | null; // Use mainSvgElement
      if (!groupElement) return;

      // Add data-tooth-id attribute for event delegation
      groupElement.dataset.toothId = idStr;

      // --- 1. Apply CSS Classes & Determine Primary Condition for Fill ---
      // Clear previous state classes first
      groupElement.classList.remove('tooth-selected', 'tooth-missing', 'tooth-hovered', 'tooth-selection-processed');

      let primaryConditionForFill: ToothCondition | null = null;
      const conditions = toothData.conditions;

      // Prioritize specific conditions for fill color
      const priorityOrder: ToothCondition[] = [
        'missing', // Handled by class, but good to include
        'extraction', // Often implies missing or planned missing
        'root-canal',
        'crown',
        'filled',
        'decayed',
        'treatment-planned',
        'recommended-to-be-treated',
        'has-treatment-before',
        // 'healthy' is the default, not explicitly prioritized for color unless it's the only one
      ];

      for (const cond of priorityOrder) {
        if (conditions.includes(cond)) {
          primaryConditionForFill = cond;
          break; // Stop at the highest priority condition found
        }
      }
      // If only 'healthy' is present (or no conditions somehow), default to null (white fill)
      if (conditions.length === 1 && conditions[0] === 'healthy') {
          primaryConditionForFill = null;
      }


      // Apply selection class (active or processed)
      if (toothData.isSelected && !readOnly) {
        if (processedSelectedTeeth.has(id)) {
          groupElement.classList.add('tooth-selection-processed'); // Processed selection style
        } else {
          groupElement.classList.add('tooth-selected'); // Active selection style (blinking)
        }
      }
      // Add hover class if this tooth is the hovered one (can coexist with selection classes)
      if (!readOnly && id === hoveredToothId) {
        groupElement.classList.add('tooth-hovered');
      }
      // Apply missing class (should override hover/selected styles via CSS specificity/rules)
      if (primaryConditionForFill === 'missing' || conditions.includes('missing')) {
         groupElement.classList.add('tooth-missing');
         primaryConditionForFill = 'missing'; // Ensure missing state overrides others for fill logic below
      }

      // --- 2. Apply Fill Color based on Highest Priority Condition & Store Original ---
      const pathElement = groupElement.querySelector('path');
      if (pathElement) {
          let fillColor = 'white'; // Default to white for healthy/no specific condition
          let originalFillForVar = 'white'; // Default for CSS variable

          // Determine the fill color based on the highest priority condition
          if (primaryConditionForFill && primaryConditionForFill !== 'missing' && primaryConditionForFill !== 'healthy') {
              fillColor = conditionColors[primaryConditionForFill] || 'white'; // Use determined color or fallback to white
              originalFillForVar = fillColor; // Store the actual color for the variable
          } else if (primaryConditionForFill === 'healthy' || !primaryConditionForFill) {
              // Explicitly handle healthy or default case
              fillColor = 'white'; // Healthy teeth are white
              originalFillForVar = 'white';
          }
          // Note: 'missing' condition doesn't set a fill color here, it's handled by CSS class

          // Apply the base fill color directly. Selection fill is handled by CSS.
          if (primaryConditionForFill !== 'missing') {
             pathElement.setAttribute('fill', fillColor);
          } else {
             // Ensure fill attribute is suitable for missing state (CSS handles transparency)
             pathElement.setAttribute('fill', 'transparent');
          }
          // Clear any inline style fill from previous attempts
          pathElement.style.fill = '';
       }

       // --- REMOVED Condition Indicator Dots Rendering ---


       // --- REMOVED Tooth Numbers Rendering ---

    });

    // Add/Remove class to SVG based on readOnly status
    if (readOnly) {
      mainSvgElement.classList.add('opacity-75', 'cursor-default');
    } else {
      mainSvgElement.classList.remove('opacity-75', 'cursor-default');
      mainSvgElement.classList.add('cursor-pointer');
    }

  }, [teethData, readOnly, processedSelectedTeeth, hoveredToothId]); // Added hoveredToothId dependency


   return (
     <TooltipProvider delayDuration={100}>
       <div className="dental-chart-dialog-content relative"> {/* Added relative positioning */}
         {/* Top Legend Removed */}

       {/* Main Content Area: Controls + Chart - Always Row, No Gap */}
       <div className="flex flex-row"> {/* Removed gap-4 */}

         {/* Condition Selection Controls (Left Side - Stretches to match chart height) */}
         {!readOnly && (
           <div className="w-[200px] flex-shrink-0 pr-2 self-stretch"> {/* Removed overflow/max-h, Added self-stretch */}
             <label className="block text-sm font-medium text-gray-700 mb-2 sticky top-0 bg-background z-10">Select Conditions to Apply:</label> {/* Added sticky positioning */}
             <div className="flex flex-wrap gap-2">
               {availableConditions
                // Exclude 'healthy' from selectable conditions to apply? Maybe keep it for resetting.
                // .filter(cond => cond.value !== 'healthy')
                .map(cond => {
                  const noTeethSelected = !Object.values(teethData).some(t => t.isSelected);
                  return (
               <Button
                 key={cond.value}
                 variant="outline"
                 size="sm"
                 disabled={noTeethSelected} // Disable if no teeth are selected
                 onClick={() => {
                   setSelectedConditions(prev =>
                     prev.includes(cond.value)
                       ? prev.filter(c => c !== cond.value) // Remove if exists
                       : [...prev, cond.value] // Add if not exists
                   );
                 }}
                 className={cn(
                   "text-xs h-8 px-2.5 border rounded-md flex items-center gap-1.5 transition-colors",
                   selectedConditions.includes(cond.value)
                     ? 'bg-blue-100 border-blue-300 ring-1 ring-blue-400 text-blue-800 hover:bg-blue-200' // Style for selected condition button
                     : 'text-gray-700 bg-white hover:bg-gray-50',
                   noTeethSelected ? 'opacity-50 cursor-not-allowed' : '' // Style for disabled state
                 )}
               >
                 <span
                   className="w-2.5 h-2.5 inline-block rounded-sm border border-gray-400"
                   style={{ backgroundColor: conditionColors[cond.value] }}
                 ></span>
                 {cond.label}
               </Button>
                  );
                })}
           </div>
           {/* Button to apply selected conditions to selected teeth */}
           {/* Button to apply selected conditions to selected teeth - Reduced top margin */}
           <Button
              onClick={applySelectedConditions}
              disabled={selectedConditions.length === 0 || !Object.values(teethData).some(t => t.isSelected)}
              size="sm"
              className="mt-2" // Reduced mt-3 to mt-2
           >
              Apply to Selected Teeth
           </Button>
         </div>
       )}

         {/* SVG Chart Area (Right Side - Restored original height/scroll) */}
         <div
           className={cn(
             "relative w-full flex-grow pt-2 pb-2 overflow-y-auto max-h-[350px]", // Restored overflow-y-auto, max-h-[350px]
             readOnly ? 'cursor-default' : 'cursor-pointer'
           )}
           ref={svgContainerRef}
           onClick={handleSvgClick}
           onPointerMove={handlePointerMove} // Add pointer move
           onPointerLeave={handlePointerLeave} // Add pointer leave
         >
           <TeethDiagram
             width="100%"
             height="100%"
            viewBox="0 0 698.9 980.66" // Keep original viewBox
            // Event handlers are on the container div
           />
           {/* Condition indicators and numbers are added dynamically in useEffect */}
        </div>

        {/* Combined Hover/Click Tooltip Implementation */}
        <Tooltip open={tooltipTriggerPosition !== null}>
          {/* Dummy Trigger positioned absolutely based on hover/click position state */}
          <TooltipTrigger asChild>
              <span style={{
                  position: 'absolute',
                  top: tooltipTriggerPosition?.top ?? 0,
                  left: tooltipTriggerPosition?.left ?? 0,
                  // Remove the transform style
                  pointerEvents: 'none',
                  width: 1, height: 1
              }} />
          </TooltipTrigger>
          <TooltipContent
            // Position top for upper teeth, bottom for lower teeth
            side={
              (() => {
                const id = activeTooltipData?.id ?? hoveredToothId;
                if (!id) return "top"; // Default
                const quadrantGroup = Math.floor(id / 10);
                const isUpper = [1, 2, 5, 6].includes(quadrantGroup);
                return isUpper ? "top" : "bottom";
              })()
            }
            align="center" // Always align center
            sideOffset={0} // Position directly adjacent to trigger
            collisionPadding={2} // Keep small collision padding
            className={cn(
                "z-50 rounded-lg shadow-lg p-3 max-w-xs",
                "custom-tooltip-bg" // Apply custom background class
            )}
          >
            {/* Determine content based on active click OR hover */}
            {(() => {
                // Prioritize active click data, fallback to hover data
                const dataToShow = activeTooltipData ?? (hoveredToothId !== null ? {
                    id: hoveredToothId,
                    name: getToothName(hoveredToothId),
                    conditions: teethData[hoveredToothId]?.conditions ?? [],
                    // Position data not needed here, just content
                } : null);

                if (!dataToShow) return null; // Should not happen if open=true, but safety check

                return (
                  <div className="flex flex-col items-start gap-1.5 text-left"> {/* Align left */}
                    <div className="font-semibold text-sm">
                      Tooth {dataToShow.id} - {dataToShow.name}
                    </div>
                    {/* Display conditions with colored dots */}
                    <div className="flex flex-col gap-1">
                      {(dataToShow.conditions.length > 1
                        ? dataToShow.conditions.filter((c: ToothCondition) => c !== 'healthy')
                        : dataToShow.conditions
                      ).length === 0 ? (
                        <div className="flex items-center gap-1.5">
                           <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: conditionColors['healthy'] }}></span>
                           <span className="text-xs text-gray-300">Healthy</span>
                        </div>
                      ) : (
                        (dataToShow.conditions.length > 1
                          ? dataToShow.conditions.filter((c: ToothCondition) => c !== 'healthy')
                          : dataToShow.conditions
                        ).map((cond: ToothCondition) => {
                          const conditionInfo = availableConditions.find(c => c.value === cond);
                          return (
                            <div key={cond} className="flex items-center gap-1.5">
                               <span
                                 className="w-2 h-2 rounded-full inline-block border border-gray-500" // Added border for contrast on some colors
                                 style={{ backgroundColor: conditionColors[cond] ?? '#ccc' }} // Use condition color, fallback gray
                               ></span>
                               <span className="text-xs text-gray-300">{conditionInfo?.label || cond}</span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
            })()}
          </TooltipContent>
        </Tooltip>
        {/* --- End Combined Tooltip --- */}

         </div> {/* End Flex container for Controls + Chart */}
       </div>
     </TooltipProvider>
   );

  // REMOVED useEffect for adding/removing event listeners

}); // End of component function

// Set display name for React DevTools
DentalChart.displayName = "DentalChart";

export default DentalChart; // Export the ref-forwarded component
