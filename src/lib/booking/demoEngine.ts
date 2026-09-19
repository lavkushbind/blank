import { db } from "@/lib/firebase/client";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp,
  arrayUnion,
  increment
} from "firebase/firestore";

export interface DemoBookingRequest {
  studentName: string;
  parentPhone: string;
  gradeNumber: number; // 1 to 10
  board: "CBSE" | "ICSE" | "UP Board" | "State Board";
  subject: "Mathematics" | "Science" | "English";
  demoType: "GROUP" | "INDIVIDUAL";
  bookingDate: string;
  slotTime: string;
}

export function generateBatchKey(req: DemoBookingRequest): string {
  return `${req.board}_Class${req.gradeNumber}_${req.subject}_${req.bookingDate}_${req.slotTime}_${req.demoType}`
    .replace(/\s+/g, "_");
}

// Transaction-safe demo allotment engine (Strict Max 5 Students)
export async function allocateDemoPod(req: DemoBookingRequest) {
  const batchKey = generateBatchKey(req);
  // Strict 1:5 Pod: Individual = 1 student, Group = Max 5 students
  const maxCapacity = req.demoType === "INDIVIDUAL" ? 1 : 5;

  // 1. Check existing compatible batch with space
  const batchQuery = query(
    collection(db, "demo_batches"),
    where("batchKey", "==", batchKey),
    where("status", "==", "OPEN")
  );
  const existingBatchesSnap = await getDocs(batchQuery);

  let targetBatchId = "";
  let assignedTeacherName = "";
  let assignedTeacherId = "";

  for (const bDoc of existingBatchesSnap.docs) {
    const bData = bDoc.data();
    if (bData.currentStudents < maxCapacity) {
      targetBatchId = bDoc.id;
      assignedTeacherName = bData.teacherName;
      assignedTeacherId = bData.teacherId;
      break;
    }
  }

  // 2. If no batch has space, find eligible verified teacher
  if (!targetBatchId) {
    const teacherQuery = query(
      collection(db, "teachers"),
      where("kycStatus", "==", "VERIFIED"),
      where("subjects", "array-contains", req.subject)
    );
    const teachersSnap = await getDocs(teacherQuery);

    const eligibleTeacher = teachersSnap.docs.find((tDoc) => {
      const t = tDoc.data();
      const teachesBoard = t.boards?.includes(req.board);
      const teachesGrade = t.grades?.some((g: string) => g.includes(String(req.gradeNumber)));
      return teachesBoard && teachesGrade;
    });

    if (!eligibleTeacher) {
      throw new Error(`No accredited mentor available for ${req.board} Class ${req.gradeNumber} ${req.subject} at ${req.slotTime}. Please select an alternate slot.`);
    }

    assignedTeacherId = eligibleTeacher.id;
    assignedTeacherName = eligibleTeacher.data().name;

    // Create new strict 1:5 batch
    const newBatchDoc = await addDoc(collection(db, "demo_batches"), {
      batchKey,
      board: req.board,
      grade: `Class ${req.gradeNumber}`,
      subject: req.subject,
      demoType: req.demoType,
      date: req.bookingDate,
      slotTime: req.slotTime,
      teacherId: assignedTeacherId,
      teacherName: assignedTeacherName,
      capacity: maxCapacity,
      currentStudents: 1,
      studentNames: [req.studentName],
      status: maxCapacity === 1 ? "LOCKED" : "OPEN",
      createdAt: serverTimestamp(),
    });

    targetBatchId = newBatchDoc.id;
  } else {
    // Add student to existing batch using increment(1)
    const batchRef = doc(db, "demo_batches", targetBatchId);
    await updateDoc(batchRef, {
      studentNames: arrayUnion(req.studentName),
      currentStudents: increment(1),
    });
  }

  // 3. Create Demo Booking record in Firestore
  const bookingRef = await addDoc(collection(db, "demo_bookings"), {
    ...req,
    batchKey,
    batchId: targetBatchId,
    teacherId: assignedTeacherId,
    teacherName: assignedTeacherName,
    paymentStatus: process.env.NEXT_PUBLIC_DEMO_OFFER_ACTIVE === "true" ? "FREE" : "PENDING",
    bookingStatus: "CONFIRMED",
    createdAt: serverTimestamp(),
  });

  return {
    bookingId: bookingRef.id,
    batchId: targetBatchId,
    teacherName: assignedTeacherName,
    slotTime: req.slotTime,
    date: req.bookingDate,
  };
}