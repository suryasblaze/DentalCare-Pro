import React, { useState, useEffect } from 'react';
// Import subHours correctly and Database type
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, parseISO, parse, isValid, addMonths, subMonths, startOfMonth, endOfMonth, isSameMonth, isToday, startOfDay, endOfDay, subHours, isBefore, formatISO } from 'date-fns'; // Added isBefore, formatISO
import { Plus, ChevronLeft, ChevronRight, User, Phone } from 'lucide-react';
import { api, subscribeToChanges } from '@/lib/api'; // Import subscribeToChanges
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label'; // Keep Label as PatientForm might use it indirectly
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast'; // Import useToast
// Import PatientForm
import { PatientForm } from '@/features/patients/components/PatientForm';
// Import Database type and specific table types from the correct path
import type { Database } from '@/../supabase_types'; // Corrected import path
type AppointmentRow = Database['public']['Tables']['appointments']['Row'];
type PatientRow = Database['public']['Tables']['patients']['Row'];
type StaffRow = Database['public']['Tables']['staff']['Row'];

// Define Appointment type based on API response (including nested data)
type AppointmentWithDetails = AppointmentRow & {
  patients: Pick<PatientRow, 'id' | 'first_name' | 'last_name' | 'email' | 'phone'> | null;
  staff: Pick<StaffRow, 'id' | 'first_name' | 'last_name' | 'role' | 'specialization'> | null;
};


