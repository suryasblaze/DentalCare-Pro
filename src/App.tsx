import React from 'react'; // Import React
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Appointments } from './pages/Appointments';
import { Patients } from './pages/Patients';
import { TreatmentPlansPage } from './features/treatment-plans/pages/TreatmentPlansPage';
import { Settings } from './pages/Settings';
import { ProfilePage } from './pages/ProfilePage';
import { PaymentsSubscriptionPage } from './pages/PaymentsSubscriptionPage';
import { PatientMedicalRecordsPage } from './pages/PatientMedicalRecordsPage'; // Re-import the new page
import InventoryPage from './features/inventory/pages/InventoryPage';
import InvoicesPage from './features/inventory/pages/InvoicesPage'; // Import InvoicesPage
import AssetsPage from './features/assets/pages/AssetsPage';
import AssetDetailPage from './features/assets/pages/AssetDetailPage'; // Import Asset Detail Page
import ReportsPage from './pages/ReportsPage';
import RemindersPage from './features/reminders/pages/RemindersPage'; // Import RemindersPage
import PurchaseOrderListPage from './features/purchases/pages/PurchaseOrderListPage'; // Import Purchase Order List Page
import CreatePurchaseOrderPage from './features/purchases/pages/CreatePurchaseOrderPage'; // Import Create Purchase Order Page
import PurchaseOrderDetailPage from './features/purchases/pages/PurchaseOrderDetailPage'; // Import Purchase Order Detail Page
// import UrgentPurchasePage from './features/purchases/pages/UrgentPurchasePage'; // Removed import for deleted page
import UrgentPurchaseListPage from './features/purchases/pages/UrgentPurchaseListPage'; // Import Urgent Purchase List Page
import UrgentPurchaseDetailPage from './features/purchases/pages/UrgentPurchaseDetailPage'; // Import Urgent Purchase Detail Page
import UrgentPurchaseHistoryPage from './features/purchases/pages/UrgentPurchaseHistoryPage'; // Import Urgent Purchase History Page
import UrgentPurchaseMyRequestsPage from './features/purchases/pages/UrgentPurchaseMyRequestsPage'; // Import Urgent Purchase My Requests Page
import { InventoryAdjustPage } from './features/inventory/pages/InventoryAdjustPage';
import { StockTakePage } from './features/inventory/pages/StockTakePage';
import InventoryApprovalPage from './pages/InventoryApprovalPage'; // Import Inventory Approval Page
import SpecificApprovalPage from './features/inventory/pages/SpecificApprovalPage';
import SearchResultsPage from './pages/SearchResultsPage';
import AdminRoute from './components/AdminRoute'; // Import AdminRoute
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster } from './components/ui/toaster';
import { Loader2 } from 'lucide-react';

import LoginPage from './pages/LoginPage'; // Import the new Login page
import SignUpPage from './pages/SignUpPage'; // Import the new Sign Up page


// Component to handle routing based on auth state
function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    // Show a loading indicator while checking auth state
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Routes>
      {!user ? (
        // If not logged in, allow access to login and signup pages
        <>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          {/* Redirect any other unauthenticated path to /login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </>
      ) : (
        // If logged in, render the main layout and protected routes
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} /> {/* Default route */}
          <Route path="appointments" element={<Appointments />} />
          <Route path="patients" element={<Patients />} />
          <Route path="patients/:id" element={<Patients />} /> {/* Detail/Edit */}
          <Route path="treatment-plans" element={<TreatmentPlansPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="settings" element={<Settings />} />
          <Route path="payments-subscription" element={<PaymentsSubscriptionPage />} />
          <Route path="patient-medical-records" element={<PatientMedicalRecordsPage />} />
          {/* Admin Only Routes */}
          <Route element={<AdminRoute />}>
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="inventory/create-adjustment" element={<InventoryAdjustPage />} /> {/* Updated Inventory Adjust route */}
            <Route path="inventory/stock-take" element={<StockTakePage />} /> {/* Add Stock Take route */}
            <Route path="inventory/invoices" element={<InvoicesPage />} /> {/* Add Invoices route */}
            <Route path="purchases" element={<PurchaseOrderListPage />} /> {/* Add Purchases list route */}
            <Route path="purchases/create" element={<CreatePurchaseOrderPage />} /> {/* Add Create Purchase route */}
            {/* <Route path="purchases/urgent-entry" element={<UrgentPurchasePage />} /> */} {/* Removed route for deleted page */}
            <Route path="purchases/urgent" element={<UrgentPurchaseListPage />} /> {/* Add Urgent Purchase Log route */}
            <Route path="purchases/urgent/history" element={<UrgentPurchaseHistoryPage />} /> {/* Add Urgent Purchase History route */}
            <Route path="purchases/urgent/my-requests" element={<UrgentPurchaseMyRequestsPage />} /> {/* Add Urgent Purchase My Requests route */}
            <Route path="purchases/urgent/:id" element={<UrgentPurchaseDetailPage />} /> {/* Add Urgent Purchase Detail route */}
            <Route path="purchases/:id" element={<PurchaseOrderDetailPage />} /> {/* Add Purchase Detail route */}
            <Route path="assets" element={<AssetsPage />} />
            <Route path="assets/:assetId" element={<AssetDetailPage />} /> {/* Add Asset Detail route */}
            <Route path="reports" element={<ReportsPage />} />
            <Route path="reminders" element={<RemindersPage />} />
            {/* Add Staff Leaves route here when created */}
          </Route>
          {/* Routes accessible by admin, owner, or doctor */}
          <Route path="inventory-approvals" element={<InventoryApprovalPage />} />
          
          {/* Routes accessible by all logged-in users */}
          <Route path="search" element={<SearchResultsPage />} />
          {/* Redirect any unknown protected path to dashboard */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      )}
      {/* Route for specific token-based approval, potentially accessible without full layout if user is not logged in but has token */}
      {/* Or, if you want it within the layout and for logged-in users only, move it inside the :user block */}
      <Route path="/approve-adjustment/:requestId/:approvalToken" element={<SpecificApprovalPage />} />
    </Routes>
  );
}


function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent /> {/* Render the conditional content */}
        <Toaster />
      </Router>
    </AuthProvider>
  );
}

export default App;
