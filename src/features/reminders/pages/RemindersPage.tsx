import React, { useState } from 'react'; // Import useState
import { PageHeader } from '@/components/ui/page-header';
import ReminderForm from '../components/ReminderForm'; // Import the form
import RemindersList from '../components/RemindersList'; // Import the list
import { Separator } from '@/components/ui/separator'; // Import Separator
import { Reminder } from '../services/reminderService'; // Import Reminder type
import { useReminderNotifications } from '@/lib/hooks/useReminderNotifications'; // Import the hook

const RemindersPage: React.FC = () => {
  const [refreshKey, setRefreshKey] = useState(0); // State to trigger list refresh
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null); // State for reminder being edited
  const { activeReminderIds } = useReminderNotifications(); // Get active IDs from the hook

  // Function called by RemindersList when edit button is clicked
  const handleEdit = (reminder: Reminder) => {
    setEditingReminder(reminder);
    // Optionally scroll to the form or highlight it
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Function called by ReminderForm after successful save (create or update)
  const handleSaveSuccess = () => {
    setEditingReminder(null); // Clear editing state
    setRefreshKey(prev => prev + 1); // Increment key to refresh list
  };

  return (
    <div className="container mx-auto p-4">
      <PageHeader heading="Reminders" text="Create and manage reminders for yourself or the clinic." />
      <div className="mt-6">
        <h2 className="text-xl font-semibold mb-4">
            {editingReminder ? 'Edit Reminder' : 'Create New Reminder'}
         </h2>
         <ReminderForm
           key={editingReminder?.id || 'new'} // Force re-render/reset when editingReminder changes
           initialData={editingReminder}
           onSaveSuccess={handleSaveSuccess}
         />
       </div>
       <Separator className="my-8" />
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Existing Reminders</h2>
        <RemindersList
          onEdit={handleEdit}
          refreshKey={refreshKey}
          activeReminderIds={activeReminderIds} // Pass active IDs down
        />
      </div>
    </div>
  );
};

export default RemindersPage;
