type Schedule = { date?: string; startTime?: string; endTime?: string; status?: string };

/** Booking dates and clock times are stored in India Standard Time. */
export function studentAccess(session: Schedule, now = Date.now()) {
  const time = (value?: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(session.date || "") || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value || "")) return NaN;
    return Date.parse(`${session.date}T${value}:00+05:30`);
  };
  const startsAt = time(session.startTime);
  const endsAt = time(session.endTime);
  const status = session.status || "SCHEDULED";
  let reason = "";
  if (["ENDED", "PROCESSING", "COMPLETED", "CANCELLED"].includes(status)) reason = "This class has finished or was cancelled.";
  else if (!Number.isFinite(startsAt) || !Number.isFinite(endsAt) || endsAt <= startsAt) reason = "Your teacher is confirming the class schedule.";
  else if (now < startsAt) reason = `Join opens on ${session.date} at ${session.startTime} IST.`;
  else if (now >= endsAt) reason = "The scheduled class time has ended.";
  else if (!["OPEN_FOR_JOIN", "LIVE", "PAUSED", "TECHNICAL_ISSUE"].includes(status)) reason = "Waiting for your teacher to open the class.";
  return { allowed: !reason, reason, startsAt, endsAt };
}