export function Appointments() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week' | 'day'>('week');
  const [selectedSlot, setSelectedSlot] = useState<{ date: Date; time: string } | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithDetails | null>(null);
  const [bookingStep, setBookingStep] = useState<'patient-select' | 'new-patient' | 'appointment-details'>('patient-select');
  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<PatientRow | null>(null); // Use PatientRow
  const [selectedDoctor, setSelectedDoctor] = useState<StaffRow | null>(null); // Use StaffRow
  const [appointments, setAppointments] = useState<AppointmentWithDetails[]>([]); // Use specific type
  const [patients, setPatients] = useState<PatientRow[]>([]); // Use PatientRow
  const [allDoctors, setAllDoctors] = useState<StaffRow[]>([]); // Renamed from doctors to store all doctors
  const [availableDoctors, setAvailableDoctors] = useState<StaffRow[]>([]); // State for available doctors
  const [isLoadingDoctors, setIsLoadingDoctors] = useState(false); // Loading state for doctors
  const [dateInput, setDateInput] = useState('');
  // State for manual date/time selection when booking via button
  const [manualDate, setManualDate] = useState<Date | null>(null);
  const [manualTime, setManualTime] = useState<string>(''); // e.g., "09:00"
  const { toast } = useToast(); // Initialize toast hook
  const CELL_HEIGHT = 80; // Height of a 1-hour cell in pixels
  const HOUR_IN_MINUTES = 60;

  const [appointmentFormData, setAppointmentFormData] = useState({
    type: 'checkup',
    duration: '30',
    notes: '',
    reason_for_visit: '', // Added reason for visit
  });
  // Remove newPatientData state - PatientForm handles its own state

  const timeSlots = Array.from({ length: 11 }, (_, i) => {
    const hour = i + 8;
    return format(new Date().setHours(hour, 0), 'HH:mm');
  });

  // --- Data Fetching Functions ---

  const fetchAppointments = async () => {
    try {
      let startDate, endDate;

      if (view === 'day') {
        startDate = startOfDay(selectedDate);
        endDate = endOfDay(selectedDate);
      } else if (view === 'week') {
        startDate = startOfWeek(selectedDate, { weekStartsOn: 1 });
        endDate = endOfWeek(selectedDate, { weekStartsOn: 1 });
      } else if (view === 'month') {
        startDate = startOfMonth(selectedDate);
        endDate = endOfMonth(selectedDate);
      }

      if (!startDate || !endDate) {
        console.error("Invalid view state, cannot determine date range:", view);
        return;
      }

      console.log(`Fetching appointments from ${startDate.toISOString()} to ${endDate.toISOString()}`); // Debugging

      const data = await api.appointments.getByDateRange(
        startDate.toISOString(),
        endDate.toISOString()
      );
      // Cast the fetched data to the correct type
      setAppointments(Array.isArray(data) ? (data as AppointmentWithDetails[]) : []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      setAppointments([]); // Set to empty array on error
    }
  };

  const fetchPatients = async () => {
    try {
      const data = await api.patients.getAll();
      setPatients(data || []); // Ensure it's an array
    } catch (error) {
      console.error('Error fetching patients:', error);
      setPatients([]); // Set empty on error
    }
  };

  // Fetch all doctors initially
  const fetchAllDoctors = async () => {
    try {
      const data = await api.staff.getDoctors();
      setAllDoctors(data || []); // Ensure it's an array
    } catch (error) {
      console.error('Error fetching all doctors:', error);
      setAllDoctors([]); // Set empty on error
    }
  };

  // Fetch available doctors for a specific slot
  const fetchAvailableDoctorsForSlot = async (slotDate: Date | null, slotTime: string, durationMinutes: number) => {
    if (!slotDate || !slotTime || isNaN(durationMinutes) || durationMinutes <= 0) {
      setAvailableDoctors([]); // Clear if inputs are invalid
      return;
    }

    setIsLoadingDoctors(true);
    try {
      // Combine date and time string into a single string for parsing
      const dateString = format(slotDate, 'yyyy-MM-dd'); // Get YYYY-MM-DD part
      const dateTimeString = `${dateString}T${slotTime}:00`; // Combine e.g., "2025-04-12T10:00:00"

      // Parse the combined string. Assume local timezone initially.
      const startDateLocal = parse(dateTimeString, "yyyy-MM-dd'T'HH:mm:ss", new Date());

      if (!isValid(startDateLocal)) {
        throw new Error(`Invalid combined date/time string: ${dateTimeString}`);
      }

      // Calculate end date based on the parsed local start date
      const endDateLocal = new Date(startDateLocal.getTime() + durationMinutes * 60000);

      // Convert to ISO strings (UTC) for the API call
      const startISO = formatISO(startDateLocal);
      const endISO = formatISO(endDateLocal);

      // console.log(`[DEBUG] Calling getAvailableDoctors with: ${startISO} to ${endISO}`); // Optional debug log

      const available = await api.staff.getAvailableDoctors(startISO, endISO);
      setAvailableDoctors(available || []);

      // If the currently selected doctor is no longer available, reset selection
      if (selectedDoctor && !available.some(doc => doc.id === selectedDoctor.id)) {
        setSelectedDoctor(null);
      }

    } catch (error) {
      console.error('Error fetching available doctors:', error);
      toast({ variant: "destructive", title: "Error Fetching Doctors", description: "Could not fetch available doctors for the selected slot." });
      setAvailableDoctors([]); // Clear on error
    } finally {
      setIsLoadingDoctors(false);
    }
  };

  // --- Effects ---

  // Initial data fetching and subscription setup
  useEffect(() => {
    fetchAppointments();
    fetchPatients();
    fetchAllDoctors(); // Fetch all doctors on initial load

    // Subscribe to real-time appointment changes
    const subscription = subscribeToChanges('appointments', (payload: any) => {
      console.log('Appointment change detected:', payload);
      fetchAppointments(); // Re-fetch appointments on change
    });

    // Unsubscribe on component unmount
    return () => {
      subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, view]); // Re-fetch when selectedDate or view changes

  // Effect to fetch available doctors when modal is open and relevant details change
  useEffect(() => {
    if (showBookingModal && bookingStep === 'appointment-details') {
      const durationMinutes = parseInt(appointmentFormData.duration);
      let effectiveDate: Date | null = null;
      let effectiveTime: string = '';

      if (selectedSlot) {
        effectiveDate = selectedSlot.date;
        effectiveTime = selectedSlot.time;
      } else if (manualDate && manualTime) {
        effectiveDate = manualDate;
        effectiveTime = manualTime;
      }

      if (effectiveDate && effectiveTime && !isNaN(durationMinutes)) {
        fetchAvailableDoctorsForSlot(effectiveDate, effectiveTime, durationMinutes);
      } else {
        setAvailableDoctors([]); // Clear if date/time/duration is incomplete
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showBookingModal, bookingStep, selectedSlot, manualDate, manualTime, appointmentFormData.duration]);


  // --- Event Handlers ---

  const handlePatientSearch = async (query: string) => {
    setPatientSearchQuery(query);
    if (query.length > 2) {
      try {
        const results = await api.patients.search(query);
        setPatients(results || []); // Ensure it's an array
      } catch (error) {
        console.error('Error searching patients:', error);
        setPatients([]); // Set empty on error
      }
    } else if (query.length === 0) {
      fetchPatients();
    }
  };

  const handleBookAppointment = async (formData: any) => {
    console.log("handleBookAppointment called. selectedDoctor:", selectedDoctor); // Log selectedDoctor state
    try {
      // Validation for patient and doctor selection (common for both flows)
      if (!selectedPatient || !selectedDoctor) {
        console.error("Booking validation failed: Missing patient or doctor", { selectedPatient, selectedDoctor });
        toast({ variant: "destructive", title: "Missing Information", description: "Please select a patient and a doctor." });
        return;
      }

      let startDate: Date;
      const todayStart = startOfDay(new Date()); // Get start of today

      // Determine start date based on flow (slot click vs button)
      if (selectedSlot) {
        // Flow 1: Clicked on a calendar slot (already validated in handleSlotClick)
        startDate = new Date(selectedSlot.date);
        const [startHour, startMinute] = selectedSlot.time.split(':').map(Number);
        startDate.setHours(startHour, startMinute, 0, 0);
      } else {
        // Flow 2: Clicked "New Appointment" button
        if (!manualDate || !manualTime) {
          toast({ variant: "destructive", title: "Missing Information", description: "Please select a date and time." });
          return;
        }
        const [startHour, startMinute] = manualTime.split(':').map(Number);
        if (isNaN(startHour) || isNaN(startMinute)) {
          toast({ variant: "destructive", title: "Invalid Time", description: "Invalid time format selected." });
          return;
        }
        startDate = new Date(manualDate);
        startDate.setHours(startHour, startMinute, 0, 0);

        if (!isValid(startDate)) {
          toast({ variant: "destructive", title: "Invalid Date/Time", description: "Invalid date or time selected." });
          return;
        }
      }

      // --- Add validation: Check if startDate is before today ---
      if (isBefore(startOfDay(startDate), todayStart)) {
        toast({
          variant: "destructive",
          title: "Booking Restricted",
          description: "Cannot book appointments for past dates.",
        });
        return; // Prevent booking
      }
      // --- End validation ---

      const durationMinutes = parseInt(formData.duration);
      if (isNaN(durationMinutes) || durationMinutes <= 0) {
         toast({ variant: "destructive", title: "Invalid Duration", description: "Invalid appointment duration selected." });
         return;
      }
      const endDate = new Date(startDate.getTime() + durationMinutes * 60000);

      const appointmentData = {
        patient_id: selectedPatient.id,
        staff_id: selectedDoctor.id,
        title: formData.type,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        type: formData.type,
        reason_for_visit: formData.reason_for_visit, // Added reason for visit
        notes: formData.notes,
        // Set initial status to 'scheduled' instead of 'confirmed'
        status: 'scheduled' as 'scheduled' | 'completed' | 'cancelled' | 'confirmed'
      };

      const createdAppointment = await api.appointments.create(appointmentData);

      // --- Schedule Notifications ---
      if (createdAppointment?.id && createdAppointment.start_time && createdAppointment.patient_id) {
        const appointmentId = createdAppointment.id;
        const patientId = createdAppointment.patient_id;
        const startTime = parseISO(createdAppointment.start_time);

        // 1. Schedule Immediate Confirmation (App Notification)
        try {
          await api.communications.schedule({
            patientId: patientId,
            appointmentId: appointmentId,
            type: 'appointment_reminder', // Or a new 'appointment_confirmation' type if needed
            channel: 'app', // Use 'app' channel
            scheduledFor: new Date().toISOString(), // Schedule immediately
            // Custom message could be used here if needed
          });
          console.log(`Immediate app confirmation scheduled for appointment ${appointmentId}`);
        } catch (scheduleError) {
          console.error('Failed to schedule immediate app confirmation:', scheduleError);
          // Non-fatal, continue with other scheduling
        }

        // 2. Schedule 24-Hour Reminder (Email + Optional App)
        try {
          const reminderTime = subHours(startTime, 24);
          if (reminderTime > new Date()) {
            // Schedule Email Reminder
            await api.communications.schedule({
              patientId: patientId,
              appointmentId: appointmentId,
              type: 'appointment_reminder',
              channel: 'email', // Keep email reminder
              scheduledFor: reminderTime.toISOString(),
            });
            console.log(`Email reminder scheduled for appointment ${appointmentId}`);

            // Optionally, also schedule an 'app' reminder 24 hours before
            await api.communications.schedule({
              patientId: patientId,
              appointmentId: appointmentId,
              type: 'appointment_reminder',
              channel: 'app', // Add 'app' channel reminder
              scheduledFor: reminderTime.toISOString(),
            });
            console.log(`App reminder scheduled for appointment ${appointmentId}`);

          } else {
            console.log(`24-hour reminder time for appointment ${appointmentId} is in the past, not scheduling.`);
          }
        } catch (scheduleError) {
          console.error('Failed to schedule 24-hour reminder(s):', scheduleError);
        }
      } else {
        console.warn('Could not schedule notifications: Missing created appointment data.', createdAppointment);
      }
      // --- End Schedule Notifications ---

      setShowBookingModal(false);
      await fetchAppointments(); // Re-fetch appointments for the current view

      // Reset form data and selections
      // Show success toast
      toast({
        title: "Appointment Booked",
        description: `Appointment for ${selectedPatient.first_name} ${selectedPatient.last_name} with Dr. ${selectedDoctor.first_name} ${selectedDoctor.last_name} scheduled successfully.`,
      });

      // Reset form data and selections
      setAppointmentFormData({ type: 'checkup', duration: '30', notes: '', reason_for_visit: '' }); // Reset reason_for_visit
      setSelectedPatient(null);
      setSelectedDoctor(null);
      setPatientSearchQuery('');
      setBookingStep('patient-select');
      setSelectedSlot(null); // Reset selected slot
      setManualDate(null); // Reset manual date
      setManualTime(''); // Reset manual time
      setAvailableDoctors([]); // Clear available doctors list
    } catch (error) {
      console.error('Error booking appointment:', error);
      toast({ // Show error toast
        variant: "destructive",
        title: "Booking Failed",
        description: `Could not book appointment: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
      // Keep modal open and data filled on error
    }
  };

  const handleAppointmentClick = (e: React.MouseEvent<HTMLDivElement>, appointment: AppointmentWithDetails) => {
    e.stopPropagation();
    setSelectedAppointment({
      ...appointment,
      notes: appointment.notes || '',
      type: appointment.type || 'checkup'
    });
    setShowAppointmentModal(true);
  };

  const handleCancelAppointment = async () => {
    if (!selectedAppointment || !selectedAppointment.id) return;
    const appointmentIdToCancel = selectedAppointment.id; // Store ID before state changes

    try {
      // 1. Cancel the appointment itself
      await api.appointments.cancel(appointmentIdToCancel);

      // 2. Cancel associated scheduled communications
      try {
         await api.communications.cancelByAppointment(appointmentIdToCancel);
         console.log(`Cancellation request sent for communications related to appointment ${appointmentIdToCancel}`);
      } catch (cancelCommError) {
         console.error(`Failed to cancel communications for appointment ${appointmentIdToCancel}:`, cancelCommError);
         // Decide if this should prevent UI update or just log error
         toast({
            variant: "destructive",
            title: "Communication Cancellation Failed",
            description: "Could not cancel scheduled reminders. Please check manually.",
         });
      }

      // 3. Update UI
      setShowAppointmentModal(false);
      await fetchAppointments(); // Refetch to show updated status
      toast({ title: "Appointment Cancelled", description: "The appointment and any scheduled reminders have been cancelled." });

    } catch (error) {
      console.error('Error cancelling appointment:', error);
      toast({ // Show error toast for main cancellation failure
        variant: "destructive",
        title: "Cancellation Failed",
        description: `Could not cancel appointment: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  };

  const handleUpdateAppointment = async (updatedFields: { type: string; notes: string; }) => {
    try {
      if (!selectedAppointment || !selectedAppointment.id) return;

      const appointmentData = {
        title: updatedFields.type,
        type: updatedFields.type,
        notes: updatedFields.notes,
      };

      await api.appointments.update(selectedAppointment.id, appointmentData);
      setShowAppointmentModal(false);
      await fetchAppointments();
    } catch (error) {
      console.error('Error updating appointment:', error);
      alert(`Failed to update appointment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // --- Calendar Rendering Helpers ---

  const calculateAppointmentHeight = (startTime: string | null, endTime: string | null): number => {
    if (!startTime || !endTime) return 10;
    try {
      const start = parseISO(startTime);
      const end = parseISO(endTime);
      if (!isValid(start) || !isValid(end)) return 10;
      const durationInMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
      return Math.max(10, (durationInMinutes / HOUR_IN_MINUTES) * CELL_HEIGHT);
    } catch (e) {
      console.error("Error calculating appointment height:", startTime, endTime, e);
      return 10;
    }
  };

  const calculateAppointmentOffset = (startTime: string | null): number => {
    if (!startTime) return 0;
    try {
      const start = parseISO(startTime);
      if (!isValid(start)) return 0;
      const minutes = start.getMinutes();
      return (minutes / HOUR_IN_MINUTES) * CELL_HEIGHT;
    } catch (e) {
      console.error("Error calculating appointment offset:", startTime, e);
      return 0;
    }
  };

  // Get appointments for a specific time slot, including cancelled ones
  const getAppointmentsForTimeSlot = (date: Date, timeSlot: string): AppointmentWithDetails[] => {
    const slotStart = new Date(date);
    const [hours, minutes] = timeSlot.split(':').map(Number);
    slotStart.setHours(hours, minutes, 0, 0);
    const slotEnd = new Date(slotStart);
    slotEnd.setHours(hours + 1, minutes, 0, 0);

    if (!Array.isArray(appointments)) return [];

    // Don't filter cancelled here, handle visually
    const filteredAppointments = appointments.filter(apt => {
      if (!apt || !apt.start_time || !apt.end_time) return false;
      try {
        const aptStart = parseISO(apt.start_time);
        const aptEnd = parseISO(apt.end_time);
        if (!isValid(aptStart) || !isValid(aptEnd)) {
          console.warn("Invalid date found in appointment, skipping:", apt);
          return false;
        }
        return aptStart < slotEnd && aptEnd > slotStart;
      } catch (e) {
        console.error("Error parsing appointment dates:", apt, e);
        return false;
      }
    });
    return filteredAppointments;
  };

  // Get appointments for a specific day, including cancelled ones
  const getAppointmentsForDay = (date: Date): AppointmentWithDetails[] => {
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);

    if (!Array.isArray(appointments)) return [];

    // Don't filter cancelled here, handle visually
    return appointments.filter(apt => {
       if (!apt || !apt.start_time) return false;
       try {
        const aptStart = parseISO(apt.start_time);
         if (!isValid(aptStart)) {
          console.warn("Invalid start date found in appointment, skipping:", apt);
          return false;
        }
        return aptStart >= dayStart && aptStart <= dayEnd;
      } catch (e) {
        console.error("Error parsing appointment start date:", apt, e);
        return false;
      }
    });
  };

  // --- PatientForm Callbacks ---
  const handlePatientFormSuccess = async (newPatientId?: string) => {
    if (!newPatientId) {
      console.error("PatientForm onSuccess called without a patient ID.");
      // Optionally show a toast or alert
      setBookingStep('patient-select'); // Go back if no ID
      return;
    }
    try {
      // Fetch the newly created patient to get all details
      const newPatient = await api.patients.getById(newPatientId);
      if (!newPatient) {
        throw new Error("Failed to fetch newly created patient details.");
      }
      setSelectedPatient(newPatient as PatientRow); // Set the selected patient
      setBookingStep('appointment-details'); // Move to the next step
      // Keep the modal open
    } catch (error) {
      console.error("Error after creating patient:", error);
      alert(`Patient created, but failed to fetch details: ${error instanceof Error ? error.message : 'Unknown error'}. Please select the patient manually.`);
      setBookingStep('patient-select'); // Go back to selection
    }
  };

  const handlePatientFormCancel = () => {
    setBookingStep('patient-select'); // Go back to patient selection
    // Keep the modal open
  };
  // --- End PatientForm Callbacks ---

  // --- Navigation Handlers ---
  const handlePreviousWeek = () => setSelectedDate(subWeeks(selectedDate, 1));
  const handleNextWeek = () => setSelectedDate(addWeeks(selectedDate, 1));
  const handlePreviousDay = () => setSelectedDate(addDays(selectedDate, -1));
  const handleNextDay = () => setSelectedDate(addDays(selectedDate, 1));
  const handlePreviousMonth = () => setSelectedDate(subMonths(selectedDate, 1));
  const handleNextMonth = () => setSelectedDate(addMonths(selectedDate, 1));

  const handleGoToDate = () => {
    const parsedDate = parse(dateInput, 'dd/MM/yyyy', new Date());
    if (isValid(parsedDate)) {
      setSelectedDate(parsedDate);
      setDateInput('');
    } else {
      toast({ variant: "destructive", title: "Invalid Date Format", description: "Please enter date as DD/MM/YYYY." });
    }
  };

  // --- Slot Click Handler ---
  const handleSlotClick = (date: Date, time: string) => {
    const todayStart = startOfDay(new Date());
    const clickedDayStart = startOfDay(date);

    // Check if the selected date is before today
    if (isBefore(clickedDayStart, todayStart)) {
      toast({
        variant: "destructive",
        title: "Booking Restricted",
        description: "Cannot book appointments for past dates.",
      });
      return; // Prevent opening the modal
    }

    // Proceed if the date is valid (today or future)
    setSelectedSlot({ date, time });
    setBookingStep('patient-select');
    setSelectedPatient(null);
    setSelectedDoctor(null);
    setAppointmentFormData({ type: 'checkup', duration: '30', notes: '', reason_for_visit: '' }); // Added missing reason_for_visit reset
    setShowBookingModal(true);
    // Fetch available doctors when opening modal via slot click
    const duration = parseInt(appointmentFormData.duration); // Use default duration initially
    fetchAvailableDoctorsForSlot(date, time, duration);
  };

  // --- Render Functions ---

  const renderPatientSelectionStep = () => (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="Search patients by name, email, or phone..."
          value={patientSearchQuery}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handlePatientSearch(e.target.value)}
        />
        <Button onClick={() => {
          setBookingStep('new-patient');
          setSelectedDoctor(null); // Explicitly reset doctor selection
        }}>
          <Plus className="h-4 w-4 mr-2" />
          New Patient
        </Button>
      </div>
      <div className="h-[300px] overflow-y-auto space-y-2">
        {Array.isArray(patients) && patients.map((patient) => (
          <Button
            key={patient.id}
            variant="outline"
            className="w-full justify-start"
            onClick={() => {
              setSelectedPatient(patient);
              setBookingStep('appointment-details');
            }}
          >
            <div className="flex items-center">
              <User className="h-4 w-4 mr-2" />
              <div className="text-left">
                <p className="font-medium">{`${patient.first_name} ${patient.last_name}`}</p>
                <p className="text-sm text-muted-foreground">{patient.phone || 'No phone'}</p>
              </div>
            </div>
          </Button>
        ))}
      </div>
    </div>
  );

  const renderAppointmentDetailsStep = () => {
    return (
      <div className="space-y-4">
        {/* Conditionally render Date/Time inputs if no slot is selected */}
        {!selectedSlot && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="manual-date">Date</Label>
              <Input
                id="manual-date"
                type="date"
                value={manualDate ? format(manualDate, 'yyyy-MM-dd') : ''}
                onChange={(e) => setManualDate(e.target.value ? parseISO(e.target.value) : null)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="manual-time">Time</Label>
              <Input
                id="manual-time"
                type="time"
                value={manualTime}
                onChange={(e) => setManualTime(e.target.value)}
              />
            </div>
          </div>
        )}
        <div className="space-y-2">
          <Label>Select Doctor</Label>
          <Select
            value={selectedDoctor?.id || ''}
            onValueChange={(value) => {
              const doctor = availableDoctors.find(d => d.id === value); // Find from available doctors
              setSelectedDoctor(doctor || null);
            }}
            disabled={isLoadingDoctors} // Disable while loading
          >
            <SelectTrigger>
              <SelectValue placeholder={isLoadingDoctors ? "Loading doctors..." : "Choose an available doctor"} />
            </SelectTrigger>
            <SelectContent>
              {!isLoadingDoctors && availableDoctors.length === 0 && (
                <SelectItem value="no-doctors" disabled>No doctors available for this slot</SelectItem>
              )}
              {availableDoctors.map((doctor) => (
                <SelectItem key={doctor.id} value={doctor.id}>
                  Dr. {doctor.first_name} {doctor.last_name} {doctor.specialization && `(${doctor.specialization})`}
                </SelectItem>
              ))}
              {/* Optionally show unavailable doctors, disabled */}
              {/* {allDoctors.filter(doc => !availableDoctors.some(avail => avail.id === doc.id)).map(doctor => (
                <SelectItem key={doctor.id} value={doctor.id} disabled>
                  Dr. {doctor.first_name} {doctor.last_name} (Unavailable)
                </SelectItem>
              ))} */}
            </SelectContent>
          </Select>
        </div>
        {selectedPatient && (
          <div className="flex items-center space-x-4 p-4 bg-muted rounded-lg">
            <User className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">{`${selectedPatient.first_name} ${selectedPatient.last_name}`}</p>
              <p className="text-sm text-muted-foreground">{selectedPatient.phone || 'No phone'}</p>
            </div>
          </div>
        )}
        <div className="space-y-2">
          <Label>Appointment Type</Label>
          <Select value={appointmentFormData.type} onValueChange={(value) => setAppointmentFormData({ ...appointmentFormData, type: value })}>
            <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="checkup">Checkup</SelectItem>
              <SelectItem value="cleaning">Cleaning</SelectItem>
              <SelectItem value="filling">Filling</SelectItem>
              <SelectItem value="root-canal">Root Canal</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Duration</Label>
          <Select
            value={appointmentFormData.duration}
            onValueChange={(value) => {
              setAppointmentFormData({ ...appointmentFormData, duration: value });
              // Re-fetch doctors when duration changes
              const durationMinutes = parseInt(value);
              let effectiveDate: Date | null = null;
              let effectiveTime: string = '';
              if (selectedSlot) {
                effectiveDate = selectedSlot.date;
                effectiveTime = selectedSlot.time;
              } else if (manualDate && manualTime) {
                effectiveDate = manualDate;
                effectiveTime = manualTime;
              }
              if (effectiveDate && effectiveTime && !isNaN(durationMinutes)) {
                 fetchAvailableDoctorsForSlot(effectiveDate, effectiveTime, durationMinutes);
              }
            }}
          >
            <SelectTrigger><SelectValue placeholder="Select duration" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="30">30 minutes</SelectItem>
              <SelectItem value="60">1 hour</SelectItem>
              <SelectItem value="90">1.5 hours</SelectItem>
              <SelectItem value="120">2 hours</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {/* Added Reason for Visit field */}
        <div className="space-y-2">
          <Label htmlFor="reason-for-visit">Reason for Visit</Label>
          <Textarea
            id="reason-for-visit"
            value={appointmentFormData.reason_for_visit}
            onChange={(e) => setAppointmentFormData({ ...appointmentFormData, reason_for_visit: e.target.value })}
            placeholder="Briefly describe the reason for your visit..."
          />
        </div>
        {/* End Added Reason for Visit field */}
        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" value={appointmentFormData.notes} onChange={(e) => setAppointmentFormData({ ...appointmentFormData, notes: e.target.value })} placeholder="Add any other relevant notes..." />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setBookingStep('patient-select')}>Back</Button>
          <Button onClick={() => handleBookAppointment(appointmentFormData)}>Book Appointment</Button>
        </DialogFooter>
      </div>
    );
  };

  // Render the calendar based on the current view
  const renderCalendar = () => {
    if (view === 'day') return renderDayView();
    if (view === 'week') return renderWeekView();
    if (view === 'month') return renderMonthView();
    return null; // Should not happen
  };

  // Week view
  const renderWeekView = () => {
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
    const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

    return (
      <Card>
        <div className="grid grid-cols-8 border-b">
          <div className="p-4 font-medium text-muted-foreground">Time</div>
          {daysInWeek.map((day) => (
            <div key={day.toISOString()} className={`p-4 text-center border-l ${isToday(day) ? 'bg-blue-50' : ''}`}>
              <div className="font-medium">{format(day, 'EEE')}</div>
              <div className="text-sm text-muted-foreground">{format(day, 'd')}</div>
            </div>
          ))}
        </div>
        <div>
          {timeSlots.map((time) => (
            <div key={time} className="grid grid-cols-8 border-b last:border-0">
              <div className="p-4 text-sm text-right text-muted-foreground">{time}</div>
              {daysInWeek.map((day) => {
                const slotAppointments = getAppointmentsForTimeSlot(day, time);
                const totalInSlot = slotAppointments.length;
                return (
                  <div key={day.toISOString()} onClick={() => handleSlotClick(day, time)} className={`border-l p-2 relative ${slotAppointments.some(apt => apt.status !== 'cancelled') ? 'bg-blue-50/50' : ''} hover:bg-muted/50 cursor-pointer transition-colors`} style={{ height: `${CELL_HEIGHT}px` }}>
                    {slotAppointments.map((apt, index) => {
                      // Overlap handling: Adjust width/left, reduce horizontal padding
                      const calculatedWidth = totalInSlot > 1 ? `${100 / totalInSlot - 4}%` : '95%'; // Increased gap slightly
                      const calculatedLeft = totalInSlot > 1 ? `${index * (100 / totalInSlot) + 1}%` : '2.5%'; // Added small offset

                      return (
                      <div
                        key={apt.id}
                        className={`text-sm px-1 py-2 absolute rounded-md transition-colors ${ // Changed p-2 to px-1 py-2, removed overflow-hidden
                          apt.status === 'cancelled'
                            ? 'bg-red-100/50 text-red-700/60 border border-red-200 line-through opacity-70'
                            : 'bg-primary/10 text-primary hover:bg-primary/20'
                        }`}
                        onClick={(e) => handleAppointmentClick(e, apt)}
                        style={{
                          height: `${calculateAppointmentHeight(apt.start_time, apt.end_time)}px`,
                          top: `${calculateAppointmentOffset(apt.start_time)}px`,
                          zIndex: apt.status === 'cancelled' ? 5 : 10 + index, // Adjust zIndex slightly based on index
                          width: calculatedWidth, // Apply calculated width
                          left: calculatedLeft,   // Apply calculated left offset
                        }}
                        title={`${apt.type}${apt.status === 'cancelled' ? ' (Cancelled)' : ''} - ${apt.start_time ? format(parseISO(apt.start_time), 'h:mm a') : ''} to ${apt.end_time ? format(parseISO(apt.end_time), 'h:mm a') : ''}`}
                      >
                        <div className="font-medium">
                          <div>{apt.patients?.first_name} {apt.patients?.last_name}</div>
                          <div className="text-xs text-muted-foreground">Dr. {apt.staff?.first_name} {apt.staff?.last_name}</div>
                        </div>
                        <div className="text-xs">{apt.type} ({apt.start_time ? format(parseISO(apt.start_time), 'h:mm a') : ''} - {apt.end_time ? format(parseISO(apt.end_time), 'h:mm a') : ''})</div>
                         {apt.status === 'cancelled' && <div className="text-xs font-semibold text-red-700/80">(Cancelled)</div>}
                      </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </Card>
    );
  };

  // Day view
  const renderDayView = () => {
    return (
      <Card>
        <div className="grid grid-cols-2 border-b">
          <div className="p-4 font-medium text-muted-foreground">Time</div>
          <div className={`p-4 text-center border-l ${isToday(selectedDate) ? 'bg-blue-50' : ''}`}>
            <div className="font-medium">{format(selectedDate, 'EEEE')}</div>
            <div className="text-sm text-muted-foreground">{format(selectedDate, 'MMMM d, yyyy')}</div>
          </div>
        </div>
        <div>
          {timeSlots.map((time) => {
            const slotAppointments = getAppointmentsForTimeSlot(selectedDate, time);
            const totalInSlot = slotAppointments.length;
            return (
              <div key={time} className="grid grid-cols-2 border-b last:border-0">
                <div className="p-4 text-sm text-right text-muted-foreground">{time}</div>
                <div onClick={() => handleSlotClick(selectedDate, time)} className={`border-l p-2 relative ${slotAppointments.some(apt => apt.status !== 'cancelled') ? 'bg-blue-50/50' : ''} hover:bg-muted/50 cursor-pointer transition-colors`} style={{ height: `${CELL_HEIGHT}px` }}>
                  {slotAppointments.map((apt, index) => {
                     // Overlap handling: Adjust width/left, reduce horizontal padding
                     const calculatedWidth = totalInSlot > 1 ? `${100 / totalInSlot - 4}%` : '95%'; // Increased gap slightly
                     const calculatedLeft = totalInSlot > 1 ? `${index * (100 / totalInSlot) + 1}%` : '2.5%'; // Added small offset

                     return (
                     <div
                        key={apt.id}
                        className={`text-sm px-1 py-2 absolute rounded-md transition-colors ${ // Changed p-2 to px-1 py-2, removed overflow-hidden
                          apt.status === 'cancelled'
                            ? 'bg-red-100/50 text-red-700/60 border border-red-200 line-through opacity-70'
                            : 'bg-primary/10 text-primary hover:bg-primary/20'
                        }`}
                        onClick={(e) => handleAppointmentClick(e, apt)}
                        style={{
                          height: `${calculateAppointmentHeight(apt.start_time, apt.end_time)}px`,
                          top: `${calculateAppointmentOffset(apt.start_time)}px`,
                          zIndex: apt.status === 'cancelled' ? 5 : 10 + index, // Adjust zIndex slightly based on index
                          width: calculatedWidth, // Apply calculated width
                          left: calculatedLeft,   // Apply calculated left offset
                        }}
                        title={`${apt.type}${apt.status === 'cancelled' ? ' (Cancelled)' : ''} - ${apt.start_time ? format(parseISO(apt.start_time), 'h:mm a') : ''} to ${apt.end_time ? format(parseISO(apt.end_time), 'h:mm a') : ''}`}
                      >
                      <div className="font-medium">
                        <div>{apt.patients?.first_name} {apt.patients?.last_name}</div>
                        <div className="text-xs text-muted-foreground">Dr. {apt.staff?.first_name} {apt.staff?.last_name}</div>
                      </div>
                      <div className="text-xs">{apt.type} ({apt.start_time ? format(parseISO(apt.start_time), 'h:mm a') : ''} - {apt.end_time ? format(parseISO(apt.end_time), 'h:mm a') : ''})</div>
                       {apt.status === 'cancelled' && <div className="text-xs font-semibold text-red-700/80">(Cancelled)</div>}
                    </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    );
  };

  // Month view
  const renderMonthView = () => {
    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    const weeks: Date[][] = [];
    let week: Date[] = [];
    days.forEach((day: Date) => {
      week.push(day);
      if (week.length === 7) {
        weeks.push(week);
        week = [];
      }
    });
    if (week.length > 0) weeks.push(week);

    return (
      <Card>
        <div className="grid grid-cols-7 border-b">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (<div key={day} className="p-2 text-center font-medium">{day}</div>))}
        </div>
        <div>
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-7">
              {week.map((day) => {
                const dayAppointments = getAppointmentsForDay(day);
                const isCurrentMonth = isSameMonth(day, selectedDate);
                const nonCancelledAppointments = dayAppointments.filter(apt => apt.status !== 'cancelled'); // Filter here for count
                return (
                  <div key={day.toISOString()} onClick={() => { setSelectedDate(day); setView('day'); }} className={`border p-2 min-h-[120px] relative ${!isCurrentMonth ? 'bg-gray-100 text-gray-400' : isToday(day) ? 'bg-blue-50' : ''} hover:bg-muted/50 cursor-pointer transition-colors`}>
                    <div className={`text-right font-medium ${isToday(day) ? 'text-blue-600' : ''}`}>{format(day, 'd')}</div>
                    <div className="mt-1 space-y-1 overflow-hidden max-h-[80px]">
                      {dayAppointments.slice(0, 3).map((apt) => (
                        <div
                          key={apt.id}
                          className={`text-xs p-1 rounded truncate ${
                            apt.status === 'cancelled'
                              ? 'bg-red-100/50 text-red-700/60 line-through opacity-70'
                              : 'bg-primary/10 text-primary'
                          }`}
                          onClick={(e) => { e.stopPropagation(); handleAppointmentClick(e, apt); }}
                        >
                          {apt.start_time ? format(parseISO(apt.start_time), 'HH:mm') : ''} - {apt.patients?.first_name} {apt.status === 'cancelled' ? '(C)' : ''}
                        </div>
                      ))}
                      {/* Show count of non-cancelled appointments if more than 3 total */}
                      {dayAppointments.length > 3 && (<div className="text-xs text-muted-foreground text-center">+{nonCancelledAppointments.length - 3} more</div>)}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </Card>
    );
  };

  // Navigation controls based on current view
  const renderNavigation = () => {
    let dateLabel = '';
    let prevHandler;
    let nextHandler;
    if (view === 'day') { dateLabel = format(selectedDate, 'MMMM d, yyyy'); prevHandler = handlePreviousDay; nextHandler = handleNextDay; }
    else if (view === 'week') { const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 }); const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 }); dateLabel = `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`; prevHandler = handlePreviousWeek; nextHandler = handleNextWeek; }
    else if (view === 'month') { dateLabel = format(selectedDate, 'MMMM yyyy'); prevHandler = handlePreviousMonth; nextHandler = handleNextMonth; }
    return (
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={prevHandler}><ChevronLeft className="h-4 w-4" /></Button>
        <span className="text-sm font-medium">{dateLabel}</span>
        <Button variant="outline" size="icon" onClick={nextHandler}><ChevronRight className="h-4 w-4" /></Button>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader heading="Appointments" text="Manage and schedule patient appointments">
        <div className="flex items-center gap-4">
          <Tabs value={view} onValueChange={(v) => setView(v as 'month' | 'week' | 'day')} className="w-fit">
            <TabsList>
              <TabsTrigger value="month">Month</TabsTrigger>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="day">Day</TabsTrigger>
            </TabsList>
          </Tabs>
          {renderNavigation()}
          <div className="flex gap-2 ml-auto">
            <Input className="w-32" placeholder="DD/MM/YYYY" value={dateInput} onChange={(e) => setDateInput(e.target.value)} />
            <Button variant="outline" onClick={handleGoToDate}>Go to Date</Button>
          </div>
          <Button onClick={() => {
            setSelectedSlot(null);
            setBookingStep('patient-select');
            setShowBookingModal(true);
            setAvailableDoctors([]); // Clear available doctors when opening for manual entry
            setSelectedDoctor(null); // Reset selected doctor
          }}>
            <Plus className="h-4 w-4 mr-2" /> New Appointment
          </Button>
        </div>
      </PageHeader>
      {renderCalendar()}
      <Dialog open={showBookingModal} onOpenChange={setShowBookingModal}>
        {/* Remove max-width, keep overflow-y-auto */}
        <DialogContent className="overflow-y-auto">
          <DialogHeader>
            {/* Update Dialog Title based on step */}
            <DialogTitle>{bookingStep === 'patient-select' ? 'Select Patient' : bookingStep === 'new-patient' ? 'New Patient Registration' : 'Appointment Details'}</DialogTitle>
            {/* Update Dialog Description based on step */}
            {selectedSlot && bookingStep !== 'new-patient' && (<DialogDescription>{format(selectedSlot.date, 'MMMM d, yyyy')} at {selectedSlot.time}</DialogDescription>)}
            {bookingStep === 'new-patient' && (<DialogDescription>Enter the new patient's details below.</DialogDescription>)}
          </DialogHeader>
          {/* Wrap content steps in a div with height and overflow */}
          <div className="max-h-[75vh] overflow-y-auto p-4">
            {bookingStep === 'patient-select' && renderPatientSelectionStep()}
            {/* Render PatientForm in simplified mode when bookingStep is 'new-patient' */}
            {bookingStep === 'new-patient' && <PatientForm mode="simplified" onSuccess={handlePatientFormSuccess} onCancel={handlePatientFormCancel} />}
            {bookingStep === 'appointment-details' && renderAppointmentDetailsStep()}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={showAppointmentModal} onOpenChange={setShowAppointmentModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Appointment Details</DialogTitle>
            {selectedAppointment && selectedAppointment.start_time && (
              <DialogDescription>
                {format(parseISO(selectedAppointment.start_time), 'MMMM d, yyyy')} at{' '}
                {format(parseISO(selectedAppointment.start_time), 'h:mm a')}
              </DialogDescription>
            )}
          </DialogHeader>
          {selectedAppointment && (
            <div className="space-y-4">
              <div className="flex items-center space-x-4 p-4 bg-muted rounded-lg">
                <User className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{selectedAppointment.patients?.first_name} {selectedAppointment.patients?.last_name}</p>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Phone className="h-3.5 w-3.5 mr-1" />
                    {selectedAppointment.patients?.phone || 'No phone number'}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                {/* Treat 'confirmed' like 'scheduled' for display purposes */}
                <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  selectedAppointment.status === 'completed' ? 'bg-green-100 text-green-800'
                  : selectedAppointment.status === 'cancelled' ? 'bg-red-100 text-red-800'
                  : 'bg-blue-100 text-blue-800' // Default blue for scheduled/confirmed
                }`}>
                  {selectedAppointment.status}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                {/* Allow editing if status is scheduled OR confirmed */}
                <Select value={selectedAppointment.type} onValueChange={(value) => setSelectedAppointment({ ...selectedAppointment, type: value })} disabled={selectedAppointment.status !== 'scheduled' && selectedAppointment.status !== 'confirmed'}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="checkup">Checkup</SelectItem>
                    <SelectItem value="cleaning">Cleaning</SelectItem>
                    <SelectItem value="filling">Filling</SelectItem>
                    <SelectItem value="root-canal">Root Canal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                 {/* Allow editing if status is scheduled OR confirmed */}
                <Textarea value={selectedAppointment.notes || ''} onChange={(e) => setSelectedAppointment({ ...selectedAppointment, notes: e.target.value })} placeholder="Add any notes about the appointment..." disabled={selectedAppointment.status !== 'scheduled' && selectedAppointment.status !== 'confirmed'} />
              </div>
              <DialogFooter>
                 {/* Show Cancel/Update buttons if status is scheduled OR confirmed */}
                {(selectedAppointment.status === 'scheduled' || selectedAppointment.status === 'confirmed') && (
                  <>
                    <Button variant="destructive" onClick={handleCancelAppointment}>Cancel Appointment</Button>
                    <Button onClick={() => handleUpdateAppointment({ type: selectedAppointment.type, notes: selectedAppointment.notes || '' })}>Update Appointment</Button>
                  </>
                )}
                 {/* Show Close button if status is NOT scheduled or confirmed */}
                {selectedAppointment.status !== 'scheduled' && selectedAppointment.status !== 'confirmed' && (<Button variant="outline" onClick={() => setShowAppointmentModal(false)}>Close</Button>)}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
