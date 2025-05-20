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
  condition: ToothCondition; // Changed from conditions array to single condition
  isPrimary: boolean;
  isSelected: boolean;
}

// Type for initial data passed via props - Exporting for external use
export type InitialToothState = Partial<Record<number, {
  condition?: ToothCondition;
  conditions?: ToothCondition[]; // Keep for database compatibility
  isSelected?: boolean;
}>>;

interface DentalChartProps {
  initialState?: InitialToothState;
  onToothSelect?: (selectedTeeth: number[]) => void; // Pass array of selected IDs
  readOnly?: boolean; // Optional prop to disable selection
  domain?: string; // New optional prop
  domainConditions?: string[]; // New optional prop for domain-specific conditions (as strings)
}

// Define handle type for useImperativeHandle
export interface DentalChartHandle {
  getTeethData: () => Record<number, ToothData>;
  getLastActiveCondition: () => ToothCondition | null; // New method to get the last active condition
}

// Define colors based on the second screenshot's legend/buttons
const conditionColors: Record<string, string> = { // Changed ToothCondition to string for broader compatibility
    healthy: '#10B981', // Green color for healthy
    decayed: '#DC2626', // Red
    filled: '#6B7280', // Gray
    missing: '#6B7280', // Changed from transparent to Gray for button UI consistency
    'treatment-planned': '#F97316', // Orange
    'root-canal': '#8B5CF6', // Violet
    extraction: '#EF4444', // Red (Maybe add X marker later)
    crown: '#F59E0B', // Amber
    'has-treatment-before': '#3B82F6', // Blue
    'recommended-to-be-treated': '#FBBF24', // Yellow
    selected: '#BFDBFE', // Fallback color, not used for fill now
    default: '#D1D5DB', // Default color for unknown conditions
};

// Updated initial state generator for single condition
const initializeTeethData = (initialState?: InitialToothState) => {
    const teeth: Record<number, ToothData> = {};
    const defaultCondition: ToothCondition = 'healthy'; // Default to healthy
    const defaultSelected = false; // Default selection state

    // Helper to get initial condition or default
    const getInitialCondition = (id: number): ToothCondition => {
      // First check for conditions array, then fallback to single condition, then default
      if (initialState?.[id]?.conditions?.length > 0) {
        return initialState[id].conditions[0];
      }
      return initialState?.[id]?.condition || defaultCondition;
    };

    // Helper function to determine initial selection state from initialState prop
    const getInitialSelected = (id: number): boolean => {
      // Respect the isSelected flag from the prop if it's explicitly true
      return initialState?.[id]?.isSelected === true;
    };

    // Permanent teeth (11-48) - Initialize respecting initialState.isSelected
    for (let i = 11; i <= 18; i++) teeth[i] = { id: i, condition: getInitialCondition(i), isPrimary: false, isSelected: getInitialSelected(i) };
    for (let i = 21; i <= 28; i++) teeth[i] = { id: i, condition: getInitialCondition(i), isPrimary: false, isSelected: getInitialSelected(i) };
    for (let i = 31; i <= 38; i++) teeth[i] = { id: i, condition: getInitialCondition(i), isPrimary: false, isSelected: getInitialSelected(i) };
    for (let i = 41; i <= 48; i++) teeth[i] = { id: i, condition: getInitialCondition(i), isPrimary: false, isSelected: getInitialSelected(i) };

    // Primary teeth (51-85) - Initialize respecting initialState.isSelected
    for (let i = 51; i <= 55; i++) teeth[i] = { id: i, condition: getInitialCondition(i), isPrimary: true, isSelected: getInitialSelected(i) };
    for (let i = 61; i <= 65; i++) teeth[i] = { id: i, condition: getInitialCondition(i), isPrimary: true, isSelected: getInitialSelected(i) };
    for (let i = 71; i <= 75; i++) teeth[i] = { id: i, condition: getInitialCondition(i), isPrimary: true, isSelected: getInitialSelected(i) };
    for (let i = 81; i <= 85; i++) teeth[i] = { id: i, condition: getInitialCondition(i), isPrimary: true, isSelected: getInitialSelected(i) };

    return teeth;
};

