import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, CalendarDays, ClockIcon } from 'lucide-react'; // Changed Clock to ClockIcon if that is the correct name
import { format, parseISO } from 'date-fns';

// This interface should align with the one in Dashboard.tsx or be imported
interface UpcomingAppointment {
  id: string;
  patient: string;
  time: string; // Original formatted time for dashboard
  date: string; // Original formatted date for dashboard
  type: string;
  status: string;
  start_time?: string; // ISO string for more flexible formatting in modal
}

interface UpcomingAppointmentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointments: UpcomingAppointment[];
}

export const UpcomingAppointmentsModal: React.FC<UpcomingAppointmentsModalProps> = ({ isOpen, onClose, appointments }) => {
  // Dialog handles its own open state internally based on the `open` prop and `onOpenChange` callback
  // No need for: if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] md:max-w-[800px] lg:max-w-[1000px] max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="text-2xl">All Upcoming Appointments</DialogTitle>
          <DialogDescription>
            Browse through all scheduled upcoming appointments.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-grow border-t border-b">
          <div className="space-y-4 p-6">
            {appointments.length > 0 ? (
              appointments.map(apt => (
                <Card key={apt.id} className="shadow-sm hover:shadow-md transition-shadow bg-card">
                  <CardHeader className="pb-3 pt-4">
                    <CardTitle className="text-lg flex items-center font-medium">
                      <User className="w-5 h-5 mr-3 text-primary flex-shrink-0" />
                      {apt.patient}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-3 text-sm pl-12 pr-6 pb-4">
                    <div>
                      <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Type</p>
                      <p className="mt-1">{apt.type}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Date & Time</p>
                      <p className="flex items-center mt-1">
                        <CalendarDays className="w-4 h-4 mr-2 text-muted-foreground flex-shrink-0" />
                        {apt.start_time ? format(parseISO(apt.start_time), 'EEEE, MMM d, yyyy') : apt.date}
                      </p>
                      <p className="flex items-center mt-1">
                         <ClockIcon className="w-4 h-4 mr-2 text-muted-foreground flex-shrink-0" />
                        {apt.start_time ? format(parseISO(apt.start_time), 'h:mm a') : apt.time}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Status</p>
                      <p className="mt-1 capitalize">{apt.status}</p>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                No upcoming appointments found.
              </div>
            )}
          </div>
        </ScrollArea>
        <DialogFooter className="p-6 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 