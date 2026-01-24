import React, { useEffect, useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../services/firebase';
import { signOut } from 'firebase/auth';
import { toast } from 'react-toastify';

const Layout = () => {
  const { user, logout, setSuspendedError } = useAuth();
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    if (!user?.id) return;

    // Real-time listener for user document changes
    const userDocRef = doc(db, 'users', user.id);
    
    const unsubscribe = onSnapshot(userDocRef, async (docSnapshot) => {
      if (!docSnapshot.exists()) {
        // User document deleted
        toast.error('Your account has been removed');
        await logout();
        navigate('/login');
        return;
      }

      const userData = docSnapshot.data();

      // Check if user is suspended
      if (userData.isSuspended === true) {
        setIsChecking(true);
        setSuspendedError('Your account has been suspended due to inappropriate usage of this app. Please contact support for assistance.');
        toast.error('Your account has been suspended');
        await signOut(auth);
        await logout();
        navigate('/login');
        setIsChecking(false);
        return;
      }

      // Update user data in context if isAdmin changed
      if (user.isAdmin !== userData.isAdmin) {
        const updatedUser = {
          ...user,
          isAdmin: userData.isAdmin || false
        };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        // If admin access removed while on admin page, redirect
        if (!userData.isAdmin && window.location.pathname === '/admin') {
          toast.warning('Admin access has been revoked');
          navigate('/');
        }
      }
    }, (error) => {
      console.error('Error listening to user changes:', error);
    });

    // Cleanup listener on unmount
    return () => unsubscribe();
  }, [user?.id, user?.isAdmin, logout, navigate, setSuspendedError]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Verifying account status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default Layout;