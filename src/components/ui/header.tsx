import { Link } from "react-router-dom";
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
import { useAuth } from "@/context/AuthContext"; // Import useAuth
import { useToast } from "@/components/ui/use-toast"; // Import useToast

// Define props interface
interface HeaderProps {
  onViewAllNotificationsClick?: () => void; // Prop for handling the click
}

export function Header({ onViewAllNotificationsClick }: HeaderProps) {
  const { signOut } = useAuth(); // Get signOut function
  const { toast } = useToast(); // Get toast function

  const handleLogout = async () => {
    try {
      await signOut();
      // Optional: Redirect user or show success toast
      toast({ title: "Logged out successfully" });
    } catch (error: any) {
      console.error("Logout failed:", error);
      toast({
        title: "Logout Failed",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 hidden md:flex">
          <Link to="/" className="mr-6 flex items-center space-x-2">
            {/* Use the custom logo image */}
            <img src="/dentalcarelogo.png" alt="" className="h-8" /> {/* Adjust height as needed */}
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                className="pl-8 md:w-[300px] lg:w-[400px]"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Notification Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative"
                  aria-label="Notifications"
                >
                  <Bell className="h-4 w-4" />
                  {/* Optional: Add a badge for unread notifications */}
                  <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-600" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80"> {/* Adjust width as needed */}
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {/* Placeholder Notifications */}
                <DropdownMenuItem>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">New Appointment Scheduled</span>
                    <span className="text-xs text-muted-foreground">Patient John Doe - April 5th, 10:00 AM</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">Treatment Plan Update</span>
                    <span className="text-xs text-muted-foreground">Patient Jane Smith - Plan approved</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">System Alert</span>
                    <span className="text-xs text-muted-foreground">Backup completed successfully</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {/* Modified item: Removed Link, added onClick */}
                <DropdownMenuItem
                  onClick={onViewAllNotificationsClick}
                  className="justify-center text-sm text-blue-600 hover:underline cursor-pointer"
                >
                  View all notifications
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* User Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-8 w-8 rounded-full"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src="https://github.com/shadcn.png"
                      alt="@shadcn"
                    />
                    <AvatarFallback>SC</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">shadcn</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      m@example.com
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
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer"> {/* Add onClick handler and cursor */}
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
