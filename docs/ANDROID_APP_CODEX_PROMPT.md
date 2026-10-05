# BlankLearn Android app — complete system context and Codex build prompt
> Hosting migration update: the existing `/api/...` handlers now have a Cloud Run deployment workflow in `docs/CLOUD_RUN_DEPLOYMENT.md`. Use the deployed Cloud Run origin as Android API_BASE_URL; do not assume Vercel is the API host. Firebase project `dark-6191f` and database `dark` stay unchanged. The server uses its attached service account, not credentials packaged in Android. Check the deployment guide for the actual verified URL and cutover status.

Copy this entire document into the Android coding agent's context. Also provide read access to the existing blanklearn-web repository. Based on source inspected on 28 September 2026; live production configuration has not been verified.

## 1. Task and source of truth

Build a working native Android app for BlankLearn, an online school-tuition platform. Reuse the existing web backend, Firebase identities, Firestore records, Razorpay payments and LiveKit classrooms. Existing students and teachers must see the same data on web and Android.

Do not create an independent database, duplicate booking engine, static demo app or WebView wrapper. Implement student and teacher journeys first. Add parent/admin functionality only against verified authorization and backend contracts.

First inspect this repository and write a concise API/data-contract audit. Executable route handlers and their current callers are authoritative. Distinguish existing behavior, proposed improvements and incomplete features. Do not treat old documentation or marketing text as proof a feature works. Implement available flows while isolating missing dependencies. Make backend improvements backward-compatible with the web app.

## 2. Product explained simply

BlankLearn offers small live learning batches: one teacher with a maximum of five students in group mode. Individual demos allow one student.

Student journey:
Sign in → profile → choose demo program/date/slot → server matches teacher and batch → free confirmation or verified payment → three demo sessions → course purchase eligibility → paid membership → scheduled regular classes → homework, resources and feedback.

Teacher journey:
Sign in → application, subjects, boards, classes and availability → application/KYC approval → assigned demos and batches → prepare/open classroom → teach → end session → attendance and summary → homework review, messages and recorded earnings.

| Record | Meaning |
| --- | --- |
| User | Firebase identity plus common profile |
| Student | Learning profile, grade/class and board |
| Teacher | Teaching capabilities, verification and availability |
| Demo booking | One student's demo reservation/purchase |
| Batch | Compatible group with teacher, capacity and members |
| Class session | One lesson with its own schedule and classroom ID |
| Enrollment | Student's trial/paid membership in a batch |
| Payment | Server order, amount and verification state |
| Batch request | Request for teaching; not a confirmed enrollment |

Example: a Class 6 CBSE student selects Math, GROUP and 18:00 IST on a chosen start date. The backend finds a suitable teacher/batch and schedules lessons on that date and the next two calendar days at the same slot. The student uses returned bookingId, batchId and sessionIds. Completion of all demo sessions enables purchase for the existing trial membership.

## 3. Infrastructure and mobile boundary

Current web stack: Next.js 15, TypeScript, React, Firebase Authentication, Firestore, Firebase Storage, LiveKit and Razorpay. The Next.js `/api/...` routes are the existing HTTP backend.

Both web client and server explicitly use Firestore database `dark`, not `(default)`. Configure Android in the intended existing Firebase project using an Android Firebase app registration. Do not copy a web app ID as Android configuration. Inspect named-database SDK support and deployed rules/indexes.

The Cloud Run backend was deployed on 28 September 2026 at https://blanklearn-api-yhxglez5qa-el.a.run.app. Configure Android API_BASE_URL as https://blanklearn-api-yhxglez5qa-el.a.run.app/ and retain `/api/...` endpoint paths. Use separate configuration for other environments. Android uses absolute HTTPS URLs and `Authorization: Bearer <Firebase ID token>` for protected endpoints. Browser cookies are not the mobile authentication contract. Refresh tokens through Firebase; derive authenticated identity on the backend.

