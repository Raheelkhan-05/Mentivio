import React, { useState, useEffect } from 'react';
import { Search, TrendingUp, Calendar, Target, MessageSquare, FileQuestion, CreditCard, BarChart3, Menu, X, Upload, ChevronRight } from 'lucide-react';
import UploadComponent from '../components/Upload';
import Chat from '../components/Chat';
import Quiz from '../components/Quiz';
import Flashcards from '../components/Flashcards';
import Dashboard from '../components/Dashboard';
import { getMaterials, getProgress } from '../services/api';
import { useAuth } from '../components/AuthContext';
import './App.css';

import { motion } from 'framer-motion';

function Tutor() {
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('activeTab') || 'chat';
  });

  const { user, loading } = useAuth();
  const userId = user?.userId || null;
  const [materials, setMaterials] = useState([]);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [useAllMaterials, setUseAllMaterials] = useState(true);
  const [progress, setProgress] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSidebar, setShowSidebar] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    if (!loading && user?.userId) {
      loadMaterials();
      loadProgress();
    }
  }, [loading, user?.userId]);

  const loadMaterials = async () => {
    try {
      const data = await getMaterials(userId);
      setMaterials(data.materials);

      // Auto-select latest material if useAllMaterials is false and no material is selected
      if (!useAllMaterials && data.materials.length > 0 && !selectedMaterial) {
        setSelectedMaterial(data.materials[0]);
      }
    } catch (error) {
      console.error('Failed to load materials:', error);
    }
  };

  useEffect(() => {
    localStorage.setItem('activeTab', activeTab);
  }, [activeTab]);

  const loadProgress = async () => {
    try {
      const data = await getProgress(userId);
      setProgress(data.progress);
    } catch (error) {
      console.error('Failed to load progress:', error);
    }
  };

  const handleUploadSuccess = () => {
    loadMaterials();
  };

  const handleTabChange = (tabId) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setActiveTab(tabId);
      setIsTransitioning(false);
    }, 150);
  };

  const handleUseAllMaterialsToggle = (checked) => {
    setUseAllMaterials(checked);
    if (!checked && materials.length > 0) {
      // Select the latest material when toggling off
      setSelectedMaterial(materials[0]);
    }
  };

  const filteredMaterials = materials.filter(material =>
    material.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    material.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const tabs = [
    { id: 'chat', label: 'Chat', icon: MessageSquare, color: 'blue' },
    { id: 'quiz', label: 'Quiz', icon: FileQuestion, color: 'purple' },
    { id: 'flashcards', label: 'Flashcards', icon: CreditCard, color: 'green' },
    { id: 'upload', label: 'Upload', icon: Upload, color: 'blue' },
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3, color: 'purple' }
  ];

  const getActiveTabColor = () => {
    const activeTabData = tabs.find(tab => tab.id === activeTab);
    return activeTabData?.color || 'blue';
  };

  return (
    <div className="flex flex-col bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen w-full h-[100vh] mt-16">

      <div
        className="
      relative flex flex-1 flex-col
      w-screen max-w-none mx-0
      min-h-screen
      min-[1330px]:w-full
      min-[1330px]:max-w-7xl
      min-[1330px]:mx-auto
    "
      >

        {/* OUTWARD GLOW — left & right only (>= 1330px) */}
        <div
          className="
       animated-glow
        pointer-events-none
        absolute inset-y-0 -inset-x-8
        bg-gradient-to-t from-green-400/40 via-blue-500/35 to-purple-500/40
        blur-3xl opacity-0
        transition-opacity duration-500 ease-out
        min-[1330px]:opacity-70
        w-full
      "
        />

        {/* GRADIENT BORDER — left & right only (>= 1330px) */}
        <div
          className="
        relative flex flex-1 flex-col w-full min-h-screen
        animated-glow
        min-[1330px]:bg-gradient-to-t
        min-[1330px]:from-green-400/50
        min-[1330px]:via-blue-500/40
        min-[1330px]:to-purple-500/50
        min-[1330px]:pr-[1px]
        min-[1330px]:pl-[2px]
        transition-all duration-500 ease-out
      "
        >

          {/* CONTENT */}
          <div className="bg-white/90 flex flex-col w-full min-h-screen backdrop-blur">

            <nav className="bg-white/80 ps-20 backdrop-blur-lg border-b border-gray-200/50 shadow-sm px-4 py-3 lg:px-12 sticky top-16 z-10">
            <button
    onClick={() => setShowSidebar(!showSidebar)}
    className={`
      lg:hidden absolute left-5 top-9 -translate-y-1/2 z-30 p-3
      bg-white/90 backdrop-blur-lg rounded-2xl shadow-lg hover:shadow-xl 
      transition-all duration-300 border border-gray-200/50
      ${getActiveTabColor() === 'blue' ? 'hover:bg-blue-50' :
        getActiveTabColor() === 'purple' ? 'hover:bg-purple-50' : 'hover:bg-green-50'}
    `}
  >
    <Menu className={`w-5 h-5 ${getActiveTabColor() === 'blue' ? 'text-blue-600' :
      getActiveTabColor() === 'purple' ? 'text-purple-600' : 'text-green-600'
    }`} />
  </button> 
              <div className="flex gap-2 w-full overflow-x-auto sm:overflow-visible pb-2 sm:pb-0 scrollbar-hide relative">
                {/* Active tab indicator */}
                <div
                  className="absolute bottom-0 sm:h-0.5 transition-all duration-300 ease-out z-10"
                  style={{
                    left: `calc(${tabs.findIndex(t => t.id === activeTab) * (100 / tabs.length)}% + ${10.5 / tabs.length}%)`,
                    width: `${80 / tabs.length}%`,
                    background:
                      activeTab === 'chat' || activeTab === 'upload'
                        ? 'linear-gradient(to right, #3b82f6, #60a5fa)'
                        : activeTab === 'quiz' || activeTab === 'dashboard'
                          ? 'linear-gradient(to right, #a855f7, #c084fc)'
                          : 'linear-gradient(to right, #4ade80, #86efac)',
                  }}
                />


                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => handleTabChange(tab.id)}
                      className={`
                  relative flex items-center justify-center gap-2
                  px-5 py-3 rounded-xl font-medium whitespace-nowrap
                  transition-all duration-300 ease-out
                  flex-none sm:flex-1 group
                  ${isActive
                          ? tab.color === 'blue'
                            ? 'bg-gradient-to-br from-blue-50 to-blue-100/50 text-blue-700 shadow-md shadow-blue-100'
                            : tab.color === 'purple'
                              ? 'bg-gradient-to-br from-purple-50 to-purple-100/50 text-purple-700 shadow-md shadow-purple-100'
                              : 'bg-gradient-to-br from-green-50 to-green-100/50 text-green-700 shadow-md shadow-green-100'
                          : 'text-gray-600 hover:bg-gray-50/80 hover:text-gray-900'
                        }
                `}
                    >
                      <Icon className={`w-4 h-4 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-105'}`} />
                      <span className="text-sm font-semibold">{tab.label}</span>
                      {isActive && (
                        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/40 to-transparent pointer-events-none" />
                      )}
                    </button>
                  );
                })}
              </div>
            </nav>
