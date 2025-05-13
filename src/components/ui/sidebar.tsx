import React from 'react';
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"; // Import Accordion components
import { useAuth } from '@/context/AuthContext'; // Import useAuth
import {
  LayoutDashboard,
  Calendar,
  Users,
  Stethoscope,
  ClipboardList,
  Package,
  Archive,
  BarChart,
  Settings as SettingsIcon,
  FileText,
  Bell,
  ShoppingCart,
  ListChecks, // Added for Inventory Approvals
} from "lucide-react";

const navigation = [
  {
    name: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    name: "Appointments",
    href: "/appointments",
    icon: Calendar,
  },
  {
    name: "Patients",
    href: "/patients",
    icon: Users,
  },
  {
    name: "Treatment Plans",
    href: "/treatment-plans",
    icon: Stethoscope,
  },
  {
    name: "Patient Medical Record", // New navigation item
    href: "/patient-medical-records", // New route
    icon: ClipboardList, // Use the imported icon
  },
  {
    name: "Inventory",
    href: "/inventory", // Main inventory link
    icon: Package,
    children: [ // Define sub-items
      // Removed the "Items" sub-link as the parent link goes there
      {
        name: "Purchases",
        href: "/purchases",
        // No icon needed
      },
      // Removed "Urgent Entry" link as it's now part of the Log page via Dialog
      {
        name: "Urgent Purchase Entry", // Renamed from Urgent Log
        href: "/purchases/urgent", // Path remains the same (list page)
        // No icon needed
      },
      {
        name: "Invoices",
        href: "/inventory/invoices",
        // No icon needed
      },
      {
        name: "Create Adjustment",
        href: "/inventory/create-adjustment",
        // No icon needed
      },
      {
        name: "Stock Take",
        href: "/inventory/stock-take",
        // No icon needed
      },
    ],
  },
  // Note: Removed the separate top-level Invoices and Purchase Orders links
  {
    name: "Assets",
    href: "/assets",
    icon: Archive,
  },
   {
    name: "Reports",
    href: "/reports",
    icon: BarChart, // Use the imported icon
  },
  {
    name: "Reminders",
    href: "/reminders",
    icon: Bell,
  },
  {
    name: "Settings",
    href: "/settings",
    icon: SettingsIcon,
  },
  // TODO: Add Staff Leaves link if needed for admin role
  {
    name: "Inv. Approvals",
    href: "/inventory-approvals",
    icon: ListChecks,
    roles: ['admin', 'owner', 'doctor'], // Added 'doctor'
  },
];

// Define which items are admin-only by default if not specified by item.roles
const adminOnlyItemNames = ["Inventory", "Assets", "Reports", "Reminders"];

export function Sidebar() {
  const location = useLocation();
  const { user } = useAuth(); // Get user from auth context

  // Filter navigation based on user role
  const filteredNavigation = navigation.filter(item => {
    if (!user || !user.role) return false; // Don't show if no user or role

    // If item has specific roles defined, check against them
    if (item.roles && Array.isArray(item.roles)) {
      return item.roles.includes(user.role);
    }

    // Fallback to existing logic for items without a 'roles' property
    // Admins and Owners see all items not specifically restricted by 'roles'
    if (user.role === 'admin' || user.role === 'owner') {
      return true;
    }

    // Doctors see items that are NOT in adminOnlyItemNames
    if (user.role === 'doctor') {
      return !adminOnlyItemNames.includes(item.name);
    }

    // Hide for any other case
    return false;
  });


  // Don't render sidebar if no user or role doesn't permit any items
  // (Though Layout usually handles the user check)
  if (!user || filteredNavigation.length === 0) {
    return null;
  }

  return (
    <div className="hidden border-r bg-background md:block md:w-64">
      <div className="flex h-full flex-col gap-2">
        <div className="flex h-14 items-center border-b px-4">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            {/* Use the custom logo image */}
            <img src="https://i.postimg.cc/bwDhkb5H/dentalcare.png" alt="Dental Care Logo" className="h-12" /> {/* Adjust height as needed */}
          </Link>
        </div>
        <div className="flex-1 overflow-auto py-2">
          <nav className="grid items-start px-2 text-sm font-medium">
            {/* Map over the filtered navigation items */}
            {filteredNavigation.map((item) => {
              const Icon = item.icon;
              // For parent items, check if any child is active or if the parent itself is active
              const isParentActive = item.children 
                ? item.children.some(child => location.pathname.startsWith(child.href)) || location.pathname.startsWith(item.href)
                : location.pathname.startsWith(item.href);

              if (item.children) {
                // Determine if the accordion item should be open by default
                const defaultOpenValue = isParentActive ? item.name : "";
                return (
                  <Accordion key={item.name} type="single" collapsible defaultValue={defaultOpenValue} className="w-full">
                    <AccordionItem value={item.name} className="border-b-0">
                       {/* AccordionTrigger now handles the toggle, Link is inside for navigation */}
                       <AccordionTrigger 
                        className={cn(
                          "w-full justify-start gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground [&[data-state=open]>svg]:rotate-180", // Keep chevron rotation
                           // Apply secondary background only if the main parent link itself is active, not just a child
                           location.pathname === item.href ? "bg-secondary text-secondary-foreground" : "hover:bg-muted" 
                        )}
                      >
                         <Link to={item.href} className="flex items-center flex-grow gap-2" onClick={(e) => e.stopPropagation()}> {/* Prevent link click from interfering with trigger toggle if needed */}
                            <Icon className="h-4 w-4" />
                            <span>{item.name}</span>
                         </Link>
                         {/* The chevron is typically added automatically by AccordionTrigger */}
                      </AccordionTrigger>
                      <AccordionContent className="pt-1 pb-0 pl-7"> {/* Indent content */}
                        <nav className="grid gap-1">
                          {item.children.map((child) => {
                            const isChildActive = location.pathname === child.href;
                            return (
                              <Link key={child.href} to={child.href}>
                                <Button
                                  variant={isChildActive ? "secondary" : "ghost"}
                                  size="sm"
                                  className={cn("w-full justify-start gap-2 pl-2", { // Adjusted padding
                                    "bg-secondary text-secondary-foreground": isChildActive,
                                  })}
                                >
                                  {child.name}
                                </Button>
                              </Link>
                            );
                          })}
                        </nav>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                );
              }

              // Regular item without children
              return (
                <Link key={item.href} to={item.href}>
                  <Button
                    variant={isParentActive ? "secondary" : "ghost"}
                    className={cn("w-full justify-start gap-2 rounded-md px-3 py-2 text-sm font-medium", {
                      "bg-secondary text-secondary-foreground": isParentActive,
                    })}
                  >
                    <Icon className="h-4 w-4" />
                    {item.name}
                  </Button>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}
