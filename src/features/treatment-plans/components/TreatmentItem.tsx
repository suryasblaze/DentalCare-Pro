import React from 'react';
import { Check, Clock, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/validation';

interface TreatmentItemProps {
  treatment: any;
  onStatusChange: (id: string, status: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  loading?: boolean;
}

export function TreatmentItem({ 
  treatment, 
  onStatusChange, 
  onDelete,
  loading = false
}: TreatmentItemProps) {
  // Render status badge with appropriate color
  const renderStatusBadge = (status: string) => {
    let color = 'bg-gray-100 text-gray-800';
    
    switch (status) {
      case 'pending':
        color = 'bg-purple-100 text-purple-800';
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
    <div className="border rounded-lg p-4">
      <div className="flex justify-between items-start">
        <div>
          <h4 className="font-medium">{treatment.type}</h4>
          <p className="text-sm text-muted-foreground">{treatment.description}</p>
        </div>
        <div className="flex items-center gap-2">
          {renderStatusBadge(treatment.status)}
          {treatment.priority && renderPriorityBadge(treatment.priority)}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        <div className="flex items-center gap-2">
          <span className="text-sm">Cost: {formatCurrency(treatment.cost)}</span>
        </div>
        
        {treatment.estimated_duration && (
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm">Duration: {treatment.estimated_duration}</p>
          </div>
        )}
      </div>
      
      <div className="flex justify-end gap-2 mt-4">
        {treatment.status !== 'completed' && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onStatusChange(treatment.id, 'completed')}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <Check className="h-3 w-3 mr-1" />
            )}
            Mark Complete
          </Button>
        )}
        
        {treatment.status !== 'cancelled' && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onStatusChange(treatment.id, 'cancelled')}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <X className="h-3 w-3 mr-1" />
            )}
            Cancel
          </Button>
        )}
        
        <Button
          variant="destructive"
          size="sm"
          onClick={() => onDelete(treatment.id)}
          disabled={loading}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}