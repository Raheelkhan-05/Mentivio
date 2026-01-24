import React, { createContext, useContext, useState, useEffect } from "react";
import { auth, db } from "../services/firebase";
import {
  signOut,
  onAuthStateChanged,
  getIdToken,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { setUserOnlineStatus } from '../services/chatService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  });

  const [loading, setLoading] = useState(true);
  const [suspendedError, setSuspendedError] = useState(null);

  // SAVE USER INTO STATE + LOCALSTORAGE
  const saveUserSession = async (firebaseUser) => {
    if (!firebaseUser) {
      setUser(null);
      localStorage.removeItem("activeChatId");
      localStorage.removeItem("user");
      return;
    }

    // Fetch full profile from Firestore
    const docRef = doc(db, "users", firebaseUser.uid);
    const docSnap = await getDoc(docRef);

    const profile = docSnap.exists() ? docSnap.data() : {};

    // CHECK IF USER IS SUSPENDED
    if (profile.isSuspended === true) {
      setSuspendedError("Your account has been suspended due to inappropriate usage of this app. Please contact support for assistance.");
      await signOut(auth);
      setUser(null);
      localStorage.removeItem("activeChatId");
      localStorage.removeItem("user");
      return;
    }

    const token = await getIdToken(firebaseUser, true);

    const userData = {
      id: firebaseUser.uid,
      email: firebaseUser.email,
      name: profile.name || "",
      userId: profile.userId || "",
      isAdmin: profile.isAdmin || false,
      token,
    };

    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
    setSuspendedError(null);
  };

  // LOGIN is now handled from AuthPage, but still exposed for flexibility
  const login = (userData) => {
    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
  };

  // LOGOUT
  const logout = async () => {
    await signOut(auth);
    setUser(null);
    localStorage.removeItem("activeChatId");
    localStorage.removeItem("user");
    setSuspendedError(null);
  };

  // AUTO LOGIN ON REFRESH (Firebase listener)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // 1. Get the document from Firestore using the random Auth UID
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            
            // CHECK IF USER IS SUSPENDED
            if (userData.isSuspended === true) {
              setSuspendedError("Your account has been suspended due to inappropriate usage of this app. Please contact support for assistance.");
              await signOut(auth);
              setUser(null);
              localStorage.removeItem("activeChatId");
              localStorage.removeItem("user");
              setLoading(false);
              return;
            }
            
            // 2. Use userData.userId (the custom name) 
            const userInfo = {
              id: firebaseUser.uid,
              userId: userData.userId,
              email: firebaseUser.email,
              fullName: userData?.name || userData?.fullName || '',
              isAdmin: userData.isAdmin || false
            };
            
            setUser(userInfo);
            
            // 3. Set user online using the CUSTOM ID
            setUserOnlineStatus(firebaseUser.uid, userData.userId, true);
            
            // Also save this correct session
            await saveUserSession(firebaseUser); 
          } else {
            console.error("No user document found in Firestore!");
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          setUser(null);
        }
      } else {
        setUser(null);
        localStorage.removeItem("activeChatId");
        localStorage.removeItem("user");
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, suspendedError, setSuspendedError }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);