Privileged operations remain server-side: allocation, pricing, payment signatures, access grants, teacher verification, protected uploads and admin settings. Some dashboards use Firestore listeners; reuse only access allowed by verified rules. If mobile needs missing operations, add authenticated APIs instead of opening database permissions.

Never package Firebase Admin credentials, service-account keys, Razorpay key secret or LiveKit API secret in Android. A public checkout key ID and a short-lived room token are not server secrets.

## 4. Authentication and role behavior

Existing student and teacher authentication supports email/password and Google sign-in. Implement native equivalents using current supported SDKs and preserve profile behavior.

Profiles live in users/{uid}, students/{uid} and teachers/{uid}. Do not overwrite a teacher profile or role when an existing identity enters student functionality. Room authorization includes assignment and teacher/student records; a local role selector cannot grant access.

Teacher fields include applicationStatus, kycStatus or historical nested KYC, subjects, boards, grades/classes, demoPrograms, teachingModes, availableSlots, group/individual availability, experience and rating. The backend matcher normalizes historical formats. Do not duplicate its full normalization logic in Android.

Unapproved teachers need a clear pending-verification state. The live token route requires application approval and accepted KYC status for the assigned teacher.

New platform management APIs require server-verified Firebase custom claim `admin: true`. An editable users.role field is insufficient. Older routes contain inconsistent role checks; audit these before adding mobile admin features.

## 5. Demo rules

Current demo configuration:

- Classes 1–10.
- Board IDs: CBSE, ICSE, STATE, OTHER.
- MATH_ONLY = Math; ENGLISH_ONLY = English; ALL_SUBJECTS = Math + Science + English.
- GROUP capacity 5; INDIVIDUAL capacity 1.
- Three consecutive calendar days, 60 minutes per session, same teacher and hourly slot.
- Slot IDs: 15_16, 16_17, 17_18, 18_19, 19_20, 20_21.
- Dates/times are IST: Asia/Kolkata, +05:30.

Do not invent three different teachers or a subject-per-day rotation for ALL_SUBJECTS; the current matcher finds one mentor capable of that program.

Effective demo pricing comes from platform settings. Defaults are demoFee INR 99 and freeDemo false, but runtime values override defaults. The fee covers the three-day journey, not each lesson. Free mode skips checkout. Existing bookings keep their recorded fee when settings change.

Legacy pricingEngine.ts contains coupons such as WELCOME and BL50. The active demo route uses platform settings instead of that coupon calculator. Do not advertise working coupons without a verified server contract.

## 6. Demo availability and booking

1. Authenticate as a student and collect studentName, classNumber, board, programId, demoType, date, slotId and contact details.
2. POST /api/demo/availability returns suggested options. It scans up to 14 days and returns at most 10 suggestions, with date, slotId, startTime, endTime, label, availableTeachers and hasExistingBatch.
3. Availability is advisory, not a held seat. Final booking may reject a suggested option.
4. POST /api/demo/book performs authoritative allocation using the authenticated UID.
5. Backend ensures the student's records, loads teacher capabilities and normalizes candidate batches.
6. Eligibility includes active teacher, approved/verified application and KYC, matching class/board, program or subject coverage, teaching mode and explicit day/slot availability.
7. Existing compatible batches receive preference; experience/rating affect ranking. The booking route checks availability across all three demo dates and tries eligible matches.
8. Server creates/updates booking, batch, enrollment, sessions and slot locks. Initial allocation is transactional; follow-up session scheduling is currently separate, so audit partial failures.
9. Use returned booking, pricing, teacher, batch, sessionIds, sessionDates and demoSessionCount. Do not generate equivalent records on-device.
10. Free booking grants confirmed trial access with paymentStatus NOT_REQUIRED. Paid booking stays pending until backend verification.
11. Handle NO_EXACT_MATCH, STUDENT_SLOT_BUSY, STUDENT_ALREADY_IN_BATCH and other conflicts with actionable messages and refreshed options. Do not blindly retry booking writes after timeout.

