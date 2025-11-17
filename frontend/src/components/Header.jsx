import React, { useState } from "react";
import { Menu, X, BookOpen } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "./AuthContext";
import { useNavigate, useLocation } from "react-router-dom";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ Define nav items based on login state
  const publicNavItems = [
    { name: "Home", href: "#home" },
    { name: "Features", href: "#features" },
    { name: "How It Works", href: "#how-it-works" },
    { name: "About", href: "/about" },
  ];

  const privateNavItems = [
    { name: "Home", path: "/" },
    { name: "AI Tutor", path: "/tutor" },
    { name: "Goal Guidance", path: "/goals" },
    { name: "Chats", path: "/chats" },
    { name: "About", path: "/about" },
  ];

  const navItems = user ? privateNavItems : publicNavItems;

  // Update handleNavClick (only for public links)
  const handleNavClick = (e, href, isMobile = false) => {
    e.preventDefault();

    // If it's a full route (not an anchor)
    if (!href.startsWith("#")) {
      navigate(href);
      if (isMobile) setIsMenuOpen(false);
      return;
    }

    const id = href.replace("#", "");

    const scrollToSection = () => {
      const el = document.getElementById(id);
      if (el) {
        // Add a tiny delay if menu just closed (mobile)
        setTimeout(() => {
          el.scrollIntoView({ behavior: "smooth" });
        }, isMobile ? 300 : 0);
      }
    };

    if (location.pathname !== "/") {
      navigate("/", { replace: false });
      setTimeout(scrollToSection, 400);
    } else {
      scrollToSection();
    }

    // Close menu after triggering scroll
    if (isMobile) setIsMenuOpen(false);
  };


  const handleAuthClick = () => {
    if (user) {
      logout();
      navigate("/");
    } else {
      navigate("/login");
    }
  };

  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200 will-change-transform transform-none">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <motion.div
            className="flex items-center space-x-2 cursor-pointer"
            onClick={() => navigate("/")}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-blue-500 rounded-lg flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <span
              className="text-xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent"
              style={{ fontFamily: "verdana" }}
            >
              Mentivio
            </span>
          </motion.div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item, index) => (
              <motion.a
                key={item.name}
                href={item.href || item.path}
                onClick={(e) => handleNavClick(e, item.href || item.path)}
                className={`text-gray-800 hover:text-blue-700 transition-colors duration-200 font-medium cursor-pointer ${
                  location.pathname === item.path ? "text-blue-600 font-semibold" : ""
                }`}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {item.name}
              </motion.a>
            ))}

            {/* Auth Button */}
            <motion.button
              onClick={handleAuthClick}
              className={`${
                user
                  ? "bg-red-500 hover:bg-red-600"
                  : "bg-gradient-to-r from-blue-500 to-purple-500"
              } text-white px-6 py-2 rounded-lg hover:shadow-lg transition-all duration-200`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {user ? "Logout" : "Get Started"}
            </motion.button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? (
              <X className="w-6 h-6 text-gray-800" />
            ) : (
              <Menu className="w-6 h-6 text-gray-800" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              className="md:hidden"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="py-4 space-y-4">
                {navItems.map((item) => (
                  <a
                    key={item.name}
                    href={item.href || item.path}
                    onClick={(e) => {
                      handleNavClick(e, item.href || item.path);
                      setIsMenuOpen(false);
                    }}
                    className="block text-gray-800 hover:text-blue-500 transition-colors duration-200 font-medium"
                  >
                    {item.name}
                  </a>
                ))}
                <button
                  onClick={() => {
                    handleAuthClick();
                    setIsMenuOpen(false);
                  }}
                  className={`w-full ${
                    user
                      ? "bg-red-500 hover:bg-red-600"
                      : "bg-gradient-to-r from-blue-500 to-purple-500"
                  } text-white px-6 py-2 rounded-lg hover:shadow-lg transition-all duration-200`}
                >
                  {user ? "Logout" : "Get Started"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </header>
  );
};

export default Header;
