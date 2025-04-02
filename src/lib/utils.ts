import React from 'react';
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Render status badge with appropriate color
export const renderStatusBadge = (status: string | null | undefined) => {
  if (!status) return null;
  let color = 'bg-gray-100 text-gray-800';
  switch (status) {
    case 'planned': color = 'bg-blue-100 text-blue-800'; break;
    case 'in_progress': color = 'bg-yellow-100 text-yellow-800'; break;
    case 'completed': color = 'bg-green-100 text-green-800'; break;
    case 'cancelled': color = 'bg-red-100 text-red-800'; break;
    case 'pending': color = 'bg-purple-100 text-purple-800'; break;
  }
  return React.createElement("span", { className: "px-2 py-1 rounded-full text-xs font-medium " + color, key: status }, status?.replace('_', ' '));
};

// Render priority badge with appropriate color
export const renderPriorityBadge = (priority: string | null | undefined) => {
  if (!priority) return null;
  let color = 'bg-gray-100 text-gray-800';
  switch (priority) {
    case 'low': color = 'bg-green-100 text-green-800'; break;
    case 'medium': color = 'bg-yellow-100 text-yellow-800'; break;
    case 'high': color = 'bg-red-100 text-red-800'; break;
  }
  return React.createElement("span", { className: "px-2 py-1 rounded-full text-xs font-medium " + color, key: priority }, priority);
};
