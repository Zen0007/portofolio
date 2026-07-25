import { db } from "./firebase";
import {
  doc,
  getDoc,
  collection,
  addDoc,
  getDocs,
  where,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from "firebase/firestore";

export const COLLECTION_NAME = "brick_breaker_leaderboard";
const DEFAULT_SCORES = [];

/**
 * POST: Save a new high score to Firestore & LocalStorage
 */
export async function saveHighScore(playerName, score) {
  const isTaken = await existName(name);
  if (isTaken) {
    return;
  }

  const newEntry = {
    name: playerName,
    score: Number(score), // Ensure score is a number
    createdAt: serverTimestamp(),
  };

  try {
    await addDoc(collection(db, COLLECTION_NAME), newEntry);
    console.log("Score saved to Firestore!");
  } catch (error) {
    console.error("Firestore save failed, falling back to local:", error);
  }

  const currentLeaderboard = getLocalLeaderboard();
  currentLeaderboard.push({ name: playerName, score: Number(score) });
  currentLeaderboard.sort((a, b) => b.score - a.score);

  localStorage.setItem(
    COLLECTION_NAME,
    JSON.stringify(currentLeaderboard.slice(0, 10)),
  );
}

/**
 * GET: Fetch top 10 scores from Firestore
 */
export async function getLeaderboard() {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      orderBy("score", "desc"),
      limit(10),
    );

    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const scores = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        scores.push({
          name: data.name || "ANON",
          score: data.score || 0,
        });
      });

      console.log("Fetched Scores from Firestore:", scores); // Fixed variable name

      // Cache the latest Firestore data to localStorage
      localStorage.setItem(COLLECTION_NAME, JSON.stringify(scores));
      return scores;
    }
  } catch (error) {
    console.error("Error fetching Firestore leaderboard:", error);
  }

  // Fallback if query fails or collection is empty
  return getLocalLeaderboard();
}

export async function existName(playerName) {
  const formattedName = playerName.trim();
  const q = query(
    collection(db, COLLECTION_NAME),
    where("name", "==", formattedName), // Replace "name" with your actual field name
  );

  localStorage.removeItem(COLLECTION_NAME);

  const querySnapshot = await getDocs(q);
  console.log(querySnapshot);
  return !querySnapshot.empty; // Returns true if a match was found
}

function getLocalLeaderboard() {
  const saved = localStorage.getItem(COLLECTION_NAME);

  return saved ? JSON.parse(saved) : DEFAULT_SCORES;
}
