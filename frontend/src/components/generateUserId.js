import { collection, query, where, getDocs } from "firebase/firestore";

export async function generateUniqueUserId(db, fullName) {
  const firstName = fullName.split(" ")[0].toLowerCase();

  while (true) {
    const random = Math.floor(1000 + Math.random() * 9000); // 4 digits
    const userId = `${firstName}_${random}`;

    const usersRef = collection(db, "users");
    const q = query(usersRef, where("userId", "==", userId));
    const snapshot = await getDocs(q);

    if (snapshot.empty) return userId; // unique ID found
  }
}
