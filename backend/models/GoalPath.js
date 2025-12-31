// models/GoalPath.js - Enhanced Version with Flexible Categories

const mongoose = require('mongoose');

// Topic detail schema - specific topics within each skill
const topicDetailSchema = new mongoose.Schema({
  topic: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['not_started', 'in_progress', 'completed'],
    default: 'not_started'
  },
  user_topic_mapped: {
    type: String,
    default: null,
    trim: true
  },
  similarity_score: {
    type: Number,
    default: 0,
    min: 0,
    max: 1
  },
  accuracy: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  weighted_accuracy: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  attempts: {
    type: Number,
    default: 0,
    min: 0
  },
  last_attempted: {
    type: Date,
    default: null
  }
}, { _id: false });

// Minor milestone schema - skills with specific topics
const minorMilestoneSchema = new mongoose.Schema({
  skill: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['not_started', 'in_progress', 'completed'],
    default: 'not_started'
  },
  importance: {
    type: String,
    enum: ['critical', 'important', 'beneficial'],
    default: 'important'
  },
  category: {
    type: String,
    default: 'technical'
    // Removed enum to allow flexible categories from AI
  },
  overall_accuracy: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  total_attempts: {
    type: Number,
    default: 0,
    min: 0
  },
  topics_required: {
    type: Number,
    required: true,
    min: 0
  },
  topics_matched: {
    type: Number,
    default: 0,
    min: 0
  },
  topics_completed: {
    type: Number,
    default: 0,
    min: 0
  },
  completion_percentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  topics: [topicDetailSchema],
  completion_criteria: {
    required: {
      type: String,
      default: 'Complete 80% of topics with ≥80% weighted accuracy and ≥3 attempts each'
    },
    target_accuracy: {
      type: Number,
      default: 80
    },
    min_attempts_per_topic: {
      type: Number,
      default: 3
    }
  }
}, { _id: false });

// Major milestone schema
const majorMilestoneSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  order: {
    type: Number,
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['not_started', 'in_progress', 'completed', 'locked'],
    default: 'not_started'
  },
  minor_milestones: [minorMilestoneSchema]
}, { _id: false });

// Recommendation schema with enhanced types
const recommendationSchema = new mongoose.Schema({
  skill: {
    type: String,
    default: null
  },
  type: {
    type: String,
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'info'],
    default: 'medium'
  },
  message: {
    type: String,
    required: true
  },
  suggested_action: {
    type: String,
    default: null
  },
  details: [{
    type: String
  }],
  required_topics: [{
    type: String
  }],
  remaining_topics: [{
    type: String
  }]
}, { _id: false });

// Topic classification schema
const topicClassificationSchema = new mongoose.Schema({
  mastered: [{
    topic: String,
    weighted_accuracy: Number,
    attempts: Number,
    icon: { type: String, default: '🏆' }
  }],
  strong: [{
    topic: String,
    weighted_accuracy: Number,
    attempts: Number,
    icon: { type: String, default: '💪' }
  }],
  improving: [{
    topic: String,
    accuracy: Number,
    trend: String,
    attempts: Number,
    icon: { type: String, default: '📈' }
  }],
  challenging: [{
    topic: String,
    weighted_accuracy: Number,
    attempts: Number,
    icon: { type: String, default: '🎯' }
  }],
  needs_review: [{
    topic: String,
    accuracy: Number,
    attempts: Number,
    icon: { type: String, default: '📚' }
  }],
  unclassified: [{
    topic: String,
    accuracy: Number,
    weighted_accuracy: Number,
    attempts: Number,
    note: String,
    icon: { type: String, default: '⚪' }
  }]
}, { _id: false });

