import React from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../components/AuthContext';
import { useNavigate, useLocation } from "react-router-dom";
import { BookOpen, Bot, Users, BarChart3, Sparkles, Zap, Target, ArrowRight, CheckCircle2, Brain, Rocket } from 'lucide-react';

const About = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
  const features = [
    {
      icon: BookOpen,
      title: 'Upload Your Materials',
      description: 'Upload your study materials in text or PDF format — and Mentivio transforms them into your personal knowledge hub. You can instantly ask questions directly from your syllabus and focus on what truly matters.',
      color: 'from-blue-500 to-indigo-500',
      accentColor: 'text-blue-600',
      bgGlow: 'from-blue-400/20 to-indigo-400/20'
    },
    {
      icon: Bot,
      title: 'AI Tutoring Experience',
      description: 'Meet your smart AI Tutor that simplifies even the toughest concepts. Chat naturally, create flashcards for revision, and take quick quizzes to check your understanding. Your tutor adapts to your learning pace — just like a real mentor, but available anytime.',
      color: 'from-purple-500 to-pink-500',
      accentColor: 'text-purple-600',
      bgGlow: 'from-purple-400/20 to-pink-400/20'
    },
    {
      icon: Users,
      title: 'Collaborate & Learn',
      description: 'No need to switch between apps for studying and chatting. Here, you can discuss topics with classmates, create group chats, and even post your doubts using hashtags. Others can jump in, explain, and share insights — all in one smart space.',
      color: 'from-green-500 to-teal-500',
      accentColor: 'text-green-600',
      bgGlow: 'from-green-400/20 to-teal-400/20'
    },
    {
      icon: BarChart3,
      title: 'Track Your Progress',
      description: 'Stay motivated with your personalized learning dashboard. Track your quizzes, accuracy, streaks, and strengths in real time — and watch yourself grow with every session.',
      color: 'from-orange-500 to-yellow-500',
      accentColor: 'text-orange-600',
      bgGlow: 'from-orange-400/20 to-yellow-400/20'
    }
  ];

  const highlights = [
    { icon: Zap, text: 'AI-Powered Intelligence', color: 'text-blue-500' },
    { icon: Target, text: 'Personalized Learning Paths', color: 'text-purple-500' },
    { icon: Users, text: 'Collaborative Study Groups', color: 'text-green-500' },
    { icon: Brain, text: 'Adaptive Content Delivery', color: 'text-orange-500' }
  ];

  return (
    <div className="bg-white overflow-hidden mt-11">
      {/* Hero Section with Animated Background */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            className="absolute top-20 -left-20 w-96 h-96 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-full blur-3xl"
            animate={{ 
              x: [0, 100, 0],
              y: [0, -50, 0],
              scale: [1, 1.2, 1]
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute bottom-20 -right-20 w-[500px] h-[500px] bg-gradient-to-r from-purple-400/20 to-pink-400/20 rounded-full blur-3xl"
            animate={{ 
              x: [0, -100, 0],
              y: [0, 50, 0],
              scale: [1, 1.1, 1]
            }}
            transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute top-1/2 left-1/2 w-96 h-96 bg-gradient-to-r from-green-400/10 to-blue-400/10 rounded-full blur-3xl"
            animate={{ 
              scale: [1, 1.3, 1],
              rotate: [0, 180, 360]
            }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-500/10 to-purple-500/10 backdrop-blur-sm rounded-full border border-blue-200/50 mb-8"
            >
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                The Future of Learning is Here
              </span>
            </motion.div>

            {/* Main Heading */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 leading-tight"
            >
              Welcome to
              <span className="block mt-2 text-transparent">
                <span className='bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text'>Mentivio</span>
                
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="text-xl sm:text-2xl text-gray-600 max-w-4xl mx-auto mb-8 leading-relaxed"
            >
              Your all-in-one learning companion — combining <span className="font-semibold text-gray-900">AI tutoring</span>, 
              <span className="font-semibold text-gray-900"> collaboration</span>, and 
              <span className="font-semibold text-gray-900"> personalized progress tracking</span> to make studying smarter, 
              interactive, and genuinely enjoyable.
            </motion.p>

            {/* Highlights Grid */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 max-w-5xl mx-auto mb-10"
            >
              {highlights.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.6 + index * 0.1 }}
                  whileHover={{ scale: 1.05, y: -5 }}
                  className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 sm:p-5 shadow-lg border border-gray-100"
                >
                  <item.icon className={`w-8 h-8 ${item.color} mx-auto mb-3`} />
                  <p className="text-sm sm:text-base font-medium text-gray-800 leading-tight">
                    {item.text}
                  </p>
                </motion.div>
              ))}
            </motion.div>

            {/* CTA Button */}
            <motion.button
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.7 }}
              whileHover={{ scale: 1.05, boxShadow: "0 20px 40px rgba(0,0,0,0.15)" }}
              whileTap={{ scale: 0.95 }}
              onClick={() => user ? navigate("/tutor") : navigate("/login")}
              className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold text-lg rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300"
            >
              Start Your Journey
              <ArrowRight className="w-5 h-5" />
            </motion.button>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 sm:py-28 bg-gray-50 relative overflow-hidden">
        {/* Decorative Background */}
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.02]" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16 sm:mb-20"
          >
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
              Everything You Need,
              <span className="block mt-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                All in One Place
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Mentivio brings together the best learning tools to create an unparalleled educational experience
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8 lg:gap-10">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.15 }}
                viewport={{ once: true }}
                whileHover={{ y: -8, scale: 1.02 }}
                className="group relative bg-white rounded-3xl p-8 sm:p-10 shadow-lg hover:shadow-2xl transition-all duration-500 border border-gray-100 overflow-hidden"
              >
                {/* Background Glow Effect */}
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${feature.bgGlow} opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl`}
                />

                <div className="relative z-10">
                  {/* Icon (entrance synced with card) */}
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: index * 0.15 + 0.1 }}
                    viewport={{ once: true }}
                    whileHover={{ rotate: [0, -10, 10, -10, 0], scale: 1.1 }}
                    variants={{
                      hover: { rotate: [0, -10, 10, -10, 0], scale: 1.1 },
                    }}

                    className={`inline-flex p-4 rounded-2xl bg-gradient-to-r ${feature.color} mb-6 shadow-lg`}
                  >
                    <feature.icon className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                  </motion.div>

                  {/* Title */}
                  <h3
                    className={`text-2xl sm:text-3xl font-bold ${feature.accentColor} mb-4 group-hover:translate-x-2 transition-transform duration-300`}
                  >
                    {feature.title}
                  </h3>

                  {/* Description */}
                  <p className="text-gray-600 text-base sm:text-lg leading-relaxed">
                    {feature.description}
                  </p>

                  {/* Decorative Arrow */}
                  <motion.div
                    initial={{ x: -10, opacity: 0 }}
                    whileHover={{ x: 0, opacity: 1 }}
                    className="mt-6 flex items-center gap-2 text-sm font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
                  >
                    Explore this feature
                    <ArrowRight className="w-4 h-4 text-purple-600" />
                  </motion.div>
                </div>

                {/* Corner Decoration */}
                <div
                  className={`absolute -bottom-6 -right-6 w-32 h-32 bg-gradient-to-br ${feature.color} opacity-5 rounded-full blur-2xl group-hover:opacity-20 transition-opacity duration-500`}
                />
              </motion.div>
            ))}
          </div>

        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-20 sm:py-15 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white overflow-hidden">
        {/* Animated Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <motion.div
            animate={{ 
              backgroundPosition: ['0% 0%', '100% 100%'],
            }}
            transition={{ duration: 20, repeat: Infinity, repeatType: 'reverse' }}
            className="w-full h-full"
            style={{
              backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
              backgroundSize: '50px 50px'
            }}
          />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <motion.div
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              transition={{ duration: 0.6, type: "spring" }}
              viewport={{ once: true }}
              className="inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full mb-8"
            >
              <Rocket className="w-10 h-10 text-white" />
            </motion.div>

            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              Start Your Smarter
              <span className="block mt-2">Learning Journey Today</span>
            </h2>
            
            <p className="text-xl sm:text-2xl text-blue-100 max-w-3xl mx-auto mb-10 leading-relaxed">
              Upload your notes, chat with your AI Tutor, learn with friends, 
              and track your progress — all in one seamless experience. 
              Learning has never felt this easy and fun!
            </p>

            {/* Feature Pills */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              viewport={{ once: true }}
              className="flex flex-wrap justify-center gap-4 mb-10"
            >
              {['24/7 AI Support', 'Instant Answers', 'Track Progress', 'Study Together'].map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
                  viewport={{ once: true }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white/20 backdrop-blur-sm rounded-full border border-white/30"
                >
                  <CheckCircle2 className="w-5 h-5 text-green-300" />
                  <span className="font-medium">{item}</span>
                </motion.div>
              ))}
            </motion.div>

            {/* CTA Button */}
            <motion.button
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.05, boxShadow: "0 25px 50px rgba(0,0,0,0.3)" }}
              whileTap={{ scale: 0.95 }}
              onClick={() => user ? navigate("/tutor") : navigate("/login")}
              className="inline-flex items-center gap-3 px-10 py-5 bg-white text-purple-700 font-bold text-xl rounded-xl shadow-2xl hover:bg-gray-50 transition-all duration-300"
            >
              Get Started Now
              <ArrowRight className="w-6 h-6" />
            </motion.button>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default About;