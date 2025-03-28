import React, { useState, useEffect } from 'react';
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, parseISO, isSameDay, parse, isValid, addMonths, subMonths, startOfMonth, endOfMonth, getDaysInMonth, getMonth, getYear, isSameMonth, isToday, startOfDay, endOfDay } from 'date-fns';
import { Calendar as CalendarIcon, Clock, Plus, Search, Filter, ChevronLeft, ChevronRight, User, Phone, Mail, X } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export function Appointments() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week' | 'day'>('week');
  const [selectedSlot, setSelectedSlot] = useState<{ date: Date; time: string } | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [bookingStep, setBookingStep] = useState<'patient-select' | 'new-patient' | 'appointment-details'>('patient-select');
  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateInput, setDateInput] = useState('');
  const CELL_HEIGHT = 80; // Height of a 1-hour cell in pixels
  const HOUR_IN_MINUTES = 60;

  const [appointmentFormData, setAppointmentFormData] = useState({
    type: 'checkup',
    duration: '30',
    notes: '',
  });
  const [newPatientData, setNewPatientData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    age: null as number | null,
    gender: 'male' as const
  });

  const timeSlots = Array.from({ length: 11 }, (_, i) => {
    const hour = i + 8;
    return format(new Date().setHours(hour, 0), 'HH:mm');
  });

  useEffect(() => {
    fetchAppointments();
    fetchPatients();
    fetchDoctors();
  }, [selectedDate, view]);

  const fetchDoctors = async () => {
    try {
      const data = await api.staff.getDoctors();
      setDoctors(data);
    } catch (error) {
      console.error('Error fetching doctors:', error);
    }
  };

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
      
      const data = await api.appointments.getByDateRange(
        startDate.toISOString(),
        endDate.toISOString()
      );
      setAppointments(data);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    }
  };

  const fetchPatients = async () => {
    try {
      const data = await api.patients.getAll();
      setPatients(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching patients:', error);
      setLoading(false);
    }
  };

  const handlePatientSearch = async (query: string) => {
    setPatientSearchQuery(query);
    if (query.length > 2) {
      try {
        const results = await api.patients.search(query);
        setPatients(results);
      } catch (error) {
        console.error('Error searching patients:', error);
      }
    }
  };

  const handleCreateNewPatient = async () => {
    try {
      if (!newPatientData.first_name || !newPatientData.last_name || !newPatientData.phone) {
        throw new Error('First name, last name, and phone number are required');
      }

      const newPatient = await api.patients.create(newPatientData);
      if (!newPatient) {
        throw new Error('Failed to create patient');
      }

      setSelectedPatient(newPatient);
      setBookingStep('appointment-details');
    } catch (error) {
      console.error('Error creating new patient:', error);
      alert(error instanceof Error ? error.message : 'Failed to create patient. Please try again.');
    }
  };

  const handleBookAppointment = async (formData: any) => {
    try {
      if (!selectedPatient || !selectedSlot) return;

      const startDate = new Date(selectedSlot.date);
      startDate.setHours(parseInt(selectedSlot.time.split(':')[0]), parseInt(selectedSlot.time.split(':')[1]));

      const endDate = new Date(selectedSlot.date);
      endDate.setHours(parseInt(selectedSlot.time.split(':')[0]) + parseInt(formData.duration) / 60, parseInt(selectedSlot.time.split(':')[1]));
      
      const appointmentData = {
        patient_id: selectedPatient.id,
        staff_id: selectedDoctor.id,
        title: formData.type,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        type: formData.type,
        notes: formData.notes,
      };

      await api.appointments.create(appointmentData);
      setShowBookingModal(false);
      fetchAppointments();
      setAppointmentFormData({
        type: 'checkup',
        duration: '30',
        notes: '',
      });
    } catch (error) {
      console.error('Error booking appointment:', error);
    }
  };

  const handleAppointmentClick = (e: React.MouseEvent, appointment: any) => {
    e.stopPropagation(); // Prevent triggering the cell click
    setSelectedAppointment(appointment);
    setShowAppointmentModal(true);
  };

  const handleCancelAppointment = async () => {
    try {
      if (!selectedAppointment) return;
      await api.appointments.cancel(selectedAppointment.id);
      setShowAppointmentModal(false);
      fetchAppointments();
    } catch (error) {
      console.error('Error cancelling appointment:', error);
    }
  };

  const handleUpdateAppointment = async (formData: any) => {
    try {
      if (!selectedAppointment) return;
      
      const startDate = parseISO(selectedAppointment.start_time);
      const endDate = new Date(startDate);
      endDate.setMinutes(startDate.getMinutes() + parseInt(formData.duration));

      const appointmentData = {
        title: formData.type,
        type: formData.type,
        notes: formData.notes,
        end_time: endDate.toISOString()
      };

      await api.appointments.update(selectedAppointment.id, appointmentData);
      setShowAppointmentModal(false);
      fetchAppointments();
    } catch (error) {
      console.error('Error updating appointment:', error);
    }
  };

  const calculateAppointmentHeight = (startTime: string, endTime: string) => {
    const start = parseISO(startTime);
    const end = parseISO(endTime);
    const durationInMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
    return (durationInMinutes / HOUR_IN_MINUTES) * CELL_HEIGHT;
  };

  const calculateAppointmentOffset = (startTime: string) => {
    const start = parseISO(startTime);
    const minutes = start.getMinutes();
    return (minutes / HOUR_IN_MINUTES) * CELL_HEIGHT;
  };

  const getAppointmentsForTimeSlot = (date: Date, timeSlot: string) => {
    const slotStart = new Date(date);
    const [hours, minutes] = timeSlot.split(':').map(Number);
    slotStart.setHours(hours, minutes, 0, 0);
    const slotEnd = new Date(slotStart);
    slotEnd.setHours(hours + 1, minutes, 0, 0);

    return appointments.filter(apt => {
      const aptStart = parseISO(apt.start_time);
      const aptEnd = parseISO(apt.end_time);
      return aptStart < slotEnd && aptEnd > slotStart;
    });
  };

  const getAppointmentsForDay = (date: Date) => {
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);
    
    return appointments.filter(apt => {
      const aptStart = parseISO(apt.start_time);
      return aptStart >= dayStart && aptStart <= dayEnd;
    });
  };

  // Navigation functions
  const handlePreviousWeek = () => setSelectedDate(subWeeks(selectedDate, 1));
  const handleNextWeek = () => setSelectedDate(addWeeks(selectedDate, 1));
  
  const handlePreviousDay = () => setSelectedDate(addDays(selectedDate, -1));
  const handleNextDay = () => setSelectedDate(addDays(selectedDate, 1));
  
  const handlePreviousMonth = () => setSelectedDate(subMonths(selectedDate, 1));
  const handleNextMonth = () => setSelectedDate(addMonths(selectedDate, 1));

  const handleGoToDate = () => {
    // Parse the input date in format DD/MM/YYYY
    const parsedDate = parse(dateInput, 'dd/MM/yyyy', new Date());
    
    // Check if the parsed date is valid
    if (isValid(parsedDate)) {
      setSelectedDate(parsedDate);
      setDateInput('');
    } else {
      alert('Please enter a valid date in DD/MM/YYYY format');
    }
  };

  const handleSlotClick = (date: Date, time: string) => {
    setSelectedSlot({ date, time });
    setBookingStep('patient-select');
    setShowBookingModal(true);
  };

  const getAppointmentsForSlot = (date: Date, time: string) => {
    return appointments.filter(apt => 
      isSameDay(parseISO(apt.start_time), date) && 
      format(parseISO(apt.start_time), 'HH:mm') === time
    );
  };

  const renderPatientSelectionStep = () => (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="Search patients by name, email, or phone..."
          value={patientSearchQuery}
          onChange={(e) => handlePatientSearch(e.target.value)}
        />
        <Button onClick={() => setBookingStep('new-patient')}>
          <Plus className="h-4 w-4 mr-2" />
          New Patient
        </Button>
      </div>

      <div className="h-[300px] overflow-y-auto space-y-2">
        {patients.map((patient) => (
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
                <p className="text-sm text-muted-foreground">{patient.phone}</p>
              </div>
            </div>
          </Button>
        ))}
      </div>
    </div>
  );

  const renderNewPatientStep = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>First Name</Label>
          <Input
            required
            value={newPatientData.first_name}
            onChange={(e) => setNewPatientData({ ...newPatientData, first_name: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label>Last Name</Label>
          <Input
            required
            value={newPatientData.last_name}
            onChange={(e) => setNewPatientData({ ...newPatientData, last_name: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label>Email</Label>
        <Input
          type="email"
          value={newPatientData.email}
          onChange={(e) => setNewPatientData({ ...newPatientData, email: e.target.value })}
        />
      </div>

      <div className="space-y-1">
        <Label>Phone *</Label>
        <Input
          required
          value={newPatientData.phone}
          onChange={(e) => setNewPatientData({ ...newPatientData, phone: e.target.value })}
          placeholder="+1234567890"
        />
        <p className="text-xs text-muted-foreground">Format: +[country code][number], e.g., +1234567890</p>
      </div>

      <div className="space-y-1">
        <Label>Age</Label>
        <Input
          type="number"
          min="0"
          max="120"
          value={newPatientData.age || ''}
          onChange={(e) => setNewPatientData({ ...newPatientData, age: e.target.value ? parseInt(e.target.value) : null })}
          placeholder="Enter age"
        />
        <p className="text-xs text-muted-foreground">Age must be between 0 and 120 years</p>
      </div>

      <div className="space-y-1">
        <Label>Gender</Label>
        <Select
          value={newPatientData.gender}
          onValueChange={(value: 'male' | 'female' | 'other') => setNewPatientData({ ...newPatientData, gender: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select gender" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="male">Male</SelectItem>
            <SelectItem value="female">Female</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={() => setBookingStep('patient-select')}>
          Back
        </Button>
        <Button onClick={handleCreateNewPatient}>
          Create Patient & Continue
        </Button>
      </DialogFooter>
    </div>
  );

  const renderAppointmentDetailsStep = () => {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Select Doctor</Label>
          <Select
            value={selectedDoctor?.id || ''}
            onValueChange={(value) => setSelectedDoctor(doctors.find(d => d.id === value))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose a doctor" />
            </SelectTrigger>
            <SelectContent>
              {doctors.map((doctor) => (
                <SelectItem key={doctor.id} value={doctor.id}>
                  Dr. {doctor.first_name} {doctor.last_name}
                  {doctor.specialization && ` (${doctor.specialization})`}
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
              <p className="text-sm text-muted-foreground">{selectedPatient.phone}</p>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label>Appointment Type</Label>
          <Select
            value={appointmentFormData.type}
            onValueChange={(value) => setAppointmentFormData({ ...appointmentFormData, type: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
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
            onValueChange={(value) => setAppointmentFormData({ ...appointmentFormData, duration: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select duration" />
            </SelectTrigger>
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
          <Textarea
            value={appointmentFormData.notes}
            onChange={(e) => setAppointmentFormData({ ...appointmentFormData, notes: e.target.value })}
            placeholder="Add any notes about the appointment..."
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setBookingStep('patient-select')}>
            Back
          </Button>
          <Button onClick={() => handleBookAppointment(appointmentFormData)}>
            Book Appointment
          </Button>
        </DialogFooter>
      </div>
    );
  };

  // Render the calendar based on the current view
  const renderCalendar = () => {
    if (view === 'day') {
      return renderDayView();
    } else if (view === 'week') {
      return renderWeekView();
    } else if (view === 'month') {
      return renderMonthView();
    }
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
            <div
              key={day.toISOString()}
              className={`p-4 text-center border-l ${isToday(day) ? 'bg-blue-50' : ''}`}
            >
              <div className="font-medium">{format(day, 'EEE')}</div>
              <div className="text-sm text-muted-foreground">{format(day, 'd')}</div>
            </div>
          ))}
        </div>

        <div>
          {timeSlots.map((time) => (
            <div key={time} className="grid grid-cols-8 border-b last:border-0">
              <div className="p-4 text-sm text-right text-muted-foreground">
                {time}
              </div>
              {daysInWeek.map((day) => {
                const slotAppointments = getAppointmentsForTimeSlot(day, time);
                return (
                  <div
                    key={day.toISOString()}
                    onClick={() => handleSlotClick(day, time)}
                    className={`border-l p-2 relative ${
                      slotAppointments.length > 0 ? 'bg-blue-50' : ''
                    } hover:bg-muted/50 cursor-pointer transition-colors`}
                    style={{ height: `${CELL_HEIGHT}px` }}
                  >
                    {slotAppointments.map((apt) => (
                      <div
                        key={apt.id}
                        className="text-sm p-2 absolute w-[calc(100%-1rem)] rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                        onClick={(e) => handleAppointmentClick(e, apt)}
                        style={{
                          height: `${calculateAppointmentHeight(apt.start_time, apt.end_time)}px`,
                          top: `${calculateAppointmentOffset(apt.start_time)}px`,
                          zIndex: 10
                        }}
                        title={`${apt.type} - ${format(parseISO(apt.start_time), 'h:mm a')} to ${format(parseISO(apt.end_time), 'h:mm a')}`}
                      >
                        <div className="font-medium">
                          <div>{apt.patients?.first_name} {apt.patients?.last_name}</div>
                          <div className="text-xs text-muted-foreground">
                            Dr. {apt.staff?.first_name} {apt.staff?.last_name}
                          </div>
                        </div>
                        <div className="text-xs">
                          {apt.type} ({format(parseISO(apt.start_time), 'h:mm a')} - {format(parseISO(apt.end_time), 'h:mm a')})
                        </div>
                      </div>
                    ))}
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
            return (
              <div key={time} className="grid grid-cols-2 border-b last:border-0">
                <div className="p-4 text-sm text-right text-muted-foreground">
                  {time}
                </div>
                <div
                  onClick={() => handleSlotClick(selectedDate, time)}
                  className={`border-l p-2 relative ${
                    slotAppointments.length > 0 ? 'bg-blue-50' : ''
                  } hover:bg-muted/50 cursor-pointer transition-colors`}
                  style={{ height: `${CELL_HEIGHT}px` }}
                >
                  {slotAppointments.map((apt) => (
                    <div
                      key={apt.id}
                      className="text-sm p-2 absolute w-[calc(100%-1rem)] rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                      onClick={(e) => handleAppointmentClick(e, apt)}
                      style={{
                        height: `${calculateAppointmentHeight(apt.start_time, apt.end_time)}px`,
                        top: `${calculateAppointmentOffset(apt.start_time)}px`,
                        zIndex: 10
                      }}
                      title={`${apt.type} - ${format(parseISO(apt.start_time), 'h:mm a')} to ${format(parseISO(apt.end_time), 'h:mm a')}`}
                    >
                      <div className="font-medium">
                        <div>{apt.patients?.first_name} {apt.patients?.last_name}</div>
                        <div className="text-xs text-muted-foreground">
                          Dr. {apt.staff?.first_name} {apt.staff?.last_name}
                        </div>
                      </div>
                      <div className="text-xs">
                        {apt.type} ({format(parseISO(apt.start_time), 'h:mm a')} - {format(parseISO(apt.end_time), 'h:mm a')})
                      </div>
                    </div>
                  ))}
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
    
    // Create weeks array for the grid
    const weeks = [];
    let week = [];
    
    days.forEach((day) => {
      week.push(day);
      
      if (week.length === 7) {
        weeks.push(week);
        week = [];
      }
    });

    if (week.length > 0) {
      weeks.push(week);
    }
    
    return (
      <Card>
        <div className="grid grid-cols-7 border-b">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
            <div key={day} className="p-2 text-center font-medium">
              {day}
            </div>
          ))}
        </div>
        
        <div>
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-7">
              {week.map((day) => {
                const dayAppointments = getAppointmentsForDay(day);
                const isCurrentMonth = isSameMonth(day, selectedDate);
                
                return (
                  <div
                    key={day.toISOString()}
                    onClick={() => {
                      setSelectedDate(day);
                      setView('day');
                    }}
                    className={`border p-2 min-h-[120px] relative ${
                      !isCurrentMonth ? 'bg-gray-100 text-gray-400' : 
                      isToday(day) ? 'bg-blue-50' : ''
                    } hover:bg-muted/50 cursor-pointer transition-colors`}
                  >
                    <div className={`text-right font-medium ${isToday(day) ? 'text-blue-600' : ''}`}>
                      {format(day, 'd')}
                    </div>
                    
                    <div className="mt-1 space-y-1 overflow-hidden max-h-[80px]">
                      {dayAppointments.slice(0, 3).map((apt) => (
                        <div
                          key={apt.id}
                          className="text-xs p-1 rounded bg-primary/10 text-primary truncate"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAppointmentClick(e, apt);
                          }}
                        >
                          {format(parseISO(apt.start_time), 'HH:mm')} - {apt.patients?.first_name}
                        </div>
                      ))}
                      
                      {dayAppointments.length > 3 && (
                        <div className="text-xs text-muted-foreground text-center">
                          +{dayAppointments.length - 3} more
                        </div>
                      )}
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
    
    if (view === 'day') {
      dateLabel = format(selectedDate, 'MMMM d, yyyy');
      prevHandler = handlePreviousDay;
      nextHandler = handleNextDay;
    } else if (view === 'week') {
      const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
      dateLabel = `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
      prevHandler = handlePreviousWeek;
      nextHandler = handleNextWeek;
    } else if (view === 'month') {
      dateLabel = format(selectedDate, 'MMMM yyyy');
      prevHandler = handlePreviousMonth;
      nextHandler = handleNextMonth;
    }
    
    return (
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={prevHandler}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium">
          {dateLabel}
        </span>
        <Button variant="outline" size="icon" onClick={nextHandler}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        heading="Appointments"
        text="Manage and schedule patient appointments"
      >
        <div className="flex items-center gap-4">
          <Tabs value={view} onValueChange={(v: any) => setView(v)} className="w-fit">
            <TabsList>
              <TabsTrigger value="month">Month</TabsTrigger>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="day">Day</TabsTrigger>
            </TabsList>
          </Tabs>

          {renderNavigation()}

          <div className="flex gap-2 ml-auto">
            <Input 
              className="w-32"
              placeholder="DD/MM/YYYY" 
              value={dateInput}
              onChange={(e) => setDateInput(e.target.value)}
            />
            <Button variant="outline" onClick={handleGoToDate}>
              Go to Date
            </Button>
          </div>

          <Button onClick={() => {
            setSelectedSlot(null);
            setBookingStep('patient-select');
            setShowBookingModal(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            New Appointment
          </Button>
        </div>
      </PageHeader>

      {renderCalendar()}

      <Dialog open={showBookingModal} onOpenChange={setShowBookingModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {bookingStep === 'patient-select' && 'Select Patient'}
              {bookingStep === 'new-patient' && 'New Patient'}
              {bookingStep === 'appointment-details' && 'Appointment Details'}
            </DialogTitle>
            {selectedSlot && (
              <DialogDescription>
                {format(selectedSlot.date, 'MMMM d, yyyy')} at {selectedSlot.time}
              </DialogDescription>
            )}
          </DialogHeader>
          {bookingStep === 'patient-select' && renderPatientSelectionStep()}
          {bookingStep === 'new-patient' && renderNewPatientStep()}
          {bookingStep === 'appointment-details' && renderAppointmentDetailsStep()}
        </DialogContent>
      </Dialog>

      <Dialog open={showAppointmentModal} onOpenChange={setShowAppointmentModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Appointment Details</DialogTitle>
            {selectedAppointment && (
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
                  <p className="font-medium">
                    {selectedAppointment.patients?.first_name} {selectedAppointment.patients?.last_name}
                  </p>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Phone className="h-3.5 w-3.5 mr-1" />
                    {selectedAppointment.patients?.phone || 'No phone number'}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  selectedAppointment.status === 'completed' ? 'bg-green-100 text-green-800' :
                  selectedAppointment.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {selectedAppointment.status}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={selectedAppointment.type}
                  onValueChange={(value) => setSelectedAppointment({
                    ...selectedAppointment,
                    type: value
                  })}
                  disabled={selectedAppointment.status !== 'scheduled'}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
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
                <Textarea
                  value={selectedAppointment.notes || ''}
                  onChange={(e) => setSelectedAppointment({
                    ...selectedAppointment,
                    notes: e.target.value
                  })}
                  placeholder="Add any notes about the appointment..."
                  disabled={selectedAppointment.status !== 'scheduled'}
                />
              </div>

              <DialogFooter>
                {selectedAppointment.status === 'scheduled' && (
                  <>
                    <Button
                      variant="destructive"
                      onClick={handleCancelAppointment}
                    >
                      Cancel Appointment
                    </Button>
                    <Button
                      onClick={() => handleUpdateAppointment({
                        type: selectedAppointment.type,
                        notes: selectedAppointment.notes
                      })}
                    >
                      Update Appointment
                    </Button>
                  </>
                )}
                {selectedAppointment.status !== 'scheduled' && (
                  <Button
                    variant="outline"
                    onClick={() => setShowAppointmentModal(false)}
                  >
                    Close
                  </Button>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}