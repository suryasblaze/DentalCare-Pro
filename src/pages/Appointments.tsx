import React, { useState, useEffect } from 'react';
// Import subHours correctly and Database type
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, parseISO, parse, isValid, addMonths, subMonths, startOfMonth, endOfMonth, isSameMonth, isToday, startOfDay, endOfDay, subHours, isBefore, formatISO } from 'date-fns'; // Added isBefore, formatISO
import { Plus, ChevronLeft, ChevronRight, User, Phone, Clock, Tag, Armchair, Ban, Briefcase, Loader2 } from 'lucide-react'; // Added Clock, Tag, Armchair, Ban, Briefcase, Loader2
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"; // Import Tooltip
// Import PatientForm
import { PatientForm } from '@/features/patients/components/PatientForm';
// Import Database type and specific table types from the correct path
import type { Database } from '@/../supabase_types'; // Corrected import path
type AppointmentRow = Database['public']['Tables']['appointments']['Row'];
type PatientRow = Database['public']['Tables']['patients']['Row'];
type StaffRow = Database['public']['Tables']['staff']['Row'];
// Import TreatmentVisit type
import type { TreatmentVisit } from '@/features/treatment-plans/components/TreatmentPlanDetails';
import { useSearchParams, useNavigate } from 'react-router-dom'; // Import useSearchParams and useNavigate

// Define Appointment type based on API response (including nested data)
type AppointmentWithDetails = AppointmentRow & {
  patients: Pick<PatientRow, 'id' | 'first_name' | 'last_name' | 'email' | 'phone'> | null;
  staff: Pick<StaffRow, 'id' | 'first_name' | 'last_name' | 'role' | 'specialization'> | null;
};


