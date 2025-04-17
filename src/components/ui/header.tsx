import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from "react-router-dom";
import { Bell, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent, // Keep for user menu
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import useNotifications from '@/lib/hooks/useNotifications'; // Import the hook
import { NotificationPanel } from '@/components/ui/NotificationPanel'; // Import the panel
import { Badge } from "@/components/ui/badge"; // Import Badge for count
import { User } from '@supabase/supabase-js'; // Import User type if needed for metadata

// Import the notification type, assuming it's defined in useNotifications or a central types file
// If DbNotification is not exported from useNotifications, we might need to define it here or import from types/index.ts
// For now, let's assume we can import it or define it inline if needed.
// Let's try defining it inline for now if it's not exported.
interface DbNotification {
  id: string;
  user_id: string;
  message: string;
  is_read: boolean;
  link_url?: string | null;
  created_at: string;
}


// Helper function to get initials
const getInitials = (name?: string | null, email?: string | null): string => {
  if (name) {
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    } else if (names.length === 1 && names[0].length > 0) {
      return names[0].substring(0, 2).toUpperCase();
    }
  }
  if (email) {
    return email.substring(0, 2).toUpperCase();
  }
  return 'U'; // Default fallback
};

export function Header() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false); // State for panel visibility

  // Use the notifications hook
  const { notifications, markAsRead } = useNotifications();

  // *** Add Logging ***
  console.log("Notifications in Header:", notifications);
  // *** End Logging ***

  // Calculate unread count
  const unreadCount = useMemo(() => {
    // Add explicit type DbNotification for 'n'
    return notifications.filter((n: DbNotification) => !n.is_read).length;
  }, [notifications]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  const handleSearchSubmit = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && searchQuery.trim()) {
      const query = searchQuery.trim();
      navigate(`/search?q=${encodeURIComponent(query)}`);
      setSearchQuery('');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      toast({ title: "Logged out successfully" });
      navigate('/login');
    } catch (error: any) {
      console.error("Logout failed:", error);
      toast({
        title: "Logout Failed",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  };

  // Toggle notification panel
  const toggleNotificationPanel = () => {
    setIsNotificationPanelOpen(prev => !prev);
  };

  // Close notification panel
  const closeNotificationPanel = () => {
    setIsNotificationPanelOpen(false);
  };

  // Handle clicking outside the panel to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const panel = document.getElementById('notification-panel');
      const trigger = document.getElementById('notification-trigger');

      if (panel && !panel.contains(event.target as Node) &&
          trigger && !trigger.contains(event.target as Node)) {
        closeNotificationPanel();
      }
    };

    if (isNotificationPanelOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isNotificationPanelOpen]);

  // Extract user metadata safely using type assertion
  const userMetadata = (user as any)?.user_metadata;
  const userFullName = userMetadata?.full_name;
  const userAvatarUrl = userMetadata?.avatar_url;
  const userEmail = user?.email; // Email is usually directly on the user object

  return (
    <> {/* Use Fragment to render panel potentially outside header flow but positioned correctly */}
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <div className="mr-4 hidden md:flex">
            <Link to="/" className="mr-6 flex items-center space-x-2">
              <img src="/dentalcarelogo.png" alt="" className="h-8" /> {/* Alt text is correct */}
              {/* Re-applying style, ensuring no "Logo" text */}
              <span className="text-xl font-semibold text-gray-700 dark:text-gray-200 tracking-tight"> {/* Reverted to a previous successful style attempt */}
                Facets Dental
              </span>
            </Link>
          </div>
          <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
            <div className="w-full flex-1 md:w-auto md:flex-none">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  className="pl-8 md:w-[300px] lg:w-[400px]"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onKeyDown={handleSearchSubmit}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Notification Button - Toggles Panel */}
              <Button
                id="notification-trigger"
                variant="ghost"
                size="icon"
                className="relative"
                aria-label="Notifications"
                onClick={toggleNotificationPanel}
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-4 w-4 justify-center rounded-full p-0 text-xs"
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Badge>
                )}
              </Button>

              {/* User Profile Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-8 w-8 rounded-full"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={userAvatarUrl || "https://syevxwuraxjpvkcclmjj.supabase.co/storage/v1/object/public/avatars/68f6a588-b802-4e33-8c6b-3de2d070d3bf-1744191950747.jpg"} // Use dynamic or fallback avatar
                        alt={userFullName || userEmail || 'User'}
                      />
                      <AvatarFallback>{getInitials(userFullName, userEmail)}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{userFullName || 'User Name'}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {userEmail || 'user@example.com'}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/profile">Profile</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/settings">Settings</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/payments-subscription">Payments & Subscription</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Conditionally render the Notification Panel */}
      {isNotificationPanelOpen && (
        // Wrap panel for positioning and click-outside detection
        <div id="notification-panel" className="absolute top-0 right-0 z-50 mt-14 mr-4"> {/* Adjust positioning as needed */}
          <NotificationPanel
            notifications={notifications}
            onClose={closeNotificationPanel}
            onMarkAsRead={markAsRead}
          />
        </div>
      )}
    </>
  );
}
