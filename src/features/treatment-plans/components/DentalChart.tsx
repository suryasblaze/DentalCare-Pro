import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
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
    healthy: '#FFFFFF', // White circle
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
  // Changed state to hold multiple selected conditions
  const [selectedConditions, setSelectedConditions] = useState<ToothCondition[]>([]);
  const [hoveredToothId, setHoveredToothId] = useState<number | null>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null);

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

  // Effect to create gradient definition on mount
  useEffect(() => {
    const svgElement = svgContainerRef.current?.querySelector('svg');
    if (!svgElement) return;

    let defs = svgElement.querySelector('defs');
    if (!defs) {
      defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      svgElement.insertBefore(defs, svgElement.firstChild);
    }

    const gradientId = 'innerHighlightGradient';
    if (!defs.querySelector(`#${gradientId}`)) {
      const radialGradient = document.createElementNS('http://www.w3.org/2000/svg', 'radialGradient');
      radialGradient.setAttribute('id', gradientId);
      radialGradient.setAttribute('cx', '50%');
      radialGradient.setAttribute('cy', '40%'); // Slightly offset towards top
      radialGradient.setAttribute('r', '50%');
      radialGradient.setAttribute('fx', '50%');
      radialGradient.setAttribute('fy', '40%');

      const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
      stop1.setAttribute('offset', '0%');
      stop1.setAttribute('style', 'stop-color:white; stop-opacity:1'); // Center is bright white

      const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
      stop2.setAttribute('offset', '100%');
      stop2.setAttribute('style', 'stop-color:white; stop-opacity:0'); // Edge is transparent white

      radialGradient.appendChild(stop1);
      radialGradient.appendChild(stop2);
      defs.appendChild(radialGradient);
      console.log("DentalChart: Added innerHighlightGradient definition to SVG defs.");
    }
  }, []); // Run only once on mount

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

  }, [readOnly, onToothSelect, teethData]); // Added teethData dependency

  // Applies the currently selected conditions to all selected teeth
  const applySelectedConditions = useCallback(() => {
    if (readOnly || selectedConditions.length === 0) return;

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
            changed = true;
          }
          // If no conditions changed, tooth remains selected
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

  // --- Hover Handlers ---
  // Memoize hover handler - Use div event type
  const handleMouseEnter = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (readOnly) return;
    const toothId = getToothIdFromElement(event.target);
    setHoveredToothId(toothId);
  }, [readOnly, getToothIdFromElement]); // Dependencies updated

  // Memoize hover handler - Use div event type
  const handleMouseLeave = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    setHoveredToothId(null);
  }, []);
  // --- End Hover Handlers ---


  // --- Effect for Visual Updates (CSS Classes, Indicators, Numbers) ---
  useEffect(() => {
    const mainSvgElement = svgContainerRef.current?.querySelector('svg'); // Rename to avoid conflict
    if (!mainSvgElement) return;

    // Get defs once, outside the loop
    const defs = mainSvgElement.querySelector('defs');
    if (!defs) {
        console.error("DentalChart: Could not find or create <defs> element in SVG.");
        return; // Cannot proceed without defs for gradients
    }

    // Clear previous tooth numbers to prevent duplication on re-render
    mainSvgElement.querySelectorAll('.tooth-number-text').forEach(el => el.remove());

    Object.entries(teethData).forEach(([idStr, toothData]) => {
      const id = parseInt(idStr, 10);
      const groupElement = mainSvgElement.querySelector(`#ID_${id}`) as SVGGElement | null; // Use mainSvgElement
      if (!groupElement) return;

      // --- 1. Apply CSS Classes & Determine Primary Condition for Fill ---
      groupElement.classList.remove('tooth-selected', 'tooth-hovered', 'tooth-missing'); // Clear previous state classes

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


      // Apply classes
      if (toothData.isSelected && !readOnly) {
        groupElement.classList.add('tooth-selected');
      }
      if (hoveredToothId === id && !readOnly) {
         groupElement.classList.add('tooth-hovered');
      }
      if (primaryConditionForFill === 'missing' || conditions.includes('missing')) {
         groupElement.classList.add('tooth-missing');
         primaryConditionForFill = 'missing'; // Ensure missing state overrides others for fill logic below
      }

      // --- 2. Apply Fill Color based on Highest Priority Condition ---
      // (Restoring this logic)
      const pathElement = groupElement.querySelector('path');
      if (pathElement) {
          let fillColor = conditionColors.healthy; // Default to white

          // Use the already determined primaryConditionForFill
          if (primaryConditionForFill && primaryConditionForFill !== 'missing' && primaryConditionForFill !== 'healthy') {
              fillColor = conditionColors[primaryConditionForFill] || conditionColors.healthy;
          }

          // Apply the fill color (Missing state is handled by CSS class)
          if (primaryConditionForFill !== 'missing') {
             pathElement.setAttribute('fill', fillColor);
          } else {
             // Ensure fill is reset if it somehow became missing after being colored
             pathElement.setAttribute('fill', conditionColors.healthy); // Or transparent if preferred via CSS
          }
          // Clear any potential inline style from previous gradient attempts
          pathElement.style.fill = '';
      }

      // --- 2b. Render Condition Indicator Dots ---
      const conditionsToDisplayAsDots = conditions.filter(c => c !== 'healthy' && c !== 'missing');
      const dotRadius = 2.5; // Increased dot radius
      const dotSpacing = dotRadius * 2 + 2; // Adjusted spacing
      const totalDotWidth = (conditionsToDisplayAsDots.length - 1) * dotSpacing;
      const bboxForDots = groupElement.getBBox(); // Get BBox specifically for dot positioning
      // Center dots vertically within the bounding box
      const dotCenterY = bboxForDots.y + bboxForDots.height / 2;
      // Center the group of dots horizontally
      const groupStartX = bboxForDots.x + (bboxForDots.width - totalDotWidth) / 2;

      conditionsToDisplayAsDots.forEach((condition, index) => {
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        const currentX = groupStartX + index * dotSpacing;

        circle.setAttribute('cx', String(currentX));
        circle.setAttribute('cy', String(dotCenterY));
        circle.setAttribute('r', String(dotRadius));
        circle.setAttribute('fill', conditionColors[condition] || '#CCCCCC'); // Use condition color
        circle.classList.add('condition-indicator-dot'); // Add class for blinking animation

        // Add simple title tooltip to dot as well
        const dotTitle = document.createElementNS('http://www.w3.org/2000/svg', 'title');
        dotTitle.textContent = availableConditions.find(c => c.value === condition)?.label || condition;
        circle.appendChild(dotTitle);

        groupElement.appendChild(circle);
      });


      // --- 3. Render Tooth Numbers ---
      // Get bounding box *once* if needed for multiple elements
      const bbox = groupElement.getBBox(); // Use the same bbox as before or recalculate if needed
      const isUpperJaw = (id >= 11 && id <= 28) || (id >= 51 && id <= 65);

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      const textX = bbox.x + bbox.width / 2; // Center horizontally
      // Position further out for better visibility
      const textY = isUpperJaw
          ? bbox.y - 8 // Further above upper teeth
          : bbox.y + bbox.height + 18; // Further below lower teeth
      text.setAttribute('x', String(textX));
      text.setAttribute('y', String(textY));
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('font-size', '10'); // Adjust font size as needed
      text.setAttribute('fill', '#6B7280'); // Gray color for number
      text.classList.add('tooth-number-text'); // Add class for potential global styling/clearing
      text.textContent = String(id); // The tooth ID is the number
      groupElement.appendChild(text); // Append to the tooth group

    });

    // Add/Remove class to SVG based on readOnly status
    if (readOnly) {
      mainSvgElement.classList.add('opacity-75', 'cursor-default');
    } else {
      mainSvgElement.classList.remove('opacity-75', 'cursor-default');
      mainSvgElement.classList.add('cursor-pointer');
    }

  }, [teethData, readOnly, hoveredToothId]); // Dependencies updated


  return (
    // Removed outer border/rounded/padding, assuming dialog provides it
    <div className="dental-chart-dialog-content">
       {/* Legend - Horizontal layout matching screenshot */}
       <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mb-4 text-xs">
         {availableConditions.map(cond => (
           <div key={cond.value} className="flex items-center space-x-1">
             <span
                className="w-2.5 h-2.5 inline-block rounded-sm border border-gray-300"
                style={{ backgroundColor: conditionColors[cond.value] }}
             ></span>
             <span className="text-gray-600">{cond.label}</span>
           </div>
         ))}
           <div className="flex items-center space-x-1">
             <span className="w-2.5 h-2.5 inline-block rounded-sm border border-blue-800" style={{ backgroundColor: conditionColors.selected }}></span>
            <span className="text-gray-600">Selected</span>
           </div>
       </div>

       {/* Condition Selection Checkboxes */}
       {!readOnly && (
         <div className="mb-4">
           <label className="block text-sm font-medium text-gray-700 mb-2">Select Conditions to Apply:</label>
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
           <Button
              onClick={applySelectedConditions}
              disabled={selectedConditions.length === 0 || !Object.values(teethData).some(t => t.isSelected)}
              size="sm"
              className="mt-3"
           >
              Apply to Selected Teeth
           </Button>
         </div>
       )}

       {/* SVG Chart Area - Fixed pixel height, added scroll */}
       <div
         className={cn(
            "relative mt-2 mx-auto w-full max-h-[300px] overflow-y-auto pb-6 pt-4", // Fixed max-h in pixels
            readOnly ? 'cursor-default' : 'cursor-pointer' // Class applied in useEffect now
            )}
        ref={svgContainerRef}
        onClick={handleSvgClick}
        onMouseMove={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
       >
         <TeethDiagram
            width="100%"
            height="auto" // Add height auto for proportional scaling
            viewBox="0 0 698.9 980.66" // Keep original viewBox
            // Event handlers are on the container div
         />
         {/* Condition indicators and numbers are added dynamically in useEffect */}
       </div>

       {/* Hover Information Panel */}
       <div className="mt-2 text-center text-sm min-h-[2.5em]"> {/* Added min-height to prevent layout shifts */}
         {hoveredToothId && teethData[hoveredToothId] ? (
           <div>
             <span className="font-semibold">Tooth {hoveredToothId}:</span>{' '}
             <span className="text-muted-foreground">
               {
                 (teethData[hoveredToothId].conditions.length > 1
                   ? teethData[hoveredToothId].conditions.filter(c => c !== 'healthy')
                   : teethData[hoveredToothId].conditions
                 ).map(cond => availableConditions.find(c => c.value === cond)?.label || cond).join(', ') || 'Healthy'
               }
             </span>
           </div>
         ) : (
           // Placeholder or empty div to maintain height
           <div>&nbsp;</div>
         )}
       </div>
    </div>
  );

  // REMOVED useEffect for adding/removing event listeners

};

export default DentalChart;
