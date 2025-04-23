import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle, useMemo } from 'react'; // Added useMemo
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
    const defaultSelected = false; // Default selection state

    // Helper to get initial conditions or default
    const getInitialConditions = (id: number): ToothCondition[] => {
        const conditions = initialState?.[id]?.conditions;
        // Ensure it's an array and not empty, otherwise default
        return Array.isArray(conditions) && conditions.length > 0 ? conditions : defaultConditions;
    };

    // Helper function to determine initial selection state from initialState prop
    const getInitialSelected = (id: number): boolean => {
        // Respect the isSelected flag from the prop if it's explicitly true
        return initialState?.[id]?.isSelected === true;
    };

    // Permanent teeth (11-48) - Initialize respecting initialState.isSelected
    for (let i = 11; i <= 18; i++) teeth[i] = { id: i, conditions: getInitialConditions(i), isPrimary: false, isSelected: getInitialSelected(i) };
    for (let i = 21; i <= 28; i++) teeth[i] = { id: i, conditions: getInitialConditions(i), isPrimary: false, isSelected: getInitialSelected(i) };
    for (let i = 31; i <= 38; i++) teeth[i] = { id: i, conditions: getInitialConditions(i), isPrimary: false, isSelected: getInitialSelected(i) };
    for (let i = 41; i <= 48; i++) teeth[i] = { id: i, conditions: getInitialConditions(i), isPrimary: false, isSelected: getInitialSelected(i) };

    // Primary teeth (51-85) - Initialize respecting initialState.isSelected
    for (let i = 51; i <= 55; i++) teeth[i] = { id: i, conditions: getInitialConditions(i), isPrimary: true, isSelected: getInitialSelected(i) };
    for (let i = 61; i <= 65; i++) teeth[i] = { id: i, conditions: getInitialConditions(i), isPrimary: true, isSelected: getInitialSelected(i) };
    for (let i = 71; i <= 75; i++) teeth[i] = { id: i, conditions: getInitialConditions(i), isPrimary: true, isSelected: getInitialSelected(i) };
    for (let i = 81; i <= 85; i++) teeth[i] = { id: i, conditions: getInitialConditions(i), isPrimary: true, isSelected: getInitialSelected(i) };

    // This ensures all teeth are initialized, respecting the isSelected flag from the prop.
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
  console.log("DentalChart: Render triggered. Initial prop value:", JSON.stringify(initialState)); // <<< Log prop on render

  // Initialize with empty state, rely on useEffect to populate based on prop
  const [teethData, setTeethData] = useState<Record<number, ToothData>>({});
  console.log("DentalChart: Initializing state with {}. Current teethData:", JSON.stringify(teethData)); // <<< Log initial empty state

  // REMOVED selectedConditions state - conditions applied immediately
  // const [selectedConditions, setSelectedConditions] = useState<ToothCondition[]>([]);
  const [activeCondition, setActiveCondition] = useState<ToothCondition | null>(null); // State to track the selected condition button
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

  // Update internal state if initialState prop changes
  useEffect(() => {
     console.log("DentalChart: useEffect for initialState triggered. Prop value:", JSON.stringify(initialState)); // <<< Log effect trigger
     const initialTeeth = generateInitialTeeth(initialState);
     console.log("DentalChart: Regenerated initialTeeth based on prop:", JSON.stringify(initialTeeth)); // <<< Log regenerated state
     setTeethData(initialTeeth);
     console.log("DentalChart: setTeethData called with regenerated state."); // <<< Log state update call
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

  // REMOVED applySelectedConditions function - logic moved to handleConditionButtonClick

  // Handles applying a specific condition immediately when its button is clicked AND sets the active condition state
  const handleConditionButtonClick = useCallback((conditionToApply: ToothCondition) => {
    if (readOnly) return;

    // Set the clicked condition as the active one for styling
    setActiveCondition(conditionToApply);

    const newlyProcessedIds = new Set<number>();
    let conditionsChangedForActiveTooltip = false;
    let finalConditionsForActiveTooltip: ToothCondition[] | undefined;

    setTeethData(prevData => {
      const newData = { ...prevData };
      let changed = false;

      Object.keys(newData).forEach(idStr => {
        const id = parseInt(idStr, 10);
        const tooth = newData[id];

        // Apply condition ONLY to currently selected teeth
        if (tooth.isSelected) {
          let currentConditions = [...tooth.conditions];
          let conditionsUpdated = false;

          // Logic for applying the single clicked condition:
          if (conditionToApply === 'healthy') {
            // If 'healthy' is clicked, set it as the only condition
            if (!(currentConditions.length === 1 && currentConditions[0] === 'healthy')) {
              currentConditions = ['healthy'];
              conditionsUpdated = true;
            }
          } else if (conditionToApply === 'missing') {
             // If 'missing' is clicked, set it as the only condition AND deselect
             if (!(currentConditions.length === 1 && currentConditions[0] === 'missing')) {
               currentConditions = ['missing'];
               conditionsUpdated = true;
               // DESELECT the tooth when marked as missing
               newData[id] = { ...tooth, conditions: currentConditions, isSelected: false };
               newlyProcessedIds.add(id); // Mark as processed even though deselected
                changed = true;
                // Skip the rest of the 'else' block for this tooth
                return; // Use return instead of continue in forEach
              }
            } else {
              // For other conditions: Check if the condition already exists
             const conditionIndex = currentConditions.indexOf(conditionToApply);
             if (conditionIndex > -1) {
               // Condition exists - REMOVE it
               currentConditions.splice(conditionIndex, 1);
               // If removing the last condition, add 'healthy' back
               if (currentConditions.length === 0) {
                 currentConditions.push('healthy');
               }
               conditionsUpdated = true;
             } else {
               // Condition doesn't exist - ADD it
               // Remove 'healthy' first if it exists
               const healthyIndex = currentConditions.indexOf('healthy');
               if (healthyIndex > -1) {
                 currentConditions.splice(healthyIndex, 1);
               }
               currentConditions.push(conditionToApply);
               conditionsUpdated = true;
            }
           }

           // This block now only runs if the condition wasn't 'missing' or if 'missing' was already applied
           if (conditionsUpdated) {
             // Ensure isSelected remains true for non-missing updates
             newData[id] = { ...tooth, conditions: currentConditions, isSelected: true };
             newlyProcessedIds.add(id);
             changed = true;

            // Check if this is the active tooltip tooth and if its conditions changed
            if (activeTooltipData && id === activeTooltipData.id) {
               if (JSON.stringify(currentConditions) !== JSON.stringify(activeTooltipData.conditions)) {
                   conditionsChangedForActiveTooltip = true;
                   finalConditionsForActiveTooltip = currentConditions;
               }
            }
          } else if (tooth.isSelected) {
             // If conditions didn't change but tooth was selected, mark it as processed too
             newlyProcessedIds.add(id);
          }
        }
      });

       // Update tooltip state *before* returning newData if the active tooltip tooth's conditions changed
       if (conditionsChangedForActiveTooltip && activeTooltipData) {
           const newConditions = finalConditionsForActiveTooltip ?? activeTooltipData.conditions;
           // Update tooltip state directly here, as setTeethData might be async
           setActiveTooltipData(prev => prev ? { ...prev, conditions: newConditions } : null);
       }


       // Notify parent about the potentially changed selection state *after* the loop
       const finalSelectedIds = Object.values(newData)
           .filter(t => t.isSelected)
           .map(t => t.id);
       onToothSelect?.(finalSelectedIds);


       return newData; // Return the modified state
    });

    // Update tooltip state *after* the main state update, if necessary
    if (conditionsChangedForActiveTooltip && activeTooltipData) { // Check if activeTooltipData exists
        // Use finalConditionsForActiveTooltip if available, otherwise keep existing conditions from prev state
        const newConditions = finalConditionsForActiveTooltip ?? activeTooltipData.conditions;
        setActiveTooltipData(prev => prev ? { ...prev, conditions: newConditions } : null);
    }

    // Add the newly processed teeth to the state set
    setProcessedSelectedTeeth(prevSet => new Set([...prevSet, ...newlyProcessedIds]));

  }, [readOnly, onToothSelect, teethData, activeTooltipData]); // Dependencies updated


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

      // Ensure default fill is white initially before applying condition/selection styles
      const pathElement = groupElement.querySelector('path:first-of-type'); // Target the main tooth shape path
      if (pathElement) {
        pathElement.setAttribute('fill', 'var(--tooth-default-fill, #fff)'); // Explicitly set default fill
      }


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
      // Re-select pathElement in case it wasn't found above (though unlikely)
      const pathElementForColor = groupElement.querySelector('path:first-of-type');
      if (pathElementForColor) {
          let fillColor = 'var(--tooth-default-fill, #fff)'; // Default to white using CSS variable
          // let originalFillForVar = 'white'; // This variable seems unused, removing for now

          // Determine the fill color based on the highest priority condition
          if (primaryConditionForFill && primaryConditionForFill !== 'missing' && primaryConditionForFill !== 'healthy') {
              fillColor = conditionColors[primaryConditionForFill] || 'var(--tooth-default-fill, #fff)'; // Use condition color or fallback to default CSS variable
              // originalFillForVar = fillColor; // Removed assignment to non-existent variable
          } else if (primaryConditionForFill === 'healthy' || !primaryConditionForFill) {
              // Explicitly handle healthy or default case
              fillColor = 'var(--tooth-default-fill, #fff)'; // Use default CSS variable
              // originalFillForVar = 'white'; // Removed assignment to non-existent variable
          }
          // Note: 'missing' condition doesn't set a fill color here, it's handled by CSS class

          // Apply the base fill color directly based on condition. Selection fill is handled by CSS classes.
          if (primaryConditionForFill && primaryConditionForFill !== 'missing') {
             fillColor = conditionColors[primaryConditionForFill] || 'var(--tooth-default-fill, #fff)'; // Use condition color or fallback to default
             pathElementForColor.setAttribute('fill', fillColor);
          } else if (primaryConditionForFill === 'missing') {
             // Ensure fill attribute is suitable for missing state (CSS handles transparency)
             pathElementForColor.setAttribute('fill', 'transparent');
          } else {
             // Explicitly ensure healthy/default is white
             pathElementForColor.setAttribute('fill', 'var(--tooth-default-fill, #fff)');
          }

          // Clear any inline style fill from previous attempts if needed (though setAttribute should override)
          // pathElementForColor.style.fill = '';
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
                  const isActive = activeCondition === cond.value;
                  return (
               <Button
                 key={cond.value}
                 variant="outline"
                 size="sm"
                 disabled={noTeethSelected} // Disable if no teeth are selected
                 onClick={() => handleConditionButtonClick(cond.value)} // Call new handler
                 className={cn(
                   "text-xs h-8 px-2.5 border rounded-md flex items-center gap-1.5 transition-colors",
                   // Apply active styling if this condition is the active one
                   isActive
                     ? 'bg-blue-600 text-white hover:bg-blue-700 border-blue-600' // Simplified Active style (darker blue bg, white text)
                     : 'text-gray-700 bg-white hover:bg-gray-100', // Default style
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
           {/* REMOVED "Apply to Selected Teeth" button */}
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
                 const id = activeTooltipData?.id ?? hoveredToothId; // Use 'id' directly
                 if (id === null) return "top"; // Check for null
                 // 'id' is guaranteed to be a number here
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
             {/* Tooltip Content Rendering */}
             {(() => {
               // 1. Determine the ID to use
               const idToShow = activeTooltipData?.id ?? hoveredToothId;

               // 2. Early exit if no ID is active
               if (idToShow === null) {
                 return null;
               }
               // idToShow is now guaranteed to be a number

               // 3. Determine the data to show based on the non-null ID
               let dataToShow: { id: number; name: string; conditions: ToothCondition[] } | null = null;
               if (activeTooltipData && activeTooltipData.id === idToShow) {
                 // Use active click data (already has name and id)
                 dataToShow = activeTooltipData;
               } else {
                 // Must be hover data (idToShow is hoveredToothId and a number)
                 const toothData = teethData[idToShow]; // Safe index access
                 if (toothData) {
                   dataToShow = {
                     id: idToShow,
                     name: getToothName(idToShow), // Safe call
                     conditions: toothData.conditions ?? [],
                   };
                 }
               }

               // 4. Early exit if data couldn't be determined
               if (!dataToShow) {
                 return null;
               }

               // 5. Now dataToShow is guaranteed non-null
               const { id: tooltipId, name: tooltipName, conditions: tooltipConditions } = dataToShow;

               // Ensure conditions is always an array
               const conditionsToDisplay = Array.isArray(tooltipConditions) ? tooltipConditions : [];
              const filteredConditions = conditionsToDisplay.length > 1
                ? conditionsToDisplay.filter((c: ToothCondition) => c !== 'healthy')
                : conditionsToDisplay;

               return (
                 <div className="flex flex-col items-start gap-1.5 text-left"> {/* Align left */}
                   <div className="font-semibold text-sm">
                     Tooth {tooltipId} - {tooltipName} {/* Use destructured variables */}
                   </div>
                   {/* Display conditions with colored dots */}
                   <div className="flex flex-col gap-1">
                    {filteredConditions.length === 0 ? (
                      // Display Healthy if no other conditions (or only healthy)
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: conditionColors['healthy'] }}></span>
                        <span className="text-xs text-gray-300">Healthy</span>
                      </div>
                    ) : (
                      // Map through the filtered conditions
                      filteredConditions.map((cond: ToothCondition) => {
                        const conditionInfo = availableConditions.find(c => c.value === cond);
                        return (
                          <div key={cond} className="flex items-center gap-1.5">
                            <span
                              className="w-2 h-2 rounded-full inline-block border border-gray-500" // Added border for contrast
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


  // --- Calculate common conditions for selected teeth ---
  const commonConditionsForAllSelected = useMemo(() => {
    const selectedTeethIds = Object.entries(teethData)
      .filter(([, data]) => data.isSelected)
      .map(([id]) => parseInt(id, 10));

    if (selectedTeethIds.length === 0) {
      return new Set<ToothCondition>(); // No teeth selected, no common conditions
    }

    // Start with the conditions of the first selected tooth
    let commonConditions = new Set(teethData[selectedTeethIds[0]].conditions);

    // Intersect with conditions of other selected teeth
    for (let i = 1; i < selectedTeethIds.length; i++) {
      const currentToothConditions = new Set(teethData[selectedTeethIds[i]].conditions);
      commonConditions = new Set([...commonConditions].filter(condition => currentToothConditions.has(condition)));
    }

    // Don't include 'healthy' as a visually distinct common condition unless it's the only one
    if (commonConditions.size > 1) {
        commonConditions.delete('healthy');
    }


    return commonConditions;
  }, [teethData]); // Recalculate when teethData changes


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
                  const isActive = activeCondition === cond.value;
                  // const isPresentOnAllSelected = !isActive && commonConditionsForAllSelected.has(cond.value); // Removed this check

                  return (
               <Button
                 key={cond.value}
                 variant="outline"
                 size="sm"
                 disabled={noTeethSelected} // Disable if no teeth are selected
                 onClick={() => handleConditionButtonClick(cond.value)} // Call new handler
                 className={cn(
                   "text-xs h-8 px-2.5 border rounded-md flex items-center gap-1.5 transition-colors",
                   // Apply active styling if this condition is the active one
                   isActive
                     ? 'bg-blue-100 border-blue-400 ring-1 ring-blue-500 text-blue-800 hover:bg-blue-200' // Active style (last clicked)
                     // : isPresentOnAllSelected // Removed this style condition
                     // ? 'bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200' // Present on selected style
                     : 'text-gray-700 bg-white hover:bg-gray-100', // Default style
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
           {/* REMOVED "Apply to Selected Teeth" button */}
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
                if (id === null) return "top"; // Check for null explicitly
                // id is guaranteed to be a number here
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
              // 1. Determine the ID to use
              const idToShow = activeTooltipData?.id ?? hoveredToothId;

              // 2. Early exit if no ID is active
              if (idToShow === null) {
                return null;
              }

              // 3. Determine the data to show based on the non-null ID
              let dataToShow: { id: number; name: string; conditions: ToothCondition[] } | null = null;
              if (activeTooltipData && activeTooltipData.id === idToShow) {
                // Use active click data
                dataToShow = activeTooltipData;
              } else {
                // Must be hover data (idToShow is hoveredToothId and not null)
                const toothData = teethData[idToShow]; // Safe index access now
                if (toothData) {
                  dataToShow = {
                    id: idToShow, // idToShow is guaranteed number here
                    name: getToothName(idToShow), // Safe call now
                    conditions: toothData.conditions ?? [],
                  };
                }
              }

              // 4. Early exit if data couldn't be determined (e.g., hover ID had no data)
              if (!dataToShow) {
                return null;
              }

              // 5. Now dataToShow is guaranteed non-null
              const { id: tooltipId, name: tooltipName, conditions: tooltipConditions } = dataToShow;

              // Ensure conditions is always an array
              const conditionsToDisplay = Array.isArray(tooltipConditions) ? tooltipConditions : [];
              const filteredConditions = conditionsToDisplay.length > 1
                ? conditionsToDisplay.filter((c: ToothCondition) => c !== 'healthy')
                : conditionsToDisplay;

              return (
                <div className="flex flex-col items-start gap-1.5 text-left"> {/* Align left */}
                  <div className="font-semibold text-sm">
                    Tooth {tooltipId} - {tooltipName} {/* Use destructured variables */}
                  </div>
                  {/* Display conditions with colored dots */}
                  <div className="flex flex-col gap-1">
                    {filteredConditions.length === 0 ? (
                      // Display Healthy if no other conditions (or only healthy)
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: conditionColors['healthy'] }}></span>
                        <span className="text-xs text-gray-300">Healthy</span>
                      </div>
                    ) : (
                      // Map through the filtered conditions
                      filteredConditions.map((cond: ToothCondition) => {
                        const conditionInfo = availableConditions.find(c => c.value === cond);
                        return (
                          <div key={cond} className="flex items-center gap-1.5">
                            <span
                              className="w-2 h-2 rounded-full inline-block border border-gray-500" // Added border for contrast
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

}); // End of component function

// Set display name for React DevTools
DentalChart.displayName = "DentalChart";

export default DentalChart; // Export the ref-forwarded component