Example body, using an actually available future date:

```json
{
  "studentName": "Example Student",
  "classNumber": 6,
  "board": "CBSE",
  "programId": "MATH_ONLY",
  "demoType": "GROUP",
  "date": "YYYY-MM-DD",
  "slotId": "18_19",
  "phone": "CONTACT_PHONE"
}
```

Confirmation displays all three lessons, teacher, payment state and per-session join state. GET /api/student-demo-details returns linked sessions/teacher details. The web hub additionally observes the student's bookings and sessions through Firestore.

## 7. Batches, membership and regular lessons

Compatible batches match teacher, class, board, subjects/program, mode, date/day and slot. Capacity and conflicts must be enforced on the server under concurrent requests. Group capacity never exceeds five; individual capacity is one.

Collections used by the allocator include batches, demo_bookings, enrollments, class_sessions, teacher_slot_locks and student_slot_locks. Android must not manipulate allocation locks directly.

An enrollment ID convention is `{batchId}_{studentId}`. Common membership states are TRIAL and ACTIVE; some compatibility logic recognizes ENROLLED. Pending payment must not grant access just because a batch card exists. GET /api/student-batches reads assigned batches and filters ended/cancelled/archived records.

A demo booking is not the batch itself, and one batch can have multiple lesson sessions. A paid membership is not a timetable. Course activation upgrades the trial's booking/enrollment but does not by itself prove that a complete recurring schedule has been generated.

Teachers have a server session-creation route. If automatic recurring lessons are required, implement server scheduling with plan frequency, dates, availability, capacity, conflicts, retries and idempotency. Never generate fake local sessions to fill the Android calendar.

## 8. Payments and course conversion

Create/resume checkout with POST /api/razorpay/order. Supply bookingId and purchaseType DEMO_BOOKING or COURSE_PURCHASE. Course orders also require planType. The server checks ownership/eligibility and computes price.

The response supplies orderId, amount, currency and keyId, or free confirmation. This backend returns/stores rupees and converts to paise when creating the provider order. Verify native checkout units and convert exactly once.

After native checkout callback, POST required order/payment/signature fields and bookingId to /api/razorpay/verify. Read that handler and the existing web caller for exact field names. Client checkout success alone must not activate access. Backend verifies ownership, signature, captured provider payment, amount and currency.

On cancellation, network loss or app restart, reconcile with server state. A failed callback does not prove money was not captured. Inspect the configured Razorpay webhook and duplicate-event handling; both current Next.js and older Functions handlers exist.

Verified demo payment sets PAID, confirms booking, grants TRIAL enrollment and adds the student to linked sessions. The helper tolerates repeated verification.

Teachers end each demo through the status API. Backend records completedSessionIds, then demoStatus COMPLETED and demoCompletedAt when all required sessions finish. This is session completion bookkeeping, not proof of each student's attendance.

Course purchase requires a matching trial enrollment and completed demos. Current fallback plan totals:

| Plan | Months | Classes/week | Regular INR | Offer INR |
| --- | --- | --- | --- | --- |
| M1_D3 | 1 | 3 | 1500 | 1500 |
| M1_D6 | 1 | 6 | 2500 | 2500 |
| M3_D3 | 3 | 3 | 4500 | 4200 |
| M3_D6 | 3 | 6 | 7500 | 7000 |
| M6_D3 | 6 | 3 | 9000 | 8100 |
| M6_D6 | 6 | 6 | 15000 | 13500 |

Fetch live settings; do not hardcode these as current prices. Offer requires offersEnabled, completed demo, plan longer than one month and purchase within 72 hours of demoCompletedAt. Banner text does not authorize a discount.

