import React from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// Import the report components
import InventoryReports from '@/features/inventory/components/InventoryReports';
import AssetReports from '@/features/assets/components/AssetReports';
import ReportDataPreview from '@/pages/ReportDataPreview';

const ReportsPage: React.FC = () => {
  return (
    <div className="container mx-auto p-4 md:p-6">
      <PageHeader heading="Reports & Analytics" />

      <Tabs defaultValue="inventory" className="mt-4">
        <TabsList className="grid w-full grid-cols-2 md:w-[400px]">
          <TabsTrigger value="inventory">Inventory Reports</TabsTrigger>
          <TabsTrigger value="assets">Asset Reports</TabsTrigger>
          <TabsTrigger value="report-data-preview">Report Data Preview</TabsTrigger>
        </TabsList>
        <TabsContent value="inventory" className="mt-4">
          {/* Render Inventory Reports Component */}
          <InventoryReports />
        </TabsContent>
        <TabsContent value="assets" className="mt-4">
           {/* Render Asset Reports Component */}
           <AssetReports />
        </TabsContent>
        <TabsContent value="report-data-preview" className="mt-4">
           {/* Render Report Data Preview Component */}
           <ReportDataPreview />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReportsPage;
