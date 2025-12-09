
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TranscribeRequest {
  audioBase64: string;
  mimeType?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('[transcribe-audio] Request received');

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[transcribe-audio] No authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized', detail: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[transcribe-audio] Missing Supabase configuration');
      return new Response(
        JSON.stringify({ error: 'Configuration Error', detail: 'Missing Supabase configuration' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user authentication
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error('[transcribe-audio] Invalid user token:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized', detail: 'Invalid user token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[transcribe-audio] User authenticated:', user.id);

    // Check subscription status
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('status')
      .eq('user_id', user.id)
      .maybeSingle();

    if (subError) {
      console.error('[transcribe-audio] Error checking subscription:', subError);
    }

    const isSubscribed = subscription?.status === 'active' || subscription?.status === 'trialing';

    if (!isSubscribed) {
      console.error('[transcribe-audio] User not subscribed');
      return new Response(
        JSON.stringify({ 
          error: 'Subscription Required', 
          detail: 'An active subscription is required to use voice input' 
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get OpenAI API key (using OpenRouter key which should work with OpenAI endpoints)
    const openaiApiKey = Deno.env.get('OPENROUTER_API_KEY');
    if (!openaiApiKey) {
      console.error('[transcribe-audio] Missing OPENROUTER_API_KEY');
      return new Response(
        JSON.stringify({ 
          error: 'Configuration Error', 
          detail: 'API key not configured' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body: TranscribeRequest = await req.json();
    const { audioBase64, mimeType = 'audio/m4a' } = body;

    if (!audioBase64) {
      return new Response(
        JSON.stringify({ error: 'Bad Request', detail: 'Missing audioBase64' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[transcribe-audio] Transcribing audio...');

    // Convert base64 to binary
    const audioData = Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0));
    
    // Create form data for OpenAI Whisper API
    const formData = new FormData();
    const audioBlob = new Blob([audioData], { type: mimeType });
    formData.append('file', audioBlob, 'audio.m4a');
    formData.append('model', 'whisper-1');
    formData.append('language', 'en'); // English language

    // Call OpenAI Whisper API directly
    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: formData,
    });

    if (!whisperResponse.ok) {
      const errorText = await whisperResponse.text();
      console.error('[transcribe-audio] OpenAI API error:', whisperResponse.status, errorText);
      
      // If OpenAI fails, try OpenRouter as fallback
      console.log('[transcribe-audio] Trying OpenRouter as fallback...');
      
      const openRouterFormData = new FormData();
      openRouterFormData.append('file', audioBlob, 'audio.m4a');
      openRouterFormData.append('model', 'whisper-1');
      openRouterFormData.append('language', 'en');
      
      const openRouterResponse = await fetch('https://openrouter.ai/api/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'HTTP-Referer': supabaseUrl,
          'X-Title': 'Macro Goal',
        },
        body: openRouterFormData,
      });
      
      if (!openRouterResponse.ok) {
        const orErrorText = await openRouterResponse.text();
        console.error('[transcribe-audio] OpenRouter API error:', openRouterResponse.status, orErrorText);
        return new Response(
          JSON.stringify({ 
            error: 'Transcription Error', 
            detail: 'Failed to transcribe audio. Please try again.' 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const orTranscription = await openRouterResponse.json();
      console.log('[transcribe-audio] OpenRouter transcription successful');
      
      return new Response(
        JSON.stringify({ 
          text: orTranscription.text || '',
          duration: orTranscription.duration,
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const transcription = await whisperResponse.json();
    console.log('[transcribe-audio] OpenAI transcription successful');

    return new Response(
      JSON.stringify({ 
        text: transcription.text || '',
        duration: transcription.duration,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('[transcribe-audio] Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal Server Error', 
        detail: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
