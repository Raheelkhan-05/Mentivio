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

// // Get dashboard stats
// router.get('/:userId/stats/dashboard', async (req, res) => {
//   try {
//     const { userId } = req.params;
    
//     const progress = await Progress.findOne({ userId });
//     const recentQuizzes = await Quiz.find({ userId, status: 'completed' })
//       .sort({ completedAt: -1 })
//       .limit(5);
    
//     if (!progress) {
//       return res.json({
//         stats: {
//           totalQuizzes: 0,
//           totalQuestions: 0,
//           overallAccuracy: 0,
//           strongTopics: [],
//           weakTopics: [],
//           studyStreak: 0
//         },
//         recentQuizzes: []
//       });
//     }
    
//     // Calculate study streak
//     const today = new Date();
//     today.setHours(0, 0, 0, 0);
    
//     if (progress.lastStudyDate) {
//       const lastStudy = new Date(progress.lastStudyDate);
//       lastStudy.setHours(0, 0, 0, 0);
      
//       const daysDiff = Math.floor((today - lastStudy) / (1000 * 60 * 60 * 24));
      
//       if (daysDiff === 0) {
//         // Same day, keep streak
//       } else if (daysDiff === 1) {
//         // Yesterday, increment streak
//         progress.studyStreak += 1;
//       } else {
//         // Streak broken
//         progress.studyStreak = 1;
//       }
      
//       progress.lastStudyDate = new Date();
//       await progress.save();
//     }
    
//     res.json({
//       stats: {
//         totalQuizzes: progress.totalQuizzesTaken,
//         totalQuestions: progress.totalQuestionsAnswered,
//         overallAccuracy: progress.overallAccuracy.toFixed(1),
//         strongTopics: progress.strongTopics,
//         weakTopics: progress.weakTopics,
//         studyStreak: progress.studyStreak,
//         topicProgress: progress.topicProgress
//       },
//       recentQuizzes: recentQuizzes.map(q => ({
//         topic: q.topic,
//         score: q.score,
//         difficulty: q.difficulty,
//         completedAt: q.completedAt
//       }))
//     });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

/**
 * Get dashboard statistics for a user
 * GET /api/progress/:userId/stats/dashboard
 */
router.get('/:userId/stats/dashboard', async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log(`[Dashboard Stats] Fetching for user: ${userId}`);
    
    // Find user progress
    let progress = await Progress.findOne({ userId });
    
    // If no progress exists, return empty stats
    if (!progress) {
      console.log(`[Dashboard Stats] No progress found for user: ${userId}`);
      return res.json({
        stats: {
          totalQuizzes: 0,
          totalQuestions: 0,
          overallAccuracy: 0,
          studyStreak: 0,
          strongTopics: [],
          weakTopics: [],
          improvingTopics: [],
          masteredTopics: [],
          challengingTopics: [],
          topicProgress: []
        }
      });
    }
    
    // Convert topicProgress Map to array for frontend
    const topicProgressArray = [];
    
    if (progress.topicProgress && progress.topicProgress instanceof Map) {
      progress.topicProgress.forEach((data, topicName) => {
        topicProgressArray.push({
          topic: topicName,
          questionsAnswered: data.total || 0,
          correctAnswers: data.correct || 0,
          accuracy: data.accuracy || 0,
          attempts: data.attempts || 0,
          weightedAccuracy: data.weightedAccuracy || data.accuracy || 0,
          trend: data.trend || 'neutral',
          lastAttempted: data.lastAttempted,
          recentDifficulties: (data.difficultyHistory || []).slice(-3),
          recentScores: (data.scoreHistory || []).slice(-3)
        });
      });
    }
    
    // Sort by number of questions answered (descending)
    topicProgressArray.sort((a, b) => b.questionsAnswered - a.questionsAnswered);
    
    // Build response
    const stats = {
      totalQuizzes: progress.totalQuizzesTaken || 0,
      totalQuestions: progress.totalQuestionsSeen || 0,
      overallAccuracy: Math.round((progress.overallAccuracy || 0) * 10) / 10,
      studyStreak: progress.currentStreak || 0,
      longestStreak: progress.longestStreak || 0,
      
      // Enhanced categories with fallback to empty arrays
      masteredTopics: progress.masteredTopics || [],
      strongTopics: progress.strongTopics || [],
      improvingTopics: progress.improvingTopics || [],
      weakTopics: progress.weakTopics || [],
      challengingTopics: progress.challengingTopics || [],
      
      // Detailed topic progress
      topicProgress: topicProgressArray,
      
      // Additional stats
      lastQuizDate: progress.lastQuizDate,
      performanceLevel: progress.performanceLevel || 'Novice'
    };
    
    console.log(`[Dashboard Stats] Returning stats:`, {
      totalQuizzes: stats.totalQuizzes,
      totalQuestions: stats.totalQuestions,
      overallAccuracy: stats.overallAccuracy,
      topicsCount: topicProgressArray.length,
      masteredCount: stats.masteredTopics.length,
      strongCount: stats.strongTopics.length,
      improvingCount: stats.improvingTopics.length,
      weakCount: stats.weakTopics.length,
      challengingCount: stats.challengingTopics.length
    });
    
    res.json({ stats });
    
  } catch (error) {
    console.error('[Dashboard Stats] Error:', error.message);
    console.error('[Dashboard Stats] Stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to fetch dashboard stats',
      details: process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred' 
    });
  }
});

