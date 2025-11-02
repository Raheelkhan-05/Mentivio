import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, User, BookOpen } from "lucide-react";
import { useAuth } from "./AuthContext";
import { useNavigate } from "react-router-dom";

const AuthPage = () => {
  const [isLoginView, setIsLoginView] = useState(true);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const { login } = useAuth();
  const navigate = useNavigate();

  // Simple input handler without console.log
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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const mockUserData = {
      id: isLoginView ? "user-123" : "user-456",
      email: formData.email,
      token: "mock_token",
      name: isLoginView ? "Learner User" : formData.name || "New User",
    };

    login(mockUserData);
    navigate("/tutor");
  };

  const toggleView = () => {
    setIsLoginView(!isLoginView);
    setErrors({});
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
            onClick={toggleView}
            className={`flex-1 py-2.5 text-center font-medium rounded-lg transition-all duration-300 ${
              isLoginView
                ? "bg-white shadow-sm text-gray-800"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={toggleView}
            className={`flex-1 py-2.5 text-center font-medium rounded-lg transition-all duration-300 ${
              !isLoginView
                ? "bg-white shadow-sm text-gray-800"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
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
              <a
                href="#"
                className="font-medium text-blue-600 hover:text-purple-600 transition-colors duration-200"
              >
                Forgot Password?
              </a>
            </div>
          )}

          {/* Submit Button */}
          <motion.button
            type="submit"
            className="w-full text-white font-semibold py-3 rounded-xl shadow-md bg-gradient-to-r from-blue-500 to-purple-600 hover:shadow-lg transition-all duration-300"
            whileHover={{
              scale: 1.01,
              boxShadow: '0 10px 25px -5px rgba(99, 102, 241, 0.4)'
            }}
            whileTap={{ scale: 0.98 }}
          >
            {isLoginView ? "Log In" : "Sign Up"}
          </motion.button>
        </form>

        {/* Toggle */}
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
      </motion.div>
    </div>
  );
};

export default AuthPage;