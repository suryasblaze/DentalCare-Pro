import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
// Import Resend using npm specifier (ensure your import_map.json handles this if needed, though Supabase usually does)
import { Resend } from 'npm:resend'; 

// --- Configuration ---
// Load API key from environment variables set via Supabase secrets
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
// Get your app's frontend URL (for constructing links) - set this as a secret too!
const APP_URL = Deno.env.get('APP_BASE_URL') || 'http://localhost:5173'; // Default for local dev, CHANGE THIS
// Define the sender email address (must be a verified domain in Resend)
const SENDER_EMAIL = Deno.env.get('SENDER_EMAIL') || 'Inventory System <noreply@yourverifieddomain.com>'; // CHANGE THIS

// --- Type Definition for Payload ---
interface AdjustmentRequestPayload {
  request_id: string;
  item_name: string;
  quantity_to_decrease: number;
  reason: string;
  requester_name: string;
  notes: string;
  approval_token: string;
  approver_emails: string[];
}

// --- Main Function Handler ---
serve(async (req) => {
  // 1. Check Method and API Key
  if (req.method !== 'POST') {
    console.warn('Received non-POST request');
    return new Response('Method Not Allowed', { status: 405 });
  }
  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY environment variable is not set.');
    return new Response(JSON.stringify({ error: 'Email service not configured.' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }

  // Initialize Resend client
  const resend = new Resend(RESEND_API_KEY);

  try {
    // 2. Parse Payload
    const payload = await req.json() as AdjustmentRequestPayload;
    console.log("Received payload:", payload); // Log received data for debugging

    if (!payload.approver_emails || !Array.isArray(payload.approver_emails) || payload.approver_emails.length === 0) {
      console.log("No valid approver emails provided in payload.");
      return new Response(JSON.stringify({ message: 'No approver emails provided.' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200, // Or 400 Bad Request if emails are mandatory
      });
    }

    // 3. Construct Approval Link
    // IMPORTANT: Adjust the path '/inventory/adjustments/approve/' based on your actual frontend route
    const approvalLink = `${APP_URL}/inventory/adjustments/approve/${payload.request_id}?token=${payload.approval_token}`;

    // 4. Prepare and Send Emails
    const emailPromises = payload.approver_emails.map(async (email) => {
      // Basic email validation
      if (typeof email !== 'string' || !email.includes('@')) {
          console.warn(`Invalid email format skipped: ${email}`);
          return { email, status: 'skipped', reason: 'Invalid format' };
      }
      
      console.log(`Attempting to send email to: ${email}`);
      try {
        const { data, error } = await resend.emails.send({
          from: SENDER_EMAIL,
          to: [email], // Resend API expects an array
          subject: `Approval Required: Inventory Adjustment Request for ${payload.item_name || 'Unknown Item'}`,
          html: `
            <p>Hello,</p>
            <p>An inventory adjustment request requires your approval:</p>
            <ul>
              <li><strong>Item:</strong> ${payload.item_name || 'N/A'}</li>
              <li><strong>Quantity to Decrease:</strong> ${payload.quantity_to_decrease}</li>
              <li><strong>Reason:</strong> ${payload.reason || 'N/A'}</li>
              <li><strong>Requester:</strong> ${payload.requester_name || 'N/A'}</li>
              <li><strong>Notes:</strong> ${payload.notes || 'N/A'}</li>
            </ul>
            <p>Please review and approve or reject using the link below:</p>
            <p><a href="${approvalLink}">Process Request</a></p>
            <hr>
            <p style="font-size: 0.8em; color: grey;">Request ID: ${payload.request_id}<br>Token: ${payload.approval_token}</p>
          `,
        });

        if (error) {
          console.error(`Resend API error sending email to ${email}:`, JSON.stringify(error));
          return { email, status: 'failed', error: error.message };
        }
        console.log(`Email sent successfully via Resend to ${email}. ID: ${data?.id}`);
        return { email, status: 'success', id: data?.id };
      } catch (innerError) {
         console.error(`Exception during Resend call for ${email}:`, innerError);
         return { email, status: 'exception', error: innerError.message || 'Unknown exception' };
      }
    });

    // 5. Process Results
    const results = await Promise.all(emailPromises);
    const failures = results.filter(r => r.status !== 'success' && r.status !== 'skipped');

    if (failures.length > 0) {
       console.error("Some emails failed to send:", failures);
       // Decide on response status based on whether *any* succeeded or if all failed
       const anySuccess = results.some(r => r.status === 'success');
       return new Response(JSON.stringify({ message: 'Processing complete. Some emails failed to send.', results }), {
         headers: { 'Content-Type': 'application/json' },
         status: anySuccess ? 207 : 500, // Multi-Status or Internal Server Error
       });
    }

    console.log("All emails processed successfully.");
    return new Response(JSON.stringify({ message: 'Emails processed successfully.', results }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error parsing request body or unexpected error:', error);
    return new Response(JSON.stringify({ error: 'Failed to process request.', details: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 400, // Bad Request likely if JSON parsing failed
    });
  }
})
