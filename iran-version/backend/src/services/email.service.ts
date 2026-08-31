// ─── Email Adapter ───────────────────────────────────────────────────────────
// Pluggable email service for OTP delivery and notifications.
// No external service dependency by default — logs to console in development.
// Switch to SMTP or API adapters via EMAIL_PROVIDER env var.

export interface EmailMessage {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export interface EmailAdapter {
  send(message: EmailMessage): Promise<void>;
}

// ─── Console Adapter (default / development) ────────────────────────────────

class ConsoleEmailAdapter implements EmailAdapter {
  async send(message: EmailMessage): Promise<void> {
    console.log("═══════════════════════════════════════════════════════════════");
    console.log("[EMAIL — Console Adapter]");
    console.log(`  To: ${message.to}`);
    console.log(`  Subject: ${message.subject}`);
    if (message.text) {
      console.log(`  Body:\n${message.text}`);
    }
    if (message.html) {
      console.log(`  HTML: (length: ${message.html.length})`);
    }
    console.log("═══════════════════════════════════════════════════════════════");
  }
}

// ─── SMTP Adapter (production-ready, optional) ─────────────────────────────

class SmtpEmailAdapter implements EmailAdapter {
  private host: string;
  private port: number;
  private user: string;
  private pass: string;
  private from: string;

  constructor() {
    this.host = process.env.SMTP_HOST || "localhost";
    this.port = parseInt(process.env.SMTP_PORT || "587");
    this.user = process.env.SMTP_USER || "";
    this.pass = process.env.SMTP_PASS || "";
    this.from = process.env.EMAIL_FROM || "noreply@genova.local";
  }

  async send(message: EmailMessage): Promise<void> {
    // Lazy-load nodemailer only when SMTP adapter is used.
    // This avoids a hard compile-time dependency.
    // Lazy-load nodemailer only when SMTP adapter is used — not a hard dependency
    const nodemailerAny: any = await import("nodemailer" as string).catch(() => null);
    if (!nodemailerAny?.createTransport) {
      console.warn("[EMAIL] nodemailer not installed — falling back to console");
      console.log(`[EMAIL] To: ${message.to} | Subject: ${message.subject}`);
      return;
    }

    const transporter = nodemailerAny.createTransport({
      host: this.host,
      port: this.port,
      secure: this.port === 465,
      auth: this.user ? { user: this.user, pass: this.pass } : undefined,
    });

    await transporter.sendMail({
      from: this.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
  }
}

// ─── Null Adapter (emails disabled) ────────────────────────────────────────

class NullEmailAdapter implements EmailAdapter {
  async send(_message: EmailMessage): Promise<void> {
    // Silently discard — useful when email is not needed
  }
}

// ─── Factory ────────────────────────────────────────────────────────────────

let _adapter: EmailAdapter | null = null;

export function getEmailAdapter(): EmailAdapter {
  if (_adapter) return _adapter;

  const provider = (process.env.EMAIL_PROVIDER || "console").toLowerCase();

  switch (provider) {
    case "smtp":
      _adapter = new SmtpEmailAdapter();
      break;
    case "null":
    case "none":
    case "disabled":
      _adapter = new NullEmailAdapter();
      break;
    case "console":
    default:
      _adapter = new ConsoleEmailAdapter();
      break;
  }

  return _adapter;
}

/**
 * Convenience function: send an OTP code via email.
 * Generates a 6-digit code and sends it through the configured adapter.
 */
export async function sendOtpEmail(
  to: string,
  code: string
): Promise<void> {
  const adapter = getEmailAdapter();
  await adapter.send({
    to,
    subject: "کد تأیید Genova",
    text: `کد تأیید شما: ${code}\nاین کد تا ۵ دقیقه معتبر است.\n\nGenova — پلتفرم آموزشی علوم زیستی`,
    html: `
      <div dir="rtl" style="font-family: system-ui, sans-serif; max-width: 400px; margin: 0 auto;">
        <h2 style="color: #0f172a;">کد تأیید شما</h2>
        <div style="background: #f1f5f9; border-radius: 8px; padding: 20px; text-align: center;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #0f172a;">${code}</span>
        </div>
        <p style="color: #64748b; font-size: 14px; margin-top: 16px;">
          این کد تا ۵ دقیقه معتبر است. لطفاً آن را با کسی به اشتراک نگذارید.
        </p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
        <p style="color: #94a3b8; font-size: 12px;">Genova — پلتفرم آموزشی علوم زیستی</p>
      </div>
    `,
  });
}
