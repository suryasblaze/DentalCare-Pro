import React from 'react'; // Added React import for JSX
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Calendar,
  Users,
  Stethoscope,
  ClipboardList,
  Package,
  Archive,
  BarChart, // Added icon for Reports
  Settings as SettingsIcon,
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
    href: "/inventory",
    icon: Package,
  },
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
    name: "Settings",
    href: "/settings",
    icon: SettingsIcon,
  },
];

export function Sidebar() {
  const location = useLocation();

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
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              return (
                <Link key={item.href} to={item.href}>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    className={cn("w-full justify-start gap-2", {
                      "bg-secondary": isActive,
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
