import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';

interface Props {
  content: string;
  generatedAt: string;
}

const AIRecommendationCard: React.FC<Props> = ({ content, generatedAt }) => {
  return (
    <Card className="shadow-md border border-muted-foreground/20">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2 text-xl font-semibold text-primary">
          <Sparkles className="text-yellow-400" size={22} />
          AI Recommendations
        </div>
        <div className="text-xs text-muted-foreground">
          Generated: {new Date(generatedAt).toLocaleString()}
        </div>
      </CardHeader>

      <CardContent className="prose prose-sm max-w-none prose-headings:text-primary prose-li:marker:text-muted-foreground prose-code:bg-muted/20 prose-code:px-1 prose-code:rounded">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {content}
        </ReactMarkdown>
      </CardContent>
    </Card>
  );
};

export default AIRecommendationCard;