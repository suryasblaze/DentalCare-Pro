import React, { useState } from 'react'; // Import useState
import { Outlet } from 'react-router-dom';
import { Header } from '@/components/ui/header';
import { Sidebar } from '@/components/ui/sidebar';
import { NotificationPanel, DbNotification } from '@/components/ui/NotificationPanel'; // Import NotificationPanel and DbNotification type

// LayoutProps is no longer needed as children are handled by Outlet
// interface LayoutProps {
//   children: React.ReactNode;
// }

export function Layout() {
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);

  const handleViewAllNotificationsClick = () => {
    setIsNotificationPanelOpen((prev) => !prev);
  };

  const handleCloseNotificationPanel = () => {
    setIsNotificationPanelOpen(false);
  };

  // Placeholder notification data matching DbNotification structure
  const placeholderNotifications: DbNotification[] = [
    { id: '1', user_id: 'system', message: 'New Appointment Scheduled: Patient John Doe - April 5th, 10:00 AM', is_read: false, created_at: '2025-04-02T10:00:00Z', link_url: '/appointments' },
    { id: '2', user_id: 'system', message: 'Treatment Plan Update: Patient Jane Smith - Plan approved', is_read: true, created_at: '2025-04-02T09:30:00Z', link_url: '/treatment-plans' },
    { id: '3', user_id: 'system', message: 'System Alert: Backup completed successfully', is_read: false, created_at: '2025-04-02T08:00:00Z' },
  ];


  return (
    <div className="min-h-screen bg-background relative"> {/* Add relative positioning */}
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
        {/* Conditionally render NotificationPanel */}
        {isNotificationPanelOpen && (
          <NotificationPanel
            notifications={placeholderNotifications} // Pass placeholder data
            onClose={handleCloseNotificationPanel} // Pass close handler
            onMarkAsRead={(id) => console.log('Mark as read (placeholder):', id)} // Add required prop
          />
        )}
      </div>
    </div>
  );
}
