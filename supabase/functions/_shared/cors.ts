// supabase/functions/_shared/cors.ts

// Standard CORS headers. Adjust as necessary for your security requirements.
// For development, '*' might be okay. For production, restrict to your frontend domain.
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Replace '*' with your frontend's origin in production
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS', // Specify allowed methods
};
