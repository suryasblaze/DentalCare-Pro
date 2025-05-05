import React from 'react'; // Keep only one React import
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Check } from 'lucide-react'; // Import Check icon
import { cn } from "@/lib/utils"; // For conditional classes
import { formatDistanceToNow } from 'date-fns'; // For relative timestamps

// Type matching the database 'notifications' table structure
// (fetched by useNotifications hook)
export interface DbNotification { // Export the interface
  id: string;
  user_id: string;
  message: string;
  is_read: boolean | null; // Allow null
  link_url?: string | null;
  created_at: string | null; // Allow null
}

interface NotificationPanelProps {
  notifications: DbNotification[]; // Use the correct type
  onClose: () => void; // Function to close the panel
  onMarkAsRead: (id: string) => void; // Function to mark a notification as read
  onClearNotification: (id: string) => void; // Function to clear/delete a notification
  // Optional: Add onNavigate for handling clicks with link_url
  // onNavigate: (url: string) => void;
}

export function NotificationPanel({ notifications, onClose, onMarkAsRead, onClearNotification }: NotificationPanelProps) {

  const handleNotificationClick = (notification: DbNotification) => {
    if (!notification.is_read) {
      onMarkAsRead(notification.id);
    }
    // Optional: Handle navigation if link_url exists
    // if (notification.link_url && onNavigate) {
    //   onNavigate(notification.link_url);
    // }
  };

  return (
    <Card className="fixed top-16 right-4 z-50 w-96 shadow-lg border bg-card text-card-foreground"> {/* Adjust positioning and styling as needed */}
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-medium">Notifications</CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close notifications">
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-[calc(100vh-10rem)] overflow-y-auto"> {/* Scrollable content */}
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center p-4">No new notifications.</p>
          ) : (
            notifications.map((notification) => (
              <div 
                key={notification.id} 
                className={cn(
                  "flex flex-col border-b p-3 hover:bg-muted/50 cursor-pointer",
                  notification.is_read === true ? "opacity-70" : "font-medium" // Explicitly check for true
                )}
                onClick={() => handleNotificationClick(notification)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleNotificationClick(notification)} // Accessibility
              >
                <div className="flex justify-between items-center w-full"> {/* Wrap message and clear button */}
                  <span className="text-sm flex-grow mr-2">{notification.message}</span> {/* Allow message to grow */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 flex-shrink-0" // Make button smaller and prevent shrinking
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent triggering handleNotificationClick
                      onClearNotification(notification.id);
                    }}
                    aria-label="Clear notification"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-muted-foreground">
                    {notification.created_at 
                      ? formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })
                      : 'Just now' /* Or some other placeholder */}
                  </span>
                  {notification.is_read !== true && ( // Check for not true (false or null)
                     <span title="Mark as read" className="text-primary">
                       {/* Optionally show a visual indicator like a dot or allow explicit mark as read */}
                       {/* <Check className="h-3 w-3" /> */}
                     </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
        {/* Optional: Add a footer with actions like "View all" or "Mark all as read" */}
        {/* Example: <CardFooter className="p-2 border-t"><Button variant="link" size="sm" className="w-full">View all notifications</Button></CardFooter> */}
      </CardContent>
    </Card>
  );
}
