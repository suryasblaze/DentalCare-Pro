import React from 'react';
import { Badge } from '@/components/ui/badge'; // Assuming this path is correct
import { StockStatus } from '../types';
import clsx from 'clsx';

interface InventoryStatusBadgeProps {
  status: StockStatus;
  className?: string; // Make className optional
}

const InventoryStatusBadge: React.FC<InventoryStatusBadgeProps> = ({ status, className }) => {
  let badgeClassName = "capitalize";
  let backgroundColor = "";
  let animationClass = "";

  switch (status) {
    case 'In Stock':
      backgroundColor = "bg-green-100 text-green-700";
      break;
    case 'Low Stock':
      backgroundColor = "bg-red-100 text-red-700";
      animationClass = "animate-pulse";
      break;
    case 'Expired':
      backgroundColor = "bg-gray-100 text-gray-700";
      break;
    default:
      backgroundColor = "bg-gray-100 text-gray-700";
  }

  return (
    <Badge className={clsx(badgeClassName, className, backgroundColor, animationClass)}>
      {status.toLowerCase().replace(' ', '-')} {/* Display status text */}
    </Badge>
  );
};

export default InventoryStatusBadge;
