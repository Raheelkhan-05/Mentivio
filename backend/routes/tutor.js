const express = require('express');
const router = express.Router();
const axios = require('axios');
const Quiz = require('../models/Quiz');
const Progress = require('../models/Progress');
const ChatSession = require('../models/ChatSession');
const ChatMessage = require('../models/ChatMessage');
const Flashcard = require('../models/Flashcard');

const FLASK_URL = process.env.FLASK_SERVICE_URL || 'http://localhost:5000';

async function saveMessage(chatId, role, content, mode, metadata = {}) {
  try {
    await ChatMessage.create({
      chatId,
      role,
      content,
      mode,
      metadata
    });
  } catch (err) {
    console.error("Error saving chat message:", err.message);
  }
}

router.post('/new', async (req, res) => {
  try {
    const { userId } = req.body;

    const chat = await ChatSession.create({ userId });
    res.json({ chat });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.get('/list/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const chats = await ChatSession.find({ userId }).sort({ updatedAt: -1 });
    res.json({ chats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/rename/:chatId', async (req, res) => {
  try {
    const { chatId } = req.params;
    const { title } = req.body;

    await ChatSession.findByIdAndUpdate(chatId, { title });
    res.json({ message: "Chat renamed successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.delete('/delete/:chatId', async (req, res) => {
  try {
    const { chatId } = req.params;

    await ChatSession.findByIdAndDelete(chatId);
    await ChatMessage.deleteMany({ chatId });

    res.json({ message: "Chat deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/messages/:chatId', async (req, res) => {
  try {
    const { chatId } = req.params;

    const messages = await ChatMessage.find({ chatId })
      .sort({ createdAt: 1 });

    res.json({ messages });
  } catch (err) {
    console.error("Messages load error:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/add-message', async (req, res) => {
  try {
    const { chatId, role, content, mode, metadata } = req.body;

    if (!chatId || chatId.length !== 24) {
      return res.status(400).json({ error: "Invalid chatId" });
    }


    const message = await ChatMessage.create({
      chatId,
      role,
      content,
      mode,
      metadata
    });

    // Update session timestamp
    await ChatSession.findByIdAndUpdate(chatId, { updatedAt: Date.now() });

    res.json({ message });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/ask', async (req, res) => {
  try {
    let { question, userId, chatId, materialId, useAllMaterials } = req.body;
    if (useAllMaterials === true) {
      materialId = null;
    }

    if (!question || !userId || !chatId) {
      return res.status(400).json({ error: 'question, userId and chatId are required' });
    }
    
    const response = await axios.post(`${FLASK_URL}/ask-question`, {
      question,
      userId,
      chatId,
      materialId,
      useAllMaterials
    });
    console.log("Ask response:", response.data);

    await saveMessage(chatId, "user", question, "normal");

    await saveMessage(
      chatId,
      "assistant",
      response.data.answer,
      response.data.mode || 'document_based',
      { sources: response.data.sources || [] }
    );

    await ChatSession.findByIdAndUpdate(chatId, { updatedAt: Date.now() });

    res.json(response.data);
  } catch (error) {
    console.error('Ask question error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Socratic questioning mode
router.post('/socratic', async (req, res) => {
  try {
    let { question, userId, chatId, materialId, useAllMaterials } = req.body;
    if (useAllMaterials === true) {
      materialId = null;
    }
    if (!question || !userId || !chatId) {
      return res.status(400).json({ error: 'question, userId and chatId are required' });
    }


    const response = await axios.post(`${FLASK_URL}/socratic-question`, {
        question,
        userId,
        chatId,
        materialId,
        useAllMaterials
    });
    console.log("Socratic response:", response.data.questions);

    await saveMessage(chatId, "user", question, "socratic");

    await saveMessage(
      chatId,
      "assistant",
      response.data.questions.answer,
      response.data.questions.mode || 'document_based',
      { sources: response.data.questions.sources || [] }
    );

    await ChatSession.findByIdAndUpdate(chatId, { updatedAt: Date.now() });


    res.json(response.data.questions);
  } catch (error) {
    console.error('Socratic question error---:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Generate quiz
router.post('/generate-quiz', async (req, res) => {
  try {
    let { topic, userId, materialId, numQuestions, difficulty, useAllMaterials } = req.body;
    if (useAllMaterials === true) {
      materialId = null;
    }
    // Input validation
    if (!topic || !userId) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        details: 'Topic and userId are required' 
      });
    }

    // Validate material scope
    if (materialId && useAllMaterials) {
      return res.status(400).json({ 
        error: 'Invalid material scope',
        details: 'Cannot specify both materialId and useAllMaterials. Choose one.' 
      });
    }

    if (!materialId && !useAllMaterials) {
      return res.status(400).json({ 
        error: 'Invalid material scope',
        details: 'Must specify either materialId or useAllMaterials=true' 
      });
    }

    // Validate parameters
    const validatedNumQuestions = Math.max(3, Math.min(numQuestions || 5, 20));
    const validDifficulties = ['easy', 'medium', 'hard'];
    const validatedDifficulty = validDifficulties.includes(difficulty?.toLowerCase()) 
      ? difficulty.toLowerCase() 
      : 'medium';

    console.log(`[Quiz Generation] User: ${userId}, Topic: "${topic}", Material: ${materialId || 'ALL'}, Questions: ${validatedNumQuestions}, Difficulty: ${validatedDifficulty}`);

    // Call Flask service
    const response = await axios.post(
      `${FLASK_URL}/generate-quiz`,
      {
        topic,
        user_id: userId,
        material_id: materialId || null,
        num_questions: validatedNumQuestions,
        difficulty: validatedDifficulty,
        use_all_materials: useAllMaterials || false
      },
      {
        timeout: 60000, // 60 second timeout for LLM generation
        headers: { 'Content-Type': 'application/json' }
      }
    );

    // Handle Flask errors
    if (response.data.error) {
      console.error('[Quiz Generation] Flask error:', response.data.error);
      return res.status(400).json({ 
        error: 'Quiz generation failed',
        details: response.data.error 
      });
    }

    if (!response.data.quiz || !response.data.quiz.questions) {
      console.error('[Quiz Generation] Invalid response format from Flask');
      return res.status(500).json({ 
        error: 'Invalid quiz data received from generation service' 
      });
    }

    const quizData = response.data.quiz;

    // Validate questions before saving
    if (!Array.isArray(quizData.questions) || quizData.questions.length === 0) {
      return res.status(400).json({ 
        error: 'No valid questions generated',
        details: 'Please try again with a different topic or material' 
      });
    }

    // Format questions for MongoDB
    const formattedQuestions = quizData.questions.map((q, index) => {
      // Validate question structure
      if (!q.question || !q.options || !q.correct_answer || !q.explanation) {
        console.warn(`[Quiz Generation] Question ${index + 1} missing required fields, skipping`);
        return null;
      }

      return {
        question: q.question.trim(),
        options: q.options, // {A: "...", B: "...", C: "...", D: "..."}
        correctAnswer: q.correct_answer, // Store as 'correctAnswer' in MongoDB
        explanation: q.explanation.trim(),
        userAnswer: null, // Will be filled when quiz is submitted
        isCorrect: null   // Will be calculated on submission
      };
    }).filter(q => q !== null); // Remove invalid questions

    if (formattedQuestions.length === 0) {
      return res.status(400).json({ 
        error: 'No valid questions after validation',
        details: 'Question generation failed quality checks' 
      });
    }

    // Create quiz document
    const quiz = new Quiz({
      userId,
      materialId: materialId || null,
      topic: quizData.topic, // Use normalized topic from LLM
      originalTopic: quizData.original_topic || topic, // Store user's original input
      difficulty: validatedDifficulty,
      questions: formattedQuestions,
      totalQuestions: formattedQuestions.length,
      status: 'in_progress',
      materialScope: materialId ? 'specific' : 'all',
      metadata: {
        topicConfidence: quizData.topic_confidence,
        topicReasoning: quizData.metadata?.topic_reasoning,
        numSources: quizData.metadata?.num_sources,
        generatedAt: new Date()
      }
    });

    await quiz.save();

    console.log(`[Quiz Generation] Success! Quiz ID: ${quiz._id}, Questions: ${formattedQuestions.length}`);

    // Return quiz data
    res.json({
      success: true,
      quizId: quiz._id,
      quiz: {
        topic: quiz.topic,
        originalTopic: quiz.originalTopic,
        difficulty: quiz.difficulty,
        totalQuestions: quiz.totalQuestions,
        materialScope: quiz.materialScope,
        questions: formattedQuestions.map(q => ({
          question: q.question,
          options: q.options,
          explanation: q.explanation
          // NOTE: correctAnswer is NOT sent to frontend to prevent cheating
        }))
      },
      metadata: quiz.metadata
    });

  } catch (error) {
    console.error('[Quiz Generation] Error:', error.message);
    
    if (error.response) {
      // Flask service error
      return res.status(error.response.status || 500).json({ 
        error: 'Quiz generation service error',
        details: error.response.data?.error || error.message 
      });
    }
    
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({ 
        error: 'Quiz generation service unavailable',
        details: 'Please try again later' 
      });
    }

    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred' 
    });
  }
});

// /**
//  * Submit quiz answers and calculate results
//  * POST /submit-quiz
//  */
// router.post('/submit-quiz', async (req, res) => {
//   try {
//     const { quizId, answers } = req.body;

//     // Input validation
//     if (!quizId || !answers) {
//       return res.status(400).json({ 
//         error: 'Missing required fields',
//         details: 'Quiz ID and answers are required' 
//       });
//     }

//     if (!Array.isArray(answers)) {
//       return res.status(400).json({ 
//         error: 'Invalid format',
//         details: 'Answers must be an array' 
//       });
//     }

//     console.log(`[Quiz Submit] Quiz ID: ${quizId}, Answers: ${answers.length}`);

//     // Retrieve quiz
//     const quiz = await Quiz.findById(quizId);
//     if (!quiz) {
//       return res.status(404).json({ 
//         error: 'Quiz not found',
//         details: 'The specified quiz does not exist' 
//       });
//     }

//     // Prevent re-submission
//     if (quiz.status === 'completed') {
//       return res.status(400).json({ 
//         error: 'Quiz already completed',
//         details: 'This quiz has already been submitted' 
//       });
//     }

//     // Validate answer count
//     if (answers.length !== quiz.questions.length) {
//       return res.status(400).json({ 
//         error: 'Answer count mismatch',
//         details: `Expected ${quiz.questions.length} answers, got ${answers.length}` 
//       });
//     }

//     // Grade the quiz
//     let correctCount = 0;
//     const correctAnswersArray = [];

//     quiz.questions.forEach((question, index) => {
//       const userAnswer = answers[index] || null;
//       const correctAnswer = question.correctAnswer;
      
//       correctAnswersArray.push(correctAnswer);
      
//       // Update question with user's answer
//       question.userAnswer = userAnswer;
//       question.isCorrect = userAnswer === correctAnswer;
      
//       if (question.isCorrect) {
//         correctCount++;
//       }

//       console.log(`[Quiz Submit] Q${index + 1}: Correct=${correctAnswer}, User=${userAnswer}, Result=${question.isCorrect}`);
//     });

//     // Calculate score
//     quiz.score = (correctCount / quiz.totalQuestions) * 100;
//     quiz.status = 'completed';
//     quiz.completedAt = new Date();
    
//     await quiz.save();

//     console.log(`[Quiz Submit] Score: ${correctCount}/${quiz.totalQuestions} (${quiz.score.toFixed(1)}%)`);

//     // Update user progress
//     let progress = await Progress.findOne({ userId: quiz.userId });
//     if (!progress) {
//       progress = new Progress({ 
//         userId: quiz.userId,
//         strongTopics: [],
//         weakTopics: [],
//         totalQuizzesTaken: 0,
//         overallAccuracy: 0
//       });
//     }

//     progress.totalQuizzesTaken += 1;

//     // Update topic-specific progress
//     const topicToUpdate = quiz.topic; // Use normalized topic
//     for (let i = 0; i < quiz.questions.length; i++) {
//       if (progress.updateTopicProgress) {
//         await progress.updateTopicProgress(topicToUpdate, quiz.questions[i].isCorrect);
//       } else {
//         // Manual topic progress update if method doesn't exist
//         if (!progress.topicProgress) {
//           progress.topicProgress = new Map();
//         }
        
//         const topicData = progress.topicProgress.get(topicToUpdate) || {
//           correct: 0,
//           total: 0,
//           accuracy: 0
//         };
        
//         topicData.total += 1;
//         if (quiz.questions[i].isCorrect) {
//           topicData.correct += 1;
//         }
//         topicData.accuracy = (topicData.correct / topicData.total) * 100;
        
//         progress.topicProgress.set(topicToUpdate, topicData);
//       }
//     }

//     // Recalculate overall accuracy
//     if (progress.topicProgress) {
//       let totalCorrect = 0;
//       let totalQuestions = 0;
      
//       progress.topicProgress.forEach(data => {
//         totalCorrect += data.correct;
//         totalQuestions += data.total;
//       });
      
//       progress.overallAccuracy = totalQuestions > 0 
//         ? (totalCorrect / totalQuestions) * 100 
//         : 0;
      
//       // Update strong/weak topics
//       progress.strongTopics = [];
//       progress.weakTopics = [];
      
//       progress.topicProgress.forEach((data, topic) => {
//         if (data.total >= 3) { // Only consider topics with at least 3 questions
//           if (data.accuracy >= 75) {
//             progress.strongTopics.push(topic);
//           } else if (data.accuracy < 60) {
//             progress.weakTopics.push(topic);
//           }
//         }
//       });
//     }

//     await progress.save();

//     // Get personalized feedback from Flask
//     let feedback = null;
//     try {
//       const feedbackResponse = await axios.post(
//         `${FLASK_URL}/evaluate-answers`,
//         {
//           answers: answers,
//           correct_answers: correctAnswersArray,
//           topic: quiz.topic,
//           difficulty: quiz.difficulty
//         },
//         { timeout: 30000 }
//       );
      
//       feedback = feedbackResponse.data;
//     } catch (feedbackError) {
//       console.error('[Quiz Submit] Feedback generation failed:', feedbackError.message);
//       // Continue without feedback rather than failing the entire submission
//       feedback = {
//         feedback: 'Feedback generation unavailable. Great job completing the quiz!',
//         suggested_difficulty: quiz.difficulty
//       };
//     }

//     // Prepare response
//     const response = {
//       success: true,
//       score: quiz.score,
//       correctCount,
//       totalQuestions: quiz.totalQuestions,
//       performanceLevel: feedback.performance_level || getPerformanceLevel(quiz.score),
//       questions: quiz.questions.map(q => ({
//         question: q.question,
//         options: q.options,
//         userAnswer: q.userAnswer,
//         correctAnswer: q.correctAnswer,
//         isCorrect: q.isCorrect,
//         explanation: q.explanation
//       })),
//       feedback: feedback.feedback || feedback,
//       suggestedDifficulty: feedback.suggested_difficulty || quiz.difficulty,
//       progress: {
//         strongTopics: progress.strongTopics || [],
//         weakTopics: progress.weakTopics || [],
//         overallAccuracy: progress.overallAccuracy || 0,
//         totalQuizzesTaken: progress.totalQuizzesTaken
//       }
//     };

//     console.log(`[Quiz Submit] Complete! Returning results to user.`);

//     res.json(response);

//   } catch (error) {
//     console.error('[Quiz Submit] Error:', error.message);
//     res.status(500).json({ 
//       error: 'Submission failed',
//       details: process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred' 
//     });
//   }
// });

/**
 * Submit quiz answers and calculate results with enhanced classification
 * POST /submit-quiz
 */
router.post('/submit-quiz', async (req, res) => {
  try {
    const { quizId, answers } = req.body;

    // Input validation
    if (!quizId || !answers) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        details: 'Quiz ID and answers are required' 
      });
    }

    if (!Array.isArray(answers)) {
      return res.status(400).json({ 
        error: 'Invalid format',
        details: 'Answers must be an array' 
      });
    }

    console.log(`[Quiz Submit] Quiz ID: ${quizId}, Answers: ${answers.length}`);

    // Retrieve quiz
    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({ 
        error: 'Quiz not found',
        details: 'The specified quiz does not exist' 
      });
    }

    // Prevent re-submission
    if (quiz.status === 'completed') {
      return res.status(400).json({ 
        error: 'Quiz already completed',
        details: 'This quiz has already been submitted' 
      });
    }

    // Validate answer count
    if (answers.length !== quiz.questions.length) {
      return res.status(400).json({ 
        error: 'Answer count mismatch',
        details: `Expected ${quiz.questions.length} answers, got ${answers.length}` 
      });
    }

    // Grade the quiz
    let correctCount = 0;
    const correctAnswersArray = [];

    quiz.questions.forEach((question, index) => {
      const userAnswer = answers[index] || null;
      const correctAnswer = question.correctAnswer;
      
      correctAnswersArray.push(correctAnswer);
      
      question.userAnswer = userAnswer;
      question.isCorrect = userAnswer === correctAnswer;
      
      if (question.isCorrect) {
        correctCount++;
      }

      console.log(`[Quiz Submit] Q${index + 1}: Correct=${correctAnswer}, User=${userAnswer}, Result=${question.isCorrect}`);
    });

    // Calculate score
    quiz.score = (correctCount / quiz.totalQuestions) * 100;
    quiz.status = 'completed';
    quiz.completedAt = new Date();
    
    await quiz.save();

    console.log(`[Quiz Submit] Score: ${correctCount}/${quiz.totalQuestions} (${quiz.score.toFixed(1)}%)`);

    // Update user progress - ENHANCED VERSION
    let progress = await Progress.findOne({ userId: quiz.userId });
    if (!progress) {
      progress = new Progress({ 
        userId: quiz.userId,
        strongTopics: [],
        weakTopics: [],
        improvingTopics: [],
        masteredTopics: [],
        challengingTopics: [],
        totalQuizzesTaken: 0,
        totalQuestionsSeen: 0,
        totalQuestionsCorrect: 0,
        overallAccuracy: 0
      });
    }

    progress.totalQuizzesTaken += 1;

    // DIRECT UPDATE - More reliable than calling methods
    const topicToUpdate = quiz.topic;
    const difficulty = quiz.difficulty || 'medium';
    const quizScore = quiz.score;
    
    console.log(`[Quiz Submit] Updating topic: ${topicToUpdate}, Difficulty: ${difficulty}, Score: ${quizScore}`);

    // Initialize topicProgress if needed
    if (!progress.topicProgress) {
      progress.topicProgress = new Map();
    }
    
    // Get existing topic data or create new
    let topicData = progress.topicProgress.get(topicToUpdate);
    
    if (!topicData) {
      console.log(`[Quiz Submit] Creating new topic entry for: ${topicToUpdate}`);
      topicData = {
        topic: topicToUpdate,
        correct: 0,
        total: 0,
        accuracy: 0,
        attempts: 0,
        lastAttempted: new Date(),
        difficultyHistory: [],
        scoreHistory: [],
        weightedAccuracy: 0,
        trend: 'neutral'
      };
    }
    
    // Update counts
    topicData.total += quiz.questions.length;
    topicData.correct += correctCount;
    topicData.attempts = (topicData.attempts || 0) + 1;
    topicData.accuracy = (topicData.correct / topicData.total) * 100;
    topicData.lastAttempted = new Date();
    
    // Track difficulty and score history
    if (!topicData.difficultyHistory) topicData.difficultyHistory = [];
    if (!topicData.scoreHistory) topicData.scoreHistory = [];
    
    topicData.difficultyHistory.push(difficulty);
    topicData.scoreHistory.push(quizScore);
    
    console.log(`[Quiz Submit] Topic history length: ${topicData.scoreHistory.length}`);
    
    // Keep only last 10 attempts for history
    if (topicData.difficultyHistory.length > 10) {
      topicData.difficultyHistory = topicData.difficultyHistory.slice(-10);
      topicData.scoreHistory = topicData.scoreHistory.slice(-10);
    }
    
    // Calculate weighted accuracy with RECENCY BIAS
    const difficultyWeight = { 'easy': 0.8, 'medium': 1.0, 'hard': 1.3 };
    
    // Give more weight to recent attempts (exponential decay)
    let totalWeightedScore = 0;
    let totalWeight = 0;
    const historyLength = topicData.scoreHistory.length;
    
    topicData.scoreHistory.forEach((score, idx) => {
      const diff = topicData.difficultyHistory[idx];
      const diffWeight = difficultyWeight[diff] || 1.0;
      
      // Recency weight: more recent = higher weight
      // Position 0 (oldest) = 0.5x, Position N-1 (newest) = 1.5x
      const recencyWeight = 0.5 + (idx / Math.max(historyLength - 1, 1));
      
      const combinedWeight = diffWeight * recencyWeight;
      
      totalWeightedScore += score * combinedWeight;
      totalWeight += combinedWeight;
      
      if (idx === historyLength - 1) {
        console.log(`[Quiz Submit] Latest attempt weight: ${combinedWeight.toFixed(2)} (diff: ${diffWeight}, recency: ${recencyWeight.toFixed(2)})`);
      }
    });
    
    topicData.weightedAccuracy = totalWeight > 0 ? totalWeightedScore / totalWeight : topicData.accuracy;
    
    console.log(`[Quiz Submit] Weighted Accuracy: ${topicData.weightedAccuracy.toFixed(1)}%, Raw Accuracy: ${topicData.accuracy.toFixed(1)}%`);
    
    // Calculate trend (comparing recent vs older performance)
    if (topicData.scoreHistory.length >= 3) {
      const recentScores = topicData.scoreHistory.slice(-3);
      const olderScores = topicData.scoreHistory.slice(0, -3);
      
      if (olderScores.length > 0) {
        const recentAvg = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
        const olderAvg = olderScores.reduce((a, b) => a + b, 0) / olderScores.length;
        
        if (recentAvg > olderAvg + 10) {
          topicData.trend = 'improving';
        } else if (recentAvg < olderAvg - 10) {
          topicData.trend = 'declining';
        } else {
          topicData.trend = 'stable';
        }
        
        console.log(`[Quiz Submit] Trend: ${topicData.trend} (Recent: ${recentAvg.toFixed(1)}%, Older: ${olderAvg.toFixed(1)}%)`);
      }
    }
    
    // Save updated topic data back to map
    progress.topicProgress.set(topicToUpdate, topicData);
    
    // Update global stats
    progress.totalQuestionsSeen = (progress.totalQuestionsSeen || 0) + quiz.questions.length;
    progress.totalQuestionsCorrect = (progress.totalQuestionsCorrect || 0) + correctCount;
    progress.overallAccuracy = progress.totalQuestionsSeen > 0
      ? (progress.totalQuestionsCorrect / progress.totalQuestionsSeen) * 100
      : 0;
    
    // ENHANCED TOPIC CLASSIFICATION WITH LOGGING
    console.log(`[Quiz Submit] Reclassifying topics...`);
    
    // Reset all categories
    progress.strongTopics = [];
    progress.weakTopics = [];
    progress.improvingTopics = [];
    progress.masteredTopics = [];
    progress.challengingTopics = [];
    
    // Classify each topic
    progress.topicProgress.forEach((data, topic) => {
      // Only classify topics with at least 3 attempts
      if ((data.attempts || 0) < 3) {
        console.log(`[Quiz Submit] Skipping ${topic} - only ${data.attempts} attempts`);
        return;
      }
      
      const weightedAcc = data.weightedAccuracy || data.accuracy;
      const rawAcc = data.accuracy;
      const trend = data.trend || 'neutral';
      const attempts = data.attempts || 0;
      
      // Get recent difficulties (last 3 attempts)
      const recentDifficulties = (data.difficultyHistory || []).slice(-3);
      const hasHardAttempts = recentDifficulties.includes('hard');
      const hasMediumAttempts = recentDifficulties.includes('medium');
      
      let classification = 'unclassified';
      
      // MASTERED: Consistently high performance on medium/hard
      if (weightedAcc >= 80 && rawAcc >= 80 && attempts >= 5 && 
          (hasHardAttempts || hasMediumAttempts)) {
        progress.masteredTopics.push(topic);
        classification = 'MASTERED';
      }
      // STRONG: Good performance with weighted consideration
      else if (weightedAcc >= 70 && rawAcc >= 65) {
        progress.strongTopics.push(topic);
        classification = 'STRONG';
      }
      // IMPROVING: Positive trend even if current accuracy is medium
      else if (trend === 'improving' && rawAcc >= 50 && rawAcc < 70) {
        progress.improvingTopics.push(topic);
        classification = 'IMPROVING';
      }
      // CHALLENGING: Low performance on harder difficulties
      else if (weightedAcc < 50 && (hasHardAttempts || hasMediumAttempts)) {
        progress.challengingTopics.push(topic);
        classification = 'CHALLENGING';
      }
      // WEAK: Low performance overall
      else if (rawAcc < 60) {
        progress.weakTopics.push(topic);
        classification = 'WEAK/REVIEW';
      }
      // DEFAULT: Decent performance that doesn't fit other categories
      else {
        progress.strongTopics.push(topic);
        classification = 'STRONG (default)';
      }
      
      console.log(`[Quiz Submit] ${topic}: ${classification} (Weighted: ${weightedAcc.toFixed(1)}%, Raw: ${rawAcc.toFixed(1)}%, Trend: ${trend}, Attempts: ${attempts})`);
    });
    
    console.log(`[Quiz Submit] Classification complete:`, {
      mastered: progress.masteredTopics.length,
      strong: progress.strongTopics.length,
      improving: progress.improvingTopics.length,
      challenging: progress.challengingTopics.length,
      weak: progress.weakTopics.length
    });
    
    // Update streak
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    if (!progress.lastQuizDate) {
      progress.currentStreak = 1;
      progress.longestStreak = Math.max(progress.longestStreak || 0, 1);
    } else {
      const lastQuizDay = new Date(
        progress.lastQuizDate.getFullYear(),
        progress.lastQuizDate.getMonth(),
        progress.lastQuizDate.getDate()
      );
      
      const daysDiff = Math.floor((today - lastQuizDay) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === 0) {
        // Same day
      } else if (daysDiff === 1) {
        progress.currentStreak += 1;
        progress.longestStreak = Math.max(progress.longestStreak || 0, progress.currentStreak);
      } else {
        progress.currentStreak = 1;
      }
    }
    
    progress.lastQuizDate = now;
    
    // Save progress
    await progress.save();
    console.log(`[Quiz Submit] Progress saved successfully`);

    // Get personalized feedback from Flask
    let feedback = null;
    try {
      const feedbackResponse = await axios.post(
        `${FLASK_URL}/evaluate-answers`,
        {
          answers: answers,
          correct_answers: correctAnswersArray,
          topic: quiz.topic,
          difficulty: quiz.difficulty
        },
        { timeout: 30000 }
      );
      
      feedback = feedbackResponse.data;
    } catch (feedbackError) {
      console.error('[Quiz Submit] Feedback generation failed:', feedbackError.message);
      feedback = {
        feedback: 'Feedback generation unavailable. Great job completing the quiz!',
        suggested_difficulty: quiz.difficulty
      };
    }

    // Prepare response with enhanced progress data
    const response = {
      success: true,
      score: quiz.score,
      correctCount,
      totalQuestions: quiz.totalQuestions,
      performanceLevel: feedback.performance_level || getPerformanceLevel(quiz.score),
      questions: quiz.questions.map(q => ({
        question: q.question,
        options: q.options,
        userAnswer: q.userAnswer,
        correctAnswer: q.correctAnswer,
        isCorrect: q.isCorrect,
        explanation: q.explanation
      })),
      feedback: feedback.feedback || feedback,
      suggestedDifficulty: feedback.suggested_difficulty || quiz.difficulty,
      progress: {
        masteredTopics: progress.masteredTopics || [],
        strongTopics: progress.strongTopics || [],
        improvingTopics: progress.improvingTopics || [],
        weakTopics: progress.weakTopics || [],
        challengingTopics: progress.challengingTopics || [],
        overallAccuracy: progress.overallAccuracy || 0,
        totalQuizzesTaken: progress.totalQuizzesTaken
      }
    };

    console.log(`[Quiz Submit] Complete! Returning results to user.`);

    res.json(response);

  } catch (error) {
    console.error('[Quiz Submit] Error:', error.message);
    console.error('[Quiz Submit] Stack:', error.stack);
    res.status(500).json({ 
      error: 'Submission failed',
      details: process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred' 
    });
  }
});

// Helper function for performance level
function getPerformanceLevel(score) {
  if (score >= 90) return 'Excellent';
  if (score >= 75) return 'Good';
  if (score >= 60) return 'Fair';
  return 'Needs Improvement';
}

/**
 * Get quiz by ID (for review)
 * GET /quiz/:quizId
 */
router.get('/quiz/:quizId', async (req, res) => {
  try {
    const { quizId } = req.params;
    const { userId } = req.query;

    const quiz = await Quiz.findById(quizId);
    
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    // Verify ownership
    if (userId && quiz.userId.toString() !== userId) {
      return res.status(403).json({ error: 'Unauthorized access' });
    }

    // Hide correct answers if quiz is in progress
    const quizData = quiz.toObject();
    if (quiz.status === 'in_progress') {
      quizData.questions = quizData.questions.map(q => ({
        question: q.question,
        options: q.options,
        explanation: q.explanation
      }));
    }

    res.json(quizData);
  } catch (error) {
    console.error('[Get Quiz] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get user's quiz history
 * GET /quiz-history/:userId
 */
router.get('/quiz-history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 10, status } = req.query;

    const query = { userId };
    if (status) {
      query.status = status;
    }

    const quizzes = await Quiz.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .select('topic difficulty score totalQuestions status createdAt completedAt materialScope');

    res.json({ quizzes });
  } catch (error) {
    console.error('[Quiz History] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Helper function
function getPerformanceLevel(score) {
  if (score >= 90) return 'Excellent';
  if (score >= 80) return 'Very Good';
  if (score >= 70) return 'Good';
  if (score >= 60) return 'Satisfactory';
  return 'Needs Improvement';
}


/**
 * Generate flashcards
 * POST /tutor/generate-flashcards
 */
router.post('/generate-flashcards', async (req, res) => {
  try {
    let { topic, userId, materialId, numCards, useAllMaterials } = req.body;
    
    if (useAllMaterials === true) {
      materialId = null;
    }
    
    if (!topic || !userId) {
      return res.status(400).json({ error: 'Topic and userId are required' });
    }

    // Call Flask service to generate flashcards
    const response = await axios.post(`${FLASK_URL}/generate-flashcards`, {
      topic,
      user_id: userId,
      material_id: materialId,
      num_cards: numCards || 10,
      use_all_materials: useAllMaterials || false
    });

    const flashcardsData = response.data;
    console.log(flashcardsData);

    // Save to MongoDB
    const flashcardSet = new Flashcard({
      userId,
      materialId: materialId || null,
      topic: flashcardsData.flashcards.topic,
      originalTopic: topic,
      flashcards: flashcardsData.flashcards.flashcards.map(card => ({
        front: card.front,
        back: card.back,
        mastered: false,
        reviewCount: 0
      })),
      totalCards: flashcardsData.flashcards.flashcards.length,
      materialScope: materialId ? 'specific' : 'global_knowledge',
      metadata: {
        topicConfidence: flashcardsData.metadata?.topic_confidence,
        topicReasoning: flashcardsData.metadata?.topic_reasoning,
        numSources: flashcardsData.metadata?.num_sources,
        generatedAt: new Date()
      }
    });

    await flashcardSet.save();

    res.json(flashcardSet);
  } catch (error) {
    console.error('Generate flashcards error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get flashcard history for a user
 * GET /tutor/flashcards/history/:userId
 */
router.get('/flashcards/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const flashcardSets = await Flashcard.find({ userId })
      .sort({ createdAt: -1 })
      .select('-flashcards') // Exclude the full flashcards array for performance
      .lean();

    res.json(flashcardSets);
  } catch (error) {
    console.error('Get flashcard history error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get detailed information for a specific flashcard set
 * GET /tutor/flashcards/:flashcardSetId
 */
router.get('/flashcards/:flashcardSetId', async (req, res) => {
  try {
    const { flashcardSetId } = req.params;

    const flashcardSet = await Flashcard.findById(flashcardSetId)
      .populate('materialId', 'title filename')
      .lean();

    if (!flashcardSet) {
      return res.status(404).json({ error: 'Flashcard set not found' });
    }

    res.json(flashcardSet);
  } catch (error) {
    console.error('Get flashcard set details error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update flashcard mastery status
 * PATCH /tutor/flashcards/:flashcardSetId/card/:cardIndex
 */
router.patch('/flashcards/:flashcardSetId/card/:cardIndex', async (req, res) => {
  try {
    const { flashcardSetId, cardIndex } = req.params;
    const { mastered } = req.body;

    if (typeof mastered !== 'boolean') {
      return res.status(400).json({ error: 'Mastered must be a boolean value' });
    }

    const flashcardSet = await Flashcard.findById(flashcardSetId);

    if (!flashcardSet) {
      return res.status(404).json({ error: 'Flashcard set not found' });
    }

    const index = parseInt(cardIndex);
    if (index < 0 || index >= flashcardSet.flashcards.length) {
      return res.status(400).json({ error: 'Invalid card index' });
    }

    // Update the specific card
    flashcardSet.flashcards[index].mastered = mastered;
    flashcardSet.flashcards[index].reviewCount += 1;

    // Save will trigger pre-save hook to update masteredCount
    await flashcardSet.save();

    res.json({
      message: 'Flashcard updated successfully',
      card: flashcardSet.flashcards[index],
      masteredCount: flashcardSet.masteredCount,
      masteryPercentage: flashcardSet.masteryPercentage
    });
  } catch (error) {
    console.error('Update flashcard mastery error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Record a study session
 * POST /tutor/flashcards/:flashcardSetId/study-session
 */
router.post('/flashcards/:flashcardSetId/study-session', async (req, res) => {
  try {
    const { flashcardSetId } = req.params;

    const flashcardSet = await Flashcard.findById(flashcardSetId);

    if (!flashcardSet) {
      return res.status(404).json({ error: 'Flashcard set not found' });
    }

    // Use the model method to record study session
    await flashcardSet.recordStudySession();

    res.json({
      message: 'Study session recorded successfully',
      lastStudiedAt: flashcardSet.lastStudiedAt,
      studySessionCount: flashcardSet.studySessionCount,
      masteredCount: flashcardSet.masteredCount,
      masteryPercentage: flashcardSet.masteryPercentage
    });
  } catch (error) {
    console.error('Record study session error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Delete a flashcard set
 * DELETE /tutor/flashcards/:flashcardSetId
 */
router.delete('/flashcards/:flashcardSetId', async (req, res) => {
  try {
    const { flashcardSetId } = req.params;

    const flashcardSet = await Flashcard.findByIdAndDelete(flashcardSetId);

    if (!flashcardSet) {
      return res.status(404).json({ error: 'Flashcard set not found' });
    }

    res.json({
      message: 'Flashcard set deleted successfully',
      deletedId: flashcardSetId
    });
  } catch (error) {
    console.error('Delete flashcard set error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get flashcard statistics for a user
 * GET /tutor/flashcards/stats/:userId
 */
router.get('/flashcards/stats/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const flashcardSets = await Flashcard.find({ userId }).lean();

    if (flashcardSets.length === 0) {
      return res.json({
        totalSets: 0,
        totalCards: 0,
        totalMastered: 0,
        totalStudySessions: 0,
        overallMasteryPercentage: 0,
        recentActivity: []
      });
    }

    const stats = {
      totalSets: flashcardSets.length,
      totalCards: flashcardSets.reduce((sum, set) => sum + set.totalCards, 0),
      totalMastered: flashcardSets.reduce((sum, set) => sum + set.masteredCount, 0),
      totalStudySessions: flashcardSets.reduce((sum, set) => sum + set.studySessionCount, 0),
      overallMasteryPercentage: 0,
      recentActivity: flashcardSets
        .filter(set => set.lastStudiedAt)
        .sort((a, b) => new Date(b.lastStudiedAt) - new Date(a.lastStudiedAt))
        .slice(0, 5)
        .map(set => ({
          id: set._id,
          topic: set.topic,
          lastStudiedAt: set.lastStudiedAt,
          masteryPercentage: (set.masteredCount / set.totalCards) * 100
        }))
    };

    // Calculate overall mastery percentage
    if (stats.totalCards > 0) {
      stats.overallMasteryPercentage = (stats.totalMastered / stats.totalCards) * 100;
    }

    res.json(stats);
  } catch (error) {
    console.error('Get flashcard stats error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get quiz history
router.get('/quiz-history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const quizzes = await Quiz.find({ userId, status: 'completed' })
      .sort({ completedAt: -1 })
      .limit(20);
    
    res.json({ quizzes });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;