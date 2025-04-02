import React, { useState } from 'react'; // Import useState
import { Outlet } from 'react-router-dom';
import { Header } from '@/components/ui/header';
import { Sidebar } from '@/components/ui/sidebar';
import { NotificationPanel } from '@/components/ui/NotificationPanel'; // Import NotificationPanel

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

  // Placeholder notification data
  const placeholderNotifications = [
    { id: '1', title: 'New Appointment Scheduled', description: 'Patient John Doe - April 5th, 10:00 AM', timestamp: '2025-04-02T10:00:00Z' },
    { id: '2', title: 'Treatment Plan Update', description: 'Patient Jane Smith - Plan approved', timestamp: '2025-04-02T09:30:00Z' },
    { id: '3', title: 'System Alert', description: 'Backup completed successfully', timestamp: '2025-04-02T08:00:00Z' },
  ];

  return (
    <div className="min-h-screen bg-background relative"> {/* Add relative positioning */}
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Pass the handler to the Header */}
          <Header onViewAllNotificationsClick={handleViewAllNotificationsClick} />
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
          />
        )}
      </div>
    </div>
  );
}
