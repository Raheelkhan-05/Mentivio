import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Play, Brain, Target, MessageCircle } from 'lucide-react';
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

const Hero = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  return (
    <section id="home" className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Background Animation */}
      <div className="absolute inset-0">
        <motion.div
          className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-r from-green-400/10 to-blue-500/10 rounded-full blur-3xl"
          animate={{ x: [0, 100, 0], y: [0, -50, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute bottom-20 right-10 w-96 h-96 bg-gradient-to-r from-purple-400/10 to-blue-500/10 rounded-full blur-3xl"
          animate={{ x: [0, -80, 0], y: [0, 60, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="mb-6"
            >
              <span className="inline-block px-4 py-2 bg-gradient-to-r from-green-400/20 to-blue-500/20 text-green-600 rounded-full text-sm font-semibold mb-4">
                AI-Powered Learning Platform
              </span>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                Transform Your
                <span className="block bg-gradient-to-r from-purple-500 via-blue-500 to-green-400 bg-clip-text text-transparent" style={{paddingBottom:'5px'}}>
                  Learning Journey
                </span>
                with AI
              </h1>
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-xl text-gray-700 mb-8 max-w-2xl"
            >
              Mentor + Vision + Interaction → AI guidance, learning, and chat in one.
              Experience personalized tutoring, goal-oriented learning paths, and collaborative study environments.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
            >
              <motion.button
                className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => user ? navigate("/tutor") : navigate("/login")}
              >
                Start Learning Now
                <ArrowRight className="w-5 h-5" />
              </motion.button>
            </motion.div>

            {/* Feature Icons */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="flex justify-center lg:justify-start gap-8 mt-12"
            >
              <div className="flex items-center gap-2 text-gray-700">
                <Brain className="w-6 h-6 text-green-400" />
                <span className="font-medium">AI Tutoring</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <Target className="w-6 h-6 text-purple-500" />
                <span className="font-medium">Goal Guidance</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <MessageCircle className="w-6 h-6 text-blue-500" />
                <span className="font-medium">In-App Chat</span>
              </div>
            </motion.div>
          </div>

          {/* Right Content - Hero Image */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, delay: 0.3 }}
            className="relative"
          >
            <div className="relative">
              <img
                src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
                alt="Students learning with AI technology"
                className="rounded-2xl shadow-2xl w-full h-auto"
                loading="lazy"
              />

              {/* Floating Cards */}
              <motion.div
                className="absolute -top-6 -left-6 bg-white p-4 rounded-xl shadow-lg"
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-900">AI Tutor Active</span>
                </div>
              </motion.div>

              <motion.div
                className="absolute -bottom-6 -right-6 bg-white p-4 rounded-xl shadow-lg"
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 4, repeat: Infinity }}
              >
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">95%</div>
                  <div className="text-sm text-gray-700">Learning Progress</div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