/**
 * Get basic progress for a user
 * GET /api/progress/:userId
 */
router.get('/progress/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log(`[Get Progress] Fetching for user: ${userId}`);
    
    let progress = await Progress.findOne({ userId });
    
    if (!progress) {
      // Create new progress record
      progress = new Progress({
        userId,
        totalQuizzesTaken: 0,
        totalQuestionsSeen: 0,
        totalQuestionsCorrect: 0,
        overallAccuracy: 0,
        strongTopics: [],
        weakTopics: [],
        improvingTopics: [],
        masteredTopics: [],
        challengingTopics: [],
        currentStreak: 0,
        longestStreak: 0
      });
      
      await progress.save();
      console.log(`[Get Progress] Created new progress for user: ${userId}`);
    }
    
    // Convert Map to object for JSON response
    const progressObj = progress.toObject();
    
    // Convert topicProgress Map to object
    if (progressObj.topicProgress instanceof Map) {
      const topicProgressObj = {};
      progressObj.topicProgress.forEach((value, key) => {
        topicProgressObj[key] = value;
      });
      progressObj.topicProgress = topicProgressObj;
    }
    
    console.log(`[Get Progress] Returning progress for user: ${userId}`);
    
    res.json(progressObj);
    
  } catch (error) {
    console.error('[Get Progress] Error:', error.message);
    console.error('[Get Progress] Stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to fetch progress',
      details: process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred' 
    });
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

// Get quiz history for a user
router.get('/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50, skip = 0, difficulty, sortBy = 'recent' } = req.query;

    // Build query
    let query = { userId, status: 'completed' };
    
    if (difficulty && ['easy', 'medium', 'hard'].includes(difficulty)) {
      query.difficulty = difficulty;
    }

    // Build sort
    let sort = {};
    if (sortBy === 'recent') {
      sort.completedAt = -1;
    } else if (sortBy === 'oldest') {
      sort.completedAt = 1;
    } else if (sortBy === 'score') {
      sort.score = -1;
    }

    const quizzes = await Quiz.find(query)
      .sort(sort)
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .select('topic originalTopic difficulty totalQuestions score completedAt materialScope materialId');

    const total = await Quiz.countDocuments(query);

    res.json({
      success: true,
      quizzes,
      total,
      hasMore: total > parseInt(skip) + parseInt(limit)
    });
  } catch (error) {
    console.error('Error fetching quiz history:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch quiz history',
      details: error.message 
    });
  }
});

// Get detailed information for a specific quiz
router.get('/quiz/:quizId', async (req, res) => {
  try {
    const { quizId } = req.params;
    console.log("getQuizDetails in Progress");
    
    const quiz = await Quiz.findById(quizId);

    if (!quiz) {
      return res.status(404).json({
        success: false,
        error: 'Quiz not found'
      });
    }

    res.json({
      success: true,
      quiz
    });
  } catch (error) {
    console.error('Error fetching quiz details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch quiz details',
      details: error.message
    });
  }
});

