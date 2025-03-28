import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.pathname.split('/').pop();
    
    if (!action) {
      throw new Error('No action specified');
    }
    
    // Extract request body
    const body = await req.json();
    const { supabaseClient } = body;
    
    let result = null;
    let error = null;
    
    // Transaction management endpoints
    switch (action) {
      case 'begin_transaction':
        try {
          await supabaseClient.rpc('begin_transaction');
          result = { message: 'Transaction started' };
        } catch (err) {
          error = { message: 'Failed to start transaction', details: err.message };
        }
        break;
      
      case 'commit_transaction':
        try {
          await supabaseClient.rpc('commit_transaction');
          result = { message: 'Transaction committed' };
        } catch (err) {
          error = { message: 'Failed to commit transaction', details: err.message };
        }
        break;
      
      case 'rollback_transaction':
        try {
          await supabaseClient.rpc('rollback_transaction');
          result = { message: 'Transaction rolled back' };
        } catch (err) {
          error = { message: 'Failed to rollback transaction', details: err.message };
        }
        break;
      
      default:
        error = { message: 'Invalid action' };
    }
    
    if (error) {
      return new Response(
        JSON.stringify({ error }),
        { 
          status: 400, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          } 
        }
      );
    }
    
    return new Response(
      JSON.stringify({ result }),
      { 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        } 
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: { message: err.message } }),
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