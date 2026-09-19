// Eye Aspect Ratio (EAR) Formula
// EAR = (||p2 - p6|| + ||p3 - p5||) / (2 * ||p1 - p4||)
// Values < 0.20 indicate closed eyes / drowsiness

interface Point {
  x: number;
  y: number;
}

function euclideanDistance(p1: Point, p2: Point): number {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

export function calculateEyeAspectRatio(landmarks: Point[]): { leftEAR: number; rightEAR: number; avgEAR: number } {
  // Landmark indices for MediaPipe 468/478 face mesh
  // Left Eye: [362, 385, 387, 263, 373, 380]
  const leftEye = [landmarks[362], landmarks[385], landmarks[387], landmarks[263], landmarks[373], landmarks[380]];
  // Right Eye: [33, 160, 158, 133, 153, 144]
  const rightEye = [landmarks[33], landmarks[160], landmarks[158], landmarks[133], landmarks[153], landmarks[144]];

  const computeEAR = (eye: Point[]) => {
    const dVertical1 = euclideanDistance(eye[1], eye[5]);
    const dVertical2 = euclideanDistance(eye[2], eye[4]);
    const dHorizontal = euclideanDistance(eye[0], eye[3]);
    return (dVertical1 + dVertical2) / (2.0 * dHorizontal);
  };

  const leftEAR = computeEAR(leftEye);
  const rightEAR = computeEAR(rightEye);
  const avgEAR = (leftEAR + rightEAR) / 2.0;

  return { leftEAR, rightEAR, avgEAR };
}