// Get quiz statistics for a user
router.get('/stats/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const quizzes = await Quiz.find({ userId, status: 'completed' });

    if (quizzes.length === 0) {
      return res.json({
        success: true,
        stats: {
          totalQuizzes: 0,
          averageScore: 0,
          totalQuestions: 0,
          byDifficulty: {
            easy: { count: 0, avgScore: 0 },
            medium: { count: 0, avgScore: 0 },
            hard: { count: 0, avgScore: 0 }
          },
          recentActivity: [],
          topTopics: []
        }
      });
    }

    // Calculate statistics
    const totalQuizzes = quizzes.length;
    const totalScore = quizzes.reduce((sum, q) => sum + q.score, 0);
    const averageScore = totalScore / totalQuizzes;
    const totalQuestions = quizzes.reduce((sum, q) => sum + q.totalQuestions, 0);

    // By difficulty
    const byDifficulty = {
      easy: { count: 0, totalScore: 0, avgScore: 0 },
      medium: { count: 0, totalScore: 0, avgScore: 0 },
      hard: { count: 0, totalScore: 0, avgScore: 0 }
    };

    quizzes.forEach(quiz => {
      const diff = quiz.difficulty;
      byDifficulty[diff].count++;
      byDifficulty[diff].totalScore += quiz.score;
    });

    Object.keys(byDifficulty).forEach(diff => {
      if (byDifficulty[diff].count > 0) {
        byDifficulty[diff].avgScore = byDifficulty[diff].totalScore / byDifficulty[diff].count;
      }
    });

    // Recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentActivity = quizzes
      .filter(q => new Date(q.completedAt) >= sevenDaysAgo)
      .map(q => ({
        date: q.completedAt,
        topic: q.topic,
        score: q.score,
        difficulty: q.difficulty
      }))
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    // Top topics by frequency
    const topicCounts = {};
    quizzes.forEach(quiz => {
      topicCounts[quiz.topic] = (topicCounts[quiz.topic] || 0) + 1;
    });

    const topTopics = Object.entries(topicCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([topic, count]) => ({ topic, count }));

    res.json({
      success: true,
      stats: {
        totalQuizzes,
        averageScore: averageScore.toFixed(1),
        totalQuestions,
        byDifficulty: {
          easy: { 
            count: byDifficulty.easy.count, 
            avgScore: byDifficulty.easy.avgScore.toFixed(1) 
          },
          medium: { 
            count: byDifficulty.medium.count, 
            avgScore: byDifficulty.medium.avgScore.toFixed(1) 
          },
          hard: { 
            count: byDifficulty.hard.count, 
            avgScore: byDifficulty.hard.avgScore.toFixed(1) 
          }
        },
        recentActivity,
        topTopics
      }
    });
  } catch (error) {
    console.error('Error fetching quiz statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch quiz statistics',
      details: error.message
    });
  }
});

// Delete a quiz
router.delete('/:quizId', async (req, res) => {
  try {
    const { quizId } = req.params;

    const quiz = await Quiz.findById(quizId);

    if (!quiz) {
      return res.status(404).json({
        success: false,
        error: 'Quiz not found'
      });
    }

    // Update progress (decrement counters)
    const progress = await Progress.findOne({ userId: quiz.userId });
    
    if (progress) {
      progress.totalQuizzesTaken = Math.max(0, progress.totalQuizzesTaken - 1);
      progress.totalQuestionsAnswered = Math.max(0, progress.totalQuestionsAnswered - quiz.totalQuestions);
      
      // Recalculate overall accuracy
      const remainingQuizzes = await Quiz.find({ 
        userId: quiz.userId, 
        status: 'completed',
        _id: { $ne: quizId }
      });
      
      if (remainingQuizzes.length > 0) {
        const totalScore = remainingQuizzes.reduce((sum, q) => sum + q.score, 0);
        progress.overallAccuracy = totalScore / remainingQuizzes.length;
      } else {
        progress.overallAccuracy = 0;
      }
      
      await progress.save();
    }

    await Quiz.findByIdAndDelete(quizId);

    res.json({
      success: true,
      message: 'Quiz deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting quiz:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete quiz',
      details: error.message
    });
  }
});

// Get quiz comparison (compare multiple quizzes)
router.post('/compare', async (req, res) => {
  try {
    const { quizIds } = req.body;

    if (!Array.isArray(quizIds) || quizIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'quizIds array is required'
      });
    }

    const quizzes = await Quiz.find({ _id: { $in: quizIds } })
      .select('topic difficulty score totalQuestions completedAt questions');

    const comparison = quizzes.map(quiz => {
      const correctAnswers = quiz.questions.filter(q => q.isCorrect).length;
      
      return {
        quizId: quiz._id,
        topic: quiz.topic,
        difficulty: quiz.difficulty,
        score: quiz.score,
        correctAnswers,
        totalQuestions: quiz.totalQuestions,
        accuracy: (correctAnswers / quiz.totalQuestions * 100).toFixed(1),
        completedAt: quiz.completedAt
      };
    });

    res.json({
      success: true,
      comparison
    });
  } catch (error) {
    console.error('Error comparing quizzes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to compare quizzes',
      details: error.message
    });
  }
});

module.exports = router;

module.exports = router;