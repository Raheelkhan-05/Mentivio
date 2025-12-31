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
export const askQuestion = async (question, userId, chatId, materialId, useAllMaterials) => {
  const response = await fetch(`${API_BASE}/tutor/ask`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      question,
      userId,
      chatId,
      materialId,
      useAllMaterials
    }),
  });

  if (!response.ok) throw new Error('Failed to get answer');
  return response.json();
};


// Ask Socratic Question
export const askSocratic = async (question, userId, chatId, materialId, useAllMaterials = false) => {
  const response = await fetch(`${API_BASE}/tutor/socratic`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      question,
      userId,
      chatId,
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


/**
 * Generate flashcards (UPDATED to handle new response format)
 */
export const generateFlashcards = async (topic, userId, materialId, numCards, useAllMaterials) => {
  try {
    const response = await fetch(`${API_BASE}/tutor/generate-flashcards`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        topic,
        userId,
        materialId,
        numCards,
        useAllMaterials
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error generating flashcards:', error);
    throw error;
  }
};

/**
 * Get flashcard history for a user
 */
export const getFlashcardHistory = async (userId) => {
  try {
    const response = await fetch(`${API_BASE}/tutor/flashcards/history/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching flashcard history:', error);
    throw error;
  }
};

/**
 * Get detailed information for a specific flashcard set
 */
export const getFlashcardSetDetails = async (flashcardSetId) => {
  try {
    const response = await fetch(`${API_BASE}/tutor/flashcards/${flashcardSetId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching flashcard set details:', error);
    throw error;
  }
};

/**
 * Update flashcard mastery status
 */
export const updateFlashcardMastery = async (flashcardSetId, cardIndex, mastered) => {
  try {
    const response = await fetch(`${API_BASE}/tutor/flashcards/${flashcardSetId}/card/${cardIndex}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ mastered }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error updating flashcard mastery:', error);
    throw error;
  }
};

/**
 * Record a study session
 */
export const recordStudySession = async (flashcardSetId) => {
  try {
    const response = await fetch(`${API_BASE}/tutor/flashcards/${flashcardSetId}/study-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error recording study session:', error);
    throw error;
  }
};

/**
 * Delete a flashcard set
 */
export const deleteFlashcardSet = async (flashcardSetId) => {
  try {
    const response = await fetch(`${API_BASE}/tutor/flashcards/${flashcardSetId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error deleting flashcard set:', error);
    throw error;
  }
};

/**
 * Get flashcard statistics
 */
export const getFlashcardStats = async (userId) => {
  try {
    const response = await fetch(`${API_BASE}/tutor/flashcards/stats/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching flashcard statistics:', error);
    throw error;
  }
};

// Get Quiz History
// export const getQuizHistory = async (userId) => {
//   const response = await fetch(`${API_BASE}/tutor/quiz-history/${userId}`);
//   return response.json();
// };

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


/**
 * Get quiz history for a user
 */
export const getQuizHistory = async (userId) => {
  try {
    const response = await fetch(`${API_BASE}/progress/history/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching quiz history:', error);
    throw error;
  }
};

/**
 * Get detailed information for a specific quiz
 */
export const getQuizDetails = async (quizId) => {
  console.log("getQuizDetails");
  try {
    const response = await fetch(`${API_BASE}/progress/quiz/${quizId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log(data);
    return data;
  } catch (error) {
    console.error('Error fetching quiz details:', error);
    throw error;
  }
};

/**
 * Delete a quiz from history
 */
export const deleteQuiz = async (quizId) => {
  try {
    const response = await fetch(`${API_BASE}/progress/${quizId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error deleting quiz:', error);
    throw error;
  }
};

/**
 * Fetch user's goal path
 */
export const fetchGoalPath = async (userId) => {
  try {
    const response = await fetch(`${API_BASE}/goal/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching goal path:', error);
    throw error;
  }
};

/**
 * Create or update goal path
 * @param {string} userId - User ID
 * @param {string} goal - Goal description
 * @param {string} startingPosition - Optional starting position
 * @param {boolean} updateOnly - If true, only updates milestones; if false, regenerates entire path
 */
export const createGoalPath = async (userId, goal, startingPosition = null, updateOnly = false) => {
  try {
    const response = await fetch(`${API_BASE}/goal/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        goal,
        startingPosition,
        updateOnly
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error creating/updating goal path:', error);
    throw error;
  }
};

/**
 * Update goal path with latest progress (milestones only)
 */
export const updateGoalPathProgress = async (userId, goal) => {
  try {
    const response = await fetch(`${API_BASE}/goal/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        goal,
        updateOnly: true
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error updating goal path progress:', error);
    throw error;
  }
};