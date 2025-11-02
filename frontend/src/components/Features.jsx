import React from 'react';
import { motion } from 'framer-motion';
import { Brain, Target, MessageCircle, Upload, BookOpen, TrendingUp } from 'lucide-react';

const Features = () => {
  const features = [
    {
      icon: Brain,
      title: 'AI Personal Tutor',
      description: 'Interactive learning through Socratic questioning, adaptive quizzes, and personalized flashcards that evolve with your progress.',
      color: 'from-green-400 to-blue-600'
    },
    {
      icon: Target,
      title: 'Goal Guidance System',
      description: 'Get personalized learning paths, course recommendations, and milestone tracking based on your academic and professional goals.',
      color: 'from-blue-500 to-purple-500'
    },
    {
      icon: MessageCircle,
      title: 'In-App Study Chat',
      description: 'Collaborate with peers in a focused learning environment with real-time messaging, search filters, and secure interactions.',
      color: 'from-purple-500 to-blue-500'
    },
    {
      icon: Upload,
      title: 'Smart Content Processing',
      description: 'Upload textbooks, notes, and research papers. Our AI extracts knowledge and creates structured learning materials.',
      color: 'from-blue-500 to-purple-500'
    },
    {
      icon: BookOpen,
      title: 'Adaptive Learning',
      description: 'Dynamic content adaptation based on your performance, ensuring personalized and incremental learning experiences.',
      color: 'from-purple-500 to-blue-500'
    },
    {
      icon: TrendingUp,
      title: 'Progress Tracking',
      description: 'Visualize your learning journey with detailed analytics, strength assessments, and achievement milestones.',
      color: 'from-blue-500 to-green-400'
    }
  ];

  return (
    <section id="features" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold text-blue-900 mb-4">
            Powerful Features for
            <span className="block bg-gradient-to-r from-purple-500 via-blue-500 to-green-400 bg-clip-text text-transparent">
              Enhanced Learning
            </span>
          </h2>
          <p className="text-xl text-gray-700 max-w-3xl mx-auto">
            Discover how Mentivio combines AI tutoring, goal guidance, and collaborative chat
            to create the ultimate personalized learning experience.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              whileHover={{ y: -5 }}
              className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100"
            >
              <div className={`w-12 h-12 bg-gradient-to-r ${feature.color} rounded-xl flex items-center justify-center mb-6`}>
                <feature.icon className="w-6 h-6 text-white" />
              </div>

              <h3 className="text-xl font-bold text-blue-900 mb-4">
                {feature.title}
              </h3>

              <p className="text-gray-700 leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
