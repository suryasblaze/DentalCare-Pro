import React, { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
// Removed Command imports
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox'; // Assuming Checkbox exists

export type MultiSelectOption = {
  value: string | number;
  label: string;
};

interface MultiSelectCheckboxProps {
  options: MultiSelectOption[];
  selectedValues: (string | number)[];
  onChange: (selected: (string | number)[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function MultiSelectCheckbox({
  options,
  selectedValues,
  onChange,
  placeholder = 'Select options...',
  className,
  disabled = false,
}: MultiSelectCheckboxProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = (value: string | number) => {
    const newSelectedValues = selectedValues.includes(value)
      ? selectedValues.filter((v) => v !== value)
      : [...selectedValues, value];
    onChange(newSelectedValues);
  };

  const getSelectedLabels = () => {
    if (selectedValues.length === 0) return placeholder;
    if (selectedValues.length <= 2) {
      return options
        .filter((option) => selectedValues.includes(option.value))
        .map((option) => option.label)
        .join(', ');
    }
    return `${selectedValues.length} selected`;
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-between font-normal', className)}
        >
          <span className="truncate">{getSelectedLabels()}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width] p-0">
        {/* Removed Command wrapper */}
        {/* Optional: Add simple input for search here if needed */}
        <div className="max-h-60 overflow-y-auto p-1"> {/* Added scrollable div */}
          {options.length === 0 ? (
             <div className="p-2 text-center text-sm text-muted-foreground">No options available.</div>
          ) : (
            options.map((option) => {
              const isSelected = selectedValues.includes(option.value);
                return (
                  // Use DropdownMenuItem to prevent closing on click
                  <DropdownMenuItem
                    key={option.value}
                    onSelect={(e) => {
                      e.preventDefault(); // Prevent closing dropdown
                      handleSelect(option.value);
                    }}
                    className="cursor-pointer"
                  >
                    <Checkbox
                      id={`select-${option.value}`}
                      checked={isSelected}
                      onCheckedChange={() => handleSelect(option.value)}
                      className="mr-2"
                      aria-labelledby={`label-${option.value}`}
                    />
                    <span id={`label-${option.value}`}>{option.label}</span>
                  </DropdownMenuItem>
                );
              })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
