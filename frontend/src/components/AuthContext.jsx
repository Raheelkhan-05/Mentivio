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

    const token = await getIdToken(firebaseUser, true);

    const userData = {
      id: firebaseUser.uid,
      email: firebaseUser.email,
      name: profile.name || "",
      userId: profile.userId || "",
      token,
    };

    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
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
  };

  // AUTO LOGIN ON REFRESH (Firebase listener)
  // useEffect(() => {
  //   const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
  //     if (firebaseUser) {
  //       await saveUserSession(firebaseUser);
  //     } else {
  //       setUser(null);
  //       localStorage.removeItem("activeChatId");
  //       localStorage.removeItem("user");
  //     }
  //     setLoading(false);
  //   });

  //   return () => unsubscribe();
  // }, []);

  // useEffect(() => {
  //   const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
  //     if (firebaseUser) {
  //       try {
  //         const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
  //         const userData = userDoc.data();
          
  //         const userInfo = {
  //           id: firebaseUser.uid,
  //           userId: firebaseUser.userId,
  //           email: firebaseUser.email,
  //           fullName: userData?.fullName || ''
  //         };
          
  //         setUser(userInfo);
          
  //         // Set user online
  //         setUserOnlineStatus(userData.userId, true);
  //       } catch (error) {
  //         console.error('Error fetching user data:', error);
  //         setUser(null);
  //       }
  //     } else {
  //       setUser(null);
  //     }
  //     setLoading(false);
  //   });

  //   return () => {
  //     if (user?.userId) {
  //       setUserOnlineStatus(user.userId, false);
  //     }
  //     unsubscribe();
  //   };
  // }, []);

  // AUTO LOGIN ON REFRESH (Firebase listener)
useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      try {
        // 1. Get the document from Firestore using the random Auth UID
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          
          // 2. CRITICAL FIX: Use userData.userId (the custom name) 
          // NOT firebaseUser.uid (the random string)
          const userInfo = {
            id: firebaseUser.uid,          // Keep the random ID as 'id' if needed for DB refs
            userId: userData.userId,       // This is 'raheelkhan_2629'
            email: firebaseUser.email,
            fullName: userData?.name || userData?.fullName || '' 
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
    // This cleanup runs on unmount
    unsubscribe();
  };
}, []); // Combined into one useEffect to prevent race conditions

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