// Define available conditions matching the second screenshot's buttons
const generalAvailableConditions: { label: string; value: ToothCondition }[] = [
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

// Define the component using forwardRef with explicit return type
const DentalChart = forwardRef<DentalChartHandle, DentalChartProps>((
  { 
    initialState, 
    onToothSelect, 
    readOnly = false, 
    domain,
    domainConditions
  }, 
  ref
): JSX.Element => {
  console.log("DentalChart: Render triggered. Initial prop value:", JSON.stringify(initialState)); 
  console.log("DentalChart: Domain received:", domain);
  console.log("DentalChart: DomainConditions received:", domainConditions);

  // Initialize with empty state, rely on useEffect to populate based on prop
  const [teethData, setTeethData] = useState<Record<number, ToothData>>({});
  const [activeCondition, setActiveCondition] = useState<ToothCondition | null>(null);
  const [hoveredToothId, setHoveredToothId] = useState<number | null>(null);
  const [processedSelectedTeeth, setProcessedSelectedTeeth] = useState<Set<number>>(new Set());
  const [activeTooltipData, setActiveTooltipData] = useState<{
    id: number;
    name: string;
    condition: ToothCondition;
    top: number;
    left: number;
  } | null>(null);
  const [tooltipTriggerPosition, setTooltipTriggerPosition] = useState<{ top: number; left: number; } | null>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null);

  // Update internal state if initialState prop changes
  useEffect(() => {
     console.log("DentalChart: useEffect for initialState triggered. Prop value:", JSON.stringify(initialState)); // <<< Log effect trigger
     const initialTeeth = initializeTeethData(initialState);
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

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    getTeethData: () => {
      // Convert internal state to expected format with conditions array
      const teethWithConditions: Record<number, { 
        id: number;
        conditions: ToothCondition[];
        isPrimary: boolean;
        isSelected: boolean;
      }> = {};

      Object.entries(teethData).forEach(([id, tooth]) => {
        teethWithConditions[parseInt(id, 10)] = {
          ...tooth,
          conditions: tooth.isSelected ? [tooth.condition] : ['healthy']
        };
      });

      return teethWithConditions;
    },
    getLastActiveCondition: () => {
      return activeCondition; // Expose the activeCondition state
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

  // --- START Refactored Condition Application Logic ---

  // Centralized function to apply a single condition on a single tooth
  const applySingleConditionToTooth = useCallback((toothId: number, conditionToApply: ToothCondition) => {
    setTeethData(prevData => {
      const tooth = prevData[toothId];
      if (!tooth) return prevData;

      // Simply replace the existing condition with the new one
      const newCondition = conditionToApply;
      let newIsSelected = tooth.isSelected;

      // If setting to missing, also unselect the tooth
      if (conditionToApply === 'missing') {
        newIsSelected = false;
      }

      const conditionChanged = tooth.condition !== newCondition;
      
      if (conditionChanged) {
        const newData = {
          ...prevData,
          [toothId]: { ...tooth, condition: newCondition, isSelected: newIsSelected }
        };

        // Update tooltip if active
        if (activeTooltipData && activeTooltipData.id === toothId) {
          setActiveTooltipData(prev => prev ? { ...prev, condition: newCondition } : null);
        }

        // Notify parent if selection state changed
        if (conditionToApply === 'missing' && tooth.isSelected && !newIsSelected) {
          const finalSelectedIds = Object.values(newData)
            .filter(t => t.isSelected)
            .map(t => t.id);
          onToothSelect?.(finalSelectedIds);
        }
        
        // Mark tooth as processed
        setProcessedSelectedTeeth(prevSet => {
            const newSet = new Set(prevSet);
            newSet.add(toothId);
            return newSet;
        });

        return newData;
      }
      return prevData;
    });
  }, [activeTooltipData, onToothSelect]);


  // Handles toggling the selection state of a tooth
  const toggleToothSelection = useCallback((toothId: number) => {
    if (readOnly) return;

    let finalSelectedIds: number[] = [];
    let isNowSelected = false;

    setTeethData(prevData => {
      const currentTooth = prevData[toothId];
      if (!currentTooth) return prevData;
      
      const nextSelectedState = !currentTooth.isSelected;
      isNowSelected = nextSelectedState;

      const updatedToothData = {
        ...prevData,
        [toothId]: { 
          ...currentTooth, 
          isSelected: nextSelectedState,
          // Reset condition to healthy when deselecting
          condition: nextSelectedState ? currentTooth.condition : 'healthy'
        }
      };

      finalSelectedIds = Object.values(updatedToothData)
        .filter(t => t.isSelected)
        .map(t => t.id);
      
      return updatedToothData;
    });

    // If deselecting, remove from processed set
    if (!isNowSelected) {
      setProcessedSelectedTeeth(prev => {
        const newSet = new Set(prev);
        newSet.delete(toothId);
        return newSet;
      });
    }

    onToothSelect?.(finalSelectedIds);

    // Update tooltip
    if (isNowSelected) {
      const currentToothAfterUpdate = teethData[toothId];
      if (!currentToothAfterUpdate) return;
      
      const groupElement = svgContainerRef.current?.querySelector(`#ID_${toothId}`) as SVGGElement | null;
      if (groupElement && svgContainerRef.current) {
        const containerRect = svgContainerRef.current.getBoundingClientRect();
        const toothRect = groupElement.getBoundingClientRect();
        const relativeTop = toothRect.top - containerRect.top + toothRect.height / 2 + svgContainerRef.current.scrollTop;
        const relativeLeft = toothRect.left - containerRect.left + toothRect.width / 2 + svgContainerRef.current.scrollLeft;
        
        setActiveTooltipData({
          id: toothId,
          name: getToothName(toothId),
          condition: currentToothAfterUpdate.condition,
          top: relativeTop,
          left: relativeLeft,
        });
        setTooltipTriggerPosition({ top: relativeTop, left: relativeLeft });
      }
    } else {
      setActiveTooltipData(null);
      if (hoveredToothId !== toothId) {
        setTooltipTriggerPosition(null);
      }
    }

    return isNowSelected;
  }, [readOnly, onToothSelect, teethData, hoveredToothId]);

  // --- END Refactored Condition Application Logic ---


  // Handles applying a specific condition when its button is clicked
  const handleConditionButtonClick = useCallback((conditionToApplyString: string) => {
    if (readOnly) return;
    const conditionValue = conditionToApplyString as ToothCondition;

    // Toggle the active condition
    setActiveCondition(prev => {
      const newActiveCondition = prev === conditionValue ? null : conditionValue;
      
      // Only apply condition to teeth that haven't been processed yet
      if (newActiveCondition) {
        setTeethData(prevData => {
          let hasChanges = false;
          const newData = { ...prevData };
          
          // First, find all selected teeth that haven't been processed
          const unprocessedSelectedTeeth = Object.entries(prevData)
            .filter(([idStr, toothData]) => {
              const toothId = parseInt(idStr, 10);
              return toothData.isSelected && !processedSelectedTeeth.has(toothId);
            });

          // If there are unprocessed selected teeth, apply the condition only to them
          if (unprocessedSelectedTeeth.length > 0) {
            unprocessedSelectedTeeth.forEach(([idStr, toothData]) => {
        const toothId = parseInt(idStr, 10);
              newData[toothId] = {
                ...toothData,
                condition: newActiveCondition
              };
              // Mark tooth as processed
              setProcessedSelectedTeeth(prev => new Set(prev).add(toothId));
              hasChanges = true;
            });
          }

          return hasChanges ? newData : prevData;
        });
      }
      
      return newActiveCondition;
    });
  }, [readOnly, processedSelectedTeeth]);


  // Combined click handler for the SVG container
  const handleSvgClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (readOnly) return;

    const toothId = getToothIdFromElement(event.target);

    if (toothId !== null) {
      // Just toggle selection, don't auto-apply condition
      toggleToothSelection(toothId);
      
      // Only clear active condition if the tooth hasn't been processed yet
      if (!processedSelectedTeeth.has(toothId)) {
        setActiveCondition(null);
      }
    }
  }, [readOnly, toggleToothSelection, processedSelectedTeeth]);


  // --- Hover Handlers ---
  const handleToothHover = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (readOnly) return;

    const toothId = getToothIdFromElement(event.target);
    if (toothId !== null) {
      setHoveredToothId(toothId);

    const groupElement = getToothGroupFromElement(event.target);
      if (groupElement && svgContainerRef.current) {
                const containerRect = svgContainerRef.current.getBoundingClientRect();
                const toothRect = groupElement.getBoundingClientRect();
        
        // Calculate center of the tooth element
        const relativeTop = toothRect.top - containerRect.top + (toothRect.height / 2) + svgContainerRef.current.scrollTop;
        const relativeLeft = toothRect.left - containerRect.left + (toothRect.width / 2) + svgContainerRef.current.scrollLeft;
        
        // Update tooltip position
                setTooltipTriggerPosition({ top: relativeTop, left: relativeLeft });
      }
    }
  }, [readOnly, getToothGroupFromElement]);

  const handleToothLeave = useCallback(() => {
    setHoveredToothId(null);
    // Only hide tooltip trigger if there's no active tooltip
    if (!activeTooltipData) {
        setTooltipTriggerPosition(null);
    }
  }, [activeTooltipData]);
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

      // Apply fill color based on the single condition
      if (pathElement) {
        let fillColor = 'var(--tooth-default-fill, #fff)';
        
        if (toothData.condition !== 'healthy') {
          fillColor = conditionColors[toothData.condition] || 'var(--tooth-default-fill, #fff)';
        }

        if (toothData.condition === 'missing') {
          pathElement.setAttribute('fill', 'transparent');
        } else {
          pathElement.setAttribute('fill', fillColor);
        }
      }

      // Apply selection and hover classes
      if (toothData.isSelected && !readOnly) {
        if (processedSelectedTeeth.has(id)) {
          groupElement.classList.add('tooth-selection-processed');
        } else {
          groupElement.classList.add('tooth-selected');
        }
      }

      if (!readOnly && id === hoveredToothId) {
        groupElement.classList.add('tooth-hovered');
      }

      if (toothData.condition === 'missing') {
         groupElement.classList.add('tooth-missing');
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

  // Update the TooltipCard component with proper styling
  const TooltipCard = ({ tooth, name, condition }: { tooth: number, name: string, condition: ToothCondition }) => {
    const conditionInfo = (domainConditions && domainConditions.length > 0 
      ? domainConditions.map(dc => ({ label: dc.charAt(0).toUpperCase() + dc.slice(1), value: dc }))
      : generalAvailableConditions
    ).find(c => c.value === condition);

    return (
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 min-w-[240px] relative">
        <div className="absolute -top-2 left-1/2 w-4 h-4 bg-white transform rotate-45 -translate-x-1/2 border-t border-l border-gray-200" />
        <div className="relative">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="font-medium text-gray-900 text-base">Tooth {tooth}</h3>
              <p className="text-sm text-gray-500">{name}</p>
            </div>
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-50">
              <span className="text-blue-600 text-sm font-medium">{tooth}</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full border border-gray-200"
                style={{ backgroundColor: conditionColors[condition] ?? conditionColors.default }}
              />
              <span className="text-sm text-gray-600 font-medium">
                {conditionInfo?.label || condition}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Main return statement for the DentalChart component
  return (
    <TooltipProvider delayDuration={100}>
      <div className="dental-chart-dialog-content relative">
        {/* Main Content Area: Controls + Chart */}
        <div className="flex flex-row">
          {/* Condition Selection Controls (Left Side) */}
          {!readOnly && (
            <div className="w-[200px] flex-shrink-0 pr-2 self-stretch">
              <label className="block text-sm font-medium text-gray-700 mb-2 sticky top-0 bg-background z-10">Select Conditions to Apply:</label>
              <div className="flex flex-wrap gap-2">
                {(domainConditions && domainConditions.length > 0 
                    ? domainConditions.map(condStr => ({ label: condStr.charAt(0).toUpperCase() + condStr.slice(1), value: condStr as ToothCondition }))
                    : generalAvailableConditions
                ).map(cond => {
                  const noTeethSelected = !Object.values(teethData).some(t => t.isSelected);
                  const isActive = activeCondition === cond.value;
                  // specificConditionColor can be used for the dot if we keep it, or border of the circle
                  const specificConditionColor = conditionColors[cond.value] || conditionColors.default;

                  return (
                    <Button
                      key={cond.value}
                      variant="ghost" // Use ghost variant for a cleaner base
                      size="sm" // Keep size sm, but padding will be controlled by className
                      disabled={noTeethSelected && !activeCondition}
                      onClick={() => handleConditionButtonClick(cond.value)}
                      className={cn(
                        "w-full text-sm h-auto px-3 py-2.5 rounded-md flex items-center justify-start gap-3 transition-all duration-150 ease-in-out font-medium",
                        "focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500",
                        isActive
                          ? "bg-blue-500 text-white shadow-md"
                          : "bg-slate-100 hover:bg-slate-200 text-slate-700",
                        (noTeethSelected && !activeCondition) ? "opacity-50 cursor-not-allowed hover:bg-slate-100" : ""
                      )}
                    >
                      <span className="flex items-center justify-center w-5 h-5 border rounded-full shrink-0" 
                            style={isActive ? { backgroundColor: 'white', borderColor: 'white' } : { borderColor: specificConditionColor }}>
                        {isActive && <span className="w-2.5 h-2.5 bg-blue-500 rounded-full"></span>}
                      </span>
                      <span>{cond.label}</span>
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          {/* SVG Chart Area (Right Side) */}
          <div
            className={cn(
              "relative w-full flex-grow pt-2 pb-2 overflow-y-auto max-h-[350px]",
              readOnly ? 'cursor-default' : 'cursor-pointer'
            )}
            ref={svgContainerRef}
            onClick={handleSvgClick}
            onMouseMove={handleToothHover}
            onMouseLeave={handleToothLeave}
          >
            <TeethDiagram
              width="100%"
              height="100%"
              viewBox="0 0 698.9 980.66"
            />
          </div>

          {/* Combined Hover/Click Tooltip Implementation */}
          <Tooltip open={tooltipTriggerPosition !== null}>
            <TooltipTrigger asChild>
              <span 
                style={{
                position: 'absolute',
                top: tooltipTriggerPosition?.top ?? 0,
                left: tooltipTriggerPosition?.left ?? 0,
                  width: '1px',
                  height: '1px',
                  padding: 0,
                  margin: 0,
                pointerEvents: 'none',
                  transform: 'translate(-50%, -50%)',
                  zIndex: 40
                }} 
              />
            </TooltipTrigger>
            <TooltipContent
              side={(() => {
                const id = hoveredToothId ?? activeTooltipData?.id;
                  if (id === null) return "top";
                  const quadrantGroup = Math.floor(id / 10);
                  const isUpper = [1, 2, 5, 6].includes(quadrantGroup);
                  return isUpper ? "top" : "bottom";
              })()}
              align="center"
              sideOffset={15}
              className="z-50 p-0 border-none shadow-none bg-transparent"
              avoidCollisions={true}
            >
              {(() => {
                // Prioritize showing hovered tooth data over active tooltip data
                const idToShow = hoveredToothId ?? activeTooltipData?.id;
                if (idToShow === null) return null;
                
                  const toothData = teethData[idToShow];
                if (!toothData) return null;

                return (
                  <TooltipCard
                    tooth={idToShow}
                    name={getToothName(idToShow)}
                    condition={toothData.condition}
                  />
                );
              })()}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}); // End of forwardRef

// Set display name for React DevTools
DentalChart.displayName = "DentalChart";

export default DentalChart; // Export the ref-forwarded component

// Add these styles to your CSS or Tailwind config
const styles = {
  '.tooltip-arrow': {
    position: 'absolute',
    width: '8px',
    height: '8px',
    background: 'inherit',
    visibility: 'hidden',
  },
  '.tooltip-arrow:before': {
    content: '""',
    position: 'absolute',
    width: '8px',
    height: '8px',
    background: 'inherit',
    visibility: 'visible',
    transform: 'rotate(45deg)',
  },
};
