import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

interface CommunicationRequest {
  patientId: string;
  type: 'appointment_reminder' | 'treatment_info' | 'post_treatment' | 'education' | 'follow_up';
  treatmentPlanId?: string;
  appointmentId?: string;
  channel: 'email' | 'sms' | 'app';
  scheduledFor: string;
  customMessage?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const url = new URL(req.url);
    const path = url.pathname.split('/').pop();

    if (req.method === 'GET' && path === 'process-scheduled') {
      return await processScheduledCommunications(supabase);
    }

    // For POST requests to schedule new communications
    const {
      patientId,
      type,
      treatmentPlanId,
      appointmentId,
      channel,
      scheduledFor,
      customMessage
    }: CommunicationRequest = await req.json();

    // Validate required fields
    if (!patientId || !type || !channel || !scheduledFor) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { 
          status: 400, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          } 
        }
      );
    }

    // Get patient data
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('*')
      .eq('id', patientId)
      .single();

    if (patientError) {
      return new Response(
        JSON.stringify({ error: `Patient not found: ${patientError.message}` }),
        { 
          status: 404, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          } 
        }
      );
    }

    // Generate appropriate content based on communication type
    let content = customMessage || '';
    if (!content) {
      content = await generateCommunicationContent(
        supabase,
        type,
        patient,
        treatmentPlanId,
        appointmentId
      );
    }

    // Create the communication record
    const { data, error } = await supabase
      .from('patient_communications')
      .insert([{
        patient_id: patientId,
        type,
        content,
        scheduled_for: scheduledFor,
        channel,
        status: 'scheduled',
        treatment_plan_id: treatmentPlanId,
        appointment_id: appointmentId
      }])
      .select()
      .single();

    if (error) {
      return new Response(
        JSON.stringify({ error: `Failed to create communication: ${error.message}` }),
        { 
          status: 500, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          } 
        }
      );
    }

    // If scheduled for now, send immediately
    const scheduledTime = new Date(scheduledFor);
    const now = new Date();
    if (scheduledTime <= now) {
      await sendCommunication(supabase, data.id);
    }

    return new Response(
      JSON.stringify({ success: true, data }),
      { 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        } 
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        } 
      }
    );
  }
});

async function generateCommunicationContent(
  supabase: any,
  type: string,
  patient: any,
  treatmentPlanId?: string,
  appointmentId?: string
): Promise<string> {
  let content = '';
  const patientName = `${patient.first_name} ${patient.last_name}`;

  switch (type) {
    case 'appointment_reminder':
      if (appointmentId) {
        const { data: appointment } = await supabase
          .from('appointments')
          .select('*, staff(first_name, last_name)')
          .eq('id', appointmentId)
          .single();
        
        if (appointment) {
          const date = new Date(appointment.start_time);
          const formattedDate = date.toLocaleDateString('en-US', { 
            weekday: 'long', 
            month: 'long', 
            day: 'numeric',
            year: 'numeric'
          });
          const formattedTime = date.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true
          });
          
          const doctorName = appointment.staff 
            ? `Dr. ${appointment.staff.first_name} ${appointment.staff.last_name}`
            : 'your dentist';
            
          content = `Hi ${patient.first_name}, this is a reminder about your dental appointment on ${formattedDate} at ${formattedTime} with ${doctorName}. Please arrive 10 minutes early to complete any necessary paperwork. If you need to reschedule, please call us at least 24 hours in advance.`;
        }
      }
      break;
      
    case 'treatment_info':
      if (treatmentPlanId) {
        const { data: plan } = await supabase
          .from('treatment_plans')
          .select('*')
          .eq('id', treatmentPlanId)
          .single();
          
        if (plan) {
          content = `Dear ${patient.first_name}, here's important information about your upcoming dental treatment: ${plan.title}. ${plan.description} Please review the attached documents for details on preparation, procedure steps, and what to expect. If you have any questions, don't hesitate to contact us.`;
        }
      }
      break;
      
    case 'post_treatment':
      content = `Hello ${patient.first_name}, we hope you're recovering well after your recent dental procedure. Remember to: 1) Follow the prescribed medication schedule, 2) Avoid hard, crunchy foods for the next 48 hours, 3) Maintain gentle brushing around the treated area, 4) Use cold compress if experiencing swelling. If you experience severe pain or unusual symptoms, please contact us immediately.`;
      break;
      
    case 'education':
      content = `Hi ${patient.first_name}, as part of our commitment to your dental health, we've prepared some educational resources for you. Proper oral hygiene includes brushing twice daily, flossing once daily, using an antimicrobial mouthwash, and replacing your toothbrush every 3-4 months. Regular dental check-ups are essential for preventing serious dental issues. Visit our website for more dental health tips!`;
      break;
      
    case 'follow_up':
      content = `Dear ${patient.first_name}, we're checking in to see how you're doing after your recent dental visit. Please let us know if you're experiencing any issues or have questions about your treatment. Your feedback helps us provide the best care possible. Remember to schedule your next check-up if you haven't already.`;
      break;
      
    default:
      content = `Hello ${patient.first_name}, thank you for choosing our dental practice. We're committed to providing you with the best dental care possible. Please don't hesitate to reach out if you have any questions or concerns.`;
  }

  return content;
}

