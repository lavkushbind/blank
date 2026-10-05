type Schedule = { date?: string; startTime?: string; endTime?: string; status?: string };

/** Schedule times are informational. The teacher controls when joining opens/closes. */
export function studentAccess(session: Schedule, _now = Date.now()) {
  const time = (value?: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(session.date || "") || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value || "")) return NaN;
    return Date.parse(session.date + "T" + value + ":00+05:30");
  };
  const status = session.status || "SCHEDULED";
  const closed = ["ENDED", "PROCESSING", "COMPLETED", "CANCELLED"].includes(status);
  const allowed = ["OPEN_FOR_JOIN", "LIVE", "PAUSED", "TECHNICAL_ISSUE"].includes(status);
  return {
    allowed,
    reason: allowed ? "" : closed ? "This class has finished or was cancelled." : "Waiting for your teacher to start the class.",
    startsAt: time(session.startTime),
    endsAt: time(session.endTime),
  };
}
