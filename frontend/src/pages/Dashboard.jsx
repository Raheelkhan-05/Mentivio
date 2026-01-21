import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../components/AuthContext";
import {
  getOrCreateConversation,
  sendMessage,
  subscribeToMessages,
  subscribeToConversations,
  setTypingStatus,
  subscribeToTyping,
  subscribeToUserStatus,
  deleteMessageForMe,
  deleteMessageForEveryone,
} from "../services/chatService";
import { getAllUsers, getUserById } from "../services/userService";
import {
  writeBatch,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "../services/firebase";

// Stroke Icons
const SearchIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    strokeWidth="2"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
    />
  </svg>
);

const SendIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    strokeWidth="2"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
    />
  </svg>
);

const TrashIcon = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    strokeWidth="2"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
    />
  </svg>
);

const MenuIcon = () => (
  <svg
    className="w-6 h-6"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    strokeWidth="2"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4 6h16M4 12h16M4 18h16"
    />
  </svg>
);

const MessageSquareIcon = () => (
  <svg
    className="w-6 h-6"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    strokeWidth="2"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
    />
  </svg>
);
//message read tick style svg
const DoubleTick = ({ read }) => (
  <svg
    width="18"
    height="12"
    viewBox="0 0 18 12"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M1 6L4.5 9.5L10 2"
      stroke={read ? "#53bdeb" : "#9ca3af"}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M7 6L10.5 9.5L16 2"
      stroke={read ? "#53bdeb" : "#9ca3af"}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// Subtle color palette for avatars
const avatarColors = [
  "from-green-100 to-green-200 text-green-700",
  "from-blue-100 to-blue-200 text-blue-700",
  "from-purple-100 to-purple-200 text-purple-700",
  "from-pink-100 to-pink-200 text-pink-700",
  "from-yellow-100 to-yellow-200 text-yellow-700",
  "from-red-100 to-red-200 text-red-700",
  "from-indigo-100 to-indigo-200 text-indigo-700",
  "from-teal-100 to-teal-200 text-teal-700",
];

const getAvatarColor = (userId) => {
  if (!userId) return avatarColors[0];
  const index =
    userId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) %
    avatarColors.length;
  return avatarColors[index];
};

const getInitials = (name) => {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name[0].toUpperCase();
};

const Avatar = ({
  name,
  userId,
  size = "md",
  showOnline = false,
  isOnline = false,
}) => {
  const sizes = {
    sm: "w-10 h-10 text-sm",
    md: "w-12 h-12 text-base",
    lg: "w-16 h-16 text-xl",
  };

  const dotSizes = {
    sm: "w-2.5 h-2.5",
    md: "w-3 h-3",
    lg: "w-3.5 h-3.5",
  };

  return (
    <div className="relative">
      <div
        className={`${sizes[size]} bg-gradient-to-br ${getAvatarColor(
          userId
        )} rounded-full flex items-center justify-center font-semibold`}
      >
        {getInitials(name)}
      </div>
      {showOnline && isOnline && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className={`absolute bottom-0 right-0 ${dotSizes[size]} bg-green-400 rounded-full border-2 border-white`}
        />
      )}
    </div>
  );
};
//msg read status check and formating
const formatUnreadCount = (count) => {
  if (!count || count <= 0) return null;
  return count > 4 ? "4+" : count;
};


// ---- DATE HELPERS (UI ONLY) ----
const isSameDay = (d1, d2) =>
  d1.getFullYear() === d2.getFullYear() &&
  d1.getMonth() === d2.getMonth() &&
  d1.getDate() === d2.getDate();

const getDateLabel = (date) => {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (isSameDay(date, today)) return "Today";
  if (isSameDay(date, yesterday)) return "Yesterday";

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const DeleteMenu = ({ onDeleteForMe, onDeleteForEveryone, onClose, isOwnMessage, position = 'right' }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.95 }}
    className={`absolute ${position === 'right' ? 'right-0' : 'left-0'} mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50`}
  >
    <button
      onClick={onDeleteForMe}
      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
    >
      Delete for me
    </button>
    {isOwnMessage && (
      <button
        onClick={onDeleteForEveryone}
        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors border-t border-gray-100"
      >
        Delete for everyone
      </button>
    )}
  </motion.div>
);