Verified course payment grants ACTIVE membership and records plan, frequency, activation and expiry. Current duration is months × 30 days, meaning 30/90/180 days, not calendar-month arithmetic. Renewals, refunds, cancellation, expiration enforcement and recurring scheduling need explicit backend contracts where absent.

## 9. Live class lifecycle

Use LiveKit audio/video. Do not switch to Agora, Zoom or another provider because an older file mentions it.

Session states and currently accepted transitions:

| Current | Allowed different next states |
| --- | --- |
| SCHEDULED / PREPARING | OPEN_FOR_JOIN, LIVE, CANCELLED |
| OPEN_FOR_JOIN | LIVE, ENDED, CANCELLED |
| LIVE | ENDED, PAUSED, TECHNICAL_ISSUE |
| PAUSED | LIVE, ENDED, TECHNICAL_ISSUE |
| TECHNICAL_ISSUE | LIVE, PAUSED, ENDED |
| ENDED / PROCESSING / COMPLETED / CANCELLED | None through the current PATCH route |

Do not invent an ENDED → COMPLETED PATCH. Post-class submission records additional information and does not imply that transition.

Teacher:

1. Select an assigned lesson or create an authorized lesson via POST /api/class_sessions/create.
2. GET /api/class_sessions/{sessionId}/status and check assignment, approval/KYC and state.
3. GET /api/livekit/token?sessionId=... with Firebase authentication.
4. Connect using the server's connection data and identity. Current token TTL is two hours.
5. Preview devices and PATCH status with `{ "status": "OPEN_FOR_JOIN" }` to admit eligible students, then LIVE as appropriate.
6. Teach, pause/resume or report technical trouble through supported states.
7. PATCH ENDED, release room/media resources and submit post-class details.

Student:

1. Open an assigned session and fetch its status and IST schedule.
2. Treat the scheduled date/time as information only; do not disable joining based on the device clock.
3. Wait for teacher opening; once open, join at any date/time until the teacher ends the session.
4. Request an authorized room token and connect using the server response.
5. On disconnection, show reconnect state and rejoin only while authorized.

Joining is teacher-controlled, with no scheduled-time restriction. The status API returns studentJoinAllowed, studentJoinMessage and joinPolicy=TEACHER_CONTROLLED. OPEN_FOR_JOIN, LIVE, PAUSED and TECHNICAL_ISSUE allow assigned students to join. SCHEDULED/PREPARING wait for the teacher; ENDED/COMPLETED/PROCESSING/CANCELLED are closed. The token endpoint enforces the same lifecycle policy and membership authorization. Teacher Start uses PATCH status LIVE and opens the assigned room in one action.

Mobile must handle camera/microphone permission, denied-permission recovery, preview, mute/unmute, camera switching, speaker/headset routes, rotation, weak connectivity, reconnect and background/foreground transitions. Leaving or ending must not leave camera/microphone running. Verify target-SDK foreground-service/background media requirements during implementation.

## 10. Classroom tools and web/Android interoperability

Inspect active web components: LiveKitClassroom, SuperWhiteboard, SharedPDFViewer, InClassChat, RaiseHandQueue, InClassReactions and LivePollModal. Native implementations must use compatible wire contracts.

| Feature | Existing transport/event |
| --- | --- |
| Room chat | Reliable LiveKit JSON: CHAT_MESSAGE |
| Raise/lower hand | RAISE_HAND, LOWER_HAND |
| Reactions | EMOJI_REACTION |
| Whiteboard | CLASSROOM_BOARD plus page/operation |
| Shared document | CLASS_PDF |
| Shared PDF page | CLASS_PDF_PAGE |
| Poll | Session HTTP poll API |

Whiteboard operations include stroke, shape, text, clear and page. Web uses a 1400×800 logical canvas and three pages. Scale coordinates consistently to mobile. Preserve brush width, colors and payloads. Current page changes clear the canvas; durable full-history replay is not established. Implement a compatible snapshot/replay protocol if late-join and reconnect restoration are required; do not claim it already exists.

