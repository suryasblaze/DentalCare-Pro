import React, { useState, useRef, useEffect } from 'react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'; // Import PopoverTrigger
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
// Removed InvoiceUpload import

interface QuantityUpdatePopoverProps {
  children: React.ReactNode;
  currentItemQuantity: number;
  onUpdate: (newQuantity: number) => Promise<void>;
  itemId: string;
}

const QuantityUpdatePopover: React.FC<QuantityUpdatePopoverProps> = ({
  children,
  currentItemQuantity,
  onUpdate,
  itemId,
}) => {
  const [newQuantity, setNewQuantity] = useState<string>(''); // Initialize empty, set on open
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const popoverContentRef = useRef<HTMLDivElement>(null); // Ref for popover content
  const triggerRef = useRef<HTMLButtonElement>(null); // Ref for trigger
  let openTimeout: NodeJS.Timeout | null = null;
  let closeTimeout: NodeJS.Timeout | null = null;

  // Effect to set initial quantity when popover opens
  useEffect(() => {
    if (isOpen) {
      setNewQuantity(currentItemQuantity.toString());
    }
  }, [isOpen, currentItemQuantity]);


  const handleQuantityChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    if (/^\d*$/.test(value)) {
      setNewQuantity(value);
    }
  };

  const handleUpdateClick = async () => {
    const quantity = parseInt(newQuantity, 10);
    if (!isNaN(quantity) && quantity >= 0) {
      setIsLoading(true);
      try {
        await onUpdate(quantity);
        setIsOpen(false); // Close popover on successful update
      } catch (error) {
        console.error('Failed to update quantity:', error);
        // Optionally show a toast notification for the error
      } finally {
        setIsLoading(false);
      }
    } else {
      console.warn('Invalid quantity input');
      // Optionally show a toast notification for invalid input
    }
  };

  // --- Hover Logic ---
  const clearTimeouts = () => {
    if (openTimeout) clearTimeout(openTimeout);
    if (closeTimeout) clearTimeout(closeTimeout);
  };

  const handleTriggerMouseEnter = () => {
    clearTimeouts();
    openTimeout = setTimeout(() => setIsOpen(true), 150); // Delay opening slightly
  };

  const handleTriggerMouseLeave = () => {
    clearTimeouts();
    // Delay closing to allow moving mouse to popover content
    closeTimeout = setTimeout(() => {
       // Check if the mouse is over the popover content before closing
       if (!popoverContentRef.current?.matches(':hover')) {
           setIsOpen(false);
       }
    }, 200);
  };

 const handleContentMouseEnter = () => {
    clearTimeouts(); // Cancel any pending close timeouts
 };

 const handleContentMouseLeave = () => {
    clearTimeouts();
    closeTimeout = setTimeout(() => setIsOpen(false), 200); // Close after leaving content
 };
  // --- End Hover Logic ---


  return (
    // Use PopoverTrigger for accessibility and better control
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger
        asChild // Use the child element as the trigger
        ref={triggerRef}
        onMouseEnter={handleTriggerMouseEnter}
        onMouseLeave={handleTriggerMouseLeave}
      >
         {/* Wrap children in a span or div if it's a plain string or non-button element */}
         {typeof children === 'string' ? <span>{children}</span> : children}
      </PopoverTrigger>

      <PopoverContent
        ref={popoverContentRef}
        className="w-auto p-4"
        sideOffset={5}
        onMouseEnter={handleContentMouseEnter} // Keep open when mouse enters content
        onMouseLeave={handleContentMouseLeave} // Close when mouse leaves content
        // Prevent focus moving away from popover when interacting
        onFocusOutside={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => {
            // Prevent closing if click is on the trigger itself
            if (triggerRef.current?.contains(e.target as Node)) {
                e.preventDefault();
            }
        }}
      >
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">Update Quantity</h4>
            <p className="text-sm text-muted-foreground">
              Enter the new stock quantity for this item.
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`quantity-${itemId}`}>Quantity</Label>
            <Input
              id={`quantity-${itemId}`}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={newQuantity}
              onChange={handleQuantityChange}
              className="col-span-2 h-8"
              disabled={isLoading}
            />
            <Button
              onClick={handleUpdateClick}
              disabled={isLoading || newQuantity === currentItemQuantity.toString() || newQuantity === ''} // Also disable if empty
            >
              {isLoading ? 'Updating...' : 'Update'}
            </Button>
          </div>
          {/* Removed InvoiceUpload component */}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default QuantityUpdatePopover;
