import React, { useState, useRef, useEffect } from "react";
import { askQuestion, askSocratic } from "../services/api";
import { useAuth } from '../components/AuthContext';
import { useLocation } from "react-router-dom";

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

function Chat({ userId, materialId, useAllMaterials }) {
  const location = useLocation();
  const [chatListLoading, setChatListLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [chatList, setChatList] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("normal"); // normal | socratic
  const { user, loads } = useAuth();
  const curr_user = user?.userId || null;

  const messagesEndRef = useRef(null);
  const scrollToBottom = () =>
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });


  // Load Chat List
  const loadChatList = async () => {
    setChatListLoading(true); // start loading
    try {
      const res = await fetch(`${API_BASE}/tutor/list/${userId}`);
      const data = await res.json();
      setChatList(data.chats || []);
    } catch (err) {
      console.error("Chat list error:", err);
    } finally {
      setChatListLoading(false); // finished loading
    }
  };

  useEffect(() => {
  if (!userId) return; // wait until userId is loaded

  (async () => {
    await loadChatList();

    const savedChatId = localStorage.getItem("activeChatId");
    if (savedChatId) {
      await loadMessages(savedChatId);
    }
  })();
}, [userId]);


  // New Chat
  const handleNewChat = () => {
    setActiveChatId(null);
    localStorage.removeItem("activeChatId");
    setMessages([]);
  };

  // Load Messages of a Chat
  const loadMessages = async (chatId) => {
    try {
      setActiveChatId(chatId);
      localStorage.setItem("activeChatId", chatId);

      const res = await fetch(`${API_BASE}/tutor/messages/${chatId}`);
      const data = await res.json();

      setMessages(data.messages || []);
    } catch (err) {
      console.error("Load messages error:", err);
    }
  };

  // Rename Chat
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

  // Delete Chat
  const deleteChat = async (chatId) => {
    if (!window.confirm("Delete this chat permanently?")) return;

    await fetch(`${API_BASE}/tutor/delete/${chatId}`, { method: "DELETE" });

    if (chatId === activeChatId) {
      setMessages([]);
      setActiveChatId(null);
    }

    loadChatList();
  };

  // Scroll messages down
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Send Message
  const handleSubmit = async (e) => {
  e.preventDefault();
  if (!input.trim() || loading) return;

  setLoading(true);
  const userMsg = { role: "user", content: input };
  setMessages((prev) => [...prev, userMsg]);

  let chatId = activeChatId;

  // CREATE NEW CHAT ONLY WHEN USER SENDS FIRST MESSAGE
  if (!chatId) {
    const res = await fetch(`${API_BASE}/tutor/new`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });

    const data = await res.json();
    chatId = data.chat._id;
    setActiveChatId(chatId);
    localStorage.setItem("activeChatId", chatId);  // SAVE NEW CHAT ID
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
        content: response.questions?.join("\n\n") || "No questions.",
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

        // update updatedAt locally
        const updatedChat = { ...chat, updatedAt: new Date().toISOString() };

        // move to top
        return [updatedChat, ...prev.filter((c) => c._id !== chatId)];
      });
    };

    bumpChatToTop(chatId);
    setMessages((prev) => [...prev, aiMsg]);

    // AUTO-RENAME CHAT AFTER FIRST AI MESSAGE
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
    <div className="chat-layout">

      {/* --------------------------------------------------
          Sidebar: Chat List
      ----------------------------------------------------- */}
      <div className="chat-sidebar">
        <div className="sidebar-header">
          <h3>Your Chats</h3>
          <button onClick={handleNewChat}>➕ New Chat</button>
        </div>

        {chatListLoading ? (
          <p>Loading chats...</p> // can replace with a spinner if you have one
        ) : chatList.length === 0 ? (
          <p>No chats yet.</p>
        ) : (
          <ul className="chat-list">
            {chatList.map((chat) => (
              <li
                key={chat._id}
                className={activeChatId === chat._id ? "active" : ""}
              >
                <span onClick={() => loadMessages(chat._id)}>
                  {chat.title || "Untitled Chat"}
                </span>
                <div className="chat-actions">
                  <button onClick={() => renameChat(chat._id)}>✏️</button>
                  <button onClick={() => deleteChat(chat._id)}>🗑️</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>


      {/* --------------------------------------------------
          Chat Window
      ----------------------------------------------------- */}
      <div className="chat-container">

        <div className="chat-header">
          <h2>AI Tutor</h2>

          <div className="mode-toggle">
            <button
              className={mode === "normal" ? "active" : ""}
              onClick={() => setMode("normal")}
            >
              Direct Answer
            </button>
            <button
              className={mode === "socratic" ? "active" : ""}
              onClick={() => setMode("socratic")}
            >
              Socratic 🤔
            </button>
          </div>
        </div>

        <div className="messages-container">
          {messages.map((msg, i) => (
            <div key={i} className={`message ${msg.role}`}>
              <div className="message-text">{msg.content}</div>
              {msg.hint && <div className="hint">💡 {msg.hint}</div>}
            </div>
          ))}

          {loading && (
            <div className="message assistant">
              <div className="typing">
                <span></span><span></span><span></span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef}></div>
        </div>

        {/* --------------------------------------------------
            Input Form
        ----------------------------------------------------- */}
        <form onSubmit={handleSubmit} className="chat-input-form">
          <input
            type="text"
            value={input}
            disabled={loading}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              activeChatId ? "Type your message..." : "Start a new chat first"
            }
          />
          <button type="submit" disabled={!input.trim() || loading}>
            Send
          </button>
        </form>
      </div>
    </div>
  );
}

export default Chat;