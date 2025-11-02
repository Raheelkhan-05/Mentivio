import React from 'react';
import { motion } from 'framer-motion';

const Stats = () => {
  const stats = [
    { number: '24/7', label: 'AI Tutor Availability', color: 'from-green-500 to-blue-500' },
    { number: '6+', label: 'Core Features Integrated', color: 'from-blue-500 to-purple-500' },
    { number: '3+', label: 'AI Models Evaluated', color: 'from-purple-500 to-blue-500' },
    { number: '3', label: 'Team Collaborators', color: 'from-blue-500 to-green-400' }
    
  ];

  return (
    <section className="py-20 bg-gradient-to-r from-black via-gray-800 to-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold text-white mb-4">
            Mentivio at a Glance
          </h2>
          <p className="text-xl text-white/70 max-w-3xl mx-auto">
            The Mentivio AI Learning Platform is an ongoing engineering project focused on
            building an adaptive and interactive tutoring system powered by AI and modern web technologies.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.5 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.05 }}
              className="text-center bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20"
            >
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ duration: 1, delay: index * 0.2 }}
                viewport={{ once: true }}
                className={`text-4xl lg:text-5xl font-bold mb-2 bg-gradient-to-r ${stats[index].color} bg-clip-text text-transparent`}
              >
                {stat.number}
              </motion.div>
              <div className="text-white/90 font-medium text-lg">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Stats;