PDF sharing uses the materials endpoint for uploads, plus LiveKit document/page and annotation packets. Read SharedPDFViewer for exact shapes and file limits. Students follow the teacher; use a secure viewer and handle expired file access correctly.

Class chat is currently room-local/in-memory; it is distinct from persistent support and teacher/student messages. Do not promise history across reconnect without adding persistence.

Poll API GET/POST /api/class_sessions/{sessionId}/poll supports launch, vote and close. Teachers/admins launch and close; students vote. Current validation requires 2–6 options and one active poll. Votes are authenticated and tracked by UID. Use server results instead of client-side vote totals.

Verify the actual LiveKit sender identity and server-resolved role for teacher-only board/PDF/control packets. Do not trust a packet's self-declared isTeacher field. Review web receivers too. Any protocol change must be versioned or backward-compatible on both clients.

## 11. Post-class, homework, resources and quizzes

POST /api/class_sessions/{sessionId}/post-class accepts attendance keyed by student UID, summary and notes. Backend limits attendance to session students, records counts in class_sessions/{id}/post_class/teacher and flags submission on the session. Prevent duplicate submit and handle the server's existing-submission response.

Activity notes have a separate endpoint and describe classroom actions. They are not a complete audio transcript or automatic AI analysis.

Homework:

- Student selects an assigned batch, supplies taskTitle and notes or file.
- POST /api/homework/submissions uses multipart fields batchId, taskTitle, contentNotes and file.
- At least notes or an attachment are required.
- Current maximum file size is 15 MB; read the route for exact allowed PDF/image MIME types.
- Backend verifies membership, resolves teacher and creates PENDING submission in submissions.
- GET returns the student's work or the teacher's assigned submissions.
- PATCH /api/homework/submissions/{submissionId} accepts authorized grading/teacherFeedback; match marks validation.
- Signed file links expire. Refetch instead of treating URLs as permanent public files.

Use /api/student-vault for resources, /api/student-quiz for the implemented daily quiz and /api/student-badges for badge operations. Scoring, coins and badge mutations are server-controlled. Current quiz is a specific implemented activity, not a full adaptive exam engine.

The active WebAttentionTracker explicitly says camera attention analysis is disabled. Do not fabricate attention scores, attendance, AI diagnoses, recordings, transcripts or mandatory voice remarks. Those require separate verified implementation and appropriate user permissions.

## 12. Messaging, help and batch requests

Separate these systems:

- Live class chat: transient room data.
- Teacher/student messaging: teacher-chat/{studentId} and student message listing; relationship-authorized.
- Help conversation: /api/help-chat backed by help_threads and message subcollections.
- Contact form: /api/support/contact backed by a separate support queue.

Help is human support with predefined FAQ replies, not an AI chatbot. Members see their own thread; admins can read inbox and reply. Current limits include 2000-character messages, pagination, send cooldown and requestId deduplication. Retain a requestId for retries of the same message and create a new one for a different message. Web refreshes every five seconds; Android polling must be lifecycle-aware.

Batch requests are not demo allocation. Students POST programId, classNumber, board, preferredTime and note to /api/batch-requests. Approved teachers GET matching OPEN requests and PATCH /api/batch-requests/{requestId} to claim. Claim changes state to REVIEWING and assigns teacher; it does not create paid enrollment or confirm a timetable.

The request API currently permits classes up to 12, while demo booking supports 1–10. Preserve endpoint-specific rules and report this inconsistency rather than silently broadening demos.

## 13. Parent, admin, wallet and notifications

Parent-related pages exist for home, linking children, remarks, reports, syllabus, billing and chat. A route under `(parent)` does not prove it accepts a separate parent account. Important current booking/billing/history calls use the signed-in student's identity.

Audit students.parentIds, linking verification and endpoint ownership before building parent mode. Parents must access only linked children. Parent-initiated purchase/booking requires a server-authorized child contract, not an arbitrary childId sent to student-only APIs.