const Dashboard = () => {
  const { user, loading } = useAuth();
  const userId = user?.userId || null;

  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [users, setUsers] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [receiverInfo, setReceiverInfo] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [onlineStatus, setOnlineStatus] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [showDeleteMenu, setShowDeleteMenu] = useState(null); // stores message id
  const deleteMenuRef = useRef(null);

  const [isDesktop, setIsDesktop] = useState(
    window.matchMedia("(min-width: 1024px)").matches
  );

  const messageRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const messagesContainerRef = useRef(null);

  useEffect(() => {
    if (!isDesktop && !selectedConversation) {
      setShowMobileMenu(true);
    }
  }, [isDesktop, selectedConversation]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)");

    const handleResize = (e) => {
      setIsDesktop(e.matches);
    };

    mediaQuery.addEventListener("change", handleResize);

    return () => mediaQuery.removeEventListener("change", handleResize);
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop =
        messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Load conversations
  // useEffect(() => {
  //   if (!userId) return;

  //   const unsubscribe = subscribeToConversations(userId, async (convos) => {
  //     const conversationsWithUsers = await Promise.all(
  //       convos.map(async (convo) => {
  //         const otherUserId = convo.members.find((id) => id !== userId);
  //         const otherUsers = await getUserById(otherUserId);
  //         return {
  //           ...convo,
  //           otherUsers,
  //         };
  //       })
  //     );
  //     setConversations(conversationsWithUsers);
  //   });

  //   return () => unsubscribe();
  // }, [userId]);

  useEffect(() => {
    if (!userId) return;

    const unsubscribe = subscribeToConversations(userId, async (convos) => {
      const conversationsWithUsers = await Promise.all(
        convos.map(async (convo) => {
          const otherUserId = convo.members.find((id) => id !== userId);
          const otherUsers = await getUserById(otherUserId);

          //  COUNT UNREAD MESSAGES
          const messagesRef = collection(db, "messages");
          const q = query(
            messagesRef,
            where("conversationId", "==", convo.id),
            where("senderId", "!=", userId),
            where("read", "==", false)
          );

          const snapshot = await getDocs(q);

           // GET LAST MESSAGE AND CHECK IF DELETED
        let displayLastMessage = convo.lastMessage || "" ;
        console.log(convo.lastMessage);
        
        if (convo.lastMessage) {
          // Check if last message was deleted for everyone
          if (convo.lastMessageDeleted === true) {
            displayLastMessage = "This message was deleted";
          }
          // Check if last message was deleted for this user
          else if (convo.lastMessageDeletedFor?.includes(userId)) {
            displayLastMessage = "";
          }
        }

          return {
            ...convo,
            otherUsers,
            unreadCount: snapshot.size, // IMPORTANT
            displayLastMessage
          };
        })
      );

      //STORE UNREAD COUNTS
      const counts = {};
      conversationsWithUsers.forEach((c) => {
        counts[c.id] = c.unreadCount;
      });

      setUnreadCounts(counts);
      setConversations(conversationsWithUsers);
    });

    return () => unsubscribe();
  }, [userId]);

  // Load all users
  useEffect(() => {
    if (!userId) return;

    const loadUsers = async () => {
      const allUsers = await getAllUsers(userId);
      setUsers(allUsers);

      allUsers.forEach((u) => {
        subscribeToUserStatus(u.userId, (status) => {
          setOnlineStatus((prev) => ({
            ...prev,
            [u.userId]: status,
          }));
        });
      });
    };

    loadUsers();
  }, [userId]);

  // Subscribe to messages when conversation is selected
  // useEffect(() => {
  //   if (!selectedConversation) return;

  //   const unsubscribe = subscribeToMessages(selectedConversation, (msgs) => {
  //     setMessages(msgs);
  //   });

  //   return () => unsubscribe();
  // }, [selectedConversation]);

  useEffect(() => {
  if (!selectedConversation) return;

  const unsubscribe = subscribeToMessages(selectedConversation, (msgs) => {
    console.log("=== MESSAGES RECEIVED ===");
    console.log("Total messages:", msgs.length);
    console.log("Current userId:", userId);
    
    // Filter and log
    const filtered = msgs.filter(msg => {
      const isDeletedForMe = msg.deletedFor?.includes(userId);
      console.log(`Message ${msg.id}:`, {
        deletedFor: msg.deletedFor,
        isDeletedForMe,
        shouldShow: !isDeletedForMe
      });
      return !isDeletedForMe;
    });
    
    console.log("Filtered messages:", filtered.length);
    setMessages(filtered);
  });

  return () => unsubscribe();
}, [selectedConversation, userId]);

  // Mark messages as read

  useEffect(() => {
    const markMessagesAsRead = async () => {
      if (!selectedConversation || !user?.userId) return;

      const messagesRef = collection(db, "messages");
      const q = query(
        messagesRef,
        where("conversationId", "==", selectedConversation),
        where("senderId", "!=", user.userId),
        where("read", "==", false)
      );

      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const batch = writeBatch(db);
        querySnapshot.docs.forEach((msgDoc) => {
          batch.update(msgDoc.ref, { read: true });
        });

        await batch.commit();
        // CLEAR UNREAD BADGE LOCALLY
        setUnreadCounts((prev) => ({
          ...prev,
          [selectedConversation]: 0,
        }));
      }
    };

    markMessagesAsRead();
  }, [messages, selectedConversation, user?.userId]);

  // Subscribe to typing indicator
  useEffect(() => {
    if (!selectedConversation || !userId) return;

    const unsubscribe = subscribeToTyping(
      selectedConversation,
      userId,
      (typing) => {
        setIsTyping(typing);
      }
    );

    return () => unsubscribe();
  }, [selectedConversation, userId]);

  // Search functionality
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setSearchResults([]);
      return;
    }

    const results = users.filter(
      (u) =>
        u.userId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.fullName?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setSearchResults(results);
  }, [searchQuery, users]);

