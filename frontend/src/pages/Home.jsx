import React from 'react';
import Header from '../components/Header';
import Hero from '../components/Hero';
import Features from '../components/Features';
import HowItWorks from '../components/HowItWorks';
import Stats from '../components/Stats';
import CTA from '../components/CTA';
import Footer from '../components/Footer';

// Removed ': React.FC'
const Home = () => {
  return (
    <div className="min-h-screen">
      <Hero />
      <Features />
      <HowItWorks />
      <Stats />
      <CTA />
    </div>
  );
};

export default Home;