import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from "react-router-dom";
import { Bell, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import useNotifications from '@/lib/hooks/useNotifications';
import { NotificationPanel } from '@/components/ui/NotificationPanel';
import { Badge } from "@/components/ui/badge";

interface DbNotification {
  id: string;
  user_id: string;
  message: string;
  is_read: boolean | null;
  link_url?: string | null;
  created_at: string | null;
}

export interface UserProfile {
  id: string;
  email?: string;
  display_name?: string;
  avatar_url?: string;
}

export interface HeaderProps {
  user?: UserProfile | null;
}

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
  return 'U';
};

export function Header({ user }: HeaderProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user: authUser, signOut } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
  const { notifications, markAsRead, clearNotification } = useNotifications();

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => n.is_read !== true).length;
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

  const toggleNotificationPanel = () => {
    setIsNotificationPanelOpen(prev => !prev);
  };

  const closeNotificationPanel = () => {
    setIsNotificationPanelOpen(false);
  };

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

  const userFullName = user?.display_name;
  const userAvatarUrl = user?.avatar_url;
  const userEmail = user?.email;

  const [logoSrc, setLogoSrc] = useState("https://i.postimg.cc/j2qGSXwJ/facetslogo.png");

  useEffect(() => {
    const loadLogo = () => {
      const storedLogo = localStorage.getItem('customClinicLogo');
      if (storedLogo) {
        setLogoSrc(storedLogo);
      } else {
        setLogoSrc("https://i.postimg.cc/j2qGSXwJ/facetslogo.png");
      }
    };

    loadLogo();

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'customClinicLogo') {
        loadLogo();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <div className="mr-4 hidden md:flex">
            <div className="flex items-center">
              <Link to="/dashboard" className="flex items-center space-x-2">
                <img src={logoSrc} alt="Facets Dental Logo" className="h-10" />
              </Link>
            </div>
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

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-8 w-8 rounded-full"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={userAvatarUrl || "https://syevxwuraxjpvkcclmjj.supabase.co/storage/v1/object/public/avatars/68f6a588-b802-4e33-8c6b-3de2d070d3bf-1744191950747.jpg"}
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

      {isNotificationPanelOpen && (
        <div id="notification-panel" className="absolute top-0 right-0 z-50 mt-14 mr-4">
          <NotificationPanel
            notifications={notifications}
            onClose={closeNotificationPanel}
            onMarkAsRead={markAsRead}
            onClearNotification={clearNotification}
          />
        </div>
      )}
    </>
  );
}
