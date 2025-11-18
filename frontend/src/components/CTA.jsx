import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useAuth } from "./AuthContext";
import { useNavigate } from "react-router-dom";

const CTA = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  return (
    <section className="py-20 bg-gray-100 relative overflow-hidden">
      {/* Background Animation */}
      <div className="absolute inset-0">
        <motion.div
          className="absolute top-10 left-10 w-64 h-64 bg-gradient-to-r from-green-400/20 to-blue-600/20 rounded-full blur-3xl"
          animate={{ x: [0, 100, 0], y: [0, -50, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute bottom-10 right-10 w-80 h-80 bg-gradient-to-r from-purple-400/20 to-blue-500/20 rounded-full blur-3xl"
          animate={{ x: [0, -80, 0], y: [0, 60, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="mb-8"
        >
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-green-400/20 to-blue-600/20 text-green-600 px-4 py-2 rounded-full text-sm font-semibold mb-6 border border-green-400/30">
            <Sparkles className="w-4 h-4" />
            Start Your AI Learning Journey Today
          </div>

          <h2 className="text-4xl lg:text-5xl font-bold text-blue-900 mb-6">
            Ready to Transform Your
            <span className="block bg-gradient-to-r from-purple-500 via-blue-500 to-green-400 bg-clip-text text-transparent" style={{paddingBottom:'5px'}}>
              Learning Experience?
            </span>
          </h2>

          <p className="text-xl text-gray-700 mb-8 max-w-2xl mx-auto">
            Join thousands of learners who have already discovered the power of AI-driven
            personalized education. Start your journey with Mentivio today.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          viewport={{ once: true }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
        >
          <motion.button
            className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => user ? navigate("/tutor") : navigate("/login")}
          >
            Get Started Free
            <ArrowRight className="w-5 h-5" />
          </motion.button>
{/* 
          <motion.button
            className="border-2 border-blue-500 text-blue-700 px-8 py-4 rounded-lg font-semibold text-lg hover:border-green-400 hover:text-green-400 transition-all duration-300"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Schedule Demo
          </motion.button> */}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          viewport={{ once: true }}
          className="mt-8 text-sm text-gray-600"
        >
          {/* No credit card required • Free 14-day trial • Cancel anytime */}
          No credit card required &nbsp; • Designed for students & educators &nbsp; • Constantly evolving
        </motion.div>
      </div>
    </section>
  );
};

export default CTA;
