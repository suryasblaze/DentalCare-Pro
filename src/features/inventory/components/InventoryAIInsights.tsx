import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Sparkles, Flame, Calendar, Package, AlertCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

interface AIInsight {
  message: string;
  type: 'reorder' | 'expiry' | 'clinical';
  impact: 'High' | 'Medium' | 'Low';
}

interface AIInsightsResponse {
  assets: {
    structuredInsights: AIInsight[];
  };
  generatedAt: string;
}

interface InventoryAIInsightsProps {
  onLoadingChange: (loading: boolean) => void;
  onInitialFetchComplete: () => void;
}

const iconMap = {
  reorder: <Package className="text-blue-500" size={16} />,
  expiry: <Calendar className="text-red-500" size={16} />,
  clinical: <Flame className="text-orange-500" size={16} />
};

const impactBadge = {
  High: 'bg-red-100 text-red-600',
  Medium: 'bg-yellow-100 text-yellow-600',
  Low: 'bg-green-100 text-green-600'
};

const parseInsights = (insights: AIInsight[]) => {
  const grouped: Record<string, { insight: AIInsight; content: string }[]> = {};
  const ungrouped: { insight: AIInsight; content: string }[] = [];

  let currentItem: string | null = null;

  for (const insight of insights) {
    const raw = insight.message.trim();
    const nameMatch = raw.match(/\*\*(.*?)\*\*/);
    const name = nameMatch?.[1]?.trim() || null;

    if (name) {
      currentItem = name;
      const content = raw.replace(/\*\*(.*?)\*\*\s*:?/, '').trim();
      if (!grouped[currentItem]) grouped[currentItem] = [];
      if (content && content !== '-' && content.length > 5) {
        grouped[currentItem].push({ insight, content });
      }
    } else if (currentItem) {
      if (raw && raw !== '-' && raw.length > 5) {
        grouped[currentItem].push({ insight, content: raw });
      }
    } else {
      if (raw && raw.length > 10 && raw !== '-') {
        ungrouped.push({ insight, content: raw });
      }
    }
  }

  return { grouped, ungrouped };
};

const InventoryAIInsights: React.FC<InventoryAIInsightsProps> = ({ onLoadingChange, onInitialFetchComplete }) => {
  const [insights, setInsights] = useState<AIInsight[] | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    onLoadingChange(true);

    try {
      signal?.throwIfAborted();

      const { data, error: invokeError } = await supabase.functions.invoke(
        'ai-insights'
      );
      
      signal?.throwIfAborted();

      if (invokeError) throw invokeError;

      const response = data as AIInsightsResponse;
      if (response.assets?.structuredInsights) {
        setInsights(response.assets.structuredInsights);
        setGeneratedAt(response.generatedAt);
      } else {
        throw new Error('Invalid AI insight format.');
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setError('AI insights request timed out (120 seconds).');
      } else if (err && typeof err === 'object' && 'message' in err) {
        setError((err as Error).message || 'Unknown error fetching AI insights');
      } else {
        setError('An unknown error occurred while fetching AI insights.');
      }
      setInsights(null);
    } finally {
      setLoading(false);
      onLoadingChange(false);
      onInitialFetchComplete();
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    fetchInsights(controller.signal);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
      onLoadingChange(false);
      onInitialFetchComplete();
    };
  }, [onLoadingChange, onInitialFetchComplete]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="animate-pulse">AI Suggestions</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-full mb-2" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!insights) return null;

  const { grouped, ungrouped } = parseInsights(insights);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="text-xl font-semibold flex gap-2 items-center">
          <Sparkles className="text-yellow-400" />
          AI Suggestions
        </div>
        <div className="text-xs text-muted-foreground">
          Generated: {new Date(generatedAt).toLocaleString()}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Object.entries(grouped).map(([title, entries], idx) => {
          if (!entries || entries.length === 0) return null;
          return (
            <div
              key={idx}
              className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-3 hover:shadow-md transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="font-semibold text-base flex items-center gap-2">
                  {iconMap[entries[0].insight.type]}
                  {title}
                </div>
                <div
                  className={`text-xs px-2 py-1 rounded-full font-medium ${
                    impactBadge[entries[0].insight.impact]
                  }`}
                >
                  {entries[0].insight.impact} Impact
                </div>
              </div>
              <ul className="space-y-2 text-sm text-gray-700">
                {entries.map((entry, i) => (
                  <li key={i} className="border-l-2 pl-3 border-gray-300">
                    {entry.content}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}

        {ungrouped.length > 0 && (
          <div className="bg-white rounded-2xl border border-blue-200 shadow-sm p-4 space-y-3 col-span-full">
            <div className="font-semibold text-base flex items-center gap-2">
              <Sparkles className="text-purple-500" />
              General Suggestions
            </div>
            <ul className="space-y-2 text-sm text-gray-700">
              {ungrouped.map((entry, i) => (
                <li key={i} className="flex justify-between items-start border-l-2 pl-3 border-gray-300">
                  <span>{entry.content}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${impactBadge[entry.insight.impact]}`}
                  >
                    {entry.insight.impact}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryAIInsights;
