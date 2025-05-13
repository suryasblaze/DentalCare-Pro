import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter, // Import DialogFooter if needed for form buttons
  DialogClose, // Import DialogClose if needed
  DialogDescription, // Import DialogDescription
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card"; // Import Card components
import { useToast } from "@/components/ui/use-toast";
import { listUrgentPurchases } from '../services/urgentPurchaseService';
import { UrgentPurchase } from '../types';
import { format } from 'date-fns';
import { Loader2, PlusCircle, Eye } from 'lucide-react';
import { UrgentPurchaseForm } from '../components/UrgentPurchaseForm'; // Import the new form component

const UrgentPurchaseListPage: React.FC = () => {
  // Removed navigate import as it's not used directly for form anymore
  const { toast } = useToast();
  const [urgentPurchases, setUrgentPurchases] = useState<UrgentPurchase[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false); // State for dialog

  const fetchPurchases = async () => { // Made fetchPurchases reusable
    setIsLoading(true);
    try {
      const data = await listUrgentPurchases();
      setUrgentPurchases(data);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error fetching urgent purchases",
        description: error.message || "Could not load urgent purchase entries.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchases();
  }, [toast]); // Removed dependency array warning by using fetchPurchases directly

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    fetchPurchases(); // Refresh the list after successful submission
  };

  const getStatusBadgeVariant = (status: UrgentPurchase['status']): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'approved':
        return "default"; // Greenish for approved
      case 'pending_approval':
        return "secondary"; // Yellowish/Orange or Grayish for pending
      case 'rejected':
        return "destructive"; // Red for rejected
      case 'draft':
        return "outline"; // Neutral for draft
      default:
        // Fallback for any unexpected status values
        const exhaustiveCheck: never = status; 
        return "outline";
    }
  };

  const isValidDate = (dateString: string | null | undefined): boolean => {
    if (!dateString) return false;
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  };

  return (
    <div className="container mx-auto p-4">
      <PageHeader
        heading="Urgent Purchase Entry" // Renamed heading
        text="Create or view history of urgent stock entries made without a PO." // Updated text
      >
        <div className="flex gap-2">
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Create New Urgent Entry
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[80vw] md:max-w-[70vw] lg:max-w-[60vw] xl:max-w-[50vw]"> {/* Adjust width */}
            <DialogHeader>
              <DialogTitle>Create Urgent Purchase Entry</DialogTitle>
              <DialogDescription> {/* Added description */}
                Upload a slip/invoice image for OCR processing or use the Quick Manual Entry tab.
              </DialogDescription>
            </DialogHeader>
            {/* Render the form inside the dialog */}
            <UrgentPurchaseForm 
              onClose={() => setIsFormOpen(false)} 
              onSuccess={handleFormSuccess} 
            />
            {/* Footer might be handled within UrgentPurchaseForm now */}
          </DialogContent>
        </Dialog>
        <Button variant="outline" asChild>
          <Link to="/purchases/urgent/history">View Modification History</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/purchases/urgent/my-requests">View My Requests</Link>
        </Button>
        </div>
      </PageHeader>

      {isLoading ? (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Card className="mt-6">
          <CardContent className="p-0"> {/* Remove padding if table handles it */}
            <Table>
              <TableHeader>
                <TableRow>
                <TableHead>Delivery Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Slip Filename</TableHead>
                <TableHead>Requested At</TableHead>
                <TableHead>Updated At</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {urgentPurchases.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                    No urgent purchase entries found.
                  </TableCell>
                </TableRow>
              ) : (
                urgentPurchases.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      {isValidDate(entry.invoice_delivery_date) ? format(new Date(entry.invoice_delivery_date!), 'PP') : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(entry.status)}>
                        {entry.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Badge>
                    </TableCell>
                    <TableCell>{entry.slip_filename || 'N/A (Quick Entry)'}</TableCell>
                    <TableCell>
                      {isValidDate(entry.requested_at) ? format(new Date(entry.requested_at), 'PPpp') : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {isValidDate(entry.updated_at) ? format(new Date(entry.updated_at), 'PPpp') : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        asChild // Use asChild to make the button act like a Link
                      >
                        <Link to={`/purchases/urgent/${entry.id}`}>
                           <Eye className="mr-2 h-4 w-4" /> View Details
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
              </TableBody>
            </Table>
          </CardContent>
          {/* Optional CardFooter for pagination or summary */}
        </Card>
      )}
    </div>
  );
};

export default UrgentPurchaseListPage;