async function sendCommunication(supabase: any, communicationId: string): Promise<boolean> {
  // Get the communication details
  const { data: communication, error } = await supabase
    .from('patient_communications')
    .select('*, patients(email, phone)')
    .eq('id', communicationId)
    .single();
    
  if (error || !communication) {
    console.error('Error fetching communication:', error);
    return false;
  }
  
  // In a production environment, this would integrate with email/SMS services
  // For development, we'll simulate sending and update the status
  let success = true;
  let errorMessage = '';
  
  try {
    console.log(`SENDING ${communication.channel.toUpperCase()} to ${communication.patients.email || communication.patients.phone}:`);
    console.log(`CONTENT: ${communication.content}`);
    
    // Simulate sending delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // In production, replace with actual sending logic:
    // if (communication.channel === 'email') {
    //   // Send email using SendGrid, AWS SES, etc.
    // } else if (communication.channel === 'sms') {
    //   // Send SMS using Twilio, AWS SNS, etc.
    // }
    
  } catch (e) {
    success = false;
    errorMessage = e.message;
    console.error('Error sending communication:', e);
  }
  
  // Update the communication status
  const { error: updateError } = await supabase
    .from('patient_communications')
    .update({
      status: success ? 'sent' : 'failed',
      sent_at: success ? new Date().toISOString() : null,
      error_message: errorMessage
    })
    .eq('id', communicationId);
    
  if (updateError) {
    console.error('Error updating communication status:', updateError);
  }
  
  // If this was related to a treatment plan, update the last notification info
  if (communication.treatment_plan_id) {
    const { error: planUpdateError } = await supabase
      .from('treatment_plans')
      .update({
        last_notification_sent: new Date().toISOString(),
        notification_count: supabase.sql`notification_count + 1`
      })
      .eq('id', communication.treatment_plan_id);
      
    if (planUpdateError) {
      console.error('Error updating treatment plan notification data:', planUpdateError);
    }
  }
  
  return success;
}

async function processScheduledCommunications(supabase: any): Promise<Response> {
  const now = new Date();
  
  // Get all communications scheduled for now or earlier that haven't been sent
  const { data: communications, error } = await supabase
    .from('patient_communications')
    .select('id')
    .eq('status', 'scheduled')
    .lte('scheduled_for', now.toISOString())
    .limit(50);
    
  if (error) {
    return new Response(
      JSON.stringify({ error: `Failed to fetch scheduled communications: ${error.message}` }),
      { 
        status: 500, 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        } 
      }
    );
  }
  
  const results = [];
  
  // Process each communication
  for (const comm of communications) {
    const success = await sendCommunication(supabase, comm.id);
    results.push({ id: comm.id, success });
  }
  
  return new Response(
    JSON.stringify({ 
      processed: results.length,
      results
    }),
    { 
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders
      } 
    }
  );
}