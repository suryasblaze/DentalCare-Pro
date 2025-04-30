// Import Supabase client using the alias defined in import_map.json
import { createClient, SupabaseClient } from '@supabase/supabase-js'; 

// Define CORS headers for responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Allow requests from any origin
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS', // Allowed HTTP methods
  'Access-Control-Allow-Headers': 'Content-Type, Authorization', // Allowed headers
};

// Interface for the expected request body when scheduling a communication
interface CommunicationRequest {
  patientId: string;
  type: 
    | 'appointment_reminder' 
    | 'treatment_info' 
    | 'post_treatment' 
    | 'education' 
    | 'follow_up'
    | 'appointment_cancellation' // Added
    | 'new_patient_welcome'    // Added
    | 'profile_update';        // Added
  treatmentPlanId?: string;
  appointmentId?: string; // Used for reminders and cancellations
  channel: 'email' | 'sms' | 'app';
  scheduledFor: string; // ISO 8601 date string
  customMessage?: string;
}

// Interface for the expected request body when cancelling communications
interface CancelRequest {
    appointmentId: string;
}

// --- Main Server Logic ---
// Deno.serve handles incoming HTTP requests
Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client using environment variables
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

        // Parse request URL to determine the intended action
        const url = new URL(req.url);
        // Example URL: https://<project_ref>.supabase.co/functions/v1/patient-communication/cancel-by-appointment
        // pathname: /functions/v1/patient-communication/cancel-by-appointment
        const pathSegments = url.pathname.split('/').filter(segment => segment); // Filter out empty segments
        // Actual pathSegments received by function: ['patient-communication', 'cancel-by-appointment'] (or just ['patient-communication'])
        
        // Adjust indices based on actual received path
        const functionName = pathSegments[0]; // Should be 'patient-communication'
        const action = pathSegments[1]; // Should be 'cancel-by-appointment' or undefined

        // --- Enhanced Logging ---
        console.log(`Received Request URL: ${req.url}`);
        console.log(`Parsed Pathname: ${url.pathname}`);
        console.log(`Filtered Path Segments: ${JSON.stringify(pathSegments)}`);
        console.log(`Detected Function Name (Segment 0): ${functionName}`); // Updated log index
        console.log(`Detected Action (Segment 1): ${action}`); // Updated log index
        // --- End Enhanced Logging ---

        // --- Routing based on HTTP method and action ---

        // POST / (base path): Schedule a new communication message
        // Check this route first and use explicit undefined check
        if (req.method === 'POST' && functionName === 'patient-communication' && action === undefined) {
          console.log('Scheduling new communication (checked first)...');
          const commRequest: CommunicationRequest = await req.json();

          // Validate required fields for scheduling
          if (!commRequest.patientId || !commRequest.type || !commRequest.channel || !commRequest.scheduledFor) {
            return new Response(
              JSON.stringify({ error: 'Missing required fields for scheduling' }),
              { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
            );
          }

          // Get patient data needed for content generation
          const { data: patient, error: patientError } = await supabase
            .from('patients')
            .select('*') // Select necessary fields like name, email, phone
            .eq('id', commRequest.patientId)
            .single();

          if (patientError || !patient) {
            return new Response(
              JSON.stringify({ error: `Patient not found or error fetching: ${patientError?.message}` }),
              { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
            );
          }

          // Generate message content if not provided
          let content = commRequest.customMessage || '';
          if (!content) {
            content = await generateCommunicationContent(
              supabase,
              commRequest.type,
              patient, // Pass the fetched patient object
              commRequest.treatmentPlanId,
              commRequest.appointmentId
            );
          }

          // Insert the communication record into the database
          const { data: newComm, error: insertError } = await supabase
            .from('patient_communications')
            .insert([{
              patient_id: commRequest.patientId,
              type: commRequest.type,
              content,
              scheduled_for: commRequest.scheduledFor,
              channel: commRequest.channel,
              status: 'scheduled', // Initial status
              treatment_plan_id: commRequest.treatmentPlanId,
              appointment_id: commRequest.appointmentId
            }])
            .select()
            .single();

          if (insertError) {
            console.error('Error inserting communication:', insertError);
            return new Response(
              JSON.stringify({ error: `Failed to create communication: ${insertError.message}` }),
              { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
            );
          }

          // If scheduled for now or in the past, attempt to send immediately
          const scheduledTime = new Date(commRequest.scheduledFor);
          const now = new Date();
          if (scheduledTime <= now && newComm) {
             // Double-check status in case it was cancelled extremely quickly
             const { data: currentCommCheck } = await supabase.from('patient_communications').select('status').eq('id', newComm.id).single();
             if (currentCommCheck?.status === 'scheduled') {
                console.log(`Communication ${newComm.id} scheduled for immediate sending.`);
                await sendCommunication(supabase, newComm.id); // Don't wait for the processing job
             }
          }

          return new Response(
            JSON.stringify({ success: true, data: newComm }),
            { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        }

        // GET /process-scheduled: Trigger processing of due messages
        // Note: This route might need adjustment if invoked differently (e.g., via cron)
        if (req.method === 'GET' && functionName === 'patient-communication' && action === 'process-scheduled') {
          console.log('Processing scheduled communications...');
          return await processScheduledCommunications(supabase);
        }

        // POST /cancel-by-appointment: Cancel scheduled messages for an appointment
        if (req.method === 'POST' && functionName === 'patient-communication' && action === 'cancel-by-appointment') {
          console.log('Attempting to cancel communications by appointment...');
          let requestBody;
          try {
        requestBody = await req.json(); // Parse body first
        console.log('Received cancellation request body:', JSON.stringify(requestBody)); // Log the received body
      } catch (parseError) {
        console.error('Error parsing cancellation request body:', parseError);
        return new Response(JSON.stringify({ error: 'Invalid JSON body for cancellation' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
      }
      const { appointmentId } = requestBody as CancelRequest; // Destructure after logging
      if (!appointmentId) {
        console.error('appointmentId missing after parsing body:', requestBody); // Log if ID is missing
        return new Response(JSON.stringify({ error: 'Missing appointmentId in request body' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
      }
      return await cancelCommunicationsByAppointment(supabase, appointmentId);
    }

    // Fallback for any unhandled routes or methods
    console.warn(`Unhandled request: ${req.method} ${req.url} (functionName: ${functionName}, action: ${action})`); // Added more detail to warning
    return new Response(JSON.stringify({ error: 'Method or path not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json', ...corsHeaders } });

  } catch (error) {
    // Catch-all for unexpected errors during request processing
    console.error('Unhandled error in Deno.serve:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});

// --- Helper Functions ---

/**
 * Generates the message content based on the communication type and related data.
 */
async function generateCommunicationContent(
  supabase: SupabaseClient,
  type: CommunicationRequest['type'],
  patient: any, // Consider defining a stricter Patient type
  treatmentPlanId?: string,
  appointmentId?: string
): Promise<string> {
  let content = '';
  // Use patient's first name if available, otherwise a generic greeting
  const patientFirstName = patient?.first_name || 'there';
  const clinicName = "Your Clinic Name"; // TODO: Make this configurable?

  switch (type) {
    case 'appointment_reminder':
      if (appointmentId) {
        // Fetch appointment details including the assigned staff member
        const { data: appointment } = await supabase
          .from('appointments')
          .select('start_time, staff(first_name, last_name)') // Select only needed fields
          .eq('id', appointmentId)
          .maybeSingle(); // Use maybeSingle in case appointment is deleted

        if (appointment?.start_time) {
          const date = new Date(appointment.start_time);
          // Format date and time clearly
          const formattedDate = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
          const formattedTime = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
          // Construct doctor's name if available
          // Access the first element of the staff array
          const doctorName = appointment.staff && appointment.staff.length > 0 
            ? `Dr. ${appointment.staff[0].first_name} ${appointment.staff[0].last_name}` 
            : 'your practitioner';
          content = `Hi ${patientFirstName}, reminder: Your appointment is on ${formattedDate} at ${formattedTime} with ${doctorName}. Please arrive 10 minutes early. Call us to reschedule (24hr notice appreciated).`;
        } else {
           console.warn(`Could not find appointment details for ID: ${appointmentId} to generate reminder.`);
           content = `Hi ${patientFirstName}, this is a reminder about your upcoming appointment. Please contact us if you need details.`;
        }
      } else {
         console.warn(`Cannot generate reminder content without an appointmentId.`);
         content = `Hi ${patientFirstName}, this is a reminder about your upcoming appointment at ${clinicName}.`;
      }
      break;
      
    case 'appointment_cancellation': // Added Case
      if (appointmentId) {
        // Fetch minimal appointment details needed for cancellation message
        // Note: We might not need the full details like staff if just confirming cancellation
        const { data: appointment } = await supabase
          .from('appointments')
          .select('start_time') // Only need time to identify the cancelled slot
          .eq('id', appointmentId)
          .maybeSingle(); 

        if (appointment?.start_time) {
          const date = new Date(appointment.start_time);
          const formattedDate = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
          const formattedTime = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
          content = `Hi ${patientFirstName}, this message confirms the cancellation of your appointment scheduled for ${formattedDate} at ${formattedTime} with ${clinicName}. Please call us if you need to reschedule.`;
        } else {
           console.warn(`Could not find appointment details for ID: ${appointmentId} to generate cancellation message.`);
           // Generic cancellation if details aren't found (appointment might be fully deleted)
           content = `Hi ${patientFirstName}, this confirms the cancellation of your recent appointment with ${clinicName}. Please contact us if you have questions.`;
        }
      } else {
         console.warn(`Cannot generate cancellation message without an appointmentId.`);
         // Fallback if no appointment ID provided for cancellation type
         content = `Hi ${patientFirstName}, this confirms the cancellation of your appointment with ${clinicName}.`;
      }
      break;

    case 'treatment_info':
      if (treatmentPlanId) {
        // Fetch treatment plan details
        const { data: plan } = await supabase
          .from('treatment_plans')
          .select('title, description') // Select only needed fields
          .eq('id', treatmentPlanId)
          .maybeSingle();

        if (plan) {
          content = `Dear ${patientFirstName}, regarding your treatment plan "${plan.title}": ${plan.description || 'Please review the details in your portal.'} Contact us with any questions.`;
        } else {
           console.warn(`Could not find treatment plan details for ID: ${treatmentPlanId}`);
           content = `Dear ${patientFirstName}, please review the information regarding your treatment plan in your portal.`;
        }
      } else {
         content = `Dear ${patientFirstName}, please review the information regarding your treatment plan.`;
      }
      break;

    case 'post_treatment':
      // Generic post-treatment advice
      content = `Hello ${patientFirstName}, hope you're recovering well. Remember to follow post-care instructions provided. Contact us immediately if you experience severe pain or unusual symptoms.`;
      break;

    case 'education':
      // Generic educational content
      content = `Hi ${patientFirstName}, quick tip for great oral health: Brush twice daily, floss once daily, and visit us regularly for check-ups! More tips on our website.`;
      break;

    case 'follow_up':
      // Generic follow-up message
      content = `Dear ${patientFirstName}, checking in after your recent visit. Please let us know if you have any questions or concerns about your treatment.`;
      break;

    case 'new_patient_welcome': // Added Case
      content = `Welcome to ${clinicName}, ${patientFirstName}! We're excited to have you as a patient. You can manage your appointments and view information through our patient portal.`;
      break;

    case 'profile_update': // Added Case
      content = `Hi ${patientFirstName}, your information at ${clinicName} has been updated. If you did not make these changes, please contact us immediately.`;
      break;

    default:
      // Fallback message
      console.warn(`Unknown communication type: ${type}`);
      content = `Hello ${patientFirstName}, thank you for being a patient at ${clinicName}.`;
  }

  return content;
}

/**
 * Generates a concise notification message suitable for the staff panel.
 */
function generateStaffNotificationMessage(communication: any): string {
  // Basic message indicating activity type and patient
  let message = `Communication (${communication.type}) processed for patient ${communication.patient_id}.`;

  // Add more context based on type if needed
  if (communication.type === 'appointment_reminder' && communication.appointment_id) {
    message = `Appointment reminder processed for patient ${communication.patient_id} (Appt ID: ${communication.appointment_id}).`;
  } else if (communication.type === 'treatment_info' && communication.treatment_plan_id) {
     message = `Treatment info sent for patient ${communication.patient_id} (Plan ID: ${communication.treatment_plan_id}).`;
  }
  // Add more cases for other communication types as needed

  return message;
}


/**
 * Simulates sending the communication (logs to console) and updates its status.
 * Replace console logs with actual email/SMS service integration.
 */
async function sendCommunication(supabase: SupabaseClient, communicationId: string): Promise<boolean> {
  let success = false;
  let errorMessage = '';
  let communication: any = null; 

  try {
    // Fetch communication details and related patient info using correct join syntax
    // Note: `patients(*)` or specific columns like `patients(user_id, email, phone)` should work if relationship is set up
    console.log(`Attempting to fetch comm ${communicationId} with patient join...`);
    const { data: commData, error: fetchError } = await supabase
      .from('patient_communications')
      .select('*, patients(user_id, email, phone)') // Correct syntax for join
      .eq('id', communicationId)
      .eq('status', 'scheduled')
      .single();

    if (fetchError || !commData) {
      // Handle case where fetch fails or communication is not found/scheduled
      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 means 0 rows, not necessarily an error here
        console.error(`Error fetching communication ${communicationId} with patient data:`, fetchError);
      } else if (!commData) {
         // console.log(`Communication ${communicationId} not found or not scheduled.`);
      }
      return false; // Indicate failure or already handled
    }
    
    // Assign fetched data (now includes 'patients' object if join was successful and patient exists)
    communication = commData; 
    console.log(`Successfully fetched comm ${communicationId}. Joined patient data: ${JSON.stringify(communication.patients)}`);

    // --- !!! Integration Point !!! ---
    if (communication.channel === 'app') {
        // Extract user_id from the joined 'patients' object
        // --- MODIFIED FOR STAFF NOTIFICATION (Temporary Hardcoding) ---
        // Instead of notifying the patient in-app, notify the specific staff member.
        // TODO: Pass the actual staff user ID who initiated the action from the frontend.
        const staffUserIdToNotify = "68f6a588-b802-4e33-8c6b-3de2d070d3bf"; // Hardcoded staff ID from screenshot

        console.log(`Processing 'app' channel for comm ${communicationId}. Attempting to notify staff user: ${staffUserIdToNotify}`);

        if (!staffUserIdToNotify) { 
             // This should not happen with hardcoding, but good practice
             console.error(`Critical error: staffUserIdToNotify is unexpectedly null/undefined for comm ${communicationId}.`);
             success = false;
             errorMessage = 'Staff user ID to notify is missing.';
        } else {
             // Generate the staff-specific message
             const staffMessage = generateStaffNotificationMessage(communication);
             console.log(`Generated staff message for notification insert: "${staffMessage}"`); // Log the exact message

             // Attempt to insert the notification for the staff member
             const { error: notificationError } = await supabase
                 .from('notifications')
                 .insert({
                     user_id: staffUserIdToNotify, // Use the hardcoded staff ID
                     message: staffMessage, // Use the generated message variable
                     // link_url: generateLinkUrl(...) // Optional: Link to appointment/patient
                 });

             if (notificationError) {
                 // Log error if insert fails 
                 console.error(`Failed to insert STAFF app notification for communication ${communication.id} (target staff: ${staffUserIdToNotify}):`, notificationError);
                 success = false; 
                 errorMessage = `Failed to insert staff app notification: ${notificationError.message}`;
             } else {
                 // Log success if insert works
                 console.log(`Successfully inserted STAFF app notification for user ${staffUserIdToNotify}, comm ID ${communication.id}.`);
                 success = true; 
             }
        }
        // --- END MODIFICATION ---

    } else if (communication.channel === 'email') { // Handle Email Separately (Still Simulation)
        const target = communication.patients?.email; 
        console.log(`Processing 'email' channel for comm ${communicationId}. Extracted target: ${target}`);

        if (!target) {
            console.warn(`Skipping email for comm ${communicationId}: Missing target email in linked patient record (patient_id: ${communication.patient_id}).`);
            success = false; 
            errorMessage = `Missing target email address.`;
        } else {
            // --- Email Simulation ---
            console.log(`--- SIMULATING EMAIL SEND ---`);
            console.log(`To: ${target}`);
            console.log(`Content: ${communication.content}`);
            console.log(`---------------------------`);
            await new Promise(resolve => setTimeout(resolve, 100)); // Simulate delay
            success = true; // Assume success for simulation
            // TODO: Replace simulation with actual Email API calls (Gmail/SendGrid etc.)
        }

    } else if (communication.channel === 'sms') { // Handle SMS via Alaris API
        const targetPhone = communication.patients?.phone;
        console.log(`Processing 'sms' channel for comm ${communicationId}. Extracted target phone: ${targetPhone}`);

        if (!targetPhone) {
            console.warn(`Skipping SMS for comm ${communicationId}: Missing target phone in linked patient record (patient_id: ${communication.patient_id}).`);
            success = false;
            errorMessage = `Missing target phone number.`;
        } else {
            // --- Alaris SMS API Integration ---
            const apiKey = Deno.env.get("ALARIS_API_KEY");
            const apiEndpoint = Deno.env.get("ALARIS_API_ENDPOINT");

            if (!apiKey || !apiEndpoint) {
                console.error(`Alaris API Key or Endpoint not configured in Supabase secrets for comm ${communicationId}.`);
                success = false;
                errorMessage = "SMS provider configuration missing.";
            } else {
                try {
                    // **IMPORTANT**: Adjust the payload structure based on Alaris API docs (Step 1.4)
                    const payload = {
                        recipient: targetPhone, // Use the correct field name from Alaris docs
                        message: communication.content, // Use the correct field name
                        // senderId: "YourClinic", // Add if required by Alaris
                        // Add any other required fields here
                    };

                    console.log(`Attempting to send SMS via Alaris to ${targetPhone} for comm ${communicationId}`);
                    
                    // **IMPORTANT**: Adjust headers based on Alaris API docs (Step 1.3)
                    const headers: HeadersInit = {
                        'Content-Type': 'application/json',
                        // Example: API Key in Authorization header
                        'Authorization': `Bearer ${apiKey}`, 
                        // Example: API Key in custom header (Replace 'X-API-Key' if different)
                        // 'X-API-Key': apiKey 
                    };
                    
                    // **IMPORTANT**: Adjust method if not POST (Step 1.2)
                    const response = await fetch(apiEndpoint, {
                        method: 'POST', 
                        headers: headers,
                        body: JSON.stringify(payload),
                    });

                    console.log(`Alaris API response status for comm ${communicationId}: ${response.status}`);

                    // **IMPORTANT**: Adjust success check based on Alaris API docs (Step 1.5)
                    if (response.ok) { // Check if status code is 2xx
                        // Optionally check response body if needed
                        // const responseData = await response.json(); 
                        // console.log("Alaris API Success Response:", responseData);
                        console.log(`Successfully sent SMS via Alaris for comm ${communicationId}.`);
                        success = true;
                    } else {
                        // Handle API errors
                        const errorBody = await response.text();
                        console.error(`Alaris API error for comm ${communicationId}: ${response.status} ${response.statusText}. Body: ${errorBody}`);
                        success = false;
                        errorMessage = `SMS provider error: ${response.status} ${response.statusText}. ${errorBody.substring(0, 100)}`; // Limit error message
                    }
                } catch (apiError) {
                    console.error(`Error calling Alaris API for comm ${communicationId}:`, apiError);
                    success = false;
                    errorMessage = `Failed to call SMS provider: ${apiError.message}`;
                }
            }
            // --- End Alaris SMS API Integration ---
        }
    } else { // Handle WhatsApp (Still Simulation) or other unsupported channels
        // TODO: Add WhatsApp integration using Alaris API similarly
        console.warn(`Unsupported or not yet integrated channel: ${communication.channel} for comm ID ${communication.id}`);
        success = false; // Mark as failed for unsupported/unintegrated channel
        errorMessage = `Channel not supported or integrated: ${communication.channel}`;
    }
    // --- End Integration Point ---

  } catch (e) { // Catch errors from the entire sending process (fetch comms, API calls)
    console.error(`Error during communication processing for ${communicationId}:`, e);
    success = false;
    errorMessage = e.message;
  }

  // --- Update Communication Status ---
  // Always attempt to update status, even if sending failed
  if (communication) { // Only update if we successfully fetched the communication (Use 'communication' here)
      const newStatus = success ? 'sent' : 'failed';
      const updatePayload: { status: string; sent_at?: string; error_message?: string } = {
          status: newStatus,
      };
      if (success) {
          updatePayload.sent_at = new Date().toISOString();
      }
      if (errorMessage) {
          updatePayload.error_message = errorMessage.substring(0, 500); // Limit error message length
      }

      const { error: updateError } = await supabase
          .from('patient_communications')
          .update(updatePayload)
          .eq('id', communication.id); // Update the specific record (Use 'communication' here)

      if (updateError) {
          console.error(`Error updating status for communication ${communication.id} to ${newStatus}:`, updateError); // Use 'communication' here
          // Even if update fails, we return the success status of the *sending* attempt
      } else {
          // console.log(`Updated status for communication ${communication.id} to ${newStatus}.`); // Use 'communication' here
      }

      // Optional: Update related treatment plan notification info if applicable
      if (success && communication.treatment_plan_id) { // Use 'communication' here
          const { error: planUpdateError } = await supabase
              .from('treatment_plans')
              .update({
                  last_notification_sent: new Date().toISOString(),
                  // Use Supabase RPC or handle potential race conditions if incrementing directly
                  // notification_count: supabase.sql`notification_count + 1` // Be cautious with direct increments
              })
              .eq('id', communication.treatment_plan_id); // Use 'communication' here

          if (planUpdateError) {
              console.error(`Error updating treatment plan ${communication.treatment_plan_id} notification data:`, planUpdateError); // Use 'communication' here
          }
      }
  } else if (!success && !errorMessage) {
      // This case happens if fetching failed initially (e.g., status wasn't 'scheduled')
      // No update needed, just return false.
  }


  return success;
}

/**
 * Fetches and processes all communications that are scheduled and due.
 */
async function processScheduledCommunications(supabase: SupabaseClient): Promise<Response> {
  const now = new Date();
  let processedCount = 0;
  const results: { id: string; success: boolean }[] = [];

  try {
    // Fetch IDs of communications that are scheduled and due
    const { data: communications, error: fetchError } = await supabase
      .from('patient_communications')
      .select('id')
      .eq('status', 'scheduled') // Only fetch scheduled ones
      .lte('scheduled_for', now.toISOString()) // Due time is now or in the past
      .limit(50); // Process in batches to avoid overwhelming resources

    if (fetchError) {
      console.error('Error fetching scheduled communications:', fetchError);
      return new Response(
        JSON.stringify({ error: `Failed to fetch scheduled communications: ${fetchError.message}` }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    if (!communications || communications.length === 0) {
      console.log('No scheduled communications to process at this time.');
      return new Response(JSON.stringify({ processed: 0, results: [] }), { headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    console.log(`Found ${communications.length} communications to process.`);
    processedCount = communications.length;

    // Process each communication sequentially (can be parallelized with care)
    for (const comm of communications) {
      const success = await sendCommunication(supabase, comm.id);
      results.push({ id: comm.id, success });
    }

    console.log(`Finished processing batch. Success count: ${results.filter(r => r.success).length}/${processedCount}`);

  } catch (batchError) {
      console.error('Error during batch processing of scheduled communications:', batchError);
      // Return partial results if available, or an error response
      return new Response(
          JSON.stringify({ error: `Error during processing: ${batchError.message}`, processed: processedCount, results }),
          { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
  }

  // Return results of the processing batch
  return new Response(
    JSON.stringify({
      processed: processedCount,
      results
    }),
    { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
  );
}

/**
 * Updates the status of scheduled communications related to a specific appointment to 'cancelled'.
 */
async function cancelCommunicationsByAppointment(supabase: SupabaseClient, appointmentId: string): Promise<Response> {
  if (!appointmentId) {
    // This check is technically redundant due to the check in Deno.serve, but good practice
    return new Response(JSON.stringify({ error: 'appointmentId is required' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
  }

  try {
    console.log(`Attempting to cancel scheduled communications for appointment ID: ${appointmentId}`);
    // Update records directly in the database
    const { data, error, count } = await supabase
      .from('patient_communications')
      .update({
        status: 'cancelled',
        // Optionally add a cancelled_at timestamp:
        // cancelled_at: new Date().toISOString()
      })
      .eq('appointment_id', appointmentId)
      .eq('status', 'scheduled') // IMPORTANT: Only cancel messages that haven't been sent
      .select('id'); // Select only IDs of cancelled messages

    if (error) {
      console.error(`Database error cancelling communications for appointment ${appointmentId}:`, error);
      throw error; // Let the main catch block handle it
    }

    console.log(`Successfully marked ${count ?? 0} communications as cancelled for appointment ${appointmentId}.`);
    return new Response(
      JSON.stringify({ success: true, cancelledCount: count ?? 0, cancelledIds: data?.map(d => d.id) || [] }),
      { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );

  } catch (error) {
    console.error('Error in cancelCommunicationsByAppointment function:', error);
    return new Response(
      JSON.stringify({ error: `Failed to cancel communications: ${error.message}` }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
}
