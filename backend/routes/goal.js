// routes/goal.js - Enhanced Version
const express = require('express');
const router = express.Router();
const axios = require('axios');
const GoalPath = require('../models/GoalPath');
const Progress = require('../models/Progress');

const PYTHON_SERVICE_URL = process.env.FLASK_SERVICE_URL || 'http://localhost:5000';

// Helper function to sanitize learning path data before saving to MongoDB
function sanitizeLearningPath(learningPath) {
  // Deep clone to avoid modifying original
  const sanitized = JSON.parse(JSON.stringify(learningPath));
  
  // Ensure topic_classification exists with all required fields
  if (!sanitized.topic_classification) {
    sanitized.topic_classification = {
      mastered: [],
      strong: [],
      improving: [],
      challenging: [],
      needs_review: [],
      unclassified: []
    };
  }
  
  // Sanitize milestones
  if (sanitized.milestones && Array.isArray(sanitized.milestones)) {
    sanitized.milestones.forEach((milestone, idx) => {
      // Ensure required fields
      milestone.id = milestone.id || `milestone_${idx + 1}`;
      milestone.order = milestone.order || idx + 1;
      milestone.title = milestone.title || `Milestone ${idx + 1}`;
      milestone.description = milestone.description || '';
      milestone.status = milestone.status || 'not_started';
      
      // Sanitize minor milestones
      if (milestone.minor_milestones && Array.isArray(milestone.minor_milestones)) {
        milestone.minor_milestones.forEach(minor => {
          // Normalize category - remove spaces, convert to lowercase
          if (minor.category) {
            minor.category = minor.category.toLowerCase().replace(/\s+/g, '_');
          } else {
            minor.category = 'technical';
          }
          
          // Ensure importance is valid
          const validImportance = ['critical', 'important', 'beneficial'];
          if (!validImportance.includes(minor.importance)) {
            minor.importance = 'important';
          }
          
          // Ensure topics_required exists
          if (!minor.topics_required && minor.topics) {
            minor.topics_required = minor.topics.length;
          }
          
          // Ensure numeric fields have defaults
          minor.overall_accuracy = minor.overall_accuracy || 0;
          minor.total_attempts = minor.total_attempts || 0;
          minor.topics_matched = minor.topics_matched || 0;
          minor.topics_completed = minor.topics_completed || 0;
          minor.completion_percentage = minor.completion_percentage || 0;
          
          // Sanitize topics array
          if (minor.topics && Array.isArray(minor.topics)) {
            minor.topics.forEach(topic => {
              topic.status = topic.status || 'not_started';
              topic.user_topic_mapped = topic.user_topic_mapped || null;
              topic.similarity_score = topic.similarity_score || 0;
              topic.accuracy = topic.accuracy || 0;
              topic.weighted_accuracy = topic.weighted_accuracy || 0;
              topic.attempts = topic.attempts || 0;
              topic.last_attempted = topic.last_attempted || null;
            });
          } else {
            minor.topics = [];
          }
          
          // Ensure completion_criteria exists
          if (!minor.completion_criteria) {
            minor.completion_criteria = {
              required: 'Complete 80% of topics with ≥80% weighted accuracy and ≥3 attempts each',
              target_accuracy: 80,
              min_attempts_per_topic: 3
            };
          }
        });
      } else {
        milestone.minor_milestones = [];
      }
    });
  }
  
  // Sanitize recommendations
  if (sanitized.recommendations && Array.isArray(sanitized.recommendations)) {
    sanitized.recommendations.forEach(rec => {
      rec.skill = rec.skill || null;
      rec.suggested_action = rec.suggested_action || null;
      rec.details = rec.details || [];
      rec.required_topics = rec.required_topics || [];
      rec.remaining_topics = rec.remaining_topics || [];
      
      // Ensure priority is valid
      const validPriority = ['low', 'medium', 'high', 'info'];
      if (!validPriority.includes(rec.priority)) {
        rec.priority = 'medium';
      }
    });
  }
  
  // Ensure progress_summary exists
  if (!sanitized.progress_summary) {
    sanitized.progress_summary = {
      major_milestones: { total: 0, completed: 0, in_progress: 0, percentage: 0 },
      minor_milestones: { total: 0, completed: 0, in_progress: 0, percentage: 0 },
      topics: { total: 0, completed: 0, percentage: 0 },
      overall_progress: 0
    };
  }
  
  // Ensure visualization exists
  if (!sanitized.visualization) {
    sanitized.visualization = {
      nodes: [],
      path_type: 'curved_dotted',
      layout: 'hierarchical'
    };
  }
  
  return sanitized;
}

