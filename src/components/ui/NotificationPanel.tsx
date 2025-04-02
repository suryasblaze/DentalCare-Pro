import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X } from 'lucide-react';

// Placeholder type for notification data
interface Notification {
  id: string;
  title: string;
  description: string;
  timestamp: string; // Or Date object
}

interface NotificationPanelProps {
  notifications: Notification[]; // Array of notification objects
  onClose: () => void; // Function to close the panel
}

export function NotificationPanel({ notifications, onClose }: NotificationPanelProps) {
  return (
    <Card className="fixed top-16 right-4 z-50 w-96 shadow-lg border bg-card text-card-foreground"> {/* Adjust positioning and styling as needed */}
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-medium">Notifications</CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close notifications">
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-[calc(100vh-10rem)] overflow-y-auto p-4 space-y-4"> {/* Scrollable content */}
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No new notifications.</p>
          ) : (
            notifications.map((notification) => (
              <div key={notification.id} className="flex flex-col border-b pb-2 last:border-b-0">
                <span className="text-sm font-medium">{notification.title}</span>
                <span className="text-xs text-muted-foreground">{notification.description}</span>
                {/* Optional: Add timestamp */}
                {/* <span className="text-xs text-muted-foreground pt-1">{notification.timestamp}</span> */}
              </div>
            ))
          )}
        </div>
        {/* Optional: Add a footer with actions like "Mark all as read" */}
      </CardContent>
    </Card>
  );
}