Admin web features include teacher/KYC review, directories, batch views, live radar, support, pricing and payout records. New management endpoints use admin claims and pricing changes are audited in admin_audit.

Platform settings cover demo fee/free mode, six course plans, offer rules and editorial banner. Offer uploads are protected, and publishing banner content does not change price calculations.

Wallet screens reflect recorded ledgers/payouts. Admin recording a bank transfer reference does not send money. Teacher wallet and older admin screens use different payout collection names; reconcile before adding payout actions. Do not invent automated settlements or balances.

Inspect notification senders and Functions deployment before claiming reminders work. Android needs secure FCM device-token registration, token rotation, authorized delivery and notification deep links. A server notification-sending route is not automatically a device-registration API.

## 14. API inventory

Read each handler before generating DTOs. Responses are not perfectly uniform: some use message, others error; some successful routes omit success. Do not assume one universal envelope.

| Path | Purpose |
| --- | --- |
| GET /api/platform-settings | Effective pricing/settings; inspect separate management mutation |
| POST /api/demo/availability | Suggested slots |
| POST /api/demo/book | Authoritative booking |
| GET /api/student-demo-details | Demo-linked sessions/teacher |
| GET /api/student-batches | Assigned batches |
| POST /api/razorpay/order | Server-priced order |
| POST /api/razorpay/verify | Server payment verification |
| GET /api/student-payments | History |
| POST /api/class_sessions/create | Authorized lesson creation |
| GET/PATCH /api/class_sessions/{id}/status | Session details/lifecycle |
| GET /api/livekit/token | Authorized room token |
| /api/class_sessions/{id}/materials | Inspect classroom upload contract |
| GET/POST /api/class_sessions/{id}/poll | Poll state/actions |
| /api/class_sessions/{id}/activity-notes | Inspect activity-note contract |
| POST /api/class_sessions/{id}/post-class | Attendance, summary, notes |
| GET/POST /api/homework/submissions | List/multipart submit |
| PATCH /api/homework/submissions/{id} | Teacher grading |
| GET /api/student-vault | Resources |
| GET/POST /api/student-quiz | Quiz/answers |
| GET/POST /api/student-badges | Badges/action |
| GET /api/student-messages | Student message list |
| GET/POST /api/teacher-chat/{studentId} | Relationship-authorized conversation |
| GET/POST /api/batch-requests | Teacher queue/student request |
| PATCH /api/batch-requests/{id} | Claim request |
| GET/POST /api/help-chat | Thread/inbox/pagination and send |
| POST /api/support/contact | Contact request |

Provider webhook routes and notification senders are backend integrations, not unrestricted mobile actions.

Important collections include users, students, teachers, batches, demo_bookings, enrollments, class_sessions, payments, teacher_slot_locks, student_slot_locks, submissions, batch_requests, help_threads, support_tickets, platform_settings and admin_audit. Build exact field DTOs from current source; this list is not permission to directly access every collection.

## 15. Required gap audit before production parity

These are observations from source, not claims about deployed infrastructure:

1. docs/blueprint.md contains older EduConnect/Gisty/10-student content; it is not the current BlankLearn contract.
2. lib/booking/demoEngine.ts uses legacy client-side demo_batches logic. Use the active server booking route and batchAllocator.
3. Legacy coupon calculator differs from active settings-driven demo pricing.
4. Availability suggestions do not perform identical three-day conflict checks to final booking. Display them as tentative and improve backend parity where appropriate.
5. Initial allocation and follow-up demo scheduling are separate writes. Audit partial failure, retries, duplicate booking, pending-seat expiry/cleanup and rollback.
6. Shared compatible batches/sessions need tests proving later booking writes do not overwrite existing studentIds or shared session associations.
7. Paid activation is not a recurring scheduler. Audit timetable creation, renewal, expiry enforcement, cancellation and parent authorization separately.
8. functions/src contains older matchmaker, payment/subscription and LiveKit handlers with different schema and database assumptions. Verify deployment, database selection and duplicate webhook effects.
9. The Next.js LiveKit webhook currently verifies/logs events; it is not a complete attendance/recording/payout pipeline.
10. Time-based joining has been removed. Preserve the shared teacher-controlled join policy in both clients.
11. Older role-document admin checks and newer custom-claim checks need consistency review.
12. Classroom packet sender validation and late-join board/PDF restoration need explicit verification. Connecting to LiveKit alone does not provide durable state replay.
13. Disabled attention tracking and mock/helper files must not become fake production features.
14. Direct Firestore dashboards depend on deployed rules/indexes for database dark. Source alone does not prove rules or Functions are correctly deployed.
15. Production previously returned HTML to JSON consumers. Validate HTTP status/content type and handle invalid/empty bodies. Friendly error handling must not conceal broken API deployment or report failed mutations as successful.
16. Parent payment, notification registration and payout collection consistency require audited contracts before being presented as complete.

Classify each finding as existing behavior, required fix or deferred scope. Fix backend defects compatibly with regression tests. Never bypass authorization/payment failures by giving Android privileged database access.

## 16. Android implementation architecture

Use Kotlin and Jetpack Compose with ViewModels, observable UI state, coroutines, repositories and clear UI/domain/data boundaries. Choose compatible stable SDK versions using current official documentation; do not guess versions.

Use native Firebase authentication, authorized named-database access, LiveKit Android SDK and a verified native payment integration. Before shipping checkout, verify applicable current platform/provider payment requirements rather than assuming website checkout can be copied unchanged. Keep business decisions on the existing server.

Suggested feature organization:

- core: environment config, auth session, HTTP client, error mapping, common UI, time and money.
- student: onboarding, hub, demo, classes, course checkout, homework, resources, quiz, badges, messages and profile.
- teacher: onboarding/verification, dashboard, batches, requests, studio, post-class, homework review, messages and wallet.
- classroom: media lifecycle, participants, whiteboard, PDF, polls, chat, hand raises and reactions.
- support: FAQ and persistent support conversation.
- parent: linked-child operations after backend authorization is verified.

Suggested student tabs: Home, Classes, Learning, Messages, Profile. Teacher tabs: Dashboard, Batches, Requests, Messages, Profile, with review/wallet reachable from the workspace. Support small screens and landscape classroom mode. Match BlankLearn branding while using native interactions.

Every remote screen needs loading, empty, error, retry and permission-denied states. Avoid presenting failed loads as empty records. Guard duplicate booking/payment/grading taps. Only retry idempotent writes automatically. Show IST for schedules and preserve absolute server instants across device time zones. Store only appropriate cached data and clear account-scoped state on logout.

HTTP error handling must support 401 reauthentication/controlled token refresh, 403 access denied, 409 business conflict, rate limits, server errors, timeouts and malformed/HTML responses. Never display raw parser traces or HTML to users. Retrying payment verification must reconcile the existing order, not create a new charge.

## 17. Build sequence and deliverables

Phase 1: Inspect current routes/callers, document exact contracts/gaps, configure Android build and environments, implement auth/profile and real student/teacher dashboards.

Phase 2: Implement live settings, demo options/availability/booking, three-session confirmation, free flow, paid checkout/verification and payment history.

Phase 3: Implement authorized teacher controls and native LiveKit classroom. Prove web-to-Android and Android-to-web tool compatibility.

Phase 4: Implement demo completion, plan eligibility/offers, server-confirmed membership and regular timetable display. Resolve scheduling/expiry gaps before claiming complete course lifecycle.

Phase 5: Implement homework, resources, quiz/badges, relationship messages, support and batch requests. Add parent, notifications and wallet actions only against verified contracts.

