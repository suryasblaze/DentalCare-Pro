// src/features/purchases/pages/PurchaseOrderListPage.tsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'; // Assuming Shadcn/ui Table
import { PurchaseOrder } from '../types';
import { getPurchaseOrders } from '../services/purchaseOrderService';
import { PlusCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge'; // For status display

const PurchaseOrderListPage: React.FC = () => {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPOs = async () => {
      try {
        setIsLoading(true);
        const data = await getPurchaseOrders();
        setPurchaseOrders(data);
        setError(null);
      } catch (err) {
        console.error(err);
        setError('Failed to fetch purchase orders.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchPOs();
  }, []);

  const getStatusBadgeVariant = (status: PurchaseOrder['status']): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'Pending':
        return 'outline';
      case 'Ordered':
        return 'secondary';
      case 'Partially Received':
        return 'default';
      case 'Received':
        return 'default'; // Fallback, actual styling will be via className
      case 'Cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  };


  return (
    <div className="container mx-auto p-4">
      <PageHeader
        heading="Purchase Orders"
        text="Manage and track all your purchase orders."
      >
        <Link to="/purchases/create"> {/* TODO: Define this route later */}
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Create New PO
          </Button>
        </Link>
      </PageHeader>

      <div className="mt-6">
        {isLoading && <p>Loading purchase orders...</p>}
        {error && <p className="text-red-500">{error}</p>}
        {!isLoading && !error && purchaseOrders.length === 0 && (
          <p>No purchase orders found.</p>
        )}
        {!isLoading && !error && purchaseOrders.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PO Number</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Order Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total Amount</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchaseOrders.map((po) => (
                <TableRow key={po.id}>
                  <TableCell className="font-medium">{po.po_number}</TableCell>
                  <TableCell>{po.supplier_name}</TableCell>
                  <TableCell>{new Date(po.order_date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge 
                      variant={getStatusBadgeVariant(po.status)}
                      className={po.status === 'Received' ? 'bg-green-500 hover:bg-green-600 text-white' : ''}
                    >
                      {po.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {po.total_amount?.toLocaleString('en-IN', { style: 'currency', currency: 'INR' }) || 'N/A'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link to={`/purchases/${po.id}`}> {/* TODO: Define detail route */}
                      <Button variant="outline" size="sm">View</Button>
                    </Link>
                    {/* TODO: Add Edit/Delete buttons with appropriate permissions */}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
};

export default PurchaseOrderListPage;
