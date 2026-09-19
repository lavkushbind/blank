import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const db = admin.firestore();

// Scheduled every 15 minutes
export const autoBatchMatchmaker = functions.pubsub
  .schedule("every 15 minutes")
  .onRun(async (context) => {
    console.log("[Matchmaker Cron]: Scanning waitlisted students...");

    // Query unassigned students
    const waitlistSnapshot = await db
      .collection("waitlist")
      .where("status", "==", "PENDING")
      .limit(50)
      .get();

    if (waitlistSnapshot.empty) {
      console.log("[Matchmaker Cron]: No pending students on waitlist.");
      return null;
    }

    // Group students by Grade + Board + TimeSlot
    const groups: { [key: string]: Array<{ id: string; data: any }> } = {};

    waitlistSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const key = `${data.grade}_${data.board}_${data.timeSlot}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push({ id: doc.id, data });
    });

    // Form strict 1:5 pods when group reaches 3-5 students
    for (const key in groups) {
      const cohort = groups[key];
      if (cohort.length >= 3) {
        const podStudents = cohort.slice(0, 5); // Strictly Max 5 Students
        const sampleStudent = podStudents[0].data;

        // Find an approved teacher available for this slot
        const teacherSnapshot = await db
          .collection("teachers")
          .where("kycStatus", "==", "VERIFIED")
          .where("subjects", "array-contains", sampleStudent.subject)
          .limit(1)
          .get();

        const teacherId = teacherSnapshot.empty ? "teacher_rahul_default" : teacherSnapshot.docs[0].id;

        // Create new Pod Batch
        const newBatchRef = await db.collection("batches").add({
          name: `${sampleStudent.grade} - ${sampleStudent.subject} Pod`,
          grade: sampleStudent.grade,
          board: sampleStudent.board,
          subject: sampleStudent.subject,
          teacherId: teacherId,
          studentIds: podStudents.map((s) => s.id),
          capacity: 5,
          enrolledCount: podStudents.length,
          timeSlot: sampleStudent.timeSlot,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          isActive: true,
        });

        // Mark students as ENROLLED
        const batchOp = db.batch();
        podStudents.forEach((s) => {
          batchOp.update(db.collection("waitlist").doc(s.id), {
            status: "ENROLLED",
            batchId: newBatchRef.id,
          });
        });
        await batchOp.commit();

        console.log(`[Matchmaker Cron]: Pod ${newBatchRef.id} created with ${podStudents.length}/5 students.`);
      }
    }

    return null;
  });