<div className="flex flex-1 overflow-y-auto w-full">
  {/* Sidebar */}
  {['chat', 'quiz', 'flashcards', 'upload', 'dashboard'].includes(activeTab) && (
    <>
      
      {showSidebar && (
  <button
    onClick={() => setShowSidebar(false)}
    className={`
      lg:hidden absolute left-5 top-9 -translate-y-1/2 z-30 p-3
      bg-white/90 backdrop-blur-lg rounded-2xl shadow-lg hover:shadow-xl 
      transition-all duration-300 border border-gray-200/50
      ${getActiveTabColor() === 'blue'
        ? 'hover:bg-blue-50'
        : getActiveTabColor() === 'purple'
        ? 'hover:bg-purple-50'
        : 'hover:bg-green-50'}
    `}
  >
    <X
      className={`w-5 h-5 ${
        getActiveTabColor() === 'blue'
          ? 'text-blue-600'
          : getActiveTabColor() === 'purple'
          ? 'text-purple-600'
          : 'text-green-600'
      }`}
    />
  </button>
)}

      <aside className={`lg:mt-0
        fixed lg:relative inset-y-0 left-0 z-20 lg:z-0
        w-80 bg-white/95 backdrop-blur-xl border-r border-gray-200/50
        transform transition-transform duration-300 ease-in-out
        ${showSidebar ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        flex flex-col overflow-hidden shadow-2xl lg:shadow-none
      `}>
        {/* Study Materials Section */}
        <div className="flex-1 lg:flex-[0.90] overflow-y-auto">
          <div className="p-6 border-b border-gray-200/50 pb-0">
            <div className="flex items-center gap-2 mb-4 ps-12 lg:ps-0">
              <div className={`hidden lg:block w-1 h-6 rounded-full ${getActiveTabColor() === 'blue' ? 'bg-gradient-to-b from-blue-400 to-blue-600' :
                  getActiveTabColor() === 'purple' ? 'bg-gradient-to-b from-purple-400 to-purple-600' :
                    'bg-gradient-to-b from-green-400 to-green-600'
                }`} />
              <h3 className="text-gray-900 font-bold text-lg">Study Materials</h3>
            </div>

            {/* Search Bar */}
            <div className="relative mb-4 group">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 transition-colors ${getActiveTabColor() === 'blue' ? 'text-blue-400 group-focus-within:text-blue-600' :
                  getActiveTabColor() === 'purple' ? 'text-purple-400 group-focus-within:text-purple-600' :
                    'text-green-400 group-focus-within:text-green-600'
                }`} />
              <input
                type="text"
                placeholder="Search materials..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-10 pr-4 py-3 text-sm border-2 border-gray-200 rounded-xl 
                  focus:outline-none transition-all bg-gray-50/50 focus:bg-white
                  ${getActiveTabColor() === 'blue' ? 'focus:border-blue-400 focus:ring-4 focus:ring-blue-100' :
                    getActiveTabColor() === 'purple' ? 'focus:border-purple-400 focus:ring-4 focus:ring-purple-100' :
                      'focus:border-green-400 focus:ring-4 focus:ring-green-100'
                  }`}
              />
            </div>

            {/* Use All Materials Toggle */}
            <label className={`flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all duration-300 group
              ${useAllMaterials
                ? getActiveTabColor() === 'blue'
                  ? 'bg-gradient-to-br from-blue-50 to-blue-100/50 border-2 border-blue-200'
                  : getActiveTabColor() === 'purple'
                    ? 'bg-gradient-to-br from-purple-50 to-purple-100/50 border-2 border-purple-200'
                    : 'bg-gradient-to-br from-green-50 to-green-100/50 border-2 border-green-200'
                : 'bg-gray-50/50 border-2 border-gray-200 hover:bg-gray-100/50'
              }`}>
              <input
                type="checkbox"
                checked={useAllMaterials}
                onChange={(e) => handleUseAllMaterialsToggle(e.target.checked)}
                className={`w-5 h-5 rounded-lg border-2 focus:ring-4 focus:ring-offset-0 transition-all
                  ${getActiveTabColor() === 'blue' ? 'text-blue-600 focus:ring-blue-200 border-blue-300' :
                    getActiveTabColor() === 'purple' ? 'text-purple-600 focus:ring-purple-200 border-purple-300' :
                      'text-green-600 focus:ring-green-200 border-green-300'
                  }`}
              />
              <span className={`font-semibold text-sm ${useAllMaterials
                  ? getActiveTabColor() === 'blue' ? 'text-blue-700' :
                    getActiveTabColor() === 'purple' ? 'text-purple-700' : 'text-green-700'
                  : 'text-gray-700'
                }`}>
                Use all materials
              </span>
            </label>
          </div>

          {!useAllMaterials && (
            <div className="p-4 space-y-3">
              {filteredMaterials.length === 0 ? (
                <div className="text-center py-12">
                  <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center
                    ${getActiveTabColor() === 'blue' ? 'bg-blue-50' :
                      getActiveTabColor() === 'purple' ? 'bg-purple-50' : 'bg-green-50'
                    }`}>
                    <Upload className={`w-8 h-8
                      ${getActiveTabColor() === 'blue' ? 'text-blue-400' :
                        getActiveTabColor() === 'purple' ? 'text-purple-400' : 'text-green-400'
                      }`} />
                  </div>
                  <p className="text-gray-500 text-sm font-medium">
                    {materials.length === 0 ? 'No materials uploaded yet' : 'No materials found'}
                  </p>
                  {materials.length === 0 && (
                    <p className="text-gray-400 text-xs mt-2">Upload your first material to get started</p>
                  )}
                </div>
              ) : (
                filteredMaterials.map((material, index) => (
                  <div
                    key={material._id}
                    onClick={() => setSelectedMaterial(material)}
                    style={{ animationDelay: `${index * 50}ms` }}
                    className={`
                      p-4 rounded-xl cursor-pointer transition-all duration-300
                      animate-fadeIn group relative overflow-hidden
                      ${selectedMaterial?._id === material._id
                        ? getActiveTabColor() === 'blue'
                          ? 'bg-gradient-to-br from-blue-50 to-blue-100/50 border-2 border-blue-300 shadow-lg shadow-blue-100'
                          : getActiveTabColor() === 'purple'
                            ? 'bg-gradient-to-br from-purple-50 to-purple-100/50 border-2 border-purple-300 shadow-lg shadow-purple-100'
                            : 'bg-gradient-to-br from-green-50 to-green-100/50 border-2 border-green-300 shadow-lg shadow-green-100'
                        : 'bg-white hover:bg-gray-50 border-2 border-gray-200 hover:border-gray-300 hover:shadow-md'
                      }
                    `}
                  >
                    {selectedMaterial?._id === material._id && (
                      <div className={`absolute inset-0 bg-gradient-to-r opacity-10 pointer-events-none
                        ${getActiveTabColor() === 'blue' ? 'from-blue-400 to-transparent' :
                          getActiveTabColor() === 'purple' ? 'from-purple-400 to-transparent' :
                            'from-green-400 to-transparent'
                        }`} />
                    )}

                    <div className="flex items-start justify-between mb-2 relative">
                      <h4 className="font-semibold text-gray-900 text-sm flex-1 pr-2 line-clamp-2">
                        {material.title}
                      </h4>
                      {material.processingStatus === 'completed' && (
                        <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs rounded-lg font-semibold border border-green-200">
                          Ready
                        </span>
                      )}
                      {material.processingStatus === 'processing' && (
                        <span className="px-2.5 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-lg font-semibold border border-yellow-200 animate-pulse">
                          Processing
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-md text-xs font-medium
                        ${getActiveTabColor() === 'blue' ? 'bg-blue-100 text-blue-700' :
                          getActiveTabColor() === 'purple' ? 'bg-purple-100 text-purple-700' :
                            'bg-green-100 text-green-700'
                        }`}>
                        {material.subject}
                      </span>
                    </div>

                  </div>
                ))
              )}
            </div>
          )}
        </div>
        {/* Progress Section */}
        <div className={`p-4 border-t border-gray-200/50 bg-gradient-to-br
          ${getActiveTabColor() === 'blue' ? 'from-blue-50/30 to-transparent' :
            getActiveTabColor() === 'purple' ? 'from-purple-50/30 to-transparent' :
              'from-green-50/30 to-transparent'
          }`}>

          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className={`w-4 h-4
              ${getActiveTabColor() === 'blue' ? 'text-blue-600' :
                getActiveTabColor() === 'purple' ? 'text-purple-600' :
                  'text-green-600'
              }`} />
            <h4 className="font-semibold text-gray-900 text-sm">
              Your Progress
            </h4>
          </div>

          {progress && (
            <div className="space-y-2">

              {/* Accuracy */}
              <div className="flex items-center justify-between p-3 bg-white/80 backdrop-blur-sm rounded-lg border border-gray-200/50 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center bg-gradient-to-br from-green-400 to-green-600
                    `}>
                    <Target className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-gray-700 font-medium text-xs">
                    Accuracy
                  </span>
                </div>
                <strong className="text-gray-900 text-base font-bold">
                  {progress.overallAccuracy.toFixed(1)}%
                </strong>
              </div>

              {/* Quizzes */}
              <div className="flex items-center justify-between p-3 bg-white/80 backdrop-blur-sm rounded-lg border border-gray-200/50 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                    <FileQuestion className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-gray-700 font-medium text-xs">
                    Quizzes
                  </span>
                </div>
                <strong className="text-gray-900 text-base font-bold">
                  {progress.totalQuizzesTaken}
                </strong>
              </div>

              {/* Streak */}
              <div className="flex items-center justify-between p-3 bg-white/80 backdrop-blur-sm rounded-lg border border-gray-200/50 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-gray-700 font-medium text-xs">
                    Streak
                  </span>
                </div>
                <strong className="text-gray-900 text-base font-bold">
                  {progress.currentStreak} days 🔥
                </strong>
              </div>

            </div>
          )}
        </div>
      </aside>
      {/* Overlay for mobile */}
      {showSidebar && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-10 transition-opacity duration-300"
          onClick={() => setShowSidebar(false)}
        />
      )}
    </>
  )}
              {/* Main Content Area */}
              <main className={`flex-1 overflow-hidden bg-white/50 backdrop-blur-sm transition-opacity duration-300 ${isTransitioning ? 'opacity-70' : 'opacity-100'
                }`}>
                {activeTab === 'chat' && (
                  <Chat
                    userId={userId}
                    materialId={selectedMaterial?._id}
                    useAllMaterials={useAllMaterials}
                  />
                )}
                {activeTab === 'quiz' && (
                  <Quiz
                    userId={userId}
                    materialId={selectedMaterial?._id}
                    useAllMaterials={useAllMaterials}
                    onQuizComplete={loadProgress}
                  />
                )}
                {activeTab === 'flashcards' && (
                  <Flashcards
                    userId={userId}
                    materialId={selectedMaterial?._id}
                    useAllMaterials={useAllMaterials}
                  />
                )}
                {activeTab === 'upload' && (
                  <UploadComponent
                    userId={userId}
                    onUploadSuccess={handleUploadSuccess}
                  />
                )}
                {activeTab === 'dashboard' && (
                  <Dashboard userId={userId} />
                )}
              </main>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Tutor;