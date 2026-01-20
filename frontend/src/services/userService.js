// src/services/userService.js
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';

// Get all users except current user
export const getAllUsers = async (currentUserId) => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('userId', '!=', currentUserId));
    
    const querySnapshot = await getDocs(q);
    const users = [];
    
    querySnapshot.forEach((doc) => {
      users.push({ id: doc.id, ...doc.data() });
    });
    
    return users;
  } catch (error) {
    console.error('Error getting users:', error);
    throw error;
  }
};

export const getUserById = async (userId) => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where("userId", "==", userId));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0];
      const data = userDoc.data();
      
      // console.log("User found:", data);
      
      return { 
        id: userDoc.id, // This is the 'random string'
        userId: data.userId,
        fullName: data.name,
        email: data.email 
      };
    }
    
    console.log("No user found with userId:", userId);
    return null;
  } catch (error) {
    console.error('Error getting user:', error);
    throw error;
  }
};