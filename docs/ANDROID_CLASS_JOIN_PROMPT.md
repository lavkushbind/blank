# Android agent: teacher-controlled class joining

Use API_BASE_URL=https://blanklearn-api-yhxglez5qa-el.a.run.app/ and Firebase project dark-6191f/database dark.

Remove all scheduled-date/start-time/end-time checks from Join buttons, room entry and reconnect. Scheduling is informational; membership/role/payment checks remain on the server.

Every protected request sends Authorization: Bearer <Firebase ID token>.

Student: GET /api/class_sessions/{sessionId}/status. Read session.studentJoinAllowed and session.studentJoinMessage. If allowed, GET /api/livekit/token?sessionId={sessionId} and connect the native LiveKit SDK using response.serverUrl and response.token. Refresh status while waiting; do not invent another local clock gate.

Teacher: make Start one action: fetch the teacher's room token, PATCH /api/class_sessions/{sessionId}/status with {"status":"LIVE"}, then connect. Handle any failed step visibly. For an already LIVE session, reconnect without restarting it. The teacher must be assigned and verified.

On teacher end, PATCH {"status":"ENDED"}. Students observe terminal status and disconnect. OPEN_FOR_JOIN/LIVE/PAUSED/TECHNICAL_ISSUE allow assigned student joins; SCHEDULED/PREPARING wait for the teacher; ENDED/COMPLETED/PROCESSING/CANCELLED are closed. The API reports joinPolicy=TEACHER_CONTROLLED.

Implement camera/mic permission recovery, audio routing and reconnect. Use the returned LiveKit WebSocket URL, not the API origin, for the media connection. Preserve web-compatible board/PDF/chat/poll events. Test future-dated and past-dated LIVE sessions, teacher-start-to-student-join, reconnect and teacher end on a real Android device. Do not claim media testing if it has not been run.