// Create or update learning path
// Create or update learning path
router.post('/create', async (req, res) => {
  try {
    const { userId, goal, startingPosition, updateOnly = false } = req.body;
    
    if (!userId || !goal) {
      return res.status(400).json({ error: 'userId and goal are required' });
    }
    
    console.log(`[GOAL_ROUTES] ${updateOnly ? 'Updating' : 'Creating'} goal path for user: ${userId}, goal: ${goal}`);
    
    // Get user's performance data
    const progress = await Progress.findOne({ userId });
    
    if (!progress) {
      return res.status(404).json({ 
        error: 'User progress not found. Please take some quizzes first.' 
      });
    }
    
    // Check if user has existing goal path
    let existingGoalPath = null;
    if (updateOnly) {
      existingGoalPath = await GoalPath.findOne({ userId, is_active: true });
      
      if (!existingGoalPath) {
        return res.status(404).json({
          error: 'No existing goal path found for update. Please create one first.'
        });
      }
      
      console.log(`[GOAL_ROUTES] Found existing path, will update milestones only`);
    }
    
    const performanceData = {
      overallAccuracy: progress.overallAccuracy,
      totalQuizzesTaken: progress.totalQuizzesTaken,
      totalQuestionsSeen: progress.totalQuestionsSeen,
      topicProgress: Object.fromEntries(progress.topicProgress),
      strongTopics: progress.strongTopics,
      weakTopics: progress.weakTopics,
      masteredTopics: progress.masteredTopics || [],
      challengingTopics: progress.challengingTopics || [],
      improvingTopics: progress.improvingTopics || []
    };
    
    // Prepare request payload
    const requestPayload = {
      goal: goal,
      performance_data: performanceData,
      update_only: updateOnly
    };
    
    // Add existing path if updating only
    if (updateOnly && existingGoalPath) {
      requestPayload.existing_path = {
        goal: existingGoalPath.goal,
        starting_position: existingGoalPath.starting_position,
        milestones: existingGoalPath.milestones,
        recommendations: existingGoalPath.recommendations,
        topic_classification: existingGoalPath.topic_classification,
        progress_summary: existingGoalPath.progress_summary,
        visualization: existingGoalPath.visualization
      };
    } else {
      requestPayload.starting_position = startingPosition || null;
    }
    
    console.log(`[GOAL_ROUTES] Calling Python service...`);
    
    // Call Python service
    const response = await axios.post(`${PYTHON_SERVICE_URL}/generate`, requestPayload);
    
    console.log(`[GOAL_ROUTES] Python service responded successfully`);
    
    const learningPath = response.data.learning_path;
    const wasUpdateOnly = response.data.was_update_only;
    
    // Sanitize learning path data
    const sanitizedPath = sanitizeLearningPath(learningPath);
    
    console.log(`[GOAL_ROUTES] Learning path sanitized, ${wasUpdateOnly ? 'updating' : 'saving'} to MongoDB...`);
    
    let goalPath = await GoalPath.findOne({ userId });
    
    if (goalPath) {
      console.log(`[GOAL_ROUTES] Updating existing goal path`);
      
      if (wasUpdateOnly) {
        // Only update milestone-related fields
        goalPath.milestones = sanitizedPath.milestones;
        goalPath.recommendations = sanitizedPath.recommendations;
        goalPath.topic_classification = sanitizedPath.topic_classification;
        goalPath.progress_summary = sanitizedPath.progress_summary;
        goalPath.last_updated = new Date();
      } else {
        // Full update (regeneration)
        goalPath.goal = sanitizedPath.goal;
        goalPath.starting_position = sanitizedPath.starting_position;
        goalPath.milestones = sanitizedPath.milestones;
        goalPath.recommendations = sanitizedPath.recommendations;
        goalPath.topic_classification = sanitizedPath.topic_classification;
        goalPath.progress_summary = sanitizedPath.progress_summary;
        goalPath.visualization = sanitizedPath.visualization;
        goalPath.is_active = true;
        goalPath.last_updated = new Date();
      }
    } else {
      if (wasUpdateOnly) {
        return res.status(404).json({
          error: 'Cannot update non-existent path. Please create one first.'
        });
      }
      
      console.log(`[GOAL_ROUTES] Creating new goal path`);
      goalPath = new GoalPath({
        userId,
        goal: sanitizedPath.goal,
        starting_position: sanitizedPath.starting_position,
        milestones: sanitizedPath.milestones,
        recommendations: sanitizedPath.recommendations,
        topic_classification: sanitizedPath.topic_classification,
        progress_summary: sanitizedPath.progress_summary,
        visualization: sanitizedPath.visualization,
        is_active: true
      });
    }
    
    await goalPath.save();
    
    console.log(`[GOAL_ROUTES] Goal path ${wasUpdateOnly ? 'updated' : 'saved'} successfully`);
    
    res.json({
      success: true,
      goalPath,
      was_update_only: wasUpdateOnly
    });
    
  } catch (error) {
    console.error('[GOAL_ROUTES] Error creating/updating goal path:', error.response?.data || error.message);
    console.error('[GOAL_ROUTES] Stack trace:', error.stack);
    
    res.status(500).json({ 
      error: error.response?.data?.error || error.message,
      details: error.response?.data || null
    });
  }
});

