export interface LiveKitTokenRequest {
  roomName: string;
  participantName: string;
  participantIdentity: string;
  role: "teacher" | "student" | "observer";
}

export interface AttentionMinuteFrame {
  minuteIndex: number; // 1 to 60
  earAverage: number;  // Eye Aspect Ratio (Normal: 0.25 - 0.35, Sleepy: < 0.20)
  headPoseYaw: number; // Degrees (> 25 = Distracted)
  headPosePitch: number;
  attentionScore: number; // 0 - 100%
  isDrowsy: boolean;
  isLookingAway: boolean;
}

export interface ClassDiagnosticReport {
  sessionId: string;
  batchId: string;
  studentId: string;
  date: string;
  timeline: AttentionMinuteFrame[];
  averageScore: number;
  voiceNoteUrl?: string;
  ratings: {
    conceptualClarity: number; // 1 to 5
    participation: number;
    homeworkDiscipline: number;
  };
  aiPedagogicalSummary?: string;
}
