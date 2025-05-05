import React, { useState, useEffect, useRef } from 'react'; // Import React for JSX
import { getReminders, Reminder } from '@/features/reminders/services/reminderService';
import { useAuth } from '@/context/AuthContext';
import { isPast, addDays, differenceInMilliseconds } from 'date-fns'; // Removed unused differenceInMinutes
import { useToast } from '@/components/ui/use-toast'; // Import useToast
import { BellRing } from 'lucide-react'; // Import an icon for the toast

const CHECK_INTERVAL_MS = 60 * 1000; // Check every 60 seconds

export function useReminderNotifications() {
  const { user } = useAuth();
  const { toast } = useToast(); // Initialize toast
  const [permission, setPermission] = useState<NotificationPermission>('Notification' in window ? Notification.permission : 'default'); // Initialize permission state safely
  // Store notified occurrences with timestamp to clear old ones
  const notifiedOccurrences = useRef<Map<string, number>>(new Map());
  // State to track IDs of reminders that just triggered a notification
  const [activeReminderIds, setActiveReminderIds] = useState<Set<string>>(new Set());
  const activeTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Ref to manage timeout

  // Request permission when the hook mounts if not already granted/denied
  useEffect(() => {
    if (!('Notification' in window)) {
      return; // Desktop notifications not supported
    }
    const currentPermission = Notification.permission;
    setPermission(currentPermission);
    if (currentPermission !== 'granted' && currentPermission !== 'denied') {
      Notification.requestPermission().then((status) => {
        setPermission(status);
        // Removed confirmation logs/notifications
      });
    }
  }, []); // Run only once on mount

  // Interval to check for due reminders
  useEffect(() => {
    if (!user) {
      return; // Only run if logged in
    }

    const intervalId = setInterval(async () => {
      try {
        const reminders = await getReminders();
        const now = new Date();

        reminders.forEach((reminder) => {
          if (!reminder.is_active) return;

          let expectedTimesToday: Date[] = [];
          const baseReminderTime = new Date(reminder.reminder_datetime);

          // --- Calculate Expected Times for Today ---
          if (reminder.recurrence_config?.type === 'daily') {
            const lastExpectedDay = calculateLastExpectedOccurrenceDay(reminder, now);
            if (lastExpectedDay) {
              expectedTimesToday = calculateExpectedTimesForDay(reminder, lastExpectedDay);
            }
          } else if (!reminder.recurrence_config || reminder.recurrence_config.type === 'none') {
             if (baseReminderTime >= now && differenceInMilliseconds(now, baseReminderTime) < CHECK_INTERVAL_MS) {
                 expectedTimesToday = [baseReminderTime];
             } else if (isPast(baseReminderTime) && differenceInMilliseconds(now, baseReminderTime) < CHECK_INTERVAL_MS) {
                 expectedTimesToday = [baseReminderTime];
             }
          }
          // TODO: Add logic for weekly, monthly, yearly recurrence

          // --- Check Each Expected Time ---
          expectedTimesToday.forEach((expectedTime) => {
            const msDifference = differenceInMilliseconds(now, expectedTime);
            const occurrenceKey = `${reminder.id}-${expectedTime.toISOString()}`;
            const alreadyNotified = notifiedOccurrences.current.has(occurrenceKey);

            if (
              msDifference >= 0 &&
              msDifference < CHECK_INTERVAL_MS &&
              !alreadyNotified
            ) {
              // Trigger Desktop Notification (if permission granted)
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('Dental Care Reminder', {
                  body: reminder.message,
                  icon: '/ransferent.svg',
                  tag: occurrenceKey,
                });
              }

              // Trigger In-App Toast Notification
              toast({
                title: "Reminder Due", // Simplified title
                description: reminder.message,
                duration: 10000,
              });

              // Mark specific occurrence as notified for this session
              notifiedOccurrences.current.set(occurrenceKey, now.getTime());

              // --- Trigger List Item Indication State ---
              setActiveReminderIds(prev => new Set(prev).add(reminder.id));
              if (activeTimeoutRef.current) {
                clearTimeout(activeTimeoutRef.current);
              }
              activeTimeoutRef.current = setTimeout(() => {
                setActiveReminderIds(new Set());
                activeTimeoutRef.current = null;
              }, 60000); // Keep active for 1 minute
              // --- End Trigger List Item Indication State ---

              // Cleanup old notified occurrences (e.g., older than 1 day)
              const oneDayAgo = now.getTime() - 24 * 60 * 60 * 1000;
              for (const [key, timestamp] of notifiedOccurrences.current.entries()) {
                  if (timestamp < oneDayAgo) {
                      notifiedOccurrences.current.delete(key);
                  }
              }
            }
          });
        });
      } catch (error) {
        console.error('Error checking reminders for notifications:', error); // Keep error log
      }
    }, CHECK_INTERVAL_MS);

    // Clear interval on cleanup
    return () => {
        clearInterval(intervalId);
    }

  }, [user, permission, toast]); // Add toast to dependency array

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (activeTimeoutRef.current) {
        clearTimeout(activeTimeoutRef.current);
      }
    };
  }, []);

  // Return permission status and active IDs
  return { permission, activeReminderIds };
}

// Helper function to calculate the most recent day an occurrence was expected at or before 'now'
function calculateLastExpectedOccurrenceDay(reminder: Reminder, now: Date): Date | null {
    if (!reminder.recurrence_config || reminder.recurrence_config.type !== 'daily') {
        return null;
    }
    const baseTime = new Date(reminder.reminder_datetime);
    const interval = reminder.recurrence_config.interval || 1;
    const baseDay = new Date(baseTime);
    baseDay.setHours(0, 0, 0, 0);
    if (baseDay > now) {
        return null;
    }
    let lastOccurrenceDay = baseDay;
    while (true) {
        const nextTry = addDays(lastOccurrenceDay, interval);
        if (nextTry > now) {
            break;
        }
        lastOccurrenceDay = nextTry;
    }
    return lastOccurrenceDay;
}

// Helper function to calculate all expected trigger times for a specific day
function calculateExpectedTimesForDay(reminder: Reminder, targetDate: Date): Date[] {
    const baseTime = new Date(reminder.reminder_datetime);
    const timesPerDay = reminder.recurrence_config?.times_per_day || 1;
    if (timesPerDay <= 0) return [];
    const expectedTimes: Date[] = [];
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    let firstTriggerTime = new Date(startOfDay);
    firstTriggerTime.setHours(baseTime.getHours(), baseTime.getMinutes(), baseTime.getSeconds(), baseTime.getMilliseconds());
    if (firstTriggerTime < baseTime && firstTriggerTime.toDateString() === baseTime.toDateString()) {
       firstTriggerTime = baseTime;
    }
    if (timesPerDay === 1) {
        if (firstTriggerTime >= baseTime && firstTriggerTime.toDateString() === targetDate.toDateString()) {
           expectedTimes.push(firstTriggerTime);
        }
    } else {
        const intervalMs = (24 * 60 * 60 * 1000) / timesPerDay;
        for (let i = 0; i < timesPerDay; i++) {
            const triggerTime = new Date(firstTriggerTime.getTime() + i * intervalMs);
            if (triggerTime.getDate() === targetDate.getDate() && triggerTime >= baseTime) {
                expectedTimes.push(triggerTime);
            }
        }
    }
    return expectedTimes;
}
