// src/services/chatService.js
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocs,
  doc,
  serverTimestamp,
  updateDoc
} from 'firebase/firestore';
import { ref, set, onValue, onDisconnect } from 'firebase/database';
import { db, realtimeDb } from './firebase';
import { deleteDoc } from "firebase/firestore";

export const deleteMessage = async (messageId) => {
  try {
    await deleteDoc(doc(db, "messages", messageId));
  } catch (error) {
    console.error("Error deleting message:", error);
    throw error;
  }
};

// Get or create conversation between two users
export const getOrCreateConversation = async (userId1, userId2) => {
  try {
    const conversationsRef = collection(db, 'conversations');
    
    // Query for existing conversation
    const q = query(
      conversationsRef,
      where('members', 'array-contains', userId1)
    );
    
    const querySnapshot = await getDocs(q);
    let conversationId = null;

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.members.includes(userId2)) {
        conversationId = doc.id;
      }
    });

    // Create new conversation if doesn't exist
    if (!conversationId) {
      const newConversation = await addDoc(conversationsRef, {
        members: [userId1, userId2],
        createdAt: serverTimestamp(),
        lastMessage: '',
        lastMessageAt: serverTimestamp()
      });
      conversationId = newConversation.id;
    }

    return conversationId;
  } catch (error) {
    console.error('Error getting/creating conversation:', error);
    throw error;
  }
};

// Send a message
export const sendMessage = async (conversationId, senderId, message) => {
  try {
    const messagesRef = collection(db, 'messages');
    
    await addDoc(messagesRef, {
      conversationId,
      senderId,
      message,
      createdAt: serverTimestamp(),
      read: false
    });

    // Update conversation's last message
    const conversationRef = doc(db, 'conversations', conversationId);
    await updateDoc(conversationRef, {
      lastMessage: message,
      lastMessageAt: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

// Subscribe to messages in a conversation
export const subscribeToMessages = (conversationId, callback) => {
  const messagesRef = collection(db, 'messages');
  const q = query(
    messagesRef,
    where('conversationId', '==', conversationId),
    orderBy('createdAt', 'asc')
  );

  return onSnapshot(q, (snapshot) => {
    const messages = [];
    snapshot.forEach((doc) => {
      messages.push({ id: doc.id, ...doc.data() });
    });
    callback(messages);
  });
};

// Subscribe to user's conversations
export const subscribeToConversations = (userId, callback) => {
  const conversationsRef = collection(db, 'conversations');
  const q = query(
    conversationsRef,
    where('members', 'array-contains', userId),
    orderBy('lastMessageAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const conversations = [];
    snapshot.forEach((doc) => {
      conversations.push({ id: doc.id, ...doc.data() });
    });
    callback(conversations);
  });
};

// Typing indicator
export const setTypingStatus = (conversationId, userId, isTyping) => {
  const typingRef = ref(realtimeDb, `typing/${conversationId}/${userId}`);
  set(typingRef, isTyping);
};

export const subscribeToTyping = (conversationId, userId, callback) => {
  const typingRef = ref(realtimeDb, `typing/${conversationId}`);
  
  return onValue(typingRef, (snapshot) => {
    const typingUsers = snapshot.val();
    if (typingUsers) {
      const isOtherUserTyping = Object.keys(typingUsers).some(
        key => key !== userId && typingUsers[key] === true
      );
      callback(isOtherUserTyping);
    } else {
      callback(false);
    }
  });
};

// Online presence
// Update the function signature to take both IDs
export const setUserOnlineStatus = async (authUid, customUserId, isOnline) => {
  // 1. Realtime DB uses the readable name (for the chat UI)
  const statusRef = ref(realtimeDb, `status/${customUserId}`);
  
  // 2. Firestore uses the random Auth UID (the actual document name)
  const userDocRef = doc(db, 'users', authUid);

  if (isOnline) {
    await set(statusRef, {
      state: 'online',
      lastChanged: Date.now()
    });

    // Update Firestore using the random string ID
    await updateDoc(userDocRef, {
      lastSeen: serverTimestamp()
    });

    onDisconnect(statusRef).set({
      state: 'offline',
      lastChanged: Date.now()
    });
  } else {
    await set(statusRef, {
      state: 'offline',
      lastChanged: Date.now()
    });
  }
};

export const subscribeToUserStatus = (userId, callback) => {
  const statusRef = ref(realtimeDb, `status/${userId}`);
  
  return onValue(statusRef, (snapshot) => {
    const status = snapshot.val();
    // console.log(userId, "  ]]]]");
    callback(status?.state || 'offline');
  });
};