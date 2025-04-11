import React, { useState, useMemo } from 'react'; // Import useState and useMemo
import { format } from 'date-fns';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  User, 
  Calendar, 
  CreditCard, 
  Clock, 
  Check, 
  X, 
  Trash2, 
  RefreshCw,
  Plus,
  FileText,
  ArrowUpRight,
  ChevronLeft, // Added for pagination
  ChevronRight, // Added for pagination
  ClipboardList // Replaced Tooth icon
} from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/validation';
import { TreatmentItem } from './TreatmentItem';

interface TreatmentPlanDetailsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: any;
  onRefresh: () => Promise<void>;
  onAddTreatment: () => void;
  onStatusChange: (planId: string, status: string) => Promise<void>;
  onDeletePlan: (planId: string) => Promise<void>;
  onTreatmentStatusChange: (treatmentId: string, status: string) => Promise<void>;
  onDeleteTreatment: (treatmentId: string) => Promise<void>;
  loading?: boolean;
  navigateToPatient?: (patientId: string) => void;
}

export function TreatmentPlanDetails({
  open,
  onOpenChange,
  plan,
  onRefresh,
  onAddTreatment,
  onStatusChange,
  onDeletePlan,
  onTreatmentStatusChange,
  onDeleteTreatment,
  loading = false,
  navigateToPatient
}: TreatmentPlanDetailsProps) {

  // --- Pagination State ---
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5; // Show 5 treatments per page

  const paginatedTreatments = useMemo(() => {
    if (!plan?.treatments) return [];
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return plan.treatments.slice(startIndex, endIndex);
  }, [plan?.treatments, currentPage]);

  const totalPages = useMemo(() => {
    if (!plan?.treatments) return 1;
    return Math.ceil(plan.treatments.length / ITEMS_PER_PAGE);
  }, [plan?.treatments]);
  // --- End Pagination State ---

  if (!plan) return null;
  
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Treatment Plan Details</DialogTitle>
          <DialogDescription>
            Created on {format(new Date(plan.created_at), 'MMMM d, yyyy')}
          </DialogDescription>
        </DialogHeader>
        
        {/* Added container for scrolling */}
        <div className="pr-6 py-4 max-h-[70vh] overflow-y-auto"> 
          <div className="space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-semibold">{plan.title}</h2>
              <p className="text-sm text-muted-foreground">{plan.description}</p>
            </div>
            <div className="flex items-center gap-2">
              {renderStatusBadge(plan.status)}
              {plan.priority && renderPriorityBadge(plan.priority)}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Patient</p>
                  <p>{plan.patientName}</p>
                </div>
                {navigateToPatient && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto"
                    onClick={() => navigateToPatient(plan.patient_id)}
                  >
                    <ArrowUpRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Timeframe</p>
                  <p>
                    {format(new Date(plan.start_date), 'MMMM d, yyyy')}
                    {plan.end_date && ` to ${format(new Date(plan.end_date), 'MMMM d, yyyy')}`}
                  </p>
                </div>
              </div>

              {/* Display Associated Teeth */}
              {plan.teeth && plan.teeth.length > 0 && (
                <div className="flex items-start gap-2"> {/* Use items-start for alignment */}
                  <ClipboardList className="h-5 w-5 text-muted-foreground mt-1" /> {/* Use ClipboardList icon */}
                  <div>
                    <p className="text-sm font-medium">Associated Teeth</p>
                    <div className="mt-1 flex flex-wrap gap-1"> {/* Reduced gap */}
                      {plan.teeth.map((tooth: any) => (
                        <span
                          key={tooth.id}
                          className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800" // Use blue badge style
                        >
                          {tooth.id} - {tooth.description}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Total Cost</p>
                  <p>{formatCurrency(plan.totalCost)}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Progress</p>
                  <div className="flex items-center gap-2">
                    <Progress value={plan.progress} className="flex-1" />
                    <span className="text-sm">{plan.progress}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Treatments</h3>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={onRefresh}
                  disabled={loading}
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Refresh
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={onAddTreatment}
                  disabled={loading}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Treatment
                </Button>
              </div>
            </div>
            
            {plan.treatments && plan.treatments.length > 0 ? (
              <>
                <div className="space-y-3">
                  {paginatedTreatments.map((treatment: any) => (
                    <TreatmentItem
                      key={treatment.id}
                      treatment={treatment}
                      onStatusChange={onTreatmentStatusChange}
                      onDelete={onDeleteTreatment}
                      loading={loading}
                    />
                  ))}
                </div>
                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex justify-center items-center gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1 || loading}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages || loading}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-6 border rounded-lg">
                <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No treatments added yet</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={onAddTreatment}
                  disabled={loading}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add First Treatment
                </Button>
              </div>
            )}
          </div>
          
<Tabs defaultValue="treatments" className="w-full">
  <TabsList className="grid w-full grid-cols-2">
    <TabsTrigger value="treatments">Additional Information</TabsTrigger>
    <TabsTrigger value="financial">Financial Information</TabsTrigger>
  </TabsList>
  <TabsContent value="treatments" className="space-y-4">
    <div className="border rounded-lg p-4">
      <h4 className="font-medium">Notes</h4>
      <p className="text-sm text-muted-foreground mt-2">
        {plan.notes || "No additional notes for this treatment plan."}
      </p>
    </div>
  </TabsContent>
  <TabsContent value="financial" className="space-y-4">
    <div className="border rounded-lg p-4">
      <h4 className="font-medium">Financial Summary</h4>
      <div className="mt-4 space-y-2">
        <div className="flex justify-between">
          <span className="text-sm">Total Treatment Cost:</span>
          <span className="font-medium">{formatCurrency(plan.totalCost)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm">Insurance Coverage (Est.):</span>
          <span className="font-medium">₹0.00</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm">Patient Responsibility:</span>
          <span className="font-medium">{formatCurrency(plan.totalCost - 0)}</span>
        </div>
      </div>
    </div>
  </TabsContent>
</Tabs>
          
          <DialogFooter className="flex justify-between">
            <div className="flex gap-2">
              <Button
                variant="destructive"
                onClick={() => onDeletePlan(plan.id)}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-1" />
                )}
                Delete Plan
              </Button>
            </div>
            
            <div className="flex gap-2">
              {plan.status !== 'in_progress' && plan.status !== 'cancelled' && (
                <Button
                  variant="outline"
                  onClick={() => onStatusChange(plan.id, 'in_progress')}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Clock className="h-4 w-4 mr-1" />
                  )}
                  Start Treatment
                </Button>
              )}
              
              {plan.status !== 'completed' && plan.status !== 'cancelled' && (
                <Button
                  variant="outline"
                  onClick={() => onStatusChange(plan.id, 'completed')}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 mr-1" />
                  )}
                  Mark Completed
                </Button>
              )}
              
              <Button
                variant="secondary"
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>
            </div>
          </DialogFooter>
        </div> 
       </div> {/* End scrolling container */}
      </DialogContent>
    </Dialog>
  );
}
