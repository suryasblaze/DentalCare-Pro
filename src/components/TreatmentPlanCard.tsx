import React from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Calendar, CreditCard, FileText, ChevronRight } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { renderStatusBadge, renderPriorityBadge } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils/validation';

// Import Database type
import type { Database } from '@/lib/database.types';

// Define specific types based on generated types
type TreatmentRow = Database['public']['Tables']['treatments']['Row'];
type TreatmentPlanRow = Database['public']['Tables']['treatment_plans']['Row'];

// Define a type for TreatmentPlan with nested Treatments and calculated fields
type TreatmentPlanWithTreatments = TreatmentPlanRow & {
  treatments: TreatmentRow[] | null;
  patientName: string;
  totalCost: number;
  progress: number;
  completedTreatments: number;
  totalTreatments: number;
};

interface TreatmentPlanCardProps {
  plan: TreatmentPlanWithTreatments;
  onViewDetails: (plan: TreatmentPlanWithTreatments) => void;
}

export function TreatmentPlanCard({ plan, onViewDetails }: TreatmentPlanCardProps) {
  // Assuming TreatmentPlanRow has title, status, description, start_date, end_date, priority
  return (
    <Card key={plan.id} className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{plan.title || 'Untitled Plan'}</CardTitle>
          {renderStatusBadge(plan.status)}
        </div>
        <CardDescription className="line-clamp-2">{plan.description || 'No description'}</CardDescription>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="space-y-4">
          <div className="flex items-center text-sm">
            <User className="h-4 w-4 mr-2 text-muted-foreground" />
            <span>{plan.patientName || 'Unknown Patient'}</span>
          </div>
          <div className="flex items-center text-sm">
            <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
            <span>
              {plan.start_date ? format(new Date(plan.start_date), 'MMM d, yyyy') : 'No start date'}
              {plan.end_date && ` to ${format(new Date(plan.end_date), 'MMM d, yyyy')}`}
            </span>
          </div>
          <div className="flex items-center text-sm">
            <CreditCard className="h-4 w-4 mr-2 text-muted-foreground" />
            <span>Total Cost: {formatCurrency(plan.totalCost ?? 0)}</span>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span>Progress</span>
              <span>{plan.completedTreatments ?? 0} of {plan.totalTreatments ?? 0} treatments</span>
            </div>
            <Progress value={plan.progress ?? 0} />
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-2 flex justify-between">
        <div className="flex gap-2">
          {renderPriorityBadge(plan.priority)}
        </div>
        <Button
          variant="default"
          size="sm"
          onClick={() => onViewDetails(plan)}
        >
          View Details <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </CardFooter>
    </Card>
  );
}