// Main GoalPath schema
const goalPathSchema = new mongoose.Schema({
  userId: {
    type: String,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  goal: {
    original: {
      type: String,
      required: true,
      trim: true
    },
    interpreted: {
      type: String,
      required: true,
      trim: true
    },
    domains: [{
      type: String,
      trim: true
    }],
    description: {
      type: String,
      default: ''
    },
    created_at: {
      type: Date,
      default: Date.now
    }
  },
  starting_position: {
    level: {
      type: String,
      enum: ['Complete Beginner', 'Beginner', 'Intermediate', 'Advanced'],
      default: 'Beginner'
    },
    explicit: {
      type: Boolean,
      default: false
    },
    inferred_from: {
      type: String,
      enum: ['user_input', 'performance_data'],
      default: 'performance_data'
    }
  },
  milestones: [majorMilestoneSchema],
  recommendations: [recommendationSchema],
  topic_classification: {
    type: topicClassificationSchema,
    default: () => ({
      mastered: [],
      strong: [],
      improving: [],
      challenging: [],
      needs_review: [],
      unclassified: []
    })
  },
  progress_summary: {
    major_milestones: {
      total: { type: Number, default: 0 },
      completed: { type: Number, default: 0 },
      in_progress: { type: Number, default: 0 },
      percentage: { type: Number, default: 0 }
    },
    minor_milestones: {
      total: { type: Number, default: 0 },
      completed: { type: Number, default: 0 },
      in_progress: { type: Number, default: 0 },
      percentage: { type: Number, default: 0 }
    },
    topics: {
      total: { type: Number, default: 0 },
      completed: { type: Number, default: 0 },
      percentage: { type: Number, default: 0 }
    },
    overall_progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    }
  },
  visualization: {
    nodes: [{
      id: String,
      type: {
        type: String,
        enum: ['start', 'major', 'minor', 'goal']
      },
      label: String,
      status: String,
      position: Number,
      parent: String,
      completion: Number
    }],
    path_type: {
      type: String,
      default: 'curved_dotted'
    },
    layout: {
      type: String,
      default: 'hierarchical'
    }
  },
  is_active: {
    type: Boolean,
    default: true
  },
  last_updated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'goalpaths'
});

// Method to update milestone when user completes quiz
goalPathSchema.methods.updateMilestoneProgress = function(topic, quizResult) {
  const { accuracy, weightedAccuracy, difficulty } = quizResult;
  
  let updated = false;
  
  // Find matching topics in milestones
  for (let milestone of this.milestones) {
    for (let minor of milestone.minor_milestones) {
      for (let topicDetail of minor.topics) {
        // Check if quiz topic matches required topic
        if (this._topicsMatch(topic, topicDetail.topic)) {
          // Update topic details
          topicDetail.user_topic_mapped = topic;
          topicDetail.accuracy = Math.round(accuracy * 10) / 10;
          topicDetail.weighted_accuracy = Math.round((weightedAccuracy || accuracy) * 10) / 10;
          topicDetail.attempts += 1;
          topicDetail.last_attempted = new Date();
          
          // Update status based on criteria
          if (topicDetail.weighted_accuracy >= 80 && 
              topicDetail.attempts >= 3 &&
              (difficulty === 'Medium' || difficulty === 'Hard')) {
            topicDetail.status = 'completed';
          } else if (topicDetail.status === 'not_started') {
            topicDetail.status = 'in_progress';
          }
          
          updated = true;
        }
      }
      
      if (updated) {
        // Recalculate skill-level metrics
        const completedTopics = minor.topics.filter(t => t.status === 'completed').length;
        const totalTopics = minor.topics.length;
        
        minor.topics_completed = completedTopics;
        minor.completion_percentage = totalTopics > 0 
          ? Math.round((completedTopics / totalTopics) * 100) 
          : 0;
        
        // Update skill status
        if (completedTopics >= totalTopics * 0.8) {
          minor.status = 'completed';
        } else if (completedTopics > 0) {
          minor.status = 'in_progress';
        }
        
        // Recalculate overall accuracy
        const topicAccs = minor.topics
          .filter(t => t.attempts > 0)
          .map(t => t.weighted_accuracy);
        
        if (topicAccs.length > 0) {
          minor.overall_accuracy = Math.round(
            topicAccs.reduce((a, b) => a + b, 0) / topicAccs.length * 10
          ) / 10;
        }
        
        break;
      }
    }
    
    if (updated) {
      // Recalculate major milestone status
      const allCompleted = milestone.minor_milestones.every(m => m.status === 'completed');
      const anyInProgress = milestone.minor_milestones.some(
        m => m.status === 'in_progress' || m.status === 'completed'
      );
      
      if (allCompleted) {
        milestone.status = 'completed';
      } else if (anyInProgress) {
        milestone.status = 'in_progress';
      }
      
      break;
    }
  }
  
  // Update progress summary
  this._updateProgressSummary();
  this.last_updated = new Date();
  
  return this.save();
};

