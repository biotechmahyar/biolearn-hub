"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";

/**
 * Sends a verification email via Resend.
 * This MUST run in a "use node" context for HTTP access to external APIs.
 */
export const sendOtpEmail = action({
  args: {
    email: v.string(),
    code: v.string(),
  },
  handler: async (_ctx, args) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY is not configured in Convex environment.");
    }

    const html = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',Tahoma,sans-serif;">
  <div style="max-width:480px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#0d9488,#0ea5e9);padding:32px;text-align:center;">
      <h1 style="color:#fff;font-size:24px;margin:0;">Genova</h1>
      <p style="color:rgba(255,255,255,0.85);font-size:14px;margin-top:8px;">پلتفرم تخصصی علوم زیستی</p>
    </div>
    <div style="padding:32px;text-align:center;">
      <p style="color:#334155;font-size:16px;margin-bottom:8px;">کد تأیید شما</p>
      <div style="font-size:36px;font-weight:800;letter-spacing:12px;color:#0d9488;background:#f0fdfa;padding:16px 24px;border-radius:12px;display:inline-block;border:2px solid #ccfbf1;font-family:monospace;">${args.code}</div>
      <p style="color:#64748b;font-size:13px;margin-top:20px;">این کد تا <strong>۵ دقیقه</strong> معتبر است.</p>
      <p style="color:#94a3b8;font-size:12px;margin-top:16px;">اگر شما این درخواست را ارسال نکرده‌اید، این ایمیل را نادیده بگیرید.</p>
    </div>
    <div style="background:#f8fafc;padding:16px;text-align:center;border-top:1px solid #e2e8f0;">
      <p style="color:#94a3b8;font-size:11px;margin:0;">© ${new Date().getFullYear()} Genova — genova.ir</p>
    </div>
  </div>
</body>
</html>`;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Genova <noreply@genova.ir>",
        to: [args.email],
        subject: "کد تأیید Genova",
        html,
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "unknown");
      console.error("Resend error:", response.status, errText);
      throw new Error(`Failed to send email (HTTP ${response.status}).`);
    }

    return { success: true };
  },
});
