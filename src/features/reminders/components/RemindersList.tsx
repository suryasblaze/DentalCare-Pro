import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Trash2, Edit, BellOff, Bell } from 'lucide-react'; // Import Bell icon
import { getReminders, updateReminder, deleteReminder, Reminder } from '../services/reminderService'; // Import service functions and type
import { format } from 'date-fns';
import { useToast } from '@/components/ui/use-toast'; // Import useToast
import { cn } from '@/lib/utils'; // Import cn for conditional classes

interface RemindersListProps {
  onEdit: (reminder: Reminder) => void;
  refreshKey: number;
  activeReminderIds: Set<string>; // Add prop for active IDs
}

const RemindersList: React.FC<RemindersListProps> = ({ onEdit, refreshKey, activeReminderIds }) => {
  const { toast } = useToast(); // Call useToast at the top level
  const [reminders, setReminders] = useState<Reminder[]>([]); // Keep only one declaration
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Define fetchReminders function within the component scope
  const fetchReminders = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fetchedReminders = await getReminders();
      setReminders(fetchedReminders || []);
    } catch (err) {
      console.error('Failed to fetch reminders:', err);
      setError('Failed to load reminders. Please try again.');
      toast({
        title: "Error",
        description: "Could not fetch reminders.",
        variant: "destructive",
      });
      } finally {
        setIsLoading(false);
      }
    };

  // Use useEffect to fetch data on mount and when refreshKey changes
  useEffect(() => {
    fetchReminders();
  }, [refreshKey]); // Re-fetch when refreshKey changes

  const handleToggleActive = async (reminder: Reminder) => {
    const originalState = reminder.is_active;
    // Optimistic update
    setReminders(prev => prev.map(r => r.id === reminder.id ? { ...r, is_active: !originalState } : r));

    try {
      await updateReminder(reminder.id, { is_active: !originalState });
      toast({
        title: "Success",
        description: `Reminder ${originalState ? 'deactivated' : 'activated'}.`,
      });
      // No need to refetch if optimistic update is sufficient
    } catch (error) {
      console.error('Failed to toggle reminder state:', error);
      // Revert optimistic update on error
      setReminders(prev => prev.map(r => r.id === reminder.id ? { ...r, is_active: originalState } : r));
      toast({
        title: "Error",
        description: "Could not update reminder status.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    const originalReminders = [...reminders];
    // Optimistic update
    setReminders(prev => prev.filter(r => r.id !== id));

    try {
      await deleteReminder(id);
      toast({
        title: "Success",
        description: "Reminder deleted.",
      });
    } catch (error) {
      console.error('Failed to delete reminder:', error);
      // Revert optimistic update
      setReminders(originalReminders);
      toast({
        title: "Error",
        description: "Could not delete reminder.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (reminder: Reminder) => {
    onEdit(reminder); // Call the onEdit prop passed from the parent
  };


  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (reminders.length === 0) {
    return <p className="text-muted-foreground">No reminders found.</p>;
  }

  return (
    <div className="space-y-4">
      {reminders.map((reminder) => {
        const isActiveReminder = activeReminderIds.has(reminder.id);
        return (
          <Card
            key={reminder.id}
            className={cn(
              !reminder.is_active && 'opacity-60' // Style for inactive
              // Removed animation/border indication for active reminders
            )}
          >
            {/* Add a wrapper div for content if needed, as ping might affect layout directly */}
            {/* Or apply ping to a specific element like an icon if preferred */}
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-medium">{reminder.message}</CardTitle>
              <div className="flex items-center space-x-2">
               <Button variant="ghost" size="icon" onClick={() => handleToggleActive(reminder)} title={reminder.is_active ? 'Deactivate' : 'Activate'}>
                 {reminder.is_active ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />} {/* Assuming Bell is imported */}
               </Button>
               <Button variant="ghost" size="icon" onClick={() => handleEdit(reminder)} title="Edit">
                 <Edit className="h-4 w-4" />
               </Button>
               <Button variant="ghost" size="icon" onClick={() => handleDelete(reminder.id)} title="Delete">
                 <Trash2 className="h-4 w-4 text-destructive" />
               </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Next due: {format(new Date(reminder.reminder_datetime), "PPP 'at' HH:mm")}
            </p>
            {/* Display recurrence info */}
            {reminder.recurrence_config?.type && reminder.recurrence_config.type !== 'none' && (
              <p className="text-xs text-muted-foreground mt-1 capitalize">
                Recurring: {reminder.recurrence_config.type}
                {/* TODO: Add more details like interval, days */}
              </p>
            )}
            {!reminder.is_active && (
                 <p className="text-xs text-amber-600 mt-1">Inactive</p>
             )}
          </CardContent>
        </Card>
      );
      })}
    </div>
  );
};

export default RemindersList;
