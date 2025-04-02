import React from 'react';
import { PageHeader } from '@/components/ui/page-header';

const NotificationsPage: React.FC = () => {
  return (
    <div>
      <PageHeader heading="Notifications" />
      <div className="mt-4">
        {/* Placeholder content - Real notification list will go here */}
        <p>This page will display all your notifications.</p>
        {/* Example structure for later */}
        {/* <ul>
          <li>Notification 1</li>
          <li>Notification 2</li>
        </ul> */}
      </div>
    </div>
  );
};

export default NotificationsPage;
