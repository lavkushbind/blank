import { db } from "@/lib/firebase/client";
import { 
  doc, 
  setDoc, 
  updateDoc, 
  onSnapshot, 
  serverTimestamp, 
  arrayUnion, 
  arrayRemove 
} from "firebase/firestore";

export interface LiveRoomState {
  sessionId: string;
  batchName: string;
  teacherName: string;
  viewMode: "PDF" | "WHITEBOARD" | "GRID";
  pdfUrl?: string;
  pdfPage: number;
  isMutedAll: boolean;
  activePoll?: {
    question: string;
    options: string[];
    votes: number[];
    isOpen: boolean;
  } | null;
  raisedHands: string[];
  status: "LIVE" | "COMPLETED";
}

// 1. Initialize or join session state in Firestore
export async function initializeRoomState(sessionId: string, isTeacher: boolean, participantName: string) {
  try {
    const roomRef = doc(db, "active_classes", sessionId);
    if (isTeacher) {
      await setDoc(
        roomRef,
        {
          sessionId,
          teacherName: participantName,
          viewMode: "PDF",
          pdfPage: 1,
          isMutedAll: false,
          activePoll: null,
          raisedHands: [],
          status: "LIVE",
          startedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }
  } catch (err) {
    console.warn("Firestore room state init (using fallback offline state)", err);
  }
}

// 2. Real-time Room Listener
export function subscribeToRoomState(sessionId: string, onUpdate: (state: LiveRoomState) => void) {
  try {
    const roomRef = doc(db, "active_classes", sessionId);
    return onSnapshot(roomRef, (snapshot) => {
      if (snapshot.exists()) {
        onUpdate(snapshot.data() as LiveRoomState);
      }
    });
  } catch (err) {
    console.warn("Firestore snapshot listener error", err);
    return () => {};
  }
}

// 3. Teacher updates Stage View (PDF / Whiteboard / Grid)
export async function updateStageViewMode(sessionId: string, mode: "PDF" | "WHITEBOARD" | "GRID") {
  try {
    const roomRef = doc(db, "active_classes", sessionId);
    await updateDoc(roomRef, { viewMode: mode });
  } catch (err) {
    console.error("Failed to update view mode in Firestore", err);
  }
}

// 4. Teacher changes PDF Page
export async function updatePdfPage(sessionId: string, pageNumber: number) {
  try {
    const roomRef = doc(db, "active_classes", sessionId);
    await updateDoc(roomRef, { pdfPage: pageNumber });
  } catch (err) {
    console.error("Failed to update PDF page in Firestore", err);
  }
}

// 5. Raise / Lower Hand in Firestore
export async function setStudentHandRaise(sessionId: string, studentName: string, raise: boolean) {
  try {
    const roomRef = doc(db, "active_classes", sessionId);
    if (raise) {
      await updateDoc(roomRef, { raisedHands: arrayUnion(studentName) });
    } else {
      await updateDoc(roomRef, { raisedHands: arrayRemove(studentName) });
    }
  } catch (err) {
    console.error("Failed to update hand raise", err);
  }
}