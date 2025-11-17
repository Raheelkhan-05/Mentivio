import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Brain, Target, MessageCircle, X } from 'lucide-react';

const HowItWorks = () => {
  const [activeStep, setActiveStep] = useState(null);

  const steps = [
    {
      icon: Upload,
      title: 'Upload Your Materials',
      description: 'Upload textbooks, lecture notes, or research papers. Our AI processes and structures your content for optimal learning.',
       moreInfo:
        'Simply upload your study materials in text or PDF format — whether they’re class notes, research papers, or entire textbooks. Mentivio instantly processes your files, understands your syllabus, and prepares them for interactive learning. You can then directly ask questions, get explanations, or summarize topics — all based on your own materials.',
      color: 'from-green-400 to-blue-500',
      image:
        'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
    },
    {
      icon: Brain,
      title: 'AI Tutoring Experience',
      description:
        'Interact with intelligent tutoring agents that ask Socratic questions, generate quizzes, and adapt to your learning pace.',
      moreInfo:
        'Struggling with complex concepts? Chat directly with your AI Tutor — it explains topics in simple terms, generates examples, and ensures you truly understand before moving ahead. You can create flashcards for quick revision and take personalized quizzes to test your knowledge. The intelligent tutor continuously adapts to your learning speed, ensuring a smooth and personalized learning journey.',
      color: 'from-purple-500 to-blue-500',
      image:
        'https://images.unsplash.com/photo-1677442136019-21780ecad995?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
    },
    {
      icon: Target,
      title: 'Set Learning Goals',
      description:
        'Define your academic or professional objectives and receive personalized learning paths with recommended courses and milestones.',
      moreInfo:
        'Transform your learning journey from random studying to goal-driven progress. Set clear academic or career goals — whether it’s mastering a subject, preparing for exams, or learning new skills — and Mentivio crafts a personalized roadmap for you. Get curated learning paths, progress tracking, and smart reminders that keep you motivated and consistent. Your learning now has direction, purpose, and results.',
      color: 'from-blue-500 to-green-400',
      image:
        'https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
    },
    {
      icon: MessageCircle,
      title: 'Collaborate & Learn',
      description:
        'Connect with peers through our in-app chat system for study discussions, subject queries, and collaborative learning.',
      moreInfo:
        'No more switching between apps to discuss study topics! Mentivio brings all your conversations right where you learn. You can directly chat with your friends about specific subjects, create dedicated discussion groups, and post your questions to the community. Others can respond and help you out using hashtags linked to your post — making collaboration easy, focused, and fun. Learning becomes truly social and effortless here.',
      color: 'from-blue-500 to-purple-500',
      image:
        'https://images.unsplash.com/photo-1522071820081-009f0129c71c?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
    },
  ];

  return (
    <section id="how-it-works" className="py-20 bg-gray-50 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            How <span>Mentivio</span>
            <span className="block bg-gradient-to-r from-blue-500 via-purple-500 to-green-400 bg-clip-text text-transparent">
              Transforms Learning
            </span>
          </h2>
          <p className="text-xl text-gray-700 max-w-3xl mx-auto">
            Experience a seamless learning journey with our four-step process that combines
            AI intelligence, personalized guidance, and collaborative features.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="space-y-20">
          {steps.map((step, index) => (
            // <motion.div
            //   key={step.title}
            //   initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
            //   whileInView={{ opacity: 1, x: 0 }}
            //   transition={{ duration: 0.8, delay: 0.2 }}
            //   viewport={{ once: true }}
            //   className={`flex flex-col ${index % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'} items-center gap-12`}
            // >
            <motion.div
              style={{ willChange: "opacity, transform", transformStyle: "flat" }}
              key={step.title}
              initial={{ opacity: 0, x: typeof window !== "undefined" 
                ? (window.innerWidth > 768 
                    ? (index % 2 === 0 ? -25 : 25)
                    : 0)
                : 0 
              }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              viewport={{ once: true }}
              className={`flex flex-col ${index % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'} items-center gap-12`}
            >

              {/* Content */}
              <div className="flex-1 space-y-6">
                <div className="flex items-center gap-4">
                  <div className={`w-16 h-16 bg-gradient-to-r ${step.color} rounded-2xl flex items-center justify-center`}>
                    <step.icon className="w-8 h-8 text-white" />
                  </div>
                  <div className="text-sm font-semibold text-gray-500">STEP {index + 1}</div>
                </div>

                <h3 className="text-3xl font-bold text-gray-900">{step.title}</h3>

                <p className="text-lg text-gray-700 leading-relaxed">{step.description}</p>

                <motion.button
                  className={`bg-gradient-to-r ${step.color} text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-all duration-300`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveStep(step)}
                >
                  Learn More
                </motion.button>
              </div>

              {/* Image */}
              <div className="flex-1">
                <motion.div whileHover={{ scale: 1.05 }} transition={{ duration: 0.3 }} className="relative">
                  <img
                    src={step.image}
                    alt={step.title}
                    className="rounded-2xl shadow-2xl w-full h-80 object-cover"
                    loading="lazy"
                  />
                  <div className={`absolute inset-0 bg-gradient-to-r ${step.color} opacity-10 rounded-2xl`}></div>
                </motion.div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Popup Modal */}
      <AnimatePresence>
        {activeStep && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8 relative mx-4"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Close Button */}
              <button
                onClick={() => setActiveStep(null)}
                className="absolute top-4 right-4 text-gray-600 hover:text-gray-800"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="flex flex-col items-center text-center space-y-4">
                <div className={`w-16 h-16 bg-gradient-to-r ${activeStep.color} rounded-2xl flex items-center justify-center`}>
                  <activeStep.icon className="w-8 h-8 text-white" />
                </div>

                <h3 className="text-2xl font-bold text-gray-900">{activeStep.title}</h3>

                <p className="text-gray-700 text-lg text-justify leading-relaxed">{activeStep.moreInfo}</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default HowItWorks;