const handleDeleteForMe = async (messageId) => {
  console.log("=== HANDLE DELETE FOR ME ===");
  console.log("messageId:", messageId);
  console.log("userId:", userId);
  console.log("selectedConversation:", selectedConversation);
  
  if (!userId) {
    console.error("❌ User ID not available");
    return;
  }
  
  if (!selectedConversation) {
    console.error("❌ No conversation selected");
    return;
  }
  
  try {
    await deleteMessageForMe(messageId, userId, selectedConversation);
    console.log("✅ Delete completed successfully");
    setShowDeleteMenu(null);
  } catch (error) {
    console.error("❌ Error deleting message:", error);
    console.error("Full error object:", JSON.stringify(error, null, 2));
  }
};

const handleDeleteForEveryone = async (messageId) => {
  try {
    await deleteMessageForEveryone(messageId, user?.name, selectedConversation);
    setShowDeleteMenu(null);
  } catch (error) {
    console.error("Error deleting message:", error);
  }
};

// Close delete menu when clicking outside
useEffect(() => {
  const handleClickOutside = (event) => {
    if (deleteMenuRef.current && !deleteMenuRef.current.contains(event.target)) {
      setShowDeleteMenu(null);
    }
  };

  document.addEventListener('mousedown', handleClickOutside);
  return () => document.removeEventListener('mousedown', handleClickOutside);
}, []);

  const handleUserClick = async (otherUser) => {
    const conversationId = await getOrCreateConversation(
      userId,
      otherUser.userId
    );
    setSelectedConversation(conversationId);
    setReceiverInfo({
      userId: otherUser.userId,
      name: otherUser.name || otherUser.fullName,
      email: otherUser.email,
    });
    setShowSearch(false);
    setSearchQuery("");
    setShowMobileMenu(false);
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !selectedConversation || !userId) return;

    try {
      await sendMessage(selectedConversation, userId, message);
      setMessage("");
      setTypingStatus(selectedConversation, userId, false);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleTyping = (e) => {
    setMessage(e.target.value);

    if (!selectedConversation || !userId) return;

    setTypingStatus(selectedConversation, userId, true);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setTypingStatus(selectedConversation, userId, false);
    }, 2000);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (loading) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-white">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xl font-medium text-gray-600"
        >
          Loading...
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-gradient-to-br from-gray-50 via-white to-gray-100 mt-16">
      <span
        className="
      relative flex flex-col
      mx-0
      min-[1330px]:w-full
      min-[1330px]:max-w-7xl
      min-[1330px]:mx-auto

    "
      >
        <div
          className="
          animated-glow
        pointer-events-none
        absolute inset-y-0 -inset-x-8
        bg-gradient-to-b
        from-green-400/40
        via-blue-500/35
        to-purple-500/40
        blur-3xl
        opacity-0
        transition-opacity duration-1 ease-out
        min-[1330px]:opacity-70
        w-full
      "
        />
        <div
          className="
          animated-glow
        relative flex flex-1
        min-[1330px]:bg-gradient-to-b
        min-[1330px]:from-green-400/50
        min-[1330px]:via-blue-500/40
        min-[1330px]:to-purple-500/50
        min-[1330px]:pl-[2px]
        min-[1330px]:pr-[1px]
      "
        >
          {/* <div className="w-screen max-w-7xl mx-auto h-[93vh] max-h-screen mt-16 flex bg-white relative overflow-hidden pb-5"> */}
          <div className="relative flex w-full h-[93vh] bg-white overflow-hidden">

          {!isDesktop && !showMobileMenu && (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={() => setShowMobileMenu(true)}
      className="
        fixed
        top-20
        left-4
        z-50
        p-2
        bg-white
        border
        border-gray-200
        rounded-lg
        shadow-md
        text-gray-700
        lg:hidden
      "
    >
      <MenuIcon />
    </motion.button>
  )}




            {/* Animated background gradients and shapes */}
            <div
              className="absolute top-0 left-0 w-[500px] h-[500px] bg-gradient-to-br from-blue-200/20 via-purple-200/15 to-transparent rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none animate-pulse"
              style={{ animationDuration: "8s" }}
            />
            <div
              className="absolute top-1/4 right-0 w-[400px] h-[400px] bg-gradient-to-bl from-green-200/15 via-blue-200/10 to-transparent rounded-full blur-3xl translate-x-1/3 pointer-events-none animate-pulse"
              style={{ animationDuration: "10s", animationDelay: "2s" }}
            />
            <div
              className="absolute bottom-0 left-1/4 w-[350px] h-[350px] bg-gradient-to-tr from-purple-200/15 via-pink-200/10 to-transparent rounded-full blur-3xl translate-y-1/2 pointer-events-none animate-pulse"
              style={{ animationDuration: "12s", animationDelay: "4s" }}
            />
            <div
              className="absolute bottom-0 right-0 w-[450px] h-[450px] bg-gradient-to-tl from-indigo-200/20 via-blue-200/15 to-transparent rounded-full blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none animate-pulse"
              style={{ animationDuration: "9s", animationDelay: "1s" }}
            />
            {/* Subtle background gradient blobs */}
            <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-blue-100/30 to-purple-100/30 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-br from-green-100/30 to-blue-100/30 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none" />

            {/* Mobile Menu Button */}
            {/* <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg border border-gray-200 text-gray-700"
            >
              {showMobileMenu ? <XIcon /> : <MenuIcon />}
            </motion.button> */}

            {/* LEFT SIDEBAR: Conversations */}
            <motion.div
              initial={false}
              animate={
                isDesktop
                  ? { x: 0 } 
                  : { x: showMobileMenu ? 0 : "-100%" } 
              }
              transition={{ type: "spring", stiffness: 260, damping: 30 }}
              className="fixed lg:relative top-16 lg:top-0 inset-x-0 lg:inset-y-0 left-0 z-40 w-80 bg-white border-r flex flex-col h-[calc(100vh-4rem)] lg:h-full"
            >
              {/* User Profile Header */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <Avatar name={user?.name} userId={user?.userId} size="lg" />
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">
                      {user?.name}
                    </h3>
                    <p className="text-sm text-gray-500">@{user?.userId}</p>
                  </div>
                </div>
              </div>

              {/* Search Panel */}
              <AnimatePresence>
                {true && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="border-b border-gray-100 overflow-hidden"
                  >
                    <div className="p-4">
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Search by userId..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full py-2.5 pl-10 pr-4 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        />
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                          <SearchIcon />
                        </div>
                      </div>

                      {/* Search Results */}
                      <AnimatePresence>
                        {searchResults.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="mt-3 bg-white border border-gray-200 rounded-lg max-h-60 overflow-y-auto"
                          >
                            {searchResults.map((u) => (
                              <motion.div
                                key={u.userId}
                                whileHover={{
                                  backgroundColor: "rgba(0,0,0,0.02)",
                                }}
                                onClick={() => handleUserClick(u)}
                                className="p-3 cursor-pointer transition-colors flex items-center space-x-3 border-b last:border-b-0"
                              >
                                <Avatar
                                  name={u.name || u.fullName}
                                  userId={u.userId}
                                  size="sm"
                                  showOnline={true}
                                  isOnline={onlineStatus[u.userId] === "online"}
                                />
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-sm font-medium text-gray-900 truncate">
                                    {u.name || u.fullName}
                                  </h4>
                                  <p className="text-xs text-gray-500 truncate">
                                    @{u.userId}
                                  </p>
                                </div>
                              </motion.div>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {searchQuery && searchResults.length === 0 && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="mt-3 text-center text-sm text-gray-500 py-4"
                        >
                          No users found
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Conversations List */}
              <div className="flex-1 min-h-0 overflow-y-auto whatsapp-scroll">


              {/* <div
                className="flex-1 min-h-0 overflow-y-auto
               flex flex-col"
              > */}
                <div className="p-4">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 px-2">
                    Messages
                  </h3>

                  {conversations.length > 0 ? (
                    <div className="space-y-1">
                      {conversations.map((convo) => (
                        <motion.div
                          key={convo.id}
                          whileHover={{ x: 4 }}
                          onClick={() => handleUserClick(convo.otherUsers)}
                          className={`p-3 rounded-lg cursor-pointer transition-all ${
                            selectedConversation === convo.id
                              ? "bg-blue-50 border border-blue-200"
                              : "hover:bg-gray-50 border border-transparent"
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <Avatar
                              name={convo.otherUsers?.fullName}
                              userId={convo.otherUsers?.userId}
                              size="md"
                              showOnline={true}
                              isOnline={
                                onlineStatus[convo.otherUsers?.userId] ===
                                "online"
                              }
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <h4 className="text-sm font-medium text-gray-900 truncate">
                                  {convo.otherUsers?.fullName}
                                </h4>

                                {unreadCounts[convo.id] > 0 && (
                                  <span
                                    className="
        ml-2
        min-w-[20px]
        h-5
        px-1.5
        rounded-full
        bg-red-500
        text-white
        text-xs
        font-semibold
        flex
        items-center
        justify-center
        leading-none
      "
                                  >
                                    {formatUnreadCount(unreadCounts[convo.id])}
                                  </span>
                                )}
                              </div>

                              {/* <h4 className="text-sm font-medium text-gray-900 truncate">
                                {convo.otherUsers?.fullName}
                              </h4> */}
                              <p className="text-xs text-gray-500 truncate">
                                {convo.displayLastMessage || "No messages yet"}
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center mt-10 text-gray-400 text-sm">
                      No conversations yet
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            {/* MAIN CHAT AREA */}
            <div className="flex-1 flex flex-col min-h-0 bg-white/50 backdrop-blur-sm relative z-10">
              {receiverInfo ? (
                <>
                  {/* Chat Header */}
                  <motion.div
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="h-16 bg-white/80 backdrop-blur-md border-b border-gray-200 flex items-center px-4"
                  >
                    <div className="flex items-center space-x-3">
                      {/* Hamburger */}
                      <button
                        onClick={() => setShowMobileMenu(true)}
                        className="lg:hidden p-2 rounded-md hover:bg-gray-100 text-gray-600"
                      >
                        <MenuIcon />
                      </button>

                      {/* Avatar */}
                      <Avatar
                        name={receiverInfo?.name}
                        userId={receiverInfo?.userId}
                        size="md"
                        showOnline={true}
                        isOnline={
                          onlineStatus[receiverInfo?.userId] === "online"
                        }
                      />

                      {/* Name + Status */}
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900">
                          {receiverInfo?.name}
                        </h3>
                        <p className="text-xs">
                          {isTyping ? (
                            <span className="text-blue-500">Typing...</span>
                          ) : (
                            <span
                              className={
                                onlineStatus[receiverInfo?.userId] === "online"
                                  ? "text-green-400"
                                  : "text-gray-400"
                              }
                            >
                              {onlineStatus[receiverInfo?.userId] === "online"
                                ? "Online"
                                : "Offline"}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </motion.div>

                  {/* Messages Area */}
                  <div
                    ref={messagesContainerRef}
                    className="flex-1 min-h-0 overflow-y-auto px-4 py-4 whatsapp-scroll"
                  >
                    {messages.length > 0 ? (
                      <div className="space-y-4">
                        <AnimatePresence>
                          {messages.map((msg, index) => {
                            const msgDate = msg.createdAt?.seconds
                              ? new Date(msg.createdAt.seconds * 1000)
                              : null;

                            const prevMsg = messages[index - 1];
                            const prevDate = prevMsg?.createdAt?.seconds
                              ? new Date(prevMsg.createdAt.seconds * 1000)
                              : null;

                            const showDateDivider =
                              msgDate && (!prevDate || !isSameDay(msgDate, prevDate));

                            return (
                              <React.Fragment key={msg.id || index}>
                                {/* DATE DIVIDER */}
                                {showDateDivider && (
                                  <motion.div
                                    initial={{ opacity: 0, y: -6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex justify-center my-4"
                                  >
                                    <span className="px-3 py-1 text-xs font-medium text-gray-500 bg-gray-100 border border-gray-200 rounded-full">
                                      {getDateLabel(msgDate)}
                                    </span>
                                  </motion.div>
                                )}

                                {/* MESSAGE BUBBLE (UNCHANGED) */}
                                <motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3 }}
  className={`flex items-center ${
    msg.senderId === userId ? "justify-end" : "justify-start"
  } group`}
>
   {/* Trash icon for YOUR messages (left side) */}
  {msg.senderId === userId && !msg.deletedForEveryone && (
    <motion.button
      initial={{ }}
      whileHover={{ scale: 1.1}}
      onClick={() => setShowDeleteMenu(showDeleteMenu === msg.id ? null : msg.id)}
      className="opacity-0 text-red-500 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-gray-100 rounded-full ml-2 flex-shrink-0"
    >
      <TrashIcon />
    </motion.button>
  )}


  {/* Message bubble */}
  <div className="max-w-[70%] md:max-w-md relative">
    {/* Delete menu */}
    <AnimatePresence>
      {showDeleteMenu === msg.id && (
        <div 
          ref={deleteMenuRef} 
          className={`absolute ${
            msg.senderId === userId ? 'right-25 -top-10' : 'left-16 -top-2'
          } z-50`}
        >
          <DeleteMenu
            onDeleteForMe={() => handleDeleteForMe(msg.id)}
            onDeleteForEveryone={() => handleDeleteForEveryone(msg.id)}
            onClose={() => setShowDeleteMenu(null)}
            isOwnMessage={msg.senderId === userId}
            position={msg.senderId === userId ? 'right' : 'left'}
          />
        </div>
      )}
    </AnimatePresence>

    <div
      className={`px-3 py-2 rounded-xl ${
        msg.senderId === userId
          ? "bg-blue-500 text-white rounded-br-md"
          : "bg-gray-100 text-gray-900 rounded-bl-md border border-gray-200"
      } ${msg.deletedForEveryone ? 'italic opacity-70' : ''}`}
    >
      <p className="text-sm leading-relaxed">
        {msg.deletedForEveryone 
          ? `This message was deleted by ${msg.deletedBy}`
          : msg.message
        }
      </p>
    </div>

    {/* Timestamp and read receipt */}
    <div
      className={`flex items-center mt-1 space-x-2 px-1 ${
        msg.senderId === userId
          ? "justify-end"
          : "justify-start"
      }`}
    >
      <span className="text-xs text-gray-400">
        {msgDate
          ? msgDate.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
          : ""}
      </span>

      {msg.senderId === userId && (
        <span className="flex items-center">
          <DoubleTick read={msg.read} />
        </span>
      )}
    </div>
  </div>

 
  {/* Trash icon for OTHER user's messages (right side) */}
{msg.senderId !== userId && (
  <motion.button
    initial={{ }}
    whileHover={{ scale: 1.1 }}
    onClick={() =>
      setShowDeleteMenu(showDeleteMenu === msg.id ? null : msg.id)
    }
    className="
      opacity-0
      group-hover:opacity-100
      transition-opacity
      
      
      text-red-500
      p-1.5
      hover:bg-gray-100
      rounded-full
      mr-2
      flex-shrink-0
      pointer-events-none
      group-hover:pointer-events-auto
    "
  >
    <TrashIcon />
  </motion.button>

  )}
</motion.div>
                              </React.Fragment>
                            );
                          })}
                        </AnimatePresence>
                        <AnimatePresence>
                          {isTyping && (
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 10 }}
                              className="flex justify-start"
                            >
                              <div className="bg-gray-100 px-4 py-3 rounded-2xl rounded-bl-md border border-gray-200">
                                <div className="flex space-x-1">
                                  <motion.div
                                    animate={{ y: [0, -6, 0] }}
                                    transition={{
                                      duration: 0.6,
                                      repeat: Infinity,
                                      repeatDelay: 0,
                                    }}
                                    className="w-2 h-2 bg-gray-400 rounded-full"
                                  />
                                  <motion.div
                                    animate={{ y: [0, -6, 0] }}
                                    transition={{
                                      duration: 0.6,
                                      repeat: Infinity,
                                      delay: 0.2,
                                    }}
                                    className="w-2 h-2 bg-gray-400 rounded-full"
                                  />
                                  <motion.div
                                    animate={{ y: [0, -6, 0] }}
                                    transition={{
                                      duration: 0.6,
                                      repeat: Infinity,
                                      delay: 0.4,
                                    }}
                                    className="w-2 h-2 bg-gray-400 rounded-full"
                                  />
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="h-full flex items-center justify-center"
                      >
                        <div className="flex flex-col items-center text-center text-gray-400">
                          <MessageSquareIcon className="w-10 h-10" />

                          <p className="text-sm mt-2">No messages yet</p>
                          <p className="text-xs mt-1 text-gray-300">
                            Start the conversation!
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* Message Input */}
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="bg-white/80 backdrop-blur-md border-t border-gray-200 px-6 py-6"
                  >
                    <div className="flex items-center space-x-3">
                      <input
                        type="text"
                        placeholder="Type a message..."
                        value={message}
                        onChange={handleTyping}
                        onKeyPress={handleKeyPress}
                        className="flex-1 py-2.5 px-4 bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      />
                      <motion.button
                        whileHover={{ scale: message.trim() ? 1.05 : 1 }}
                        whileTap={{ scale: message.trim() ? 0.95 : 1 }}
                        onClick={handleSendMessage}
                        disabled={!message.trim()}
                        className={`p-2.5 rounded-full transition-all ${
                          message.trim()
                            ? "bg-blue-500 text-white hover:bg-blue-600"
                            : "bg-gray-100 text-gray-400 cursor-not-allowed"
                        }`}
                      >
                        <SendIcon />
                      </motion.button>
                    </div>
                  </motion.div>
                </>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex-1 flex items-center justify-center"
                >
                  <div className="flex flex-col items-center text-center">
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      className="text-gray-300 mb-4"
                    >
                      <MessageSquareIcon className="w-12 h-12" />
                    </motion.div>

                    <h2 className="text-xl font-medium text-gray-700 mb-2">
                      Welcome to Chat
                    </h2>

                    <p className="text-sm text-gray-500">
                      Search for a user to start messaging
                    </p>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Overlay for mobile menu */}
            <AnimatePresence>
              {showMobileMenu && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowMobileMenu(false)}
                  className="lg:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-30 pointer-events-auto"
                />
              )}
            </AnimatePresence>
          </div>
        </div>
      </span>
    </div>
  );
};

export default Dashboard;