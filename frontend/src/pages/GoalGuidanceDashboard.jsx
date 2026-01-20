import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, Target, Trophy, Info, Lock, BookOpen, TrendingUp, CheckCircle2, Circle, Loader2, Sparkles, Rocket, Award, Zap } from 'lucide-react';
import { fetchGoalPath, createGoalPath } from '../services/api';
import { useAuth } from '../components/AuthContext';

const GoalPathDashboard = () => {
  const { user } = useAuth();
  const userId = user?.userId || null;
  const [goalPath, setGoalPath] = useState(null);
  const [loads, setLoads] = useState(false);
  const [error, setError] = useState(null);
  const [creatingGoal, setCreatingGoal] = useState(false);
  
  // Form states
  const [goalInput, setGoalInput] = useState('');
  const [startingPosition] = useState('Complete Beginner');
  
  // Expandable states
  const [expandedMilestones, setExpandedMilestones] = useState({});
  const [expandedSkills, setExpandedSkills] = useState({});

  // Ref for scrolling to first incomplete skill
  const firstIncompleteSkillRef = useRef(null);

  const fetchGoalPathData = async () => {
    setLoads(true);
    setError(null);
    try {
      const data = await fetchGoalPath(userId);
      
      if (data.success) {
        setGoalPath(data.goalPath);
      } else {
        setError(data.error || 'No goal path found');
      }
    } catch (err) {
      console.error('Error fetching goal path:', err);
      setError('Failed to load goal path');
    } finally {
      setLoads(false);
    }
  };

  const createGoalPathData = async () => {
    if (!goalInput.trim()) return;
    
    setCreatingGoal(true);
    setError(null);
    
    try {
      const data = await createGoalPath(
        userId, 
        goalInput, 
        startingPosition,
        false
      );
      
      if (data.success) {
        setGoalPath(data.goalPath);
        setGoalInput('');
      } else {
        setError(data.error);
      }
    } catch (err) {
      console.error('Error creating goal path:', err);
      setError('Failed to create goal path');
    } finally {
      setCreatingGoal(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchGoalPathData();
    }
  }, [userId]);

  // Auto-expand first incomplete milestone, skill, and scroll to first incomplete skill
  useEffect(() => {
    if (goalPath && goalPath.milestones) {
      const newExpandedMilestones = {};
      const newExpandedSkills = {};
      let firstIncompleteMilestone = null;
      let firstIncompleteSkill = null;
      let foundFirstIncompleteSkill = false;

      // Find first incomplete milestone
      for (const milestone of goalPath.milestones) {
        if (milestone.status !== 'completed') {
          firstIncompleteMilestone = milestone;
          newExpandedMilestones[milestone.id] = true;
          
          // Find first incomplete skill within this milestone
          for (let skillIdx = 0; skillIdx < milestone.minor_milestones.length; skillIdx++) {
            const skill = milestone.minor_milestones[skillIdx];
            if (skill.status !== 'completed' && !foundFirstIncompleteSkill) {
              firstIncompleteSkill = `${milestone.id}-${skillIdx}`;
              newExpandedSkills[firstIncompleteSkill] = true;
              foundFirstIncompleteSkill = true;
              break;
            }
          }
          break;
        }
      }

      setExpandedMilestones(newExpandedMilestones);
      setExpandedSkills(newExpandedSkills);

      // Scroll to first incomplete skill after DOM updates
      setTimeout(() => {
        if (firstIncompleteSkillRef.current) {
          const element = firstIncompleteSkillRef.current;
          const yOffset = -600; // adjust this value (negative = scroll less)
          const y =
            element.getBoundingClientRect().top +
            window.pageYOffset +
            yOffset;

          window.scrollTo({
            top: y,
            behavior: 'smooth'
          });
        }

      }, 800);
    }
  }, [goalPath]);

  const toggleMilestone = (milestoneId) => {
    setExpandedMilestones(prev => ({
      ...prev,
      [milestoneId]: !prev[milestoneId]
    }));
  };

  const toggleSkill = (skillId) => {
    setExpandedSkills(prev => ({
      ...prev,
      [skillId]: !prev[skillId]
    }));
  };

  const handleChangeGoal = () => {
    setGoalPath(null);
    setError(null);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-50 text-green-700 border-green-200';
      case 'in_progress': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'locked': return 'bg-gray-50 text-gray-500 border-gray-200';
      default: return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'in_progress': return <Circle className="w-5 h-5 text-blue-500 fill-blue-100" />;
      case 'locked': return <Lock className="w-5 h-5 text-gray-400" />;
      default: return <Circle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      technical: 'bg-purple-100 text-purple-600',
      business: 'bg-blue-100 text-blue-600',
      soft: 'bg-green-100 text-green-600',
      leadership: 'bg-indigo-100 text-indigo-600',
      domain: 'bg-teal-100 text-teal-600'
    };
    return colors[category] || 'bg-gray-100 text-gray-600';
  };

  // Create Goal Form
  if (!goalPath && !loads) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 px-4 sm:px-6 mt-16">
      {/* Width controller */}
      <div className="relative w-full sm:max-w-3xl sm:mx-auto pt-12">

        {/* OUTWARD GLOW — visual only */}
        <span
          className="
            pointer-events-none
            absolute inset-y-20 -inset-x-2
            bg-gradient-to-t from-green-400/40 via-blue-500/35 to-purple-500/40
            blur-3xl opacity-0
            transition-opacity duration-500
            opacity-70
            w-full
          "
        />

        {/* GRADIENT BORDER */}
        <div
          className="
            relative rounded-3xl
            bg-gradient-to-t
            from-green-400/50
            via-blue-500/40
            to-purple-500/50
            ps-[2px]
            pe-[1.5px]
            
          "
        >
        <div className="bg-white/70 rounded-3xl w-full">
          <div className="bg-white rounded-3xl shadow-xl p-6 sm:p-10 border border-gray-100">
            <div className="text-center mb-8 sm:mb-10">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-gray-500 via-gray-800 to-gray-700 mb-6 shadow-lg"
              >
                <Rocket className="w-10 h-10 text-white" />
              </motion.div>
              
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3"
              >
                Ready to{" "}
                <span className="bg-gradient-to-r from-green-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">
                  Transform Your Career
                </span>
                ?
              </motion.h1>

              
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="text-base sm:text-lg text-gray-600 max-w-xl mx-auto"
              >
                {error && error !== 'No goal path found' 
                  ? error
                  : "Tell us your dream role, and we'll craft a personalized roadmap to get you there!"}
              </motion.p>
            </div>
            
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="space-y-6"
            >
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  What's your career goal?
                </label>
                <input
                  type="text"
                  value={goalInput}
                  onChange={(e) => setGoalInput(e.target.value)}
                  placeholder="e.g., Software Developer, Data Scientist, Product Manager"
                  className="w-full px-5 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-base placeholder:text-gray-400 bg-white"
                />
              </div>
              
              <button
                onClick={createGoalPathData}
                disabled={creatingGoal || !goalInput.trim()}
                className="w-full bg-gradient-to-r from-green-500 via-blue-500 to-purple-500 text-white py-4 rounded-xl font-semibold text-lg hover:shadow-lg hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center transition-all duration-300"
              >
                {creatingGoal ? (
                  <>
                    <Loader2 className="w-6 h-6 mr-2 animate-spin" />
                    Creating Your Personalized Path...
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5 mr-2" />
                    Create My Learning Path
                  </>
                )}
              </button>

              <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 pt-4 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-green-500" />
                  <span>Personalized</span>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-blue-500" />
                  <span>AI-Powered</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-purple-500" />
                  <span>Track Progress</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
        </div>
        </div>
      </div>
    );
  }

  if (loads) {
    return (
      <div className="min-h-screen flex items-center justify-center mt-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          {/* Spinner */}
          <div className="mx-auto mb-4 h-12 w-12 rounded-full border-1 border-b-2 border-blue-500 animate-spin" />

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-gray-600 font-medium"
          >
            Loading your journey...
          </motion.p>
        </motion.div>
      </div>

    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 p-4 sm:p-6 lg:p-8 mt-16">
      <span
        className="
      relative flex flex-col
      mx-0
      min-h-screen
      min-[1330px]:w-full
      min-[1330px]:max-w-7xl
      min-[1330px]:mx-auto
    "
      >

        {/* OUTWARD GLOW — left & right only (>= 1330px) */}
        <span
          className="
       animated-glow
        pointer-events-none
        absolute inset-y-9 -inset-x-15
        bg-gradient-to-t from-green-400/40 via-blue-500/35 to-purple-500/40
        blur-3xl opacity-0
        transition-opacity duration-500 ease-out
        min-[1330px]:opacity-70
        w-full
      "
        />

        {/* GRADIENT BORDER — left & right only (>= 1330px) */}
        <span
          className="
        relative flex flex-1 flex-col w-full min-h-screen
        animated-glow
        min-[1330px]:bg-gradient-to-t
        min-[1330px]:from-green-400/50
        min-[1330px]:via-blue-500/40
        min-[1330px]:to-purple-500/50
        min-[1330px]:pr-[1px]
        min-[1330px]:pl-[2px]
        transition-all duration-500 ease-out rounded-3xl
      "
        >

      
      <div className="bg-white/90 border rounded-3xl max-w-7xl p-3 mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 mb-6 border border-gray-100"
        >
          <div className="flex flex-col lg:flex-row items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-gradient-to-tl from-gray-700 via-gray-900 rounded-xl shadow-md">
                  <Target className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">
                  {goalPath.goal.interpreted}
                </h1>
              </div>
              <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
                {goalPath.goal.description}
              </p>
            </div>
            <div className="flex gap-2 w-full lg:w-auto">
              
              <button
                onClick={handleChangeGoal}
                className="flex-1 lg:flex-none px-4 py-2 text-sm font-medium bg-blue-50 border-2 border-blue-200 text-blue-600 rounded-xl hover:bg-blue-100 hover:border-blue-300 transition-all duration-200"
              >
                Change in Goal?
              </button>
            </div>
          </div>
        </motion.div>

        {/* Progress Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-white rounded-xl shadow-md p-4 sm:p-6 border-l-4 border-green-400 hover:shadow-lg transition-all duration-300"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs sm:text-sm text-gray-600 font-medium">Overall Progress</div>
              <Trophy className="w-5 h-5 text-green-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-green-600 to-green-400 bg-clip-text text-transparent">
              {goalPath.progress_summary.overall_progress}%
            </div>
            <div className="mt-3 bg-gray-100 rounded-full h-2 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${goalPath.progress_summary.overall_progress}%` }}
                transition={{ duration: 1, delay: 0.5 }}
                className="bg-gradient-to-r from-green-400 to-green-500 h-full"
              />
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="bg-white rounded-xl shadow-md p-4 sm:p-6 border-l-4 border-blue-500 hover:shadow-lg transition-all duration-300"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs sm:text-sm text-gray-600 font-medium">Milestones</div>
              <Target className="w-5 h-5 text-blue-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-gray-900">
              {goalPath.progress_summary.major_milestones.completed}<span className="text-gray-400">/{goalPath.progress_summary.major_milestones.total}</span>
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="bg-white rounded-xl shadow-md p-4 sm:p-6 border-l-4 border-purple-500 hover:shadow-lg transition-all duration-300"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs sm:text-sm text-gray-600 font-medium">Skills</div>
              <BookOpen className="w-5 h-5 text-purple-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-gray-900">
              {goalPath.progress_summary.minor_milestones.completed}<span className="text-gray-400">/{goalPath.progress_summary.minor_milestones.total}</span>
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="bg-white rounded-xl shadow-md p-4 sm:p-6 border-l-4 border-green-500 hover:shadow-lg transition-all duration-300"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs sm:text-sm text-gray-600 font-medium">Topics</div>
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-gray-900">
              {goalPath.progress_summary.topics.completed}<span className="text-gray-400">/{goalPath.progress_summary.topics.total}</span>
            </div>
          </motion.div>
        </div>

        {/* Learning Path */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden mb-6"
        >
          <div className="bg-gradient-to-r from-green-50 via-blue-50 to-purple-50 px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-500" />
              Your Learning Path
            </h2>
          </div>

          <div className="p-4 sm:p-6">
            <div className="space-y-4">
              {goalPath.milestones.map((milestone, idx) => {
                const isFirstIncompleteMilestone = expandedMilestones[milestone.id];
                
                return (
                  <motion.div
                    key={milestone.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.7 + idx * 0.1 }}
                    className={`border-2 rounded-xl overflow-hidden transition-all duration-300 hover:shadow-md ${getStatusColor(milestone.status)}`}
                  >
                    {/* Milestone Header */}
                    <button
                      onClick={() => toggleMilestone(milestone.id)}
                      className="w-full p-4 sm:p-5 flex items-center justify-between hover:bg-opacity-70 transition-all duration-200"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="flex-shrink-0">
                          {getStatusIcon(milestone.status)}
                        </div>
                        <div className="text-left flex-1 min-w-0">
                          <div className="font-bold text-base sm:text-lg mb-1">
                            {idx + 1}. {milestone.title}
                          </div>
                          <div className="text-xs sm:text-sm opacity-80 line-clamp-2">
                            {milestone.description}
                          </div>
                        </div>
                      </div>
                      <div className="flex-shrink-0 ml-2">
                        {expandedMilestones[milestone.id] ? (
                          <ChevronDown className="w-5 h-5 transition-transform duration-200" />
                        ) : (
                          <ChevronRight className="w-5 h-5 transition-transform duration-200" />
                        )}
                      </div>
                    </button>

                    {/* Milestone Content */}
                    <AnimatePresence initial={false}>
                    {milestone.status !== 'locked' && expandedMilestones[milestone.id] && (
                      <div className="border-t border-current border-opacity-20 bg-white overflow-hidden transition-all duration-300">
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3, ease: 'easeInOut' }}
                          className="p-4"
                        >
                        <div className="space-y-3">
                          {milestone.minor_milestones.map((skill, skillIdx) => {
                            const skillId = `${milestone.id}-${skillIdx}`;
                            const isFirstIncompleteSkill = 
                              isFirstIncompleteMilestone && 
                              skill.status !== 'completed' && 
                              !firstIncompleteSkillRef.current;
                              
                            
                            return (
                              <div
                                key={skillIdx}
                                ref={isFirstIncompleteSkill ? firstIncompleteSkillRef : null}
                                className="border-2 border-gray-200 rounded-xl overflow-hidden hover:border-gray-300 transition-all duration-200"
                              >
                                {/* Skill Header */}
                                <button
                                  onClick={() => toggleSkill(skillId)}
                                  className="w-full p-3 sm:p-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-all duration-200"
                                >
                                  <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className="flex-shrink-0">
                                      {getStatusIcon(skill.status)}
                                    </div>
                                    <div className="text-left flex-1 min-w-0">
                                      <div className="font-semibold text-sm sm:text-base mb-2">
                                        {skill.skill}
                                      </div>
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${getCategoryColor(skill.category)}`}>
                                          {skill.category}
                                        </span>
                                        <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
                                          {skill.completion_percentage}% complete
                                        </span>
                                        <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
                                          {skill.topics_completed}/{skill.topics_required} topics
                                        </span>
                                        {skill.importance === 'critical' && (
                                          <span className="text-xs px-2 py-1 bg-red-100 text-red-600 rounded-full">
                                            Critical
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex-shrink-0 ml-2">
                                    {expandedSkills[skillId] ? (
                                      <ChevronDown className="w-4 h-4 transition-transform duration-200" />
                                    ) : (
                                      <ChevronRight className="w-4 h-4 transition-transform duration-200" />
                                    )}
                                  </div>
                                </button>

                                {/* Topics List */}
                                <AnimatePresence initial={false}>
                                  {expandedSkills[skillId] && (
                                    <motion.div
                                      key="topics"
                                      initial={{ opacity: 0, height: 0 }}
                                      animate={{ opacity: 1, height: 'auto' }}
                                      exit={{ opacity: 0, height: 0 }}
                                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                                      className="overflow-hidden"
                                    >
                                    <div className="p-3 sm:p-4 bg-white">
                                    <div className="space-y-2">
                                      {skill.topics.map((topic, topicIdx) => {
                                        return (
                                          <div
                                            key={topicIdx}
                                            className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-all duration-200 border border-transparent hover:border-gray-200"
                                          >
                                            <div className="flex-shrink-0 mt-0.5">
                                              {topic.status === 'completed' ? (
                                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                                              ) : topic.status === 'in_progress' ? (
                                                <Circle className="w-5 h-5 text-blue-500 fill-blue-100" />
                                              ) : (
                                                <Circle className="w-5 h-5 text-gray-400" />
                                              )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                              <div className="font-medium text-sm mb-1">
                                                {topic.topic}
                                              </div>
                                              {topic.user_topic_mapped && (
                                                <div className="text-xs text-gray-500 bg-gray-100 rounded px-2 py-1 inline-block mb-1">
                                                  Mapped to: {topic.user_topic_mapped} ({(topic.similarity_score * 100).toFixed(0)}% match)
                                                </div>
                                              )}
                                              {topic.attempts > 0 && (
                                                <div className="text-xs text-gray-600">
                                                  <span className="font-medium">Accuracy:</span> {topic.weighted_accuracy}% · {topic.attempts} attempts
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                      </div>
                                    </div>
                                  </motion.div>
                                )}
                                </AnimatePresence>
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                      </div>
                    )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* Legend Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden mb-8"
        >
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Info className="w-5 h-5 text-blue-500" />
              How Progress Works
            </h2>
          </div>

          <div className="p-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Status Icons Legend */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Target className="w-4 h-4 text-blue-500" />
                  Status Indicators
                </h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-medium text-md text-gray-900">Completed</div>
                      <div className="text-sm text-gray-600">You've successfully mastered this item</div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <Circle className="w-5 h-5 text-blue-500 fill-blue-100 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-medium text-md text-gray-900">In Progress</div>
                      <div className="text-sm text-gray-600">Currently working on this item</div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <Circle className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-medium text-md text-gray-900">Not Started</div>
                      <div className="text-sm text-gray-600">Ready to begin when you are</div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <Lock className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-medium text-md text-gray-900">Locked</div>
                      <div className="text-sm text-gray-600">Complete previous milestone to unlock</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Completion Rules */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-green-500" />
                  Completion Requirements
                </h3>
                <div className="space-y-4">
                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <div className="font-medium text-md text-green-900 mb-2">Topic Completion</div>
                    <div className="text-sm text-green-700 space-y-1">
                      <div>• Achieve <strong>≥80% weighted accuracy</strong></div>
                      <div>• Complete <strong>≥3 attempts</strong></div>
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <div className="font-medium text-md text-blue-900 mb-2">Minor Milestone (Skill) Completion</div>
                    <div className="text-sm text-blue-700">
                      Complete <strong>all required topics</strong> within the skill
                    </div>
                  </div>
                  
                  <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                    <div className="font-medium text-md text-purple-900 mb-2">Major Milestone Completion</div>
                    <div className="text-sm text-purple-700">
                      Complete <strong>all minor milestones (skills)</strong> within the milestone
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Info */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium text-md text-gray-900 mb-1">Pro Tip</div>
                    <div className="text-sm text-gray-700">
                      Your weighted accuracy improves with consistent practice. Focus on understanding concepts deeply rather than rushing through topics. The system automatically tracks your progress and unlocks new content as you complete requirements.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
        </div>
      </span>
      </span>
    </div>
  );
};

export default GoalPathDashboard;