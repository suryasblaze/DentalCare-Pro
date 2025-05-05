import React from 'react';
import { PageHeader } from '@/components/ui/page-header';
import InvoicesList from '../components/InvoicesList';

const InvoicesPage: React.FC = () => {
  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <PageHeader
        heading="Uploaded Invoices"
        text="View and download previously uploaded invoices."
      />
      <InvoicesList />
    </div>
  );
};

export default InvoicesPage;
