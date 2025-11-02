const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

// Upload Material
export const uploadMaterial = async (formData) => {
  const response = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData
  });
  return response.json();
};

// Get User Materials
export const getMaterials = async (userId) => {
  const response = await fetch(`${API_BASE}/upload/${userId}`);
  return response.json();
};

// Get Material by ID
export const getMaterial = async (materialId) => {
  const response = await fetch(`${API_BASE}/upload/material/${materialId}`);
  return response.json();
};

// Delete Material
export const deleteMaterial = async (materialId) => {
  const response = await fetch(`${API_BASE}/upload/${materialId}`, {
    method: 'DELETE'
  });
  return response.json();
};

// Ask Question
export const askQuestion = async (question, userId, materialId, useAllMaterials = false) => {
  const response = await fetch(`${API_BASE}/tutor/ask`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      question,
      userId,
      materialId,
      useAllMaterials
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get answer');
  }

  return response.json();
};

// Ask Socratic Question
export const askSocratic = async (question, userId, materialId, useAllMaterials = false) => {
  const response = await fetch(`${API_BASE}/ask-socratic`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      question,
      userId,
      materialId,
      useAllMaterials
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get socratic questions');
  }

  return response.json();
};

export const clearConversation = async (userId) => {
  const response = await fetch(`${API_BASE}/clear-conversation`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userId
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to clear conversation');
  }

  return response.json();
};

// Generate Quiz
export const generateQuiz = async (topic, userId, materialId, numQuestions, difficulty, useAllMaterials) => {
  const response = await fetch(`${API_BASE}/tutor/generate-quiz`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      topic,
      userId,
      materialId,
      numQuestions,
      difficulty,
      useAllMaterials
    })
  });
  return response.json();
};

// Submit Quiz
export const submitQuiz = async (quizId, answers) => {
  const response = await fetch(`${API_BASE}/tutor/submit-quiz`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      quizId,
      answers
    })
  });
  return response.json();
};

// Generate Flashcards
export const generateFlashcards = async (topic, userId, materialId, numCards, useAllMaterials) => {
  const response = await fetch(`${API_BASE}/tutor/generate-flashcards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      topic,
      userId,
      materialId,
      numCards,
      useAllMaterials
    })
  });
  return response.json();
};

// Get Quiz History
export const getQuizHistory = async (userId) => {
  const response = await fetch(`${API_BASE}/tutor/quiz-history/${userId}`);
  return response.json();
};

// Get Progress
export const getProgress = async (userId) => {
  const response = await fetch(`${API_BASE}/progress/${userId}`);
  return response.json();
};

// Get Dashboard Stats
export const getDashboardStats = async (userId) => {
  const response = await fetch(`${API_BASE}/progress/${userId}/stats/dashboard`);
  return response.json();
};

// Get Topic Progress
export const getTopicProgress = async (userId, topic) => {
  const response = await fetch(`${API_BASE}/progress/${userId}/topic/${encodeURIComponent(topic)}`);
  return response.json();
};