import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface Asset {
  id: string;
  asset_name: string;
  location: string | null;
  last_serviced_date: string | null;
  next_maintenance_due_date: string | null;
  supplier_info: string | null;
  responsible_user_id: string | null;
  // profiles: { email: string | null } | null; // To get email of responsible user
}

interface Profile {
  id: string;
  email?: string; // Assuming email is on profiles table
}


// Email sending utility
async function sendEmail(to: string, subject: string, htmlBody: string) {
  const emailProvider = Deno.env.get('EMAIL_PROVIDER'); // e.g., 'resend', 'sendgrid'
  const apiKey = Deno.env.get('EMAIL_API_KEY');
  const fromEmail = Deno.env.get('EMAIL_FROM_ADDRESS');

  if (!apiKey || !fromEmail) {
    console.warn('Email API key or From Address not configured. Skipping email sending.');
    console.log(`Email intended for ${to} - Subject: ${subject}`);
    // console.log(`Body: ${htmlBody}`); // Log body only if really needed for debugging
    return;
  }

  console.log(`Attempting to send email to ${to} via ${emailProvider || 'configured service'}...`);

  try {
    // Example for Resend (User needs to adjust this for their chosen provider)
    if (emailProvider === 'resend') {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: to,
          subject: subject,
          html: htmlBody,
        }),
      });
      if (!res.ok) {
        const errorBody = await res.text();
        throw new Error(`Resend API Error (${res.status}): ${errorBody}`);
      }
      console.log(`Email sent to ${to} successfully via Resend.`);
    } 
    // Example for SendGrid (User needs to adjust this)
    /* else if (emailProvider === 'sendgrid') {
      const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to }] }],
          from: { email: fromEmail },
          subject: subject,
          content: [{ type: 'text/html', value: htmlBody }],
        }),
      });
      if (!res.ok) {
        const errorBody = await res.text();
        throw new Error(`SendGrid API Error (${res.status}): ${errorBody}`);
      }
      console.log(`Email sent to ${to} successfully via SendGrid.`);
    } */
    else {
      console.warn(`Unsupported email provider: ${emailProvider}. Email not sent. Please configure EMAIL_PROVIDER and the sending logic.`);
      // Fallback to console log if no provider logic matches
      console.log(`Fallback: Email intended for ${to} - Subject: ${subject}`);
    }
  } catch (error) {
    console.error(`Failed to send email to ${to}:`, error.message);
  }
}

async function createInAppNotification(
  supabaseClient: SupabaseClient,
  userId: string,
  message: string,
  assetId: string
) {
  const { error } = await supabaseClient.from('notifications').insert({
    user_id: userId,
    message: message,
    link_url: `/assets/${assetId}`, // Adjust link as per your app's routing
  });
  if (error) {
    console.error(`Error creating in-app notification for user ${userId}:`, error);
  } else {
    console.log(`In-app notification created for user ${userId}: ${message}`);
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(today.getDate() + 7);
    const sevenDaysFromNowStr = sevenDaysFromNow.toISOString().split('T')[0];

    // Fetch assets needing reminder (due in 7 days)
    const { data: assetsForReminder, error: reminderError } = await supabaseClient
      .from('assets')
      .select(`
        id,
        asset_name,
        location,
        last_serviced_date,
        next_maintenance_due_date,
        supplier_info,
        responsible_user_id,
        profiles ( email )
      `)
      .eq('next_maintenance_due_date', sevenDaysFromNowStr);

    if (reminderError) throw reminderError;

    for (const asset of (assetsForReminder as any[] || [])) {
      if (asset.responsible_user_id && asset.profiles?.email) {
        const reminderSubject = `Maintenance Reminder: ${asset.asset_name}`;
        const reminderBody = `
          <p>Hi,</p>
          <p>This is a reminder that the following asset is due for maintenance soon:</p>
          <p><strong>Asset Name:</strong> ${asset.asset_name}</p>
          <p><strong>Room/Location:</strong> ${asset.location || 'N/A'}</p>
          <p><strong>Last Serviced:</strong> ${asset.last_serviced_date || 'N/A'}</p>
          <p><strong>Next Due:</strong> ${asset.next_maintenance_due_date}</p>
          <p><strong>Assigned Supplier:</strong> ${asset.supplier_info || 'N/A'}</p>
          <p>Please arrange for the upcoming maintenance.</p>
          <p>Thank you.</p>
        `;
        await sendEmail(asset.profiles.email, reminderSubject, reminderBody);
        await createInAppNotification(
          supabaseClient,
          asset.responsible_user_id,
          `Maintenance for ${asset.asset_name} is due on ${asset.next_maintenance_due_date}.`,
          asset.id
        );
      }
    }

    // Fetch overdue assets
    const { data: overdueAssets, error: overdueError } = await supabaseClient
      .from('assets')
      .select(`
        id,
        asset_name,
        location,
        last_serviced_date,
        next_maintenance_due_date,
        supplier_info,
        responsible_user_id,
        profiles ( email )
      `)
      .lt('next_maintenance_due_date', todayStr); // Less than today

    if (overdueError) throw overdueError;

    for (const asset of (overdueAssets as any[] || [])) {
      if (asset.responsible_user_id && asset.profiles?.email) {
        const urgentSubject = `URGENT: Maintenance Overdue for ${asset.asset_name}`;
        const urgentBody = `
          <p>Hi,</p>
          <p><strong>URGENT:</strong> The following asset is overdue for maintenance:</p>
          <p><strong>Asset Name:</strong> ${asset.asset_name}</p>
          <p><strong>Room/Location:</strong> ${asset.location || 'N/A'}</p>
          <p><strong>Last Serviced:</strong> ${asset.last_serviced_date || 'N/A'}</p>
          <p><strong>Next Due:</strong> ${asset.next_maintenance_due_date}</p>
          <p><strong>Assigned Supplier:</strong> ${asset.supplier_info || 'N/A'}</p>
          <p>Please take immediate action to service this asset.</p>
          <p>Thank you.</p>
        `;
        await sendEmail(asset.profiles.email, urgentSubject, urgentBody);
        await createInAppNotification(
          supabaseClient,
          asset.responsible_user_id,
          `URGENT: Maintenance for ${asset.asset_name} was due on ${asset.next_maintenance_due_date}. It is now overdue.`,
          asset.id
        );
      }
    }

    return new Response(JSON.stringify({ message: 'Maintenance reminders processed.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error processing maintenance reminders:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
