// supabase/functions/ai-insights/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const openAiKey = Deno.env.get("OPENAI_API_KEY");
const supabase = createClient(supabaseUrl, supabaseKey);
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, apikey, x-client-info"
};

// Expected data structure for a parsed supplier invoice
interface ParsedInvoiceItemFromAI {
  description: string; // Item description
  quantity: number | null;
  unit_price: number | null; // Price per unit
}

interface ParsedInvoiceDataFromAI {
  supplier_name?: string | null;
  invoice_date?: string | null; // YYYY-MM-DD
  total_amount?: number | null;
  items: ParsedInvoiceItemFromAI[];
  raw_text?: string | null; // Optional: Full extracted text
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // Expecting an array of image_data_urls for PDF pages, or a single one for an image file
    const { image_data_urls } = await req.json(); 

    if (!image_data_urls || !Array.isArray(image_data_urls) || image_data_urls.length === 0) {
      return new Response(JSON.stringify({ error: "Missing or invalid image_data_urls array" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const openAiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openAiKey) {
      console.error("OPENAI_API_KEY is not set in Supabase secrets.");
      return new Response(JSON.stringify({ error: "OpenAI API key not configured." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    const model = "gpt-4o";

    const system_prompt = `You are an expert OCR and data extraction assistant for invoices.
Analyze the content of the provided image(s), which represent pages of a single supplier invoice.
Extract the following information cohesively from all pages:
1. "supplier_name": The name of the supplier or vendor.
2. "invoice_date": The date of the invoice (format as YYYY-MM-DD if found, otherwise null).
3. "total_amount": The final total amount of the invoice (numerical value, null if not found).
4. "items": A list of line items. For each item, extract:
   - "description": The item name or description.
   - "quantity": The numerical quantity.
   - "unit_price": The price per unit for the item.
5. "raw_text": The combined full, raw text extracted from all pages, if possible. (Optional field)

Respond ONLY with a valid JSON object matching the following structure. Do not include any other text, explanations, or markdown formatting.
If a value is not found, use null. For numerical fields, if not found, use null.

Example JSON structure:
{
  "supplier_name": "Example Supplier Inc.",
  "invoice_date": "2025-05-10",
  "total_amount": 1275.50,
  "items": [
    { "description": "Product A Widget", "quantity": 10, "unit_price": 50.25 },
    { "description": "Service B Fee", "quantity": 1, "unit_price": 773.00 }
  ],
  "raw_text": "Full text content of the invoice..."
}`;
    
    const userContent: any[] = [
      {
        type: "text",
        text: "Extract data from the following page(s) of a single invoice according to the specified JSON structure. Consolidate information across all pages if the document is multi-page.",
      },
    ];

    for (const dataUrl of image_data_urls) {
      userContent.push({
        type: "image_url",
        image_url: {
          url: dataUrl,
          detail: "auto",
        },
      });
    }

    const messages = [
      { role: "system", content: system_prompt },
      { role: "user", content: userContent },
    ];

    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        response_format: { type: "json_object" },
        temperature: 0.2,
        max_tokens: 3000, 
      }),
    });

    if (!aiResponse.ok) {
      const errorBody = await aiResponse.text();
      console.error("OpenAI API Error:", aiResponse.status, errorBody);
      throw new Error(`OpenAI API request failed: ${aiResponse.status} ${errorBody}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content;

    if (!aiContent) {
      console.error("No content in OpenAI response:", JSON.stringify(aiData, null, 2));
      throw new Error("OpenAI response did not contain expected content.");
    }

    let parsedJsonResponse: ParsedInvoiceDataFromAI;
    let cleanedJsonString = "";
    try {
      cleanedJsonString = aiContent.trim();
      if (cleanedJsonString.startsWith("```json")) {
        cleanedJsonString = cleanedJsonString.substring(7).trim();
        if (cleanedJsonString.endsWith("```")) {
          cleanedJsonString = cleanedJsonString.substring(0, cleanedJsonString.length - 3).trim();
        }
      } else if (cleanedJsonString.startsWith("```") && cleanedJsonString.endsWith("```")) {
        cleanedJsonString = cleanedJsonString.substring(3, cleanedJsonString.length - 3).trim();
      }
      parsedJsonResponse = JSON.parse(cleanedJsonString);
    } catch (parseError) {
      console.error("Failed to parse AI content as JSON. Cleaned string attempt:", cleanedJsonString, "Original raw content:", aiContent, parseError);
      throw new Error("AI response was not valid JSON. Raw content: " + aiContent);
    }
    
    const responseData: ParsedInvoiceDataFromAI = {
      supplier_name: parsedJsonResponse.supplier_name || null,
      invoice_date: parsedJsonResponse.invoice_date || null,
      total_amount: typeof parsedJsonResponse.total_amount === 'number' ? parsedJsonResponse.total_amount : null,
      items: (parsedJsonResponse.items || []).map((item: any) => ({
        description: item.description || "N/A",
        quantity: typeof item.quantity === 'number' ? item.quantity : null,
        unit_price: typeof item.unit_price === 'number' ? item.unit_price : null,
      })),
      raw_text: parsedJsonResponse.raw_text || aiContent,
    };

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("Error in ocr-invoice-parser function:", err);
    const errorMessage = err instanceof Error ? err.message : "Invoice OCR parsing failed";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
