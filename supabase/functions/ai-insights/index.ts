// supabase/functions/ai-insights/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const openAiKey = Deno.env.get("OPENAI_API_KEY")!;

const supabase = createClient(supabaseUrl, supabaseKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, apikey, x-client-info",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // Fetch data from the `inventory_items` table
    const { data: inventory, error } = await supabase
      .from("inventory_items")
      .select("*");

    if (error || !inventory) throw new Error("Failed to fetch inventory.");

    // Add estimated average daily usage
    const withUsage = inventory.map((item) => ({
      ...item,
      avg_daily_usage:
        item.quantity > 0 ? Math.max(1, Math.floor(item.quantity / 30)) : 1,
    }));

    // Low stock forecast
    const lowStockForecast = withUsage.map((item) => {
      const threshold = item.low_stock_threshold || 10;
      const daysToLowStock = Math.floor(
        (item.quantity - threshold) / item.avg_daily_usage
      );
      return {
        itemId: item.id,
        itemName: item.item_name,
        category: item.category,
        currentStock: item.quantity,
        threshold,
        avgDailyUsage: item.avg_daily_usage,
        daysToLowStock,
        estimatedDateToLowStock: new Date(
          Date.now() + daysToLowStock * 86400000
        ).toISOString(),
        usageTrend: "increasing",
      };
    });

    // Upcoming expiries (within 30 days)
    const upcomingExpiries = withUsage
      .filter((item) => item.expiry_date)
      .map((item) => {
        const expiry = new Date(item.expiry_date);
        const daysUntilExpiry = Math.ceil(
          (expiry.getTime() - Date.now()) / 86400000
        );
        return {
          itemId: item.id,
          itemName: item.item_name,
          category: item.category,
          expiryDate: expiry.toISOString(),
          daysUntilExpiry,
          quantity: item.quantity,
        };
      })
      .filter((item) => item.daysUntilExpiry <= 30);

    // Ask OpenAI for markdown-formatted analysis
    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are an AI assistant helping dental clinics manage inventory. Generate detailed insights in markdown format.",
          },
          {
            role: "user",
            content: `Here's the inventory: ${JSON.stringify(withUsage)}

Please:
1. List items OUT OF STOCK or near threshold (7 days).
2. Suggest reorder amounts (avg_daily_usage * 15).
3. Highlight soon-to-expire items (within 7 days).
4. Flag risky categories with frequent issues.
5. Tag items as 'High Clinical Impact' or 'Routine'.
6. Output a detailed markdown report with bold item names and sections.`,
          },
        ],
        temperature: 0.5,
      }),
    });

    const aiData = await aiResponse.json();
    const smartSuggestions =
      aiData.choices?.[0]?.message?.content ?? "No AI suggestions returned.";

    // ✅ Enhanced structuredInsights parsing
    const smartLines = smartSuggestions
      .split("\n")
      .filter((line) => line.trim().startsWith("-"));

    const structuredInsights = smartLines.map((line) => {
      const text = line.replace(/^- /, "").trim();

      let type: "reorder" | "expiry" | "clinical" = "clinical";
      if (text.toLowerCase().includes("reorder")) type = "reorder";
      else if (text.toLowerCase().includes("expiry")) type = "expiry";

      let impact: "High" | "Medium" | "Low" = "Low";
      if (text.toLowerCase().includes("high")) impact = "High";
      else if (text.toLowerCase().includes("medium")) impact = "Medium";

      return {
        message: text,
        type,
        impact,
      };
    });

    const result = {
      inventory: {
        lowStockForecast,
        upcomingExpiries,
      },
      assets: {
        smartReorderSuggestions: smartSuggestions,
        structuredInsights: structuredInsights,
      },
      generatedAt: new Date().toISOString(),
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (err) {
    console.error("Error in AI insights:", err);
    return new Response(JSON.stringify({ error: "AI Insights failed" }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
