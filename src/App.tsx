import React from 'react'; // Import React
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Appointments } from './pages/Appointments';
import { Patients } from './pages/Patients';
import { TreatmentPlansPage } from './features/treatment-plans/pages/TreatmentPlansPage';
import { Settings } from './pages/Settings';
import { ProfilePage } from './pages/ProfilePage'; // Import ProfilePage
import { PaymentsSubscriptionPage } from './pages/PaymentsSubscriptionPage'; // Import PaymentsSubscriptionPage
import { AuthProvider, useAuth } from './context/AuthContext'; // Import useAuth
import { Toaster } from './components/ui/toaster';
import { Loader2 } from 'lucide-react'; // Import loader
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
          <Route path="profile" element={<ProfilePage />} /> {/* Add Profile route */}
          <Route path="settings" element={<Settings />} />
          <Route path="payments-subscription" element={<PaymentsSubscriptionPage />} /> {/* Add Payments & Subscription route */}
          {/* Redirect any unknown protected path to dashboard */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      )}
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
