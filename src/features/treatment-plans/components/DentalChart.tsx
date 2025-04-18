import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

const DentalChart: React.FC<DentalChartProps> = ({ initialState, onToothSelect, readOnly = false }) => {
  const [teethData, setTeethData] = useState<Record<number, ToothData>>(() => generateInitialTeeth(initialState));
  const [selectedConditions, setSelectedConditions] = useState<ToothCondition[]>([]);
  const [hoveredToothId, setHoveredToothId] = useState<number | null>(null); // State for hover class
  const [processedSelectedTeeth, setProcessedSelectedTeeth] = useState<Set<number>>(new Set()); // Track teeth selected after condition applied
  // State for tooltip content and trigger positioning using event delegation
  const [tooltipContentData, setTooltipContentData] = useState<{ id: number; name: string; conditions: ToothCondition[] } | null>(null);
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
  }, []); // <-- Changed dependency array to empty to run only on mount

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
    setTeethData(prevData => ({
      ...prevData,
      [toothId]: { ...prevData[toothId], isSelected: nextSelectedState }
    }));

    // When a tooth is toggled, it's no longer considered "processed"
    setProcessedSelectedTeeth(prevSet => {
        const newSet = new Set(prevSet);
        newSet.delete(toothId); // Remove from processed set regardless of new state
        return newSet;
    });

  }, [readOnly, onToothSelect, teethData]); // Added teethData dependency

  // Applies the currently selected conditions to all selected teeth
  const applySelectedConditions = useCallback(() => {
    if (readOnly || selectedConditions.length === 0) return;

    const newlyProcessedIds = new Set<number>(); // Track IDs processed in this run

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
          } else if (tooth.isSelected) {
            // If conditions didn't change but tooth was selected, mark it as processed too
            newlyProcessedIds.add(id);
          }
        }
      });

      if (changed) {
        // Notify parent about the potentially changed state (selection remains)
        const selectedIds = Object.values(newData)
            .filter(t => t.isSelected)
            .map(t => t.id);
        onToothSelect?.(selectedIds);
        // Removed onChange call
      }

      return newData;
    });

    // Add the newly processed teeth to the state set
    setProcessedSelectedTeeth(prevSet => new Set([...prevSet, ...newlyProcessedIds]));

    // Clear selected conditions after applying
    setSelectedConditions([]);

  }, [readOnly, selectedConditions, onToothSelect, teethData]); // Added teethData dependency


  // Combined click handler for the SVG container
  const handleSvgClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (readOnly) return;

    const toothId = getToothIdFromElement(event.target);

    if (toothId !== null) {
        // If conditions are selected in the UI, clicking a tooth applies them (if tooth is selected)
        // OR toggles selection if no conditions are selected in UI
        // For simplicity now: Clicking a tooth always toggles its selection state.
        // Applying conditions is done via a separate button (to be added).
        toggleToothSelection(toothId);
    }
  }, [readOnly, toggleToothSelection, getToothIdFromElement]); // Dependencies updated (getToothIdFromElement is now defined above)

  // --- Hover Handlers (Tooltip & Hover Class) ---
  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (readOnly) return;

    const groupElement = getToothGroupFromElement(event.target);
    let currentHoveredId: number | null = null; // Track ID found in this event

    if (groupElement) {
        const toothIdStr = groupElement.dataset.toothId; // Get ID from data attribute
        if (toothIdStr) {
            const toothId = parseInt(toothIdStr, 10);
            currentHoveredId = toothId; // Set the ID found
            const toothData = teethData[toothId];
            if (toothData && svgContainerRef.current) { // Ensure container ref is available
                const containerRect = svgContainerRef.current.getBoundingClientRect();
                const toothRect = groupElement.getBoundingClientRect();

                // Calculate position relative to the container
                const relativeTop = toothRect.top - containerRect.top + svgContainerRef.current.scrollTop; // Account for container scroll
                const relativeLeft = toothRect.left - containerRect.left + toothRect.width / 2 + svgContainerRef.current.scrollLeft; // Center horizontally, account for scroll

                // Set tooltip content data
                setTooltipContentData({
                    id: toothId,
                    name: getToothName(toothId),
                    conditions: toothData.conditions,
                });
                // Set tooltip trigger position relative to the container
                setTooltipTriggerPosition({
                    top: relativeTop,
                    left: relativeLeft,
                });
                 // Don't return early, need to update hover state below
            }
        }
    }

    // Update hoveredToothId state
    setHoveredToothId(currentHoveredId);

    // If no tooth group found or data missing, clear tooltip state
    if (!currentHoveredId) {
        setTooltipContentData(null);
        setTooltipTriggerPosition(null);
    }

  }, [readOnly, getToothGroupFromElement, teethData]); // Dependencies updated

  const handlePointerLeave = useCallback(() => {
    // Clear tooltip state AND hover state when pointer leaves the SVG container
    setTooltipContentData(null);
    setTooltipTriggerPosition(null);
    setHoveredToothId(null); // Clear hovered ID state
  }, []);
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

  }, [teethData, readOnly, hoveredToothId, processedSelectedTeeth]); // Add processedSelectedTeeth dependency


   return (
     <TooltipProvider delayDuration={100}>
       <div className="dental-chart-dialog-content relative"> {/* Added relative positioning */}
         {/* Top Legend Removed */}

       {/* Main Content Area: Controls + Chart - Always Row, No Gap */}
       <div className="flex flex-row"> {/* Removed gap-4 */}

         {/* Condition Selection Controls (Left Side - Scrollable) */}
         {!readOnly && (
           <div className="w-[200px] flex-shrink-0 overflow-y-auto max-h-[250px] pr-2"> {/* Reduced max-h, removed mb-1 */}
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

         {/* SVG Chart Area (Right Side) */}
         <div
           className={cn(
             "relative w-full flex-grow pt-2 pb-2 overflow-y-auto max-h-[350px]", // Increased max-h for larger diagram
             readOnly ? 'cursor-default' : 'cursor-pointer'
           )}
           ref={svgContainerRef}
           onClick={handleSvgClick}
           onPointerMove={handlePointerMove} // Use pointer move
           onPointerLeave={handlePointerLeave} // Use pointer leave
         >
           <TeethDiagram
             width="100%"
             height="100%"
            viewBox="0 0 698.9 980.66" // Keep original viewBox
            // Event handlers are on the container div
           />
           {/* Condition indicators and numbers are added dynamically in useEffect */}
         </div>

         {/* Modern Tooltip Implementation - Event Delegation Based */}
         <Tooltip open={tooltipContentData !== null && tooltipTriggerPosition !== null}>
           {/* Dummy Trigger positioned absolutely within the relative container */}
           <TooltipTrigger asChild>
               <span style={{
                   position: 'absolute', // Changed from 'fixed'
                   top: tooltipTriggerPosition?.top ?? 0,
                   left: tooltipTriggerPosition?.left ?? 0,
                   transform: 'translate(-50%, -100%)', // Position above the calculated point
                   pointerEvents: 'none',
                   width: 1, height: 1 // Give it minimal size just in case
               }} />
           </TooltipTrigger>
           <TooltipContent
             side="top" // Display above the trigger point
             align="center"
             sideOffset={2} // Reduced offset for closer proximity
             collisionPadding={10} // Standard collision padding
             className="z-50" // Ensure tooltip is above other elements
           >
             {tooltipContentData ? (
               <div className="flex flex-col items-center gap-1 p-1">
                 <div className="font-semibold text-sm">
                   Tooth {tooltipContentData.id} - {tooltipContentData.name}
                 </div>
                 <div className="flex flex-wrap justify-center gap-1">
                   {(tooltipContentData.conditions.length > 1
                     ? tooltipContentData.conditions.filter(c => c !== 'healthy')
                     : tooltipContentData.conditions
                   ).length === 0 ? (
                     <Badge variant="secondary" className="text-xs">Healthy</Badge>
                   ) : (
                     (tooltipContentData.conditions.length > 1
                       ? tooltipContentData.conditions.filter(c => c !== 'healthy')
                       : tooltipContentData.conditions
                     ).map(cond => {
                       const conditionInfo = availableConditions.find(c => c.value === cond);
                       let variant: "default" | "secondary" | "destructive" | "outline" = "secondary";
                       if (['decayed', 'extraction'].includes(cond)) variant = "destructive";
                       else if (['missing'].includes(cond)) variant = "outline";
                       else if (['crown', 'filled', 'root-canal', 'has-treatment-before'].includes(cond)) variant = "default";

                       return (
                         <Badge key={cond} variant={variant} className="text-xs whitespace-nowrap">
                           {conditionInfo?.label || cond}
                         </Badge>
                       );
                     })
                   )}
                 </div>
               </div>
             ) : (
               // Should not render if hoveredToothId is null, but added fallback
               <span>Loading...</span>
             )}
           </TooltipContent>
         </Tooltip>
         {/* --- End Tooltip --- */}

         </div> {/* End Flex container for Controls + Chart */}
       </div>
     </TooltipProvider>
   );

  // REMOVED useEffect for adding/removing event listeners

};

export default DentalChart;