// Helper to check if topics match
goalPathSchema.methods._topicsMatch = function(userTopic, requiredTopic) {
  const userLower = userTopic.toLowerCase();
  const requiredLower = requiredTopic.toLowerCase();
  
  // Exact match
  if (userLower === requiredLower) return true;
  
  // One contains other
  if (userLower.includes(requiredLower) || requiredLower.includes(userLower)) {
    return true;
  }
  
  // Keyword matching
  const userWords = new Set(userLower.split(/\s+/).filter(w => w.length > 3));
  const requiredWords = new Set(requiredLower.split(/\s+/).filter(w => w.length > 3));
  
  // Calculate overlap
  const commonWords = new Set([...userWords].filter(w => requiredWords.has(w)));
  
  // Need at least 50% keyword overlap
  if (requiredWords.size > 0 && commonWords.size / requiredWords.size >= 0.5) {
    return true;
  }
  
  return false;
};

// Update progress summary
goalPathSchema.methods._updateProgressSummary = function() {
  const totalMajor = this.milestones.length;
  const completedMajor = this.milestones.filter(m => m.status === 'completed').length;
  const inProgressMajor = this.milestones.filter(m => m.status === 'in_progress').length;
  
  let totalMinor = 0;
  let completedMinor = 0;
  let inProgressMinor = 0;
  let totalTopics = 0;
  let completedTopics = 0;
  
  this.milestones.forEach(m => {
    totalMinor += m.minor_milestones.length;
    completedMinor += m.minor_milestones.filter(mm => mm.status === 'completed').length;
    inProgressMinor += m.minor_milestones.filter(mm => mm.status === 'in_progress').length;
    
    m.minor_milestones.forEach(mm => {
      totalTopics += mm.topics_required;
      completedTopics += mm.topics_completed;
    });
  });
  
  this.progress_summary = {
    major_milestones: {
      total: totalMajor,
      completed: completedMajor,
      in_progress: inProgressMajor,
      percentage: totalMajor > 0 ? Math.round((completedMajor / totalMajor) * 100) : 0
    },
    minor_milestones: {
      total: totalMinor,
      completed: completedMinor,
      in_progress: inProgressMinor,
      percentage: totalMinor > 0 ? Math.round((completedMinor / totalMinor) * 100) : 0
    },
    topics: {
      total: totalTopics,
      completed: completedTopics,
      percentage: totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0
    },
    overall_progress: (totalMajor > 0 && totalMinor > 0 && totalTopics > 0)
      ? Math.round(
          ((completedMajor / totalMajor) * 0.4 + 
           (completedMinor / totalMinor) * 0.3 +
           (completedTopics / totalTopics) * 0.3) * 100
        )
      : 0
  };
};

// Get incomplete topics across all milestones
goalPathSchema.methods.getIncompleteTopics = function() {
  const incomplete = [];
  
  for (let milestone of this.milestones) {
    if (milestone.status === 'locked') continue;
    
    for (let minor of milestone.minor_milestones) {
      for (let topic of minor.topics) {
        if (topic.status !== 'completed') {
          incomplete.push({
            milestone: milestone.title,
            skill: minor.skill,
            topic: topic.topic,
            status: topic.status,
            attempts: topic.attempts,
            accuracy: topic.weighted_accuracy
          });
        }
      }
    }
  }
  
  return incomplete;
};

// Get next recommended topics to practice
goalPathSchema.methods.getNextTopicsToPractice = function(limit = 5) {
  const next = [];
  
  // Find first non-completed milestone
  const currentMilestone = this.milestones.find(
    m => m.status === 'in_progress' || m.status === 'not_started'
  );
  
  if (!currentMilestone) return next;
  
  // Get not-started and in-progress topics from current milestone
  for (let minor of currentMilestone.minor_milestones) {
    for (let topic of minor.topics) {
      if (topic.status !== 'completed' && next.length < limit) {
        next.push({
          skill: minor.skill,
          topic: topic.topic,
          importance: minor.importance,
          status: topic.status,
          user_topic_mapped: topic.user_topic_mapped
        });
      }
    }
  }
  
  return next;
};

// Indexes
goalPathSchema.index({ userId: 1, is_active: 1 });
goalPathSchema.index({ 'goal.interpreted': 1 });
goalPathSchema.index({ 'milestones.minor_milestones.topics.topic': 1 });

const GoalPath = mongoose.model('GoalPath', goalPathSchema);

module.exports = GoalPath;