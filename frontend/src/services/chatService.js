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
  updateDoc,
  arrayUnion, getDoc
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


export const deleteMessageForMe = async (messageId, userId, conversationId) => {
  console.log("=== DELETE FOR ME DEBUG ===");
  console.log("messageId:", messageId);
  console.log("userId:", userId);
  console.log("conversationId:", conversationId);
  
  if (!userId) {
    console.error("❌ User ID is missing!");
    throw new Error("User ID is required");
  }
  
  try {
    const messageRef = doc(db, "messages", messageId);
    
    // Check if message exists
    const messageDoc = await getDoc(messageRef);
    console.log("Message exists:", messageDoc.exists());
    console.log("Current message data:", messageDoc.data());
    
    // Update the message
    await updateDoc(messageRef, {
      deletedFor: arrayUnion(userId)
    });
    
    console.log("✅ Message updated successfully");
    
    // Verify the update
    const updatedDoc = await getDoc(messageRef);
    console.log("Updated message data:", updatedDoc.data());
    console.log("deletedFor array:", updatedDoc.data()?.deletedFor);
    
    // Update conversation's last message deleted status
    if (conversationId) {
      const conversationRef = doc(db, "conversations", conversationId);
      const conversationDoc = await getDoc(conversationRef);
      
      console.log("Conversation exists:", conversationDoc.exists());
      console.log("Current conversation data:", conversationDoc.data());
      
      if (conversationDoc.exists()) {
        await updateDoc(conversationRef, {
          lastMessageDeletedFor: arrayUnion(userId)
        });
        
        console.log("✅ Conversation updated successfully");
        
        // Verify conversation update
        const updatedConvo = await getDoc(conversationRef);
        console.log("Updated conversation data:", updatedConvo.data());
      }
    }
    
    console.log("=== DELETE FOR ME COMPLETE ===");
  } catch (error) {
    console.error("❌ Error in deleteMessageForMe:", error);
    console.error("Error code:", error.code);
    console.error("Error message:", error.message);
    throw error;
  }
};

// Update deleteMessageForEveryone
export const deleteMessageForEveryone = async (messageId, senderName, conversationId) => {
  const messageRef = doc(db, "messages", messageId);
  
  await updateDoc(messageRef, {
    deletedForEveryone: true,
    deletedBy: senderName,
    message: "This message has been deleted"
  });

  // Update conversation's last message deleted status
  const conversationRef = doc(db, "conversations", conversationId);
  
  await updateDoc(conversationRef, {
    lastMessageDeleted: true,
    lastMessage: "This message was deleted"
  });
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
      lastMessageAt: serverTimestamp(),
      lastMessageDeleted: false,  
      lastMessageDeletedFor: []   
    });

    return { success: true };
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

// Subscribe to messages in a conversation
export const subscribeToMessages = (conversationId, callback) => {
  console.log("Subscribing to messages for conversation:", conversationId);
  
  const messagesRef = collection(db, "messages");
  const q = query(
    messagesRef,
    where("conversationId", "==", conversationId),
    orderBy("createdAt", "asc")
  );

  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    
    console.log("Messages snapshot received:", messages.length);
    console.log("Raw messages:", messages.map(m => ({
      id: m.id,
      deletedFor: m.deletedFor,
      message: m.message
    })));
    
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