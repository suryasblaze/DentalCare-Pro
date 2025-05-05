import React from 'react';
// Removed unused Badge import if it was there
import { StockStatus } from '../types';
import clsx from 'clsx';

interface InventoryStatusBadgeProps {
  status: StockStatus;
  className?: string;
  // onClick is likely not needed if used within PopoverTrigger, but keep if used elsewhere
  onClick?: () => void;
}

// Use React.forwardRef to allow the component to receive a ref
const InventoryStatusBadge = React.forwardRef<
  HTMLSpanElement, // The type of the DOM element the ref points to
  InventoryStatusBadgeProps // The type of the props
>(({ status, className, onClick }, ref) => { // Add ref parameter
  let backgroundColor = "";
  let animationClass = "";

  switch (status) {
    case 'In Stock':
      backgroundColor = "bg-green-100 text-green-800"; // Adjusted colors slightly for potentially better contrast
      break;
    case 'Low Stock':
      backgroundColor = "bg-yellow-100 text-yellow-800"; // Changed Low Stock to yellow for common convention, kept pulse
      animationClass = "animate-pulse";
      break;
    case 'Expired': // Changed Expired to red
      backgroundColor = "bg-red-100 text-red-800";
      break;
    default:
      backgroundColor = "bg-gray-100 text-gray-800";
  }

  return (
    // Attach the ref to the span element
    <span
      ref={ref}
      className={clsx(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize', // Added capitalize here
        backgroundColor,
        animationClass, // Apply animation class conditionally
        className // Allow overriding/extending classes
        // Removed cursor-pointer here, PopoverTrigger handles it
      )}
      onClick={onClick} // Keep onClick if needed for standalone use
    >
      {status}
    </span>
  );
});

// Add display name for better debugging
InventoryStatusBadge.displayName = 'InventoryStatusBadge';

export default InventoryStatusBadge;
