import React, { useEffect } from 'react';
import '@radix-ui/themes/styles.css';
import { Theme } from '@radix-ui/themes';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';

import Home from './pages/Home';
import NotFound from './pages/NotFound';
import { AuthProvider, useAuth } from './components/AuthContext';
import Login from './pages/Login';
import Layout from './pages/Layout';
import ScrollToTop from './components/ScrollToTop';
import Tutor from './pages/Tutor';
import About from './pages/About';
import GoalGuidanceDashboard from './pages/GoalGuidanceDashboard';
import Dashboard from './pages/Dashboard';
import AdminPanel from './pages/AdminPanel';
import { motion } from 'framer-motion';
import ProtectedRoute from './components/ProtectedRoute';
import { SpeedInsights } from "@vercel/speed-insights/react"

// Admin Route Component
const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen mt-12 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          {/* Spinner */}
          <div className="mx-auto mb-4 h-12 w-12 rounded-full border-1 border-b-2 border-blue-500 animate-spin" />

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-gray-600 font-medium"
          >
            Loading...
          </motion.p>
        </motion.div>
        {/* <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div> */}
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (!user.isAdmin) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

// Custom hook to clear activeChatId when leaving /tutor
const ClearActiveChatOnLeave = () => {
  const location = useLocation();

  useEffect(() => {
    if (!location.pathname.startsWith("/tutor")) {
      localStorage.removeItem("activeTab");
      localStorage.removeItem("activeChatId");
    }
  }, [location.pathname]);

  return null;
};

const App = () => {
  return (
    <Theme appearance="inherit" radius="large" scaling="100%">
      <AuthProvider>
        <Router>
          {/* Clear activeChatId whenever leaving /tutor */}
          <ClearActiveChatOnLeave />

          <main className="min-h-screen font-inter">
            <ScrollToTop/>
            <Routes>
              <Route element={<Layout/>}>
                <Route path="/" element={<Home />} />
                <Route path="*" element={<NotFound />} />
                <Route path="/login" element={<Login />} />
                <Route path="/tutor" element={<ProtectedRoute> <Tutor /> </ProtectedRoute>} />
                <Route path="/goals" element={<ProtectedRoute> <GoalGuidanceDashboard /> </ProtectedRoute>} />
                <Route path="/chats" element={<ProtectedRoute> <Dashboard /> </ProtectedRoute>} />
                <Route path="/about" element={<About />} />
                <Route path="/admin" element={<AdminRoute> <AdminPanel /> </AdminRoute>} />
              </Route>
            </Routes>

            <ToastContainer
              position="top-right"
              autoClose={3000}
              newestOnTop
              closeOnClick
              pauseOnHover
            />
          </main>
        </Router>
      </AuthProvider>
    </Theme>
  );
}

export default App;