import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import StudentDashboard from './pages/StudentDashboard';
import LibraryDashboard from './pages/LibraryDashboard';
import FADashboard from './pages/FADashboard';
import HODDashboard from './pages/HODDashboard';
import DPCDashboard from './pages/DPCDashboard';

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

  return <LoginPage />;
};

export function App() {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
}

export default App;
