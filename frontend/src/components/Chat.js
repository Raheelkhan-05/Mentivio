import React, { useState, useRef, useEffect } from "react";
import { Clock, MessageSquare, X, Edit2, Trash2, Send, Sparkles, Brain } from 'lucide-react';
import { askQuestion, askSocratic } from "../services/api";
import { useAuth } from '../components/AuthContext';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

function Chat({ userId, materialId, useAllMaterials }) {
  const messagesContainerRef = useRef(null);
  const [chatListLoading, setChatListLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [chatList, setChatList] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("normal");
  const [showHistory, setShowHistory] = useState(false);
  const { user, loads } = useAuth();
  const curr_user = user?.userId || null;

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    container.scrollTo({
      top: container.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const loadChatList = async () => {
    setChatListLoading(true);
    try {
      const res = await fetch(`${API_BASE}/tutor/list/${userId}`);
      const data = await res.json();
      setChatList(data.chats || []);
    } catch (err) {
      console.error("Chat list error:", err);
    } finally {
      setChatListLoading(false);
    }
  };

  useEffect(() => {
    if (!userId) return;

    (async () => {
      await loadChatList();

      const savedChatId = localStorage.getItem("activeChatId");
      if (savedChatId) {
        await loadMessages(savedChatId);
      }
    })();
  }, [userId]);

  const handleNewChat = () => {
    setActiveChatId(null);
    localStorage.removeItem("activeChatId");
    setMessages([]);
    setShowHistory(false);
  };

  const loadMessages = async (chatId) => {
    try {
      setActiveChatId(chatId);
      localStorage.setItem("activeChatId", chatId);

      const res = await fetch(`${API_BASE}/tutor/messages/${chatId}`);
      const data = await res.json();

      setMessages(data.messages || []);
      setShowHistory(false);
    } catch (err) {
      console.error("Load messages error:", err);
    }
  };

  const renameChat = async (chatId) => {
    const newTitle = prompt("Enter chat name:");
    if (!newTitle) return;

    await fetch(`${API_BASE}/tutor/rename/${chatId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle }),
    });

    loadChatList();
  };

  const deleteChat = async (chatId) => {
    if (!window.confirm("Delete this chat permanently?")) return;

    await fetch(`${API_BASE}/tutor/delete/${chatId}`, { method: "DELETE" });

    if (chatId === activeChatId) {
      setMessages([]);
      setActiveChatId(null);
    }

    loadChatList();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    setLoading(true);
    const userMsg = { role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);

    let chatId = activeChatId;

    if (!chatId) {
      const res = await fetch(`${API_BASE}/tutor/new`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      const data = await res.json();
      chatId = data.chat._id;
      setActiveChatId(chatId);
      localStorage.setItem("activeChatId", chatId);
    }

    const text = input;
    setInput("");

    try {
      let response;
      let aiMsg;

      if (mode === "socratic") {
        response = await askSocratic(text, userId, chatId, materialId, useAllMaterials);
        aiMsg = {
          role: "assistant",
          mode: "socratic",
          content: typeof response.answer === "string" ? response.answer : "No questions.",
          hint: response.hint || null,
        };
      } else {
        response = await askQuestion(text, userId, chatId, materialId, useAllMaterials);
        aiMsg = {
          role: "assistant",
          mode: response.mode || "document_based",
          content: typeof response.answer === "string"
            ? response.answer
            : JSON.stringify(response.answer, null, 2),
          sources: response.sources || [],
        };
      }

      const bumpChatToTop = (chatId) => {
        setChatList((prev) => {
          const chat = prev.find((c) => c._id === chatId);
          if (!chat) return prev;

          const updatedChat = { ...chat, updatedAt: new Date().toISOString() };
          return [updatedChat, ...prev.filter((c) => c._id !== chatId)];
        });
      };

      bumpChatToTop(chatId);
      setMessages((prev) => [...prev, aiMsg]);

      if (messages.length === 0) {
        const title = aiMsg.content.split(" ").slice(0, 8).join(" ");
        await fetch(`${API_BASE}/tutor/rename/${chatId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title }),
        });
        loadChatList();
      }

    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", error: true, content: "Error: " + error.message }
      ]);
    }

    setLoading(false);
  };

  return (
    <div className="flex flex-1 flex-col bg-gray-50 h-[90vh] max-h-screen overflow-hidden">
      {/* Chat History Sidebar */}
      {showHistory && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity duration-300"
            onClick={() => setShowHistory(false)}
          />

          {/* Side Panel */}
          <div
            className="fixed inset-y-0 left-0 w-80 lg:w-96
                 bg-white border-r border-gray-200 shadow-2xl
                 z-50 flex flex-col slide-in"
          >
            {/* Header */}
            <div
              className="px-6 py-4 border-b border-gray-200
                   bg-gradient-to-r from-blue-50 via-purple-50 to-indigo-50"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <Clock className="w-5 h-5 text-blue-500" />
                  </div>
                  <h3 className="text-gray-900 font-bold text-base">
                    Chat History
                  </h3>
                </div>

                <button
                  onClick={() => setShowHistory(false)}
                  className="p-2 hover:bg-white/60 rounded-lg transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatListLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 bg-blue-400 rounded-full animate-bounce" />
                    <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce delay-150" />
                    <div className="w-3 h-3 bg-indigo-500 rounded-full animate-bounce delay-300" />
                  </div>
                </div>
              ) : chatList.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <div
                    className="w-16 h-16 bg-gray-100 rounded-full
                         flex items-center justify-center mx-auto mb-4"
                  >
                    <MessageSquare className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-600 text-sm font-medium">
                    No chats yet
                  </p>
                  <p className="text-gray-400 text-xs mt-1">
                    Start a new conversation
                  </p>
                </div>
              ) : (
                chatList.map((chat) => (
                  <div
                    key={chat._id}
                    className={`group p-4 rounded-xl cursor-pointer
                border transition-all
                ${activeChatId === chat._id
                        ? 'bg-gradient-to-r from-blue-50 to-purple-50 border-blue-300 shadow-sm'
                        : 'bg-white border-gray-200 hover:shadow-md hover:border-blue-300'
                      }`}
                    onClick={() => loadMessages(chat._id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate mb-1">
                          {chat.title || 'Untitled Chat'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(chat.updatedAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </p>
                      </div>

                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            renameChat(chat._id);
                          }}
                          className="p-1.5 hover:bg-blue-100 rounded-lg transition-colors"
                          title="Rename"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteChat(chat._id);
                          }}
                          className="p-1.5 hover:bg-red-100 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-600" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* Chat Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 shadow-sm flex-shrink-0">
        <div className="flex items-center justify-between gap-3">
          {/* Mode Toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setMode("normal")}
              className={`
                px-3 sm:px-4 py-2 rounded-lg font-medium transition-all duration-200 text-xs sm:text-sm flex items-center gap-2
                ${mode === "normal"
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }
              `}
            >
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">Direct</span>
            </button>
            <button
              onClick={() => setMode("socratic")}
              className={`
                px-3 sm:px-4 py-2 rounded-lg font-medium transition-all duration-200 text-xs sm:text-sm flex items-center gap-2
                ${mode === "socratic"
                  ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }
              `}
            >
              <Brain className="w-4 h-4" />
              <span className="hidden sm:inline">Socratic</span>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleNewChat}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-green-400 to-green-500 hover:from-green-500 hover:to-green-600 text-white rounded-lg text-xs sm:text-sm font-medium transition-all shadow-sm"
            >
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">New</span>
            </button>

            <button
              onClick={() => setShowHistory(true)}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-xs sm:text-sm font-medium border border-gray-200"
            >
              <Clock className="w-4 h-4" />
              <span className="hidden md:inline">History</span>
            </button>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-gradient-to-b from-gray-50 to-white"
      >
        {messages.length === 0 && !loading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-md px-4">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                <MessageSquare className="w-10 h-10 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Start a Conversation</h3>
              <p className="text-gray-600 text-sm">Ask me anything about your study materials, and I'll help you learn!</p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {mode === "normal" ? (
                  <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-200">
                    Direct Mode
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-purple-50 text-purple-700 text-xs rounded-full border border-purple-200">
                    Socratic Mode
                  </span>
                )}
              </div>

            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}
          >
            <div
              className={`
                max-w-[85%] sm:max-w-2xl rounded-2xl px-4 py-3 shadow-sm
                ${msg.role === 'user'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                  : msg.error
                    ? 'bg-red-50 text-red-900 border-2 border-red-200'
                    : 'bg-white text-gray-900 border border-gray-200'
                }
              `}
            >
              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
              {msg.hint && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs">💡</span>
                    </div>
                    <p className="text-sm text-gray-700">{msg.hint}</p>
                  </div>
                </div>
              )}
              {msg.mode === 'socratic' && msg.role === 'assistant' && !msg.error && (
                <div className="mt-2 flex items-center gap-1">
                  <Brain className="w-3 h-3 text-purple-600" />
                  <span className="text-xs text-gray-500">Socratic Mode</span>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start animate-fadeIn">
            <div className="bg-white rounded-2xl px-5 py-4 shadow-sm border border-gray-200">
              <div className="flex gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 p-4 mb-14 shadow-lg flex-shrink-0">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-2 sm:gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder={activeChatId ? "Type your message..." : "Start a new chat..."}
              disabled={loading}
              className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:bg-gray-50 disabled:cursor-not-allowed text-sm placeholder-gray-400"
            />
            <button
              onClick={handleSubmit}
              disabled={!input.trim() || loading}
              className="px-4 sm:px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center gap-2 shadow-md"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Chat;