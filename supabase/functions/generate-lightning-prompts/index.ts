// Supabase Edge Function: generate-lightning-prompts
// Generates unique, fun lightning round prompts using Google Gemini AI
// Matches web app configuration: gemini-2.5-flash model

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
// Use gemini-2.0-flash which is the latest stable flash model
const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Fallback prompts if AI fails
const FALLBACK_PROMPTS = [
  "What's your go-to comfort food?",
  "Morning person or night owl?",
  "Last song you had on repeat?",
  "Favorite way to relax?",
  "Beach or mountains?",
  "What's something you're grateful for today?",
  "Cats or dogs?",
  "Favorite season and why?",
  "What's a skill you want to learn?",
  "Coffee or tea?",
  "What made you smile today?",
  "Dream vacation destination?",
  "Favorite childhood memory?",
  "What's your hidden talent?",
  "Best advice you've ever received?",
];

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { count = 5 } = await req.json();
    const promptCount = Math.min(Math.max(count, 1), 10); // Clamp between 1 and 10

    // If no API key, return fallback prompts
    if (!GEMINI_API_KEY) {
      console.log('No Gemini API key, using fallback prompts');
      const shuffled = [...FALLBACK_PROMPTS].sort(() => Math.random() - 0.5);
      return new Response(
        JSON.stringify({ prompts: shuffled.slice(0, promptCount) }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate prompts using Google Gemini (matching web app config)
    const response = await fetch(
      `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `You are a creative prompt generator for a social app called Limbo.
Your job is to create fun, quick-fire questions for the "Lightning Round" feature where users answer rapidly.

Generate ${promptCount} engaging questions that are:
- Easy to answer quickly (in a few words or a short sentence)
- Light-hearted, fun, and conversational (not formal)
- Good conversation starters that encourage personal stories or opinions
- Varied in topic (mix of preferences, memories, opinions, hypotheticals, "would you rather", favorites)
- Appropriate for all ages
- Not too deep or philosophical (this is a rapid-fire game - keep it snappy!)

Return ONLY a JSON array of strings, no other text or markdown formatting. Example:
["What's your comfort movie?", "Sweet or savory snacks?", "Last thing that made you laugh?"]

Generate exactly ${promptCount} unique lightning round prompts now:`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.95, // High creativity like Party Mode prompts
            maxOutputTokens: 500,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      // Return error details for debugging
      const shuffled = [...FALLBACK_PROMPTS].sort(() => Math.random() - 0.5);
      return new Response(
        JSON.stringify({
          error: `Gemini API error: ${response.status}`,
          details: errorText,
          prompts: shuffled.slice(0, promptCount)
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Parse the JSON array from the response
    let prompts: string[];
    try {
      // Try to extract JSON array from the response (handle markdown code blocks)
      const jsonMatch = content.match(/\[[\s\S]*?\]/);
      if (jsonMatch) {
        prompts = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON array found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError, 'Content:', content);
      // Return fallback prompts
      const shuffled = [...FALLBACK_PROMPTS].sort(() => Math.random() - 0.5);
      prompts = shuffled.slice(0, promptCount);
    }

    // Ensure we have enough prompts
    if (prompts.length < promptCount) {
      const shuffled = [...FALLBACK_PROMPTS].sort(() => Math.random() - 0.5);
      prompts = [...prompts, ...shuffled].slice(0, promptCount);
    }

    return new Response(
      JSON.stringify({ prompts: prompts.slice(0, promptCount) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating prompts:', error);

    // Return fallback prompts on any error
    const shuffled = [...FALLBACK_PROMPTS].sort(() => Math.random() - 0.5);
    return new Response(
      JSON.stringify({ prompts: shuffled.slice(0, 5) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
