import React from 'react';
import ErrorBoundary from './components/common/ErrorBoundary';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AlertProvider } from './context/AlertContext';
import { PWAProvider } from './context/PWAContext';
import InstallAppModal from './components/common/InstallAppModal';
import InstallAppBanner from './components/common/InstallAppBanner';
import PWAStatusBanners from './components/common/PWAStatusBanners';
import LoginPage from './pages/LoginPage';
import StudentDashboard from './pages/StudentDashboard';
import LibraryDashboard from './pages/LibraryDashboard';
import FADashboard from './pages/FADashboard';
import HODDashboard from './pages/HODDashboard';
import DPCDashboard from './pages/DPCDashboard';
import FinanceDashboard from './pages/FinanceDashboard';
import MainLibraryDashboard from './pages/MainLibraryDashboard';

const MainAppContent = () => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return <LoginPage />;
  }

  if (user.role === 'student') {
    return <StudentDashboard />;
  }

  if (user.role === 'library_staff') {
    return <LibraryDashboard />;
  }

  if (user.role === 'faculty_advisor') {
    return <FADashboard />;
  }

  if (user.role === 'hod') {
    return <HODDashboard />;
  }

  if (user.role === 'dpc') {
    return <DPCDashboard />;
  }

  if (user.role === 'finance') {
    return <FinanceDashboard />;
  }

  if (user.role === 'main_library_staff') {
    return <MainLibraryDashboard />;
  }

  return <LoginPage />;
};

export function App() {
  return (
    <ErrorBoundary>
      <PWAProvider>
        <AlertProvider>
          <AuthProvider>
            <PWAStatusBanners />
            <MainAppContent />
            <InstallAppModal />
            <InstallAppBanner />
          </AuthProvider>
        </AlertProvider>
      </PWAProvider>
    </ErrorBoundary>
  );
}

export default App;

