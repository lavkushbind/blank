interface Point3D {
  x: number;
  y: number;
  z: number;
}

export function estimateHeadPose(landmarks: Point3D[]): { yaw: number; pitch: number; isLookingAway: boolean } {
  const noseTip = landmarks[1];
  const leftEyeOuter = landmarks[263];
  const rightEyeOuter = landmarks[33];

  // Approximate horizontal center between eyes
  const eyeCenterX = (leftEyeOuter.x + rightEyeOuter.x) / 2;
  const eyeDistance = Math.abs(leftEyeOuter.x - rightEyeOuter.x);

  // Yaw (horizontal turn degrees approximation)
  const yaw = ((noseTip.x - eyeCenterX) / eyeDistance) * 100;

  // Pitch (vertical tilt degrees approximation)
  const eyeCenterY = (leftEyeOuter.y + rightEyeOuter.y) / 2;
  const pitch = ((noseTip.y - eyeCenterY) / eyeDistance) * 100;

  // Distraction Threshold: Yaw > 25° or Pitch > 25°
  const isLookingAway = Math.abs(yaw) > 25 || Math.abs(pitch) > 25;

  return { yaw, pitch, isLookingAway };
}