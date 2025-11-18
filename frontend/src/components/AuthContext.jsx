import React, { createContext, useContext, useState, useEffect } from "react";
import { auth, db } from "../services/firebase";
import {
  signOut,
  onAuthStateChanged,
  getIdToken,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

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
    localStorage.removeItem("user");
  };

  // AUTO LOGIN ON REFRESH (Firebase listener)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        await saveUserSession(firebaseUser);
      } else {
        setUser(null);
        localStorage.removeItem("user");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
