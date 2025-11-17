import React from 'react';
import '@radix-ui/themes/styles.css';
import { Theme } from '@radix-ui/themes';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import Home from './pages/Home';
import NotFound from './pages/NotFound';
import { AuthProvider } from './components/AuthContext';
import Login from './pages/Login';
import Layout from './pages/Layout';
import ScrollToTop from './components/ScrollToTop';
import Tutor from './pages/Tutor';
import About from './pages/About';


// Removed ': React.FC' type annotation
const App = () => {
  return (
    <Theme appearance="inherit" radius="large" scaling="100%">
      <AuthProvider>
      <Router>
        <main className="min-h-screen font-inter">
          <ScrollToTop/>
          <Routes>
            <Route element={<Layout/>}>
              <Route path="/" element={<Home />} />
              <Route path="*" element={<NotFound />} />
              <Route path="/login" element={<Login />} />
              <Route path="/tutor" element={<Tutor />} />
              <Route path="/about" element={<About />} />
            </Route>
          </Routes>

          <ToastContainer
            position="top-right"
            autoClose={3000}
            newestOnTop
            closeOnClick
            pauseOnHover
          />
        </main>
      </Router>
      </AuthProvider>
    </Theme>
  );
}

export default App;