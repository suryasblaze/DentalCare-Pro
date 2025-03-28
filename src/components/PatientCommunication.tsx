import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MailCheck, BellRing, Clock, Calendar, Send, MessageSquare, Brain, Check, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { format } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';

interface PatientCommunicationProps {
  patientId: string;
  treatmentPlanId?: string;
  appointmentId?: string;
}

export function PatientCommunication({ patientId, treatmentPlanId, appointmentId }: PatientCommunicationProps) {
  const [communications, setCommunications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isNewCommunicationOpen, setIsNewCommunicationOpen] = useState(false);
  const [scheduleTime, setScheduleTime] = useState<'now' | 'later'>('now');
  const [showAIGeneration, setShowAIGeneration] = useState(false);
  const { toast } = useToast();
  
  const [newCommunication, setNewCommunication] = useState({
    type: 'appointment_reminder',
    channel: 'email',
    message: '',
    scheduledDate: format(new Date(), 'yyyy-MM-dd'),
    scheduledTime: '09:00',
  });

  useEffect(() => {
    fetchCommunications();
  }, [patientId]);

  const fetchCommunications = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-communications`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ patientId }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch communications');
      }

      const data = await response.json();
      setCommunications(data.communications || []);
    } catch (error) {
      console.error('Error fetching communications:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateMessage = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-message`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patientId,
          treatmentPlanId,
          appointmentId,
          communicationType: newCommunication.type
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate message');
      }

      const data = await response.json();
      setNewCommunication({
        ...newCommunication,
        message: data.message
      });
      
      setShowAIGeneration(false);
    } catch (error) {
      console.error('Error generating message:', error);
      toast({
        title: "Generation Failed",
        description: "Could not generate message. Please try again or write your own message.",
        variant: "destructive"
      });
    }
  };

  const handleScheduleCommunication = async () => {
    if (!newCommunication.message.trim()) {
      toast({
        title: "Message Required",
        description: "Please enter a message to send",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      let scheduledFor = new Date();
      
      if (scheduleTime === 'later') {
        // Parse the date and time for scheduled communications
        scheduledFor = new Date(`${newCommunication.scheduledDate}T${newCommunication.scheduledTime}`);
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/patient-communication`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patientId,
          treatmentPlanId,
          appointmentId,
          type: newCommunication.type,
          channel: newCommunication.channel,
          scheduledFor: scheduledFor.toISOString(),
          customMessage: newCommunication.message
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to schedule communication');
      }

      toast({
        title: "Communication Scheduled",
        description: scheduleTime === 'now' 
          ? "Message has been sent successfully" 
          : "Message has been scheduled for delivery",
      });
      
      setIsNewCommunicationOpen(false);
      fetchCommunications();
      
      // Reset form
      setNewCommunication({
        type: 'appointment_reminder',
        channel: 'email',
        message: '',
        scheduledDate: format(new Date(), 'yyyy-MM-dd'),
        scheduledTime: '09:00',
      });
      
    } catch (error) {
      console.error('Error scheduling communication:', error);
      toast({
        title: "Scheduling Failed",
        description: "Could not schedule communication. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge className="bg-green-100 text-green-800">Sent</Badge>;
      case 'scheduled':
        return <Badge className="bg-blue-100 text-blue-800">Scheduled</Badge>;
      case 'delivered':
        return <Badge className="bg-green-100 text-green-800">Delivered</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email':
        return <MailCheck className="h-4 w-4" />;
      case 'sms':
        return <MessageSquare className="h-4 w-4" />;
      case 'app':
        return <BellRing className="h-4 w-4" />;
      default:
        return <MailCheck className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'appointment_reminder':
        return 'Appointment Reminder';
      case 'treatment_info':
        return 'Treatment Information';
      case 'post_treatment':
        return 'Post-Treatment Care';
      case 'education':
        return 'Educational Content';
      case 'follow_up':
        return 'Follow-up Check-in';
      default:
        return type.replace('_', ' ');
    }
  };

  return (
    <div>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Patient Communications
              </CardTitle>
              <CardDescription>
                Schedule and manage patient communications
              </CardDescription>
            </div>
            <Button size="sm" onClick={() => setIsNewCommunicationOpen(true)}>
              <Send className="h-4 w-4 mr-2" />
              New Message
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-6">
              <p className="text-muted-foreground">Loading communications...</p>
            </div>
          ) : communications.length > 0 ? (
            <div className="space-y-4">
              {communications.map((comm, index) => (
                <div key={index} className="border rounded-md p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-start gap-2">
                      {getChannelIcon(comm.channel)}
                      <div>
                        <h3 className="font-medium text-sm">{getTypeLabel(comm.type)}</h3>
                        <p className="text-xs text-muted-foreground">
                          {comm.status === 'scheduled' ? 'Scheduled for: ' : 'Sent: '}
                          {format(new Date(comm.status === 'scheduled' ? comm.scheduled_for : comm.sent_at || comm.created_at), 'PPp')}
                        </p>
                      </div>
                    </div>
                    <div>{getStatusBadge(comm.status)}</div>
                  </div>
                  <p className="mt-2 text-sm">{comm.content}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No Communications</h3>
              <p className="text-muted-foreground mb-6">
                No messages have been sent to this patient yet
              </p>
              <Button onClick={() => setIsNewCommunicationOpen(true)}>
                <Send className="h-4 w-4 mr-2" />
                Send First Message
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isNewCommunicationOpen} onOpenChange={setIsNewCommunicationOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>New Patient Communication</DialogTitle>
            <DialogDescription>
              Create a new message or notification for the patient
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Communication Type</Label>
                <Select
                  value={newCommunication.type}
                  onValueChange={(value) => setNewCommunication({...newCommunication, type: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="appointment_reminder">Appointment Reminder</SelectItem>
                    <SelectItem value="treatment_info">Treatment Information</SelectItem>
                    <SelectItem value="post_treatment">Post-Treatment Care</SelectItem>
                    <SelectItem value="education">Educational Content</SelectItem>
                    <SelectItem value="follow_up">Follow-up Check-in</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Channel</Label>
                <Select
                  value={newCommunication.channel}
                  onValueChange={(value) => setNewCommunication({...newCommunication, channel: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select channel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="app">In-App</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>Message</Label>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowAIGeneration(true)}
                  className="text-xs h-8"
                >
                  <Brain className="h-3 w-3 mr-1" />
                  Generate with AI
                </Button>
              </div>
              <Textarea
                value={newCommunication.message}
                onChange={(e) => setNewCommunication({...newCommunication, message: e.target.value})}
                placeholder="Enter message content..."
                rows={5}
              />
            </div>
            
            <div className="space-y-2">
              <Label>When to send</Label>
              <RadioGroup 
                value={scheduleTime} 
                onValueChange={(value: 'now' | 'later') => setScheduleTime(value)}
                className="flex flex-col space-y-1"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="now" id="now" />
                  <Label htmlFor="now" className="font-normal cursor-pointer">Send immediately</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="later" id="later" />
                  <Label htmlFor="later" className="font-normal cursor-pointer">Schedule for later</Label>
                </div>
              </RadioGroup>
            </div>
            
            {scheduleTime === 'later' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <input
                    type="date"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={newCommunication.scheduledDate}
                    onChange={(e) => setNewCommunication({...newCommunication, scheduledDate: e.target.value})}
                    min={format(new Date(), 'yyyy-MM-dd')}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Time</Label>
                  <input
                    type="time"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={newCommunication.scheduledTime}
                    onChange={(e) => setNewCommunication({...newCommunication, scheduledTime: e.target.value})}
                  />
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsNewCommunicationOpen(false)}
            >
              Cancel
            </Button>
            
            <Button 
              onClick={handleScheduleCommunication}
              disabled={loading || !newCommunication.message.trim()}
            >
              {scheduleTime === 'now' ? (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Now
                </>
              ) : (
                <>
                  <Clock className="h-4 w-4 mr-2" />
                  Schedule
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAIGeneration} onOpenChange={setShowAIGeneration}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Message with AI</DialogTitle>
            <DialogDescription>
              Create a personalized message for this communication type
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex items-center space-x-2 bg-blue-50 p-3 rounded-md">
              <Brain className="h-5 w-5 text-blue-500" />
              <p className="text-sm text-blue-700">
                AI will generate a personalized message based on patient data and communication type
              </p>
            </div>
            
            <div className="space-y-2">
              <Label>Communication Type</Label>
              <Select
                value={newCommunication.type}
                onValueChange={(value) => setNewCommunication({...newCommunication, type: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="appointment_reminder">Appointment Reminder</SelectItem>
                  <SelectItem value="treatment_info">Treatment Information</SelectItem>
                  <SelectItem value="post_treatment">Post-Treatment Care</SelectItem>
                  <SelectItem value="education">Educational Content</SelectItem>
                  <SelectItem value="follow_up">Follow-up Check-in</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowAIGeneration(false)}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            
            <Button onClick={generateMessage}>
              <Brain className="h-4 w-4 mr-2" />
              Generate Message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}