Deliver runnable source, setup/build instructions, environment placeholders without secrets, contract notes, meaningful tests and APK/AAB if the environment supports building them. State what was compiled, emulator/device tested, cross-platform tested or blocked. Do not claim a live payment, media test, deployment or signed release without evidence.

## 18. Acceptance checks

- Existing web accounts work on Android without overwriting teacher roles/profiles.
- Firestore uses dark and unauthorized reads/writes are rejected.
- One booking displays exactly three correct demo dates and IST times.
- Free mode skips payment; paid mode grants no trial access before server verification.
- Five concurrent group seats succeed safely; a sixth is rejected or safely allocated elsewhere. Individual capacity remains one.
- Teacher/student conflicts fail cleanly. Retried/partial bookings do not duplicate records or overwrite existing batch members.
- Invalid/replayed/cancelled callbacks do not grant access or duplicate membership. Amount/ownership checks are enforced.
- Course checkout is blocked until all demo sessions complete; 72-hour offer and plan totals follow server rules.
- Assigned students can join early or late once the teacher opens the class. They cannot join before teacher opening, after teacher ending, or into an unauthorized room.
- Teacher controls obey assignment and allowed state transitions.
- Web teacher + Android student and Android teacher + web student work for enabled audio/video, board, PDF, poll, chat, hands and reactions.
- Rotation/reconnect/background/permission denial/poor network do not leak media or fake completion.
- Homework/feedback are relationship-authorized; expired file links can be refreshed.
- Support retries deduplicate, and another member's thread is inaccessible.
- JSON/HTML/401/403/409/5xx handling produces readable, accurate state.
- Parent cannot access an unlinked child; admin privilege is verified server-side.
- No fabricated analytics/earnings/attendance/recordings and no privileged secrets ship in the app.

## 19. Read these source files first

- src/lib/config/{booking,demoPrograms,boards,timeSlots}.ts
- src/lib/platform/{defaults,server,demo-price}.ts
- src/app/api/demo/{availability,book}/route.ts
- src/lib/booking/{teacherMatcher,batchAllocator}.ts
- src/app/api/razorpay/{order,verify,webhook}/route.ts
- src/app/api/student-demo-details/route.ts
- src/app/api/livekit/token/route.ts
- src/app/api/class_sessions/[sessionId]/status/route.ts
- src/app/api/class_sessions/create/route.ts
- src/lib/classroom/studentAccess.ts
- src/components/classroom/{LiveKitClassroom,SuperWhiteboard,SharedPDFViewer,LivePollModal,InClassChat,RaiseHandQueue,InClassReactions}.tsx
- src/app/(student)/hub/page.tsx
- src/app/(teacher)/dashboard/page.tsx
- src/app/(teacher)/studio/[sessionId]/page.tsx
- src/app/(student)/classroom/[sessionId]/page.tsx
- src/app/api/homework/submissions/route.ts and child route
- src/app/api/help-chat/route.ts and src/components/HelpChat.tsx
- src/app/api/batch-requests/route.ts and child route
- src/app/student-auth/page.tsx and src/app/teacher-auth/page.tsx
- src/lib/firebase/{client,admin}.ts and src/middleware.ts
- docs/platform-admin.md and functions/src/* for deployment/schema audit

## 20. Official implementation references

Android's architecture guidance supports separating UI and data responsibilities, and Compose is the native UI direction for this implementation. Verify current platform details in the [Android architecture guide](https://developer.android.com/topic/architecture) and [Compose architecture documentation](https://developer.android.com/develop/ui/compose/architecture).

Use the [LiveKit Android quickstart](https://docs.livekit.io/transport/sdk-platforms/android/) for native room integration. Verify named-database configuration against [Firestore database documentation](https://firebase.google.com/docs/firestore/manage-databases).

Start with the repository and contract/gap audit, then implement runnable increments with real server data. Report missing capabilities honestly and preserve web compatibility.
