import React, { useState, useRef, useEffect } from 'react';
import { askQuestion, askSocratic, clearConversation } from '../services/api';

function Chat({ userId, materialId, useAllMaterials }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('normal'); // 'normal' or 'socratic'
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleClearConversation = async () => {
    if (window.confirm('Are you sure you want to clear the conversation history?')) {
      try {
        await clearConversation(userId);
        setMessages([]);
      } catch (error) {
        console.error('Error clearing conversation:', error);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!input.trim() || loading) return;

    const userMessage = {
      role: 'user',
      content: input
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      let response;

      if (mode === 'socratic') {
        response = await askSocratic(input, userId, materialId, useAllMaterials);

        const aiMessage = {
          role: 'assistant',
          content: Array.isArray(response.questions)
            ? response.questions.join('\n\n')
            : String(response.questions || 'No questions generated.'),
          hint: response.hint || null,
          mode: 'socratic'
        };

        setMessages((prev) => [...prev, aiMessage]);
      } else {
        response = await askQuestion(input, userId, materialId, useAllMaterials);

        const aiMessage = {
          role: 'assistant',
          content: typeof response.answer === 'string'
            ? response.answer
            : JSON.stringify(response.answer, null, 2),
          sources: Array.isArray(response.sources) ? response.sources : [],
          mode: response.mode || 'document_based'
        };

        setMessages((prev) => [...prev, aiMessage]);
      }
    } catch (error) {
      const errorMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered an error: ' + error.message,
        error: true
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const getModeLabel = (messageMode) => {
    switch (messageMode) {
      case 'general':
        return '💬 General';
      case 'knowledge_base':
        return '🧠 Knowledge Base';
      case 'document_based':
        return '📚 From Materials';
      case 'fallback':
        return '🔍 General Knowledge';
      default:
        return '';
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div>
          <h2>AI Tutor Chat</h2>
          {useAllMaterials && (
            <span className="mode-badge">🧠 Knowledge Mode: Using general AI knowledge</span>
          )}
        </div>
        <div className="header-controls">
          <div className="mode-toggle">
            <button
              className={mode === 'normal' ? 'active' : ''}
              onClick={() => setMode('normal')}
              title="Get direct answers"
            >
              Direct Answer
            </button>
            <button
              className={mode === 'socratic' ? 'active' : ''}
              onClick={() => setMode('socratic')}
              title="Learn through guided questions"
            >
              Socratic Mode 🤔
            </button>
          </div>
          <button 
            className="clear-btn" 
            onClick={handleClearConversation}
            title="Clear conversation history"
          >
            🗑️ Clear
          </button>
        </div>
      </div>

      {mode === 'socratic' && (
        <div className="mode-info">
          <p>🤔 Socratic Mode: I'll guide you to discover answers through thoughtful questions</p>
        </div>
      )}

      <div className="messages-container">
        {messages.length === 0 && (
          <div className="welcome-message">
            <h3>👋 Hi! I'm your AI Tutor</h3>
            <p>
              {useAllMaterials 
                ? "I'll answer using my general knowledge base. Ask me anything!"
                : "Ask me anything about your study materials!"}
            </p>
            <div className="example-questions">
              <p>Try asking:</p>
              <ul>
                {useAllMaterials ? (
                  <>
                    <li>"What is machine learning?"</li>
                    <li>"Explain quantum physics simply"</li>
                    <li>"How does photosynthesis work?"</li>
                  </>
                ) : (
                  <>
                    <li>"Explain the main concept in chapter 1"</li>
                    <li>"What's the difference between X and Y?"</li>
                    <li>"Give me an example of..."</li>
                  </>
                )}
              </ul>
            </div>
          </div>
        )}

        {messages.map((message, index) => (
          <div key={index} className={`message ${message.role} ${message.error ? 'error' : ''}`}>
            <div className="message-content">
              {message.mode && message.role === 'assistant' && (
                <div className="message-mode-badge">
                  {getModeLabel(message)}
                </div>
              )}
              
              <div className="message-text">
                {typeof message.content === 'object'
                  ? <pre>{JSON.stringify(message.content, null, 2)}</pre>
                  : message.content}
              </div>

              {message.hint && (
                <div className="hint">
                  💡 <strong>Hint:</strong> {message.hint}
                </div>
              )}

              {message.sources && message.sources.length > 0 && (
                <div className="sources">
                  <details>
                    <summary>📚 Sources ({message.sources.length})</summary>
                    {message.sources.map((source, idx) => (
                      <div key={idx} className="source-item">
                        <p>{source.content}</p>
                        {source.similarity !== undefined && (
                          <span className="similarity">
                            Relevance: {(source.similarity * 100).toFixed(0)}%
                          </span>
                        )}
                      </div>
                    ))}
                  </details>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="message assistant">
            <div className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="chat-input-form">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            useAllMaterials 
              ? "Ask me anything..." 
              : "Ask about your materials..."
          }
          disabled={loading}
        />
        <button type="submit" disabled={loading || !input.trim()}>
          {loading ? '...' : 'Send'}
        </button>
      </form>
    </div>
  );
}

export default Chat;