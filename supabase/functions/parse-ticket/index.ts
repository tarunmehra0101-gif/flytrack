import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    let payload: { text?: unknown };
    try {
      payload = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Request body must be valid JSON" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const text = typeof payload.text === "string" ? payload.text.trim() : "";
    if (!text) {
      return new Response(JSON.stringify({ error: "Missing raw text in request body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY environment secret is not set in your Supabase project." }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const prompt = `You are an expert flight ticket parser. Analyze the following text extracted from a flight ticket/boarding pass and extract all flight details. Reject mock or baggage allowance numbers (e.g. lines like '6E 15KG' represent baggage, not flight number 6E15).
Return a JSON object matching this schema exactly:
{
  "flights": [
    {
      "passenger_name": "string or null",
      "flight_number": "string (e.g. AI505, 6E2341)",
      "airline_iata": "string (2 letters, e.g. AI, 6E)",
      "departure_airport_iata": "string (3 letters, e.g. DEL, BOM)",
      "arrival_airport_iata": "string (3 letters, e.g. BOM, DEL)",
      "flight_date": "string (YYYY-MM-DD format) or null",
      "departure_time_local": "string (HH:MM format) or null",
      "arrival_time_local": "string (HH:MM format) or null",
      "seat_number": "string or null",
      "ticket_number": "string or null",
      "pnr": "string or null"
    }
  ]
}

Raw text:
${text}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(JSON.stringify({ error: `Gemini API returned error: ${errorText}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    const candidateText = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) {
      return new Response(JSON.stringify({ error: "Gemini returned empty content" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsedData = JSON.parse(candidateText.trim());
    return new Response(JSON.stringify(parsedData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
