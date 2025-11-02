const express = require('express');
const router = express.Router();
const axios = require('axios');
const Quiz = require('../models/Quiz');
const Progress = require('../models/Progress');

const FLASK_URL = process.env.FLASK_SERVICE_URL || 'http://localhost:5000';

// Ask a question (Contextual Q&A)
router.post('/ask', async (req, res) => {
  try {
    const { question, userId, materialId, useAllMaterials } = req.body;

    if (!question || !userId) {
      return res.status(400).json({ error: 'Question and userId are required' });
    }

    const response = await axios.post(`${FLASK_URL}/ask-question`, {
      question,
      user_id: userId,
      material_id: materialId,
      use_all_materials: useAllMaterials || false
    });

    res.json(response.data);
  } catch (error) {
    console.error('Ask question error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Socratic questioning mode
router.post('/socratic', async (req, res) => {
  try {
    const { question, userId, materialId, useAllMaterials } = req.body;

    if (!question || !userId) {
      return res.status(400).json({ error: 'Question and userId are required' });
    }

    const response = await axios.post(`${FLASK_URL}/socratic-question`, {
      question,
      user_id: userId,
      material_id: materialId,
      use_all_materials: useAllMaterials || false
    });

    res.json(response.data);
  } catch (error) {
    console.error('Socratic question error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// // Generate quiz
// router.post('/generate-quiz', async (req, res) => {
//   try {
//     const { topic, userId, materialId, numQuestions, difficulty, useAllMaterials } = req.body;

//     if (!topic || !userId) {
//       return res.status(400).json({ error: 'Topic and userId are required' });
//     }

//     const response = await axios.post(`${FLASK_URL}/generate-quiz`, {
//       topic,
//       user_id: userId,
//       material_id: materialId,
//       num_questions: numQuestions || 5,
//       difficulty: difficulty || 'medium',
//       use_all_materials: useAllMaterials || false
//     });

//     if (response.data.quiz) {
//       // Save quiz to database
//       const quiz = new Quiz({
//         userId,
//         materialId,
//         topic,
//         difficulty: difficulty || 'medium',
//         questions: response.data.quiz.questions,
//         totalQuestions: response.data.quiz.questions.length
//       });

//       await quiz.save();

//       res.json({
//         quizId: quiz._id,
//         quiz: response.data.quiz
//       });
//     } else {
//       res.status(500).json({ error: 'Failed to generate quiz' });
//     }
//   } catch (error) {
//     console.error('Generate quiz error:', error.message);
//     res.status(500).json({ error: error.message });
//   }
// });


// Generate quiz
router.post('/generate-quiz', async (req, res) => {
  try {
    const { topic, userId, materialId, numQuestions, difficulty, useAllMaterials } = req.body;

    if (!topic || !userId) {
      return res.status(400).json({ error: 'Topic and userId are required' });
    }

    const response = await axios.post(`${FLASK_URL}/generate-quiz`, {
      topic,
      user_id: userId,
      material_id: materialId,
      num_questions: numQuestions || 5,
      difficulty: difficulty || 'medium',
      use_all_materials: useAllMaterials || false
    });

    if (response.data.quiz) {
  // Map Flask response fields to MongoDB format
  const formattedQuestions = response.data.quiz.questions.map((q) => ({
    question: q.question,
    options: q.options,
    correctAnswer: q.correct_answer || q.correctAnswer,  // ✅ Store correct answer
    explanation: q.explanation
  }));

  const quiz = new Quiz({
    userId,
    materialId,
    topic,
    difficulty: difficulty || 'medium',
    questions: formattedQuestions,
    totalQuestions: formattedQuestions.length
  });

  await quiz.save();

  res.json({
    quizId: quiz._id,
    quiz: { ...response.data.quiz, questions: formattedQuestions }
  });

    } else {
      res.status(500).json({ error: 'Failed to generate quiz' });
    }
  } catch (error) {
    console.error('Generate quiz error:', error.message);
    res.status(500).json({ error: error.message });
  }
});



// Submit quiz answers
router.post('/submit-quiz', async (req, res) => {
  try {
    const { quizId, answers } = req.body;

    if (!quizId || !answers) {
      return res.status(400).json({ error: 'Quiz ID and answers are required' });
    }

    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    // Calculate results
    let correctCount = 0;
    const correctAnswers = [];

    // quiz.questions.forEach((question, index) => {
    //   const userAnswer = answers[index];
      
    //   question.userAnswer = userAnswer;
    //   question.isCorrect = userAnswer === question.correctAnswer;
      
    //   if (question.isCorrect) {
    //     correctCount++;
    //   }
      
    //   correctAnswers.push(question.correctAnswer);
    // });

    quiz.questions.forEach((question, index) => {
    const userAnswer = answers[index];
    console.log(`Q${index + 1}: Correct = ${question.correctAnswer}, User = ${userAnswer}`); // ✅ log
    question.userAnswer = userAnswer;
    question.isCorrect = userAnswer === question.correctAnswer;
    
    if (question.isCorrect) correctCount++;
  });

    quiz.score = (correctCount / quiz.totalQuestions) * 100;
    quiz.status = 'completed';
    quiz.completedAt = new Date();
    await quiz.save();

    // Update progress
    let progress = await Progress.findOne({ userId: quiz.userId });
    if (!progress) {
      progress = new Progress({ userId: quiz.userId });
    }

    progress.totalQuizzesTaken += 1;

    // Update topic progress for each question
    for (let i = 0; i < quiz.questions.length; i++) {
      await progress.updateTopicProgress(quiz.topic, quiz.questions[i].isCorrect);
    }

    // Get feedback from Flask service
    const feedbackResponse = await axios.post(`${FLASK_URL}/evaluate-answers`, {
      answers,
      correct_answers: correctAnswers,
      topic: quiz.topic
    });

    res.json({
      score: quiz.score,
      correctCount,
      totalQuestions: quiz.totalQuestions,
      questions: quiz.questions,
      feedback: feedbackResponse.data.feedback,
      progress: {
        strongTopics: progress.strongTopics,
        weakTopics: progress.weakTopics,
        overallAccuracy: progress.overallAccuracy
      }
    });
  } catch (error) {
    console.error('Submit quiz error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Generate flashcards
router.post('/generate-flashcards', async (req, res) => {
  try {
    const { topic, userId, materialId, numCards, useAllMaterials } = req.body;

    if (!topic || !userId) {
      return res.status(400).json({ error: 'Topic and userId are required' });
    }

    const response = await axios.post(`${FLASK_URL}/generate-flashcards`, {
      topic,
      user_id: userId,
      material_id: materialId,
      num_cards: numCards || 10,
      use_all_materials: useAllMaterials || false
    });

    res.json(response.data.flashcards);
  } catch (error) {
    console.error('Generate flashcards error:', error.message);
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