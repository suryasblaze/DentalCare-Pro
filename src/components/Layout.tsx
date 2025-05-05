import React, { useState } from 'react'; // Import useState
import { Outlet } from 'react-router-dom';
import { Header } from '@/components/ui/header';
import { Sidebar } from '@/components/ui/sidebar';
import { useReminderNotifications } from '@/lib/hooks/useReminderNotifications'; // Import the reminder hook
import { useInventoryAlerts } from '@/lib/hooks/useInventoryAlerts'; // Import the inventory alerts hook
// Removed NotificationPanel imports as it's handled by Header

// LayoutProps is no longer needed as children are handled by Outlet
// interface LayoutProps {
//   children: React.ReactNode;
// }

export function Layout() {
  // Initialize reminder notifications hook
  useReminderNotifications();
  // Initialize inventory alerts hook
  useInventoryAlerts();

  // Removed notification state and handlers from Layout

  return (
    <div className="min-h-screen bg-background"> {/* Removed relative positioning if not needed */}
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Header handles its own notification logic now */}
          <Header />
          <main className="flex-1 overflow-y-auto">
            <div className="container py-6">
              <Outlet />
            </div>
          </main>
        </div>
        {/* Removed NotificationPanel rendering from Layout */}
      </div>
    </div>
  );
}
