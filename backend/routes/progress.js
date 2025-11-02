const express = require('express');
const router = express.Router();
const Progress = require('../models/Progress');
const Quiz = require('../models/Quiz');

// Get user progress
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    let progress = await Progress.findOne({ userId });
    
    if (!progress) {
      progress = new Progress({ userId });
      await progress.save();
    }
    
    res.json({ progress });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get topic-specific progress
router.get('/:userId/topic/:topic', async (req, res) => {
  try {
    const { userId, topic } = req.params;
    
    const progress = await Progress.findOne({ userId });
    
    if (!progress) {
      return res.json({ topicProgress: null });
    }
    
    const topicProgress = progress.topicProgress.find(t => t.topic === topic);
    
    res.json({ topicProgress });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get dashboard stats
router.get('/:userId/stats/dashboard', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const progress = await Progress.findOne({ userId });
    const recentQuizzes = await Quiz.find({ userId, status: 'completed' })
      .sort({ completedAt: -1 })
      .limit(5);
    
    if (!progress) {
      return res.json({
        stats: {
          totalQuizzes: 0,
          totalQuestions: 0,
          overallAccuracy: 0,
          strongTopics: [],
          weakTopics: [],
          studyStreak: 0
        },
        recentQuizzes: []
      });
    }
    
    // Calculate study streak
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (progress.lastStudyDate) {
      const lastStudy = new Date(progress.lastStudyDate);
      lastStudy.setHours(0, 0, 0, 0);
      
      const daysDiff = Math.floor((today - lastStudy) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === 0) {
        // Same day, keep streak
      } else if (daysDiff === 1) {
        // Yesterday, increment streak
        progress.studyStreak += 1;
      } else {
        // Streak broken
        progress.studyStreak = 1;
      }
      
      progress.lastStudyDate = new Date();
      await progress.save();
    }
    
    res.json({
      stats: {
        totalQuizzes: progress.totalQuizzesTaken,
        totalQuestions: progress.totalQuestionsAnswered,
        overallAccuracy: progress.overallAccuracy.toFixed(1),
        strongTopics: progress.strongTopics,
        weakTopics: progress.weakTopics,
        studyStreak: progress.studyStreak,
        topicProgress: progress.topicProgress
      },
      recentQuizzes: recentQuizzes.map(q => ({
        topic: q.topic,
        score: q.score,
        difficulty: q.difficulty,
        completedAt: q.completedAt
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reset progress (for testing)
router.delete('/:userId/reset', async (req, res) => {
  try {
    const { userId } = req.params;
    
    await Progress.findOneAndDelete({ userId });
    await Quiz.deleteMany({ userId });
    
    res.json({ success: true, message: 'Progress reset successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;