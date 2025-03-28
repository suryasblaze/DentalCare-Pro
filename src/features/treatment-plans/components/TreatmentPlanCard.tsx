import React from 'react';
import { format } from 'date-fns';
import { ChevronRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { User, Calendar, CreditCard } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/validation';

interface TreatmentPlanCardProps {
  plan: any;
  onViewDetails: (plan: any) => void;
}

export function TreatmentPlanCard({ plan, onViewDetails }: TreatmentPlanCardProps) {
  // Render status badge with appropriate color
  const renderStatusBadge = (status: string) => {
    let color = 'bg-gray-100 text-gray-800';
    
    switch (status) {
      case 'planned':
        color = 'bg-blue-100 text-blue-800';
        break;
      case 'in_progress':
        color = 'bg-yellow-100 text-yellow-800';
        break;
      case 'completed':
        color = 'bg-green-100 text-green-800';
        break;
      case 'cancelled':
        color = 'bg-red-100 text-red-800';
        break;
    }
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${color}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };
  
  // Render priority badge with appropriate color
  const renderPriorityBadge = (priority: string) => {
    let color = 'bg-gray-100 text-gray-800';
    
    switch (priority) {
      case 'low':
        color = 'bg-green-100 text-green-800';
        break;
      case 'medium':
        color = 'bg-yellow-100 text-yellow-800';
        break;
      case 'high':
        color = 'bg-red-100 text-red-800';
        break;
    }
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${color}`}>
        {priority}
      </span>
    );
  };
  
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{plan.title}</CardTitle>
          {renderStatusBadge(plan.status)}
        </div>
        <CardDescription className="line-clamp-2">{plan.description}</CardDescription>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="space-y-4">
          <div className="flex items-center text-sm">
            <User className="h-4 w-4 mr-2 text-muted-foreground" />
            <span>{plan.patientName}</span>
          </div>
          <div className="flex items-center text-sm">
            <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
            <span>
              {format(new Date(plan.start_date), 'MMM d, yyyy')}
              {plan.end_date && ` to ${format(new Date(plan.end_date), 'MMM d, yyyy')}`}
            </span>
          </div>
          <div className="flex items-center text-sm">
            <CreditCard className="h-4 w-4 mr-2 text-muted-foreground" />
            <span>Total Cost: {formatCurrency(plan.totalCost)}</span>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span>Progress</span>
              <span>{plan.completedTreatments} of {plan.totalTreatments} treatments</span>
            </div>
            <Progress value={plan.progress} />
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-2 flex justify-between">
        <div className="flex gap-2">
          {plan.priority && renderPriorityBadge(plan.priority)}
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