// Get user's learning path
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const goalPath = await GoalPath.findOne({ userId, is_active: true });
    
    if (!goalPath) {
      return res.status(404).json({ 
        error: 'No active learning path found. Create one first.' 
      });
    }
    
    res.json({
      success: true,
      goalPath
    });
    
  } catch (error) {
    console.error('[GOAL_ROUTES] Error fetching goal path:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update milestone progress after quiz
router.post('/update-progress', async (req, res) => {
  try {
    const { userId, topic, quizResult } = req.body;
    
    if (!userId || !topic || !quizResult) {
      return res.status(400).json({ 
        error: 'userId, topic, and quizResult are required' 
      });
    }
    
    console.log(`[GOAL_ROUTES] Updating progress for user: ${userId}, topic: ${topic}`);
    
    const goalPath = await GoalPath.findOne({ userId, is_active: true });
    
    if (!goalPath) {
      return res.json({ 
        success: false, 
        message: 'No active learning path to update' 
      });
    }
    
    // Update milestone in MongoDB
    await goalPath.updateMilestoneProgress(topic, quizResult);
    
    console.log(`[GOAL_ROUTES] Progress updated successfully`);
    
    res.json({
      success: true,
      goalPath,
      message: 'Milestone progress updated'
    });
    
  } catch (error) {
    console.error('[GOAL_ROUTES] Error updating milestone progress:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get personalized recommendations
router.get('/:userId/recommendations', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const goalPath = await GoalPath.findOne({ userId, is_active: true });
    
    if (!goalPath) {
      return res.status(404).json({ 
        error: 'No active learning path found' 
      });
    }
    
    // Get recommendations from current state
    const recommendations = goalPath.recommendations;
    
    res.json({
      success: true,
      recommendations,
      topic_classification: goalPath.topic_classification
    });
    
  } catch (error) {
    console.error('[GOAL_ROUTES] Error fetching recommendations:', error);
    res.status(500).json({ error: error.message });
  }
});

// Regenerate recommendations with fresh data
router.post('/:userId/regenerate-recommendations', async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log(`[GOAL_ROUTES] Regenerating recommendations for user: ${userId}`);
    
    const goalPath = await GoalPath.findOne({ userId, is_active: true });
    const progress = await Progress.findOne({ userId });
    
    if (!goalPath || !progress) {
      return res.status(404).json({ 
        error: 'Goal path or progress not found' 
      });
    }
    
    // Call Python service for fresh recommendations
    const response = await axios.post(`${PYTHON_SERVICE_URL}/generate`, {
      goal: goalPath.goal.original,
      starting_position: goalPath.starting_position.level,
      performance_data: {
        overallAccuracy: progress.overallAccuracy,
        totalQuizzesTaken: progress.totalQuizzesTaken,
        totalQuestionsSeen: progress.totalQuestionsSeen,
        topicProgress: Object.fromEntries(progress.topicProgress),
        strongTopics: progress.strongTopics,
        weakTopics: progress.weakTopics,
        masteredTopics: progress.masteredTopics || [],
        challengingTopics: progress.challengingTopics || [],
        improvingTopics: progress.improvingTopics || []
      }
    });
    
    const updatedPath = response.data.learning_path;
    const sanitizedPath = sanitizeLearningPath(updatedPath);
    
    // Update recommendations, topic classification, and milestones
    goalPath.recommendations = sanitizedPath.recommendations;
    goalPath.topic_classification = sanitizedPath.topic_classification;
    goalPath.milestones = sanitizedPath.milestones;
    goalPath.progress_summary = sanitizedPath.progress_summary;
    goalPath.last_updated = new Date();
    
    await goalPath.save();
    
    console.log(`[GOAL_ROUTES] Recommendations regenerated successfully`);
    
    res.json({
      success: true,
      goalPath,
      message: 'Recommendations regenerated'
    });
    
  } catch (error) {
    console.error('[GOAL_ROUTES] Error regenerating recommendations:', error.response?.data || error.message);
    res.status(500).json({ error: error.message });
  }
});

// Delete/deactivate goal path
router.delete('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const goalPath = await GoalPath.findOne({ userId, is_active: true });
    
    if (!goalPath) {
      return res.status(404).json({ error: 'No active goal path found' });
    }
    
    goalPath.is_active = false;
    await goalPath.save();
    
    res.json({
      success: true,
      message: 'Goal path deactivated'
    });
    
  } catch (error) {
    console.error('[GOAL_ROUTES] Error deleting goal path:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get milestone details
router.get('/:userId/milestone/:milestoneId', async (req, res) => {
  try {
    const { userId, milestoneId } = req.params;
    
    const goalPath = await GoalPath.findOne({ userId, is_active: true });
    
    if (!goalPath) {
      return res.status(404).json({ error: 'Goal path not found' });
    }
    
    const milestone = goalPath.milestones.find(m => m.id === milestoneId);
    
    if (!milestone) {
      return res.status(404).json({ error: 'Milestone not found' });
    }
    
    res.json({
      success: true,
      milestone
    });
    
  } catch (error) {
    console.error('[GOAL_ROUTES] Error fetching milestone:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get progress summary
router.get('/:userId/progress-summary', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const goalPath = await GoalPath.findOne({ userId, is_active: true });
    
    if (!goalPath) {
      return res.status(404).json({ error: 'Goal path not found' });
    }
    
    res.json({
      success: true,
      progress_summary: goalPath.progress_summary,
      goal: goalPath.goal.interpreted,
      starting_position: goalPath.starting_position.level,
      topic_classification: goalPath.topic_classification
    });
    
  } catch (error) {
    console.error('[GOAL_ROUTES] Error fetching progress summary:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get incomplete topics
router.get('/:userId/incomplete-topics', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const goalPath = await GoalPath.findOne({ userId, is_active: true });
    
    if (!goalPath) {
      return res.status(404).json({ error: 'Goal path not found' });
    }
    
    const incompleteTopics = goalPath.getIncompleteTopics();
    
    res.json({
      success: true,
      incomplete_topics: incompleteTopics,
      total: incompleteTopics.length
    });
    
  } catch (error) {
    console.error('[GOAL_ROUTES] Error fetching incomplete topics:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get next topics to practice
router.get('/:userId/next-topics', async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 5;
    
    const goalPath = await GoalPath.findOne({ userId, is_active: true });
    
    if (!goalPath) {
      return res.status(404).json({ error: 'Goal path not found' });
    }
    
    const nextTopics = goalPath.getNextTopicsToPractice(limit);
    
    res.json({
      success: true,
      next_topics: nextTopics
    });
    
  } catch (error) {
    console.error('[GOAL_ROUTES] Error fetching next topics:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get classification guide
router.get('/classification-guide', async (req, res) => {
  try {
    const guide = {
      mastered: {
        icon: '🏆',
        label: 'Mastered',
        criteria: '≥80% weighted accuracy, 5+ attempts, with Medium/Hard quizzes',
        description: 'Topics you\'ve fully mastered with challenging problems',
        color: '#4CAF50'
      },
      strong: {
        icon: '💪',
        label: 'Strong',
        criteria: '≥70% weighted accuracy',
        description: 'Solid understanding, keep practicing',
        color: '#2196F3'
      },
      improving: {
        icon: '📈',
        label: 'Improving',
        criteria: 'Raw accuracy 50-70% with clear positive recent trend',
        description: 'You\'re making progress! Keep going!',
        color: '#FF9800'
      },
      challenging: {
        icon: '🎯',
        label: 'Challenging',
        criteria: 'Weighted accuracy <50% on Medium/Hard attempts',
        description: 'These topics need focused attention',
        color: '#F44336'
      },
      needs_review: {
        icon: '📚',
        label: 'Needs Review',
        criteria: 'Raw accuracy <60%',
        description: 'Fundamentals need reinforcement',
        color: '#9C27B0'
      },
      unclassified: {
        icon: '⚪',
        label: 'Unclassified',
        criteria: '3+ attempts but doesn\'t fit clear criteria',
        description: 'Needs more practice for clear classification',
        color: '#9E9E9E'
      }
    };
    
    res.json({
      success: true,
      classification_guide: guide
    });
    
  } catch (error) {
    console.error('[GOAL_ROUTES] Error fetching classification guide:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;