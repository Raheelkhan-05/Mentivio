import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, User, BookOpen } from "lucide-react";
import { useAuth } from "./AuthContext";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../services/firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { generateUniqueUserId } from "./generateUserId"; 


const AuthPage = () => {
  const [isLoginView, setIsLoginView] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false); 
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false); 
  const [successMessage, setSuccessMessage] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error when typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ""
      }));
    }
  };

  // Validation logic
  const validate = () => {
    const newErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!formData.email.trim()) {
      newErrors.email = "Email is required.";
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = "Enter a valid email address.";
    }

    if (!formData.password.trim()) {
      newErrors.password = "Password is required.";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters.";
    }

    if (!isLoginView) {
      if (!formData.name.trim()) {
        newErrors.name = "Full name is required.";
      }
      if (!formData.confirmPassword.trim()) {
        newErrors.confirmPassword = "Confirm your password.";
      } else if (formData.confirmPassword !== formData.password) {
        newErrors.confirmPassword = "Passwords do not match.";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  const handleSubmit = async (e) => {
  e.preventDefault();
  if (!validate()) return;

  setIsLoading(true); 

  try {
    if (isLoginView) {
      // ---------------- LOGIN ----------------
      const userCred = await signInWithEmailAndPassword(auth, formData.email, formData.password);

      const userData = {
        id: userCred.user.uid,
        email: userCred.user.email,
        token: await userCred.user.getIdToken(),
        name: userCred.user.displayName || "",
      };

      login(userData);
      navigate("/tutor");
    } 
    else {
      // ---------------- SIGN UP ----------------
      const userCred = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      // Generate unique user-id
      const userId = await generateUniqueUserId(db, formData.name);

      // Save profile in Firestore
      await setDoc(doc(db, "users", userCred.user.uid), {
        email: formData.email,
        name: formData.name,
        userId: userId,
        createdAt: new Date(),
      });

      const userData = {
        id: userCred.user.uid,
        email: formData.email,
        token: await userCred.user.getIdToken(),
        name: formData.name,
        userId: userId,
      };

      login(userData);
      navigate("/tutor");
    }
  } catch (error) {
    console.error(error);

    if (error.code === "auth/email-already-in-use") {
      setErrors({ email: "Email already registered." });
    } else if (error.code === "auth/wrong-password" || error.code === "auth/invalid-credential") {
      setErrors({ email:"", password: "Incorrect email-id or password." });
    } else if (error.code === "auth/user-not-found") {
      setErrors({ email: "No account found with this email." });
    } else {
      setErrors({ email: "An error occurred. Please try again." });
    }
  } finally {
    setIsLoading(false);
  }
};


const handleForgotPassword = async (e) => {
  e.preventDefault();
  
  // Validate email only
  if (!formData.email.trim()) {
    setErrors({ email: "Email is required." });
    return;
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(formData.email)) {
    setErrors({ email: "Enter a valid email address." });
    return;
  }

  setIsLoading(true);
  setErrors({});
  setSuccessMessage("");

  try {
    console.log("=== FORGOT PASSWORD DEBUG ===");
    console.log("Email entered:", formData.email);
    
    await sendPasswordResetEmail(auth, formData.email);
    
    console.log("Password reset email sent successfully");
    
    setSuccessMessage("Password reset email sent! Check your inbox.");
    setFormData({ ...formData, email: "" });
    
    // Auto switch back to login after 3 seconds
    setTimeout(() => {
      setIsForgotPassword(false);
      setSuccessMessage("");
    }, 3000);
  } catch (error) {
    console.error("=== ERROR IN FORGOT PASSWORD ===");
    console.error("Error code:", error.code);
    console.error("Error message:", error.message);
    console.error("Full error:", error);
    
    if (error.code === "auth/invalid-email") {
      setErrors({ email: "Invalid email address." });
    } else if (error.code === "auth/user-not-found") {
      setErrors({ email: "No account found with this email." });
    } else {
      setErrors({ email: "Failed to send reset email. Please try again." });
    }
  } finally {
    setIsLoading(false);
    console.log("=== FORGOT PASSWORD PROCESS ENDED ===");
  }
};

  const toggleView = () => {
    setIsLoginView(!isLoginView);
    setIsForgotPassword(false);
    setErrors({});
    setSuccessMessage("");
  };

  return (
    <div className="min-h-screen flex items-start mt-12 justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 sm:p-6 relative overflow-hidden">
      {/* Animated floating shapes */}
      <motion.div
        className="absolute top-20 left-10 w-64 h-64 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-30"
        animate={{
          x: [0, 100, 0],
          y: [0, 50, 0],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      <motion.div
        className="absolute top-40 right-10 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-30"
        animate={{
          x: [0, -80, 0],
          y: [0, 80, 0],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      <motion.div
        className="absolute -bottom-8 left-1/3 w-72 h-72 bg-indigo-200 rounded-full mix-blend-multiply filter blur-xl opacity-30"
        animate={{
          x: [0, 50, 0],
          y: [0, -50, 0],
        }}
        transition={{
          duration: 22,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      <motion.div
        className="w-full mt-10 max-w-md bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-8 sm:p-10 border border-white/20 relative z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <motion.div 
            className="flex items-center justify-center space-x-2 mb-3"
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <div className="w-11 h-11 bg-gradient-to-br from-green-400 to-blue-500 rounded-xl flex items-center justify-center shadow-lg">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <span
              className="text-3xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent"
              style={{ fontFamily: 'system-ui, -apple-system, sans-serif', letterSpacing: '-0.02em' }}
            >
              Mentivio
            </span>
          </motion.div>
          <h2 className="text-2xl font-semibold text-gray-800 mt-4">
            {isLoginView ? "Welcome Back" : "Get Started"}
          </h2>
          <p className="text-gray-500 text-sm mt-2 font-light">
            {isLoginView
              ? "Continue your learning journey"
              : "Create your account to begin"}
          </p>
        </div>
        {/* Tabs */}
<div className="flex bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-1 rounded-xl mb-6">
  <button
    type="button"
    onClick={() => {
      setIsLoginView(true);
      setIsForgotPassword(false);
      setErrors({});
      setSuccessMessage("");
    }}
    className={`flex-1 py-2.5 text-center font-medium rounded-lg transition-all duration-300 ${
      isLoginView && !isForgotPassword
        ? "bg-white shadow-sm text-gray-800"
        : "text-gray-500 hover:text-gray-700"
    }`}
  >
    Login
  </button>
  <button
    type="button"
    onClick={() => {
      setIsLoginView(false);
      setIsForgotPassword(false);
      setErrors({});
      setSuccessMessage("");
    }}
    className={`flex-1 py-2.5 text-center font-medium rounded-lg transition-all duration-300 ${
      !isLoginView && !isForgotPassword
        ? "bg-white shadow-sm text-gray-800"
        : "text-gray-500 hover:text-gray-700"
    }`}
  >
    Sign Up
  </button>
</div>

{/* Success Message */}
<AnimatePresence mode="wait">
  {successMessage && (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm"
    >
      {successMessage}
    </motion.div>
  )}
</AnimatePresence>

{/* Form */}
<AnimatePresence mode="wait">
  {isForgotPassword ? (
    // Forgot Password Form
    <motion.form
      key="forgot-password-form"
      onSubmit={handleForgotPassword}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      <div className="mb-6">
        <p className="text-sm text-gray-600 mb-4">
          Enter your email address and we'll send you a link to reset your password.
        </p>
        
        <div className="relative flex items-center">
          <Mail className="absolute left-3 text-gray-400 pointer-events-none" size={18} />
          <input
            type="email"
            name="email"
            placeholder="Email Address"
            value={formData.email}
            onChange={handleInputChange}
            className={`w-full pl-10 pr-4 py-3 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 ${
              errors.email
                ? "border-red-400 focus:ring-red-200 focus:border-red-500"
                : "border-gray-200 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white"
            }`}
          />
        </div>
        {errors.email && (
          <p className="text-sm text-red-500 mt-1 ml-1">
            {errors.email}
          </p>
        )}
      </div>

      <motion.button
        type="submit"
        disabled={isLoading}
        className={`w-full text-white font-semibold py-3 rounded-xl shadow-md bg-gradient-to-r from-blue-500 to-purple-600 hover:shadow-lg transition-all duration-300 ${
          isLoading ? 'opacity-70 cursor-not-allowed' : ''
        }`}
        whileHover={isLoading ? {} : {
          scale: 1.01,
          boxShadow: '0 10px 25px -5px rgba(99, 102, 241, 0.4)'
        }}
        whileTap={isLoading ? {} : { scale: 0.98 }}
      >
        {isLoading ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Sending...
          </span>
        ) : (
          "Send Reset Link"
        )}
      </motion.button>

      <div className="text-center mt-4">
        <button
          type="button"
          onClick={() => {
            setIsForgotPassword(false);
            setErrors({});
            setSuccessMessage("");
          }}
          className="text-sm font-medium text-blue-600 hover:text-purple-600 transition-colors duration-200"
        >
          ← Back to Login
        </button>
      </div>
    </motion.form>
  ) : (
    // Login/Signup Form
    <motion.form
      key="auth-form"
      onSubmit={handleSubmit}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      {/* Name Field - Only for Signup */}
      <AnimatePresence mode="wait">
        {!isLoginView && (
          <motion.div
            key="name-field"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="mb-4">
              <div className="relative flex items-center">
                <User className="absolute left-3 text-gray-400 pointer-events-none" size={18} />
                <input
                  type="text"
                  name="name"
                  placeholder="Full Name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-4 py-3 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 ${
                    errors.name
                      ? "border-red-400 focus:ring-red-200 focus:border-red-500"
                      : "border-gray-200 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white"
                  }`}
                />
              </div>
              {errors.name && (
                <p className="text-sm text-red-500 mt-1 ml-1">
                  {errors.name}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Email Field */}
      <div className="mb-4">
        <div className="relative flex items-center">
          <Mail className="absolute left-3 text-gray-400 pointer-events-none" size={18} />
          <input
            type="email"
            name="email"
            placeholder="Email Address"
            value={formData.email}
            onChange={handleInputChange}
            className={`w-full pl-10 pr-4 py-3 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 ${
              errors.email
                ? "border-red-400 focus:ring-red-200 focus:border-red-500"
                : "border-gray-200 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white"
            }`}
          />
        </div>
        {errors.email && (
          <p className="text-sm text-red-500 mt-1 ml-1">
            {errors.email}
          </p>
        )}
      </div>

      {/* Password Field */}
      <div className="mb-4">
        <div className="relative flex items-center">
          <Lock className="absolute left-3 text-gray-400 pointer-events-none" size={18} />
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleInputChange}
            className={`w-full pl-10 pr-4 py-3 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 ${
              errors.password
                ? "border-red-400 focus:ring-red-200 focus:border-red-500"
                : "border-gray-200 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white"
            }`}
          />
        </div>
        {errors.password && (
          <p className="text-sm text-red-500 mt-1 ml-1">
            {errors.password}
          </p>
        )}
      </div>

      {/* Confirm Password Field - Only for Signup */}
      <AnimatePresence mode="wait">
        {!isLoginView && (
          <motion.div
            key="confirm-field"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="mb-4">
              <div className="relative flex items-center">
                <Lock className="absolute left-3 text-gray-400 pointer-events-none" size={18} />
                <input
                  type="password"
                  name="confirmPassword"
                  placeholder="Confirm Password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-4 py-3 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 ${
                    errors.confirmPassword
                      ? "border-red-400 focus:ring-red-200 focus:border-red-500"
                      : "border-gray-200 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white"
                  }`}
                />
              </div>
              {errors.confirmPassword && (
                <p className="text-sm text-red-500 mt-1 ml-1">
                  {errors.confirmPassword}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Forgot Password Link */}
      {isLoginView && (
        <div className="flex justify-end text-sm">
          <button
            type="button"
            onClick={() => {
              setIsForgotPassword(true);
              setErrors({});
              setSuccessMessage("");
            }}
            className="font-medium text-blue-600 hover:text-purple-600 transition-colors duration-200"
          >
            Forgot Password?
          </button>
        </div>
      )}

      {/* Submit Button */}
      <motion.button
        type="submit"
        disabled={isLoading}
        className={`w-full text-white font-semibold py-3 rounded-xl shadow-md bg-gradient-to-r from-blue-500 to-purple-600 hover:shadow-lg transition-all duration-300 ${
          isLoading ? 'opacity-70 cursor-not-allowed' : ''
        }`}
        whileHover={isLoading ? {} : {
          scale: 1.01,
          boxShadow: '0 10px 25px -5px rgba(99, 102, 241, 0.4)'
        }}
        whileTap={isLoading ? {} : { scale: 0.98 }}
      >
        {isLoading ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {isLoginView ? "Logging in..." : "Signing up..."}
          </span>
        ) : (
          isLoginView ? "Log In" : "Sign Up"
        )}
      </motion.button>
    </motion.form>
  )}
</AnimatePresence>

{/* Toggle */}
{!isForgotPassword && (
  <div className="mt-6 text-center text-sm text-gray-600">
    <p>
      {isLoginView ? "Don't have an account? " : "Already have an account? "}
      <button
        type="button"
        onClick={toggleView}
        className="font-semibold text-blue-600 hover:text-purple-600 transition-colors duration-200"
      >
        {isLoginView ? "Sign Up" : "Log In"}
      </button>
    </p>
  </div>
)}

      </motion.div>
    </div>
  );
};

export default AuthPage;