// High-conversion responsive HTML email templates

export function getDiagnosticReportEmail({
  parentName,
  studentName,
  score,
  reportUrl,
}: {
  parentName: string;
  studentName: string;
  score: number;
  reportUrl: string;
}) {
  return `
    <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px;">
      <h2 style="color: #0f172a; margin-bottom: 8px;">Class Diagnostic Proof Ready • ${studentName}</h2>
      <p style="color: #475569; font-size: 14px; line-height: 1.6;">
        Namaste ${parentName}, today's 60-minute 1:5 micro-batch has completed.
      </p>
      
      <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 12px; padding: 16px; margin: 20px 0;">
        <p style="font-size: 13px; color: #64748b; margin: 0;">Average Class Attention Score:</p>
        <p style="font-size: 28px; font-weight: 800; color: #4f46e5; margin: 4px 0 0 0;">${score}% Focus</p>
      </div>

      <p style="font-size: 14px; color: #334155;">
        Your child's mentor has recorded a personalized 45-second audio remark. Listen to the voice note and review the minute-by-minute focus graph:
      </p>

      <a href="${reportUrl}" style="display: inline-block; background: #4f46e5; color: #ffffff; padding: 12px 24px; border-radius: 10px; font-weight: 700; text-decoration: none; font-size: 14px; margin-top: 12px;">
        Listen to Teacher Voice Remark →
      </a>

      <p style="color: #94a3b8; font-size: 12px; margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
        BlankLearn • Strictly 1:5 Micro-Batch AI EdTech Web Platform
      </p>
    </div>
  `;
}