export function Appointments() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate(); // For clearing search params

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
  const [manualAmPm, setManualAmPm] = useState<'AM' | 'PM'>('AM'); // New state for AM/PM
  const { toast } = useToast(); // Initialize toast hook
  const CELL_HEIGHT = 100; // Increased height to accommodate cards better
  const HOUR_IN_MINUTES = 60;
  // Define some colors for appointment icons (using softer tones like reference)
  const appointmentColors = [
    'bg-blue-100 text-blue-700 border border-blue-200', // Adjusted colors for icons
    'bg-green-100 text-green-700 border border-green-200',
    'bg-purple-100 text-purple-700 border border-purple-200',
    'bg-yellow-100 text-yellow-700 border border-yellow-200',
    'bg-pink-100 text-pink-700 border border-pink-200',
    'bg-indigo-100 text-indigo-700 border border-indigo-200',
    'bg-teal-100 text-teal-700 border border-teal-200',
    // 'bg-orange-100 text-orange-700 border border-orange-200', // Keep for reference if needed later
  ];
  // Define base classes using the new custom colors
  const bookedColor = 'bg-booked-bg text-booked-icon border border-booked-border';
  const cancelledColor = 'bg-canceled-bg text-canceled-icon border border-canceled-border line-through opacity-70';

  // States for redirected data
  const [redirectedTreatmentId, setRedirectedTreatmentId] = useState<string | null>(null);
  const [isBooking, setIsBooking] = useState(false); // New loading state for booking button

  const [appointmentFormData, setAppointmentFormData] = useState({
    type: 'checkup',
    duration: '30',
    notes: '',
    reason_for_visit: '', // Added reason for visit
    treatment_id: null as string | null, // To store treatmentId from redirect
  });
  // Remove newPatientData state - PatientForm handles its own state

  const timeSlots = Array.from({ length: 11 }, (_, i) => {
    const hour = i + 8;
    return format(new Date().setHours(hour, 0), 'HH:mm');
  });

  // State for linked treatment visit details
  const [detailedTreatmentVisit, setDetailedTreatmentVisit] = useState<TreatmentVisit | null>(null);
  const [detailedTreatmentPlanTitle, setDetailedTreatmentPlanTitle] = useState<string | null>(null);
  const [isLoadingTreatmentDetails, setIsLoadingTreatmentDetails] = useState(false);

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

  // Effect to handle incoming query parameters from Treatment Plan
  useEffect(() => {
    const dateStr = searchParams.get('date');
    const patientId = searchParams.get('patientId');
    const treatmentId = searchParams.get('treatmentId');
    const description = searchParams.get('description');

    let redirectedDate: Date | null = null;

    if (dateStr) {
      const parsedRedirectDate = parseISO(dateStr); // Dates from treatment plan should be yyyy-MM-dd
      if (isValid(parsedRedirectDate)) {
        redirectedDate = parsedRedirectDate;
        setSelectedDate(redirectedDate); // Set calendar to this date
        // Ensure the view updates if necessary, e.g., switch to day or week view centered on this date
        // For simplicity, just setting selectedDate. User can change view.
      } else {
        console.warn("Invalid date received from query params:", dateStr);
        toast({ title: "Invalid Date", description: "The date from the treatment plan was invalid.", variant: "destructive" });
      }
    }

    if (patientId && redirectedDate) { // Only proceed if we have a patient and a valid date
      const fetchAndSetPatient = async () => {
        try {
          const patientData = await api.patients.getById(patientId);
          if (patientData) {
            setSelectedPatient(patientData as PatientRow);
            setAppointmentFormData(prev => ({
              ...prev,
              type: 'Scheduled Visit', // Set generic type
              reason_for_visit: description || '', // Store actual description here
              treatment_id: treatmentId || null,
            }));
            setManualDate(redirectedDate); // Pre-fill manualDate for the form
            setBookingStep('appointment-details'); // Go directly to details
            setShowBookingModal(true);
            setRedirectedTreatmentId(treatmentId);

            // Clear search params after use to prevent re-triggering on refresh or back navigation
            setSearchParams({}, { replace: true });

          } else {
            toast({ title: "Patient Not Found", description: "Could not find the patient specified by the treatment plan.", variant: "destructive" });
            setRedirectedTreatmentId(null); // Clear if patient not found
          }
        } catch (error) {
          console.error("Error fetching patient from redirect:", error);
          toast({ title: "Error", description: "Could not fetch patient details from the treatment plan.", variant: "destructive" });
          setRedirectedTreatmentId(null); // Clear on error
        }
      };
      fetchAndSetPatient();
    } else if (dateStr || patientId || treatmentId || description) {
      // If some params are present but not enough to auto-open modal, just log or clear them
      console.log("Partial booking parameters received, not auto-opening modal.", { dateStr, patientId, treatmentId });
      setRedirectedTreatmentId(null); // Clear if params are incomplete for auto-booking
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]); // Rerun if searchParams change (e.g. on initial load with params)

  // Effect to fetch available doctors when modal is open and relevant details change
  useEffect(() => {
    if (showBookingModal && bookingStep === 'appointment-details') {
      const durationMinutes = parseInt(appointmentFormData.duration);
      let effectiveDate: Date | null = null;
      let effectiveTime: string = ''; // Expected in HH:mm (24-hour)

      if (selectedSlot) {
        effectiveDate = selectedSlot.date;
        effectiveTime = selectedSlot.time; // This is already HH:mm (24-hour)
      } else if (manualDate && manualTime) { 
        effectiveDate = manualDate;
        const timeParts = manualTime.split(':');
        if (timeParts.length === 2) {
          let hours = parseInt(timeParts[0], 10);
          let minutes = parseInt(timeParts[1], 10);

          if (!isNaN(hours) && !isNaN(minutes) && hours >= 1 && hours <= 12 && minutes >= 0 && minutes <= 59) {
            if (manualAmPm === 'PM' && hours < 12) {
              hours += 12;
            } else if (manualAmPm === 'AM' && hours === 12) { // 12 AM is 00 hours
              hours = 0;
            }
            // For 12 PM (noon), hours remains 12.
            // For 1 AM to 11 AM, hours < 12, hours remains as is.
            effectiveTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
          } else {
            setAvailableDoctors([]); 
            return; 
          }
        } else {
          setAvailableDoctors([]); 
          return; 
        }
      }

      if (effectiveDate && effectiveTime && !isNaN(durationMinutes) && durationMinutes > 0) {
        fetchAvailableDoctorsForSlot(effectiveDate, effectiveTime, durationMinutes);
      } else {
        setAvailableDoctors([]);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showBookingModal, bookingStep, selectedSlot, manualDate, manualTime, manualAmPm, appointmentFormData.duration]); // Added manualAmPm

  // Effect to fetch treatment details when an appointment is selected
  useEffect(() => {
    const fetchTreatmentDetails = async () => {
      if (selectedAppointment && selectedAppointment.treatment_id) {
        setIsLoadingTreatmentDetails(true);
        setDetailedTreatmentVisit(null);
        setDetailedTreatmentPlanTitle(null);
        try {
          const visit = await api.patients.getTreatmentVisitById(selectedAppointment.treatment_id);
          if (visit) {
            setDetailedTreatmentVisit(visit as TreatmentVisit); // Cast if necessary, ensure type alignment
            if (visit.treatment_plan_id) {
              const planDetails = await api.patients.getTreatmentPlanDetails(visit.treatment_plan_id);
              if (planDetails && planDetails.data) {
                setDetailedTreatmentPlanTitle(planDetails.data.title || 'Unnamed Plan');
              } else {
                console.warn('Could not fetch plan details for plan ID:', visit.treatment_plan_id);
                setDetailedTreatmentPlanTitle('Plan details unavailable');
              }
            } else {
               setDetailedTreatmentPlanTitle('Plan ID missing in visit');
            }
          } else {
            console.warn('Could not fetch treatment visit for ID:', selectedAppointment.treatment_id);
          }
        } catch (error) {
          console.error('Error fetching treatment details for appointment:', error);
          toast({
            title: "Error",
            description: "Could not load related treatment details for this appointment.",
            variant: "destructive",
          });
        } finally {
          setIsLoadingTreatmentDetails(false);
        }
      } else {
        // Clear details if no appointment selected or no treatment_id
        setDetailedTreatmentVisit(null);
        setDetailedTreatmentPlanTitle(null);
        setIsLoadingTreatmentDetails(false);
      }
    };

    if (showAppointmentModal) { // Only fetch when modal is shown or about to be shown
        fetchTreatmentDetails();
    } else { // Clear details when modal is closed
        setDetailedTreatmentVisit(null);
        setDetailedTreatmentPlanTitle(null);
        setIsLoadingTreatmentDetails(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAppointment, showAppointmentModal]); // Add toast to dependencies if used directly in this effect

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
    console.log("handleBookAppointment called. selectedDoctor:", selectedDoctor); 
    setIsBooking(true); 
    try {
      // Validation for patient and doctor selection (common for both flows)
      if (!selectedPatient || !selectedDoctor) {
        console.error("Booking validation failed: Missing patient or doctor", { selectedPatient, selectedDoctor });
        toast({ variant: "destructive", title: "Missing Information", description: "Please select a patient and a doctor." });
        setIsBooking(false);
        return;
      }

      let startDate: Date;
      const todayStart = startOfDay(new Date());

      if (selectedSlot) {
        startDate = new Date(selectedSlot.date);
        const [startHour, startMinute] = selectedSlot.time.split(':').map(Number);
        startDate.setHours(startHour, startMinute, 0, 0);
      } else {
        if (!manualDate || !manualTime) {
          toast({ variant: "destructive", title: "Missing Information", description: "Please select a date and time (hh:mm)." });
          setIsBooking(false);
          return;
        }
        
        const timeParts = manualTime.split(':');
        if (timeParts.length === 2) {
          let hours = parseInt(timeParts[0], 10);
          let minutes = parseInt(timeParts[1], 10);

          if (!isNaN(hours) && !isNaN(minutes) && hours >= 1 && hours <= 12 && minutes >= 0 && minutes <= 59) {
            if (manualAmPm === 'PM' && hours < 12) {
              hours += 12;
            } else if (manualAmPm === 'AM' && hours === 12) { // 12 AM is 00 hours
              hours = 0;
            }
            // if (manualAmPm === 'PM' && hours === 12) hours remains 12 (Noon)
            // if (manualAmPm === 'AM' && hours < 12) hours remains as is (e.g. 9 AM is 9)
            
            startDate = new Date(manualDate);
            startDate.setHours(hours, minutes, 0, 0);

            if (!isValid(startDate)) {
              toast({ variant: "destructive", title: "Invalid Date/Time", description: "The constructed date/time is invalid." });
              setIsBooking(false); return;
            }
          } else {
            toast({ variant: "destructive", title: "Invalid Time", description: "Please enter a valid time in hh:mm format (01-12 for hours, 00-59 for minutes)." });
            setIsBooking(false); return;
          }
        } else {
          toast({ variant: "destructive", title: "Invalid Time Format", description: "Please use hh:mm format for time."});
          setIsBooking(false); return;
        }
      }

      const now = new Date(); 
      if (isBefore(startOfDay(startDate), todayStart)) {
        toast({
          variant: "destructive",
          title: "Booking Restricted",
          description: "Cannot book appointments for past dates.",
        });
        setIsBooking(false);
        return; 
      }
      if (isToday(startDate) && isBefore(startDate, now)) {
         toast({
           variant: "destructive",
           title: "Booking Restricted",
           description: "Cannot book appointments for past times on the current day.",
         });
         setIsBooking(false);
         return; 
      }

      const durationMinutes = parseInt(formData.duration);
      if (isNaN(durationMinutes) || durationMinutes <= 0) {
         toast({ variant: "destructive", title: "Invalid Duration", description: "Invalid appointment duration selected." });
         setIsBooking(false);
         return;
      }
      const endDate = new Date(startDate.getTime() + durationMinutes * 60000);

      const appointmentData = {
        patient_id: selectedPatient.id,
        staff_id: selectedDoctor.id,
        title: formData.treatment_id ? 'Scheduled Visit' : formData.type,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        type: formData.treatment_id ? 'Scheduled Visit' : formData.type, 
        reason_for_visit: formData.reason_for_visit,
        notes: formData.notes,
        status: 'scheduled' as 'scheduled' | 'completed' | 'cancelled' | 'confirmed',
        treatment_id: formData.treatment_id || redirectedTreatmentId || null,
      };

      const createdAppointment = await api.appointments.create(appointmentData);

      if (createdAppointment?.id && createdAppointment.start_time && createdAppointment.patient_id) {
        const appointmentId = createdAppointment.id;
        const patientId = createdAppointment.patient_id;
        const startTime = parseISO(createdAppointment.start_time);

        try {
          await api.communications.schedule({
            patientId: patientId,
            appointmentId: appointmentId,
            type: 'appointment_reminder', 
            channel: 'app', 
            scheduledFor: new Date().toISOString(), 
            customMessage: `Your appointment for ${formData.type === 'Scheduled Visit' ? formData.reason_for_visit : formData.type} with Dr. ${selectedDoctor?.first_name} ${selectedDoctor?.last_name} on ${format(startTime, 'PPP \'at\' p')} is confirmed.`,
          });
        } catch (commError) {
          console.error("Error scheduling immediate app confirmation:", commError);
        }
        
        if (selectedPatient?.phone) {
          const reminderTime = subHours(startTime, 24);
          if (isBefore(new Date(), reminderTime)) { 
            try {
              await api.communications.schedule({
                patientId: patientId,
                appointmentId: appointmentId,
                type: 'appointment_reminder',
                channel: 'sms',
                scheduledFor: reminderTime.toISOString(),
                customMessage: `Reminder: Your appointment for ${formData.type === 'Scheduled Visit' ? formData.reason_for_visit : formData.type} with Dr. ${selectedDoctor?.first_name} ${selectedDoctor?.last_name} is tomorrow at ${format(startTime, 'p')}. Call us if you need to reschedule.`,
              });
            } catch (commError) {
              console.error("Error scheduling SMS reminder:", commError);
            }
          }
        }

        const newAppointmentDetails: AppointmentWithDetails = {
          ...(createdAppointment as AppointmentRow),
          patients: selectedPatient ? {
            id: selectedPatient.id,
            first_name: selectedPatient.first_name,
            last_name: selectedPatient.last_name,
            email: selectedPatient.email, 
            phone: selectedPatient.phone,
          } : null,
          staff: selectedDoctor ? {
            id: selectedDoctor.id,
            first_name: selectedDoctor.first_name,
            last_name: selectedDoctor.last_name,
            role: selectedDoctor.role, 
            specialization: selectedDoctor.specialization,
          } : null,
        };

        // If this booking was for a specific treatment from a plan, don't show the generic appointment modal.
        // The user will be redirected back to the plan details or the main appointments page.
        const wasBookingFromTreatmentPlan = !!redirectedTreatmentId;

        setShowBookingModal(false); 
        setSelectedAppointment(newAppointmentDetails); 
        
        if (!wasBookingFromTreatmentPlan) {
          setShowAppointmentModal(true); 
        }

        toast({
          title: "Appointment Booked Successfully!",
          description: `Appointment for ${selectedPatient?.first_name} with Dr. ${selectedDoctor?.first_name} has been scheduled.`,
        });

        setAppointmentFormData({
          type: 'checkup',
          duration: '30',
          notes: '',
          reason_for_visit: '',
          treatment_id: null,
        });
        setSelectedSlot(null);
        setManualDate(null);
        setManualTime('');
        setManualAmPm('AM');
        setBookingStep('patient-select');
        setRedirectedTreatmentId(null); // This reset is important and should remain here

        await fetchAppointments(); 

      } else {
        console.error("Failed to create appointment or missing critical data from response.", createdAppointment);
        toast({
          variant: "destructive",
          title: "Booking Failed",
          description: "Could not create the appointment. Please try again.",
        });
      }
    } catch (error) {
      console.error('Error booking appointment:', error);
      toast({ variant: "destructive", title: "Booking Error", description: `An unexpected error occurred: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.` });
    } finally {
      setIsBooking(false); // Ensure loading state is reset
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
    const now = new Date(); // Get current date and time
    const todayStart = startOfDay(now);
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

    // Check if the selected date is today AND the time is in the past
    if (isToday(date)) {
      const [hour, minute] = time.split(':').map(Number);
      const slotDateTime = new Date(date);
      slotDateTime.setHours(hour, minute, 0, 0);

      if (isBefore(slotDateTime, now)) {
        toast({
          variant: "destructive",
          title: "Booking Restricted",
          description: "Cannot book appointments for past times on the current day.",
        });
        return; // Prevent opening the modal
      }
    }

    // Proceed if the date and time are valid
    setSelectedSlot({ date, time });
    setBookingStep('patient-select');
    setSelectedPatient(null);
    setSelectedDoctor(null);
    setAppointmentFormData({ type: 'checkup', duration: '30', notes: '', reason_for_visit: '', treatment_id: null }); // Corrected: Added treatment_id: null
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
    const isTreatmentSpecificBooking = !!appointmentFormData.treatment_id; // Use appointmentFormData.treatment_id

    return (
      <div className="space-y-4">
        {(!selectedSlot || manualDate) && ( 
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="manual-date">Date</Label>
              <Input
                id="manual-date"
                type="date"
                value={manualDate ? format(manualDate, 'yyyy-MM-dd') : ''}
                onChange={(e) => setManualDate(e.target.value ? parseISO(e.target.value) : null)}
                disabled={!!selectedSlot && !isTreatmentSpecificBooking}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="manual-time-input">Time</Label>
              <div 
                className={`flex items-stretch border rounded-md overflow-hidden transition-all focus-within:ring-1 focus-within:ring-ring ${!manualTime ? 'border-red-500' : 'border-input'}`}
              >
                <Input
                  id="manual-time-input"
                  type="text"
                  value={manualTime}
                  onChange={(e) => {
                    let val = e.target.value.replace(/[^0-9]/g, '');
                    if (manualTime.length > val.length && manualTime.endsWith(':')) {
                        val = val.slice(0, -1);
                    }
                    if (val.length > 2 && !val.includes(':')) {
                      val = val.slice(0, 2) + ':' + val.slice(2);
                    }
                    setManualTime(val.slice(0, 5));
                  }}
                  placeholder="hh:mm"
                  className="border-none focus:ring-0 outline-none flex-grow p-2 min-w-[70px] text-sm"
                  required 
                />
                <Select
                  value={manualAmPm}
                  onValueChange={(value: 'AM' | 'PM') => setManualAmPm(value)}
                >
                  <SelectTrigger 
                    className="border-l border-input focus:ring-0 outline-none h-full bg-transparent px-3 text-sm rounded-l-none"
                    aria-label="Select AM or PM"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AM">AM</SelectItem>
                    <SelectItem value="PM">PM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground pt-1">
                Time required for the appointment.
              </p>
            </div>
          </div>
        )}
        <div className="space-y-2">
          <Label>Select Doctor</Label>
          <Select
            value={selectedDoctor?.id || ''}
            onValueChange={(value) => {
              const doctor = availableDoctors.find(d => d.id === value); 
              setSelectedDoctor(doctor || null);
            }}
            disabled={isLoadingDoctors} 
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
          <Select
            value={isTreatmentSpecificBooking ? 'Scheduled Visit' : appointmentFormData.type || ''}
            onValueChange={(value) => {
              if (!isTreatmentSpecificBooking) { // Only allow change if not treatment specific
                setAppointmentFormData({ ...appointmentFormData, type: value });
              }
            }}
            disabled={isTreatmentSpecificBooking} // Disable if treatment specific
          >
            <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
            <SelectContent>
              {isTreatmentSpecificBooking ? (
                <SelectItem value="Scheduled Visit">Scheduled Visit</SelectItem>
              ) : (
                <>
                  <SelectItem value="checkup">Checkup</SelectItem>
                  <SelectItem value="cleaning">Cleaning</SelectItem>
                  <SelectItem value="filling">Filling</SelectItem>
                  <SelectItem value="root-canal">Root Canal</SelectItem>
                  {/* Allow dynamic type if it's already set and not standard (e.g. from a draft) */}
                  {appointmentFormData.type &&
                    !['checkup', 'cleaning', 'filling', 'root-canal', 'Scheduled Visit'].includes(appointmentFormData.type) && (
                      <SelectItem value={appointmentFormData.type}>{appointmentFormData.type}</SelectItem>
                  )}
                </>
              )}
            </SelectContent>
          </Select>
        </div>
        {appointmentFormData.reason_for_visit && (
          <div className="space-y-2">
            <Label>Reason for Visit</Label>
            <p className="text-sm p-3 bg-muted rounded-md whitespace-pre-wrap border">
              {appointmentFormData.reason_for_visit}
            </p>
          </div>
        )}
        <div className="space-y-2">
          <Label>Duration</Label>
          <Select
            value={appointmentFormData.duration}
            onValueChange={(value) => {
              setAppointmentFormData({ ...appointmentFormData, duration: value });
              const durationMinutes = parseInt(value);
              let effectiveDate: Date | null = null;
              let effectiveTime: string = '';
              if (selectedSlot && !isTreatmentSpecificBooking) { // Prioritize selectedSlot if not treatment booking
                effectiveDate = selectedSlot.date;
                effectiveTime = selectedSlot.time;
              } else if (manualDate && manualTime) { // Fallback to manual or use for treatment booking
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
        <div className="space-y-2">
          <Label>Notes</Label>
          <Textarea value={appointmentFormData.notes} onChange={(e) => setAppointmentFormData({ ...appointmentFormData, notes: e.target.value })} placeholder="Add any notes about the appointment..." />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setBookingStep('patient-select')} disabled={isBooking}>
            Back
          </Button>
          <Button onClick={() => handleBookAppointment(appointmentFormData)} disabled={isBooking}>
            {isBooking ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Booking...</>
            ) : (
              'Book Appointment'
            )}
          </Button>
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

  // Helper to get color based on status using the new custom colors
  const getAppointmentColor = (status: string | undefined | null): string => {
    if (status === 'cancelled') {
      return cancelledColor;
    }
    // Use the booked color for scheduled, confirmed, completed, or any other non-cancelled status
    return bookedColor;
    // Removed staff-based color logic based on the request. Can be added back if needed.
  };


  // Week view
  const renderWeekView = () => {
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
    const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });
    const now = new Date(); // Get current time once for the view

    return (
      <TooltipProvider delayDuration={100}> {/* Wrap Week View content */}
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
                let isPastSlot = false;
                if (isToday(day)) {
                  const [hour, minute] = time.split(':').map(Number);
                  const slotDateTime = new Date(day);
                  slotDateTime.setHours(hour, minute, 0, 0);
                  if (isBefore(slotDateTime, now)) {
                    isPastSlot = true;
                  }
                }
                return (
                  <div
                    key={day.toISOString()}
                    onClick={() => handleSlotClick(day, time)}
                    className={`border-l p-1 relative transition-colors overflow-hidden ${
                      isPastSlot
                        ? 'bg-muted/30 cursor-not-allowed opacity-70' // Style for past slots today
                        : 'hover:bg-muted/50 cursor-pointer' // Style for bookable slots
                    }`}
                    style={{ height: `${CELL_HEIGHT}px` }} // Keep fixed height for the row
                  >
                    {/* Use flex-wrap to allow icons to wrap, align items top */}
                    <div className="flex flex-wrap gap-2 h-full items-start content-start p-1.5"> {/* Increased gap slightly */}
                      {slotAppointments.map((apt) => (
                        <Tooltip key={apt.id}>
                          <TooltipTrigger asChild>
                            {/* Render colored icon with ring and animation */}
                            <div
                              className={`w-7 h-7 rounded-md flex items-center justify-center cursor-pointer ring-2 transition-all ${getAppointmentColor(apt.status)} ${apt.status === 'cancelled' ? 'ring-canceled-ring animate-shake' : 'ring-booked-ring animate-pulse hover:ring-offset-1'}`}
                              onClick={(e) => handleAppointmentClick(e, apt)}
                            >
                              {/* Conditionally render Ban or Armchair icon */}
                              {apt.status === 'cancelled' ? (
                                <Ban className={`h-4 w-4 text-canceled-icon`} />
                              ) : (
                                <Armchair className={`h-4 w-4 text-booked-icon`} />
                              )}
                            </div>
                          </TooltipTrigger>
                          {/* Tooltip Content with full details */}
                          <TooltipContent side="top" align="center" className="bg-background border shadow-lg rounded-lg p-3 text-sm w-60">
                             <div className="flex items-center mb-2">
                               <User className="h-5 w-5 mr-2 text-muted-foreground flex-shrink-0" /> {/* Avatar Placeholder */}
                               <span className="font-semibold">{apt.patients?.first_name} {apt.patients?.last_name}</span>
                             </div>
                             <p className="text-muted-foreground text-xs mb-1">Dr. {apt.staff?.first_name} {apt.staff?.last_name}</p>
                             <p className="text-muted-foreground text-xs mb-1">
                               <Clock className="inline h-3 w-3 mr-1" />
                               {apt.start_time ? format(parseISO(apt.start_time), 'h:mm a') : 'No time'} - {apt.end_time ? format(parseISO(apt.end_time), 'h:mm a') : ''}
                             </p>
                             <p className="text-muted-foreground text-xs">
                               <Tag className="inline h-3 w-3 mr-1" />
                               {apt.type}
                             </p>
                             {apt.status === 'cancelled' && <p className="text-red-600 text-xs font-semibold mt-1">(Cancelled)</p>}
                           </TooltipContent>
                        </Tooltip>
                      ))}
                      {/* Removed Available Slot Placeholders */}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </Card>
      </TooltipProvider>
    );
  };

  // Day view
  const renderDayView = () => {
    const now = new Date(); // Get current time once for the view
    return (
      <TooltipProvider delayDuration={100}> {/* Wrap Day View content */}
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
            let isPastSlot = false;
            if (isToday(selectedDate)) {
              const [hour, minute] = time.split(':').map(Number);
              const slotDateTime = new Date(selectedDate);
              slotDateTime.setHours(hour, minute, 0, 0);
              if (isBefore(slotDateTime, now)) {
                isPastSlot = true;
              }
            }
            return (
              <div key={time} className="grid grid-cols-2 border-b last:border-0">
                <div className="p-4 text-sm text-right text-muted-foreground">{time}</div>
                {/* Apply the same flexbox layout and styling as renderWeekView */}
                <div
                  onClick={() => handleSlotClick(selectedDate, time)}
                  className={`border-l relative transition-colors overflow-hidden ${
                    isPastSlot
                      ? 'bg-muted/30 cursor-not-allowed opacity-70' // Style for past slots today
                      : 'hover:bg-muted/50 cursor-pointer' // Style for bookable slots
                  }`}
                  style={{ height: `${CELL_HEIGHT}px` }} // Keep fixed height for the row
                >
                  {/* Use flex-wrap to allow cards to wrap, align items top */}
                  <div className="flex flex-wrap gap-2 h-full items-start content-start p-1.5"> {/* Increased gap slightly */}
                    {slotAppointments.map((apt) => (
                      <Tooltip key={apt.id}>
                        <TooltipTrigger asChild>
                            {/* Render colored icon with ring and animation */}
                            <div
                              className={`w-7 h-7 rounded-md flex items-center justify-center cursor-pointer ring-2 transition-all ${getAppointmentColor(apt.status)} ${apt.status === 'cancelled' ? 'ring-canceled-ring animate-shake' : 'ring-booked-ring animate-pulse hover:ring-offset-1'}`}
                              onClick={(e) => handleAppointmentClick(e, apt)}
                            >
                              {/* Conditionally render Ban or Armchair icon */}
                              {apt.status === 'cancelled' ? (
                                <Ban className={`h-4 w-4 text-canceled-icon`} />
                              ) : (
                                <Armchair className={`h-4 w-4 text-booked-icon`} />
                              )}
                          </div>
                        </TooltipTrigger>
                        {/* Tooltip Content with full details */}
                        <TooltipContent side="top" align="center" className="bg-background border shadow-lg rounded-lg p-3 text-sm w-60">
                           <div className="flex items-center mb-2">
                             <User className="h-5 w-5 mr-2 text-muted-foreground flex-shrink-0" /> {/* Avatar Placeholder */}
                             <span className="font-semibold">{apt.patients?.first_name} {apt.patients?.last_name}</span>
                           </div>
                           <p className="text-muted-foreground text-xs mb-1">Dr. {apt.staff?.first_name} {apt.staff?.last_name}</p>
                           <p className="text-muted-foreground text-xs mb-1">
                             <Clock className="inline h-3 w-3 mr-1" />
                             {apt.start_time ? format(parseISO(apt.start_time), 'h:mm a') : 'No time'} - {apt.end_time ? format(parseISO(apt.end_time), 'h:mm a') : ''}
                           </p>
                           <p className="text-muted-foreground text-xs">
                             <Tag className="inline h-3 w-3 mr-1" />
                             {apt.type}
                           </p>
                           {apt.status === 'cancelled' && <p className="text-red-600 text-xs font-semibold mt-1">(Cancelled)</p>}
                         </TooltipContent>
                      </Tooltip>
                    ))}
                    {/* Removed Available Slot Placeholders */}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
      </TooltipProvider>
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
        <TooltipProvider delayDuration={300}> {/* Wrap month view content in TooltipProvider */}
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
                    {/* Display icons instead of text in month view */}
                    <div className="mt-1 flex flex-wrap gap-1 overflow-hidden max-h-[80px]">
                      {dayAppointments.slice(0, 3).map((apt) => (
                        <Tooltip key={apt.id}>
                          <TooltipTrigger asChild>
                             {/* Render small colored icon with ring and animation */}
                             <div
                              className={`w-5 h-5 rounded flex items-center justify-center cursor-pointer ring-1 transition-all ${getAppointmentColor(apt.status)} ${apt.status === 'cancelled' ? 'ring-canceled-ring animate-shake' : 'ring-booked-ring animate-pulse hover:ring-offset-1'}`}
                              onClick={(e) => { e.stopPropagation(); handleAppointmentClick(e, apt); }}
                            >
                              {/* Conditionally render Ban or Armchair icon */}
                              {apt.status === 'cancelled' ? (
                                <Ban className={`h-3 w-3 text-canceled-icon`} />
                              ) : (
                                <Armchair className={`h-3 w-3 text-booked-icon`} />
                              )}
                            </div>
                          </TooltipTrigger>
                          {/* Use the same improved Tooltip Content */}
                          <TooltipContent side="top" align="start" className="bg-gradient-to-b from-white to-gray-50 border border-gray-200 shadow-xl rounded-lg p-4 text-sm w-64">
                            <div className="flex items-center mb-2">
                              <User className="h-5 w-5 mr-2 text-muted-foreground" /> {/* Avatar Placeholder */}
                              <span className="font-bold text-gray-800">{apt.patients?.first_name} {apt.patients?.last_name}</span> {/* Bolder Name */}
                            </div>
                            <p className="text-gray-600 text-xs mb-1 font-medium">Dr. {apt.staff?.first_name} {apt.staff?.last_name}</p> {/* Medium Doctor Name */}
                            <p className="text-muted-foreground text-xs mb-1">
                              <Clock className="inline h-3 w-3 mr-1" />
                              {apt.start_time ? format(parseISO(apt.start_time), 'h:mm a') : 'No time'} - {apt.end_time ? format(parseISO(apt.end_time), 'h:mm a') : ''}
                            </p>
                            <p className="text-muted-foreground text-xs">
                              <Tag className="inline h-3 w-3 mr-1" />
                              {apt.type}
                            </p>
                            {apt.status === 'cancelled' && <p className="text-red-600 text-xs font-semibold mt-1">(Cancelled)</p>}
                          </TooltipContent>
                        </Tooltip>
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
        </TooltipProvider> {/* Close TooltipProvider */}
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
      <Dialog open={showBookingModal} onOpenChange={(isOpen) => {
        setShowBookingModal(isOpen);
        if (!isOpen) {
          // Reset states when modal is closed to ensure clean state for next opening
          setSelectedSlot(null);
          setManualDate(null);
          setManualTime('');
          setManualAmPm('AM'); // Reset AM/PM state
          setSelectedPatient(null);
          setSelectedDoctor(null);
          setAvailableDoctors([]);
          setPatientSearchQuery('');
          setBookingStep('patient-select');
          setAppointmentFormData({ type: 'checkup', duration: '30', notes: '', reason_for_visit: '', treatment_id: null });
          setRedirectedTreatmentId(null); // Crucially reset this
          // Do not clear searchParams here, as user might just be closing temporarily.
          // searchParams are cleared after successful processing in the useEffect.
        }
      }}>
        <DialogContent className="overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{bookingStep === 'patient-select' ? 'Select Patient' : bookingStep === 'new-patient' ? 'New Patient Registration' : redirectedTreatmentId ? 'Book Treatment Visit' : 'Appointment Details'}</DialogTitle>
            {(selectedSlot && bookingStep !== 'new-patient' && !redirectedTreatmentId) && (<DialogDescription>{format(selectedSlot.date, 'MMMM d, yyyy')} at {selectedSlot.time}</DialogDescription>)}
            {(manualDate && bookingStep !== 'new-patient' && redirectedTreatmentId) && (
              <DialogDescription>
                For Treatment Visit: {format(manualDate, 'MMMM d, yyyy')}
                {manualTime && ` at ${manualTime} ${manualAmPm}`}
              </DialogDescription>
            )}
            {bookingStep === 'new-patient' && (<DialogDescription>Enter the new patient's details below.</DialogDescription>)}
          </DialogHeader>
          <div className="max-h-[75vh] overflow-y-auto p-4">
            {bookingStep === 'patient-select' && renderPatientSelectionStep()}
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
              {/* Doctor Details Section */}
              {selectedAppointment.staff && (
                <div className="flex items-center space-x-4 p-4 bg-muted rounded-lg">
                  <Briefcase className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Dr. {selectedAppointment.staff.first_name} {selectedAppointment.staff.last_name}</p>
                    {selectedAppointment.staff.specialization && (
                      <p className="text-sm text-muted-foreground">{selectedAppointment.staff.specialization}</p>
                    )}
                  </div>
                </div>
              )}
              {/* End Doctor Details Section */}
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
                <Select
                  value={selectedAppointment.treatment_id ? 'Scheduled Visit' : selectedAppointment.type || ''}
                  onValueChange={(value) => {
                    // Only allow type change if not a treatment visit and status allows editing
                    if (!selectedAppointment.treatment_id && (selectedAppointment.status === 'scheduled' || selectedAppointment.status === 'confirmed')) {
                      setSelectedAppointment({ ...selectedAppointment, type: value });
                    }
                  }}
                  // Disable if status doesn't allow editing OR if it's a treatment-linked appointment (type is fixed)
                  disabled={(selectedAppointment.status !== 'scheduled' && selectedAppointment.status !== 'confirmed') || !!selectedAppointment.treatment_id}
                >
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {selectedAppointment.treatment_id ? (
                      <SelectItem value="Scheduled Visit">Scheduled Visit</SelectItem>
                    ) : (
                      <>
                        <SelectItem value="checkup">Checkup</SelectItem>
                        <SelectItem value="cleaning">Cleaning</SelectItem>
                        <SelectItem value="filling">Filling</SelectItem>
                        <SelectItem value="root-canal">Root Canal</SelectItem>
                        {/* If current type is custom and not 'Scheduled Visit', add it as an option */}
                        {selectedAppointment.type &&
                          !['checkup', 'cleaning', 'filling', 'root-canal', 'Scheduled Visit'].includes(selectedAppointment.type) && (
                            <SelectItem value={selectedAppointment.type}>{selectedAppointment.type}</SelectItem>
                        )}
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Display Reason for Visit if it exists */}
              {selectedAppointment.reason_for_visit && (
                <div className="space-y-2">
                  <Label>Reason for Visit</Label>
                  <p className="text-sm p-3 bg-muted rounded-md whitespace-pre-wrap border">
                    {selectedAppointment.reason_for_visit}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label>Notes</Label>
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

              {/* Treatment Plan and Visit Details Section - START */}
              {isLoadingTreatmentDetails && (
                <div className="p-4 text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mt-2">Loading treatment details...</p>
                </div>
              )}
              {!isLoadingTreatmentDetails && detailedTreatmentVisit && (
                <div className="border-t pt-4 mt-4">
                  <h4 className="text-md font-semibold mb-2 text-primary">Related Treatment Information</h4>
                  {detailedTreatmentPlanTitle && (
                    <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                      <p className="text-sm font-medium text-blue-700">
                        Part of Treatment Plan: <span className="font-bold">{detailedTreatmentPlanTitle}</span>
                      </p>
                    </div>
                  )}
                  <div className="space-y-2 text-sm p-3 bg-slate-50 rounded-md">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Visit Number:</span>
                      <span className="font-medium">{detailedTreatmentVisit.visit_number || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Procedures:</span>
                      <span className="font-medium text-right break-words max-w-[70%]">{detailedTreatmentVisit.procedures || 'N/A'}</span>
                    </div>
                    {detailedTreatmentVisit.estimated_duration && (
                       <div className="flex justify-between">
                        <span className="text-muted-foreground">Est. Duration:</span>
                        <span className="font-medium">{detailedTreatmentVisit.estimated_duration}</span>
                      </div>
                    )}
                     {detailedTreatmentVisit.scheduled_date && (
                       <div className="flex justify-between">
                        <span className="text-muted-foreground">Originally Scheduled:</span>
                        <span className="font-medium">{format(parseISO(detailedTreatmentVisit.scheduled_date), 'MMM d, yyyy')}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {/* Treatment Plan and Visit Details Section - END */}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
