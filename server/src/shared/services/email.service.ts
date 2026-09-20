import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

class EmailService {
  private transporter: Transporter | null = null;

  private async getTransporter(): Promise<Transporter> {
    if (this.transporter) {
      return this.transporter;
    }

    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT) || 587;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASSWORD;

    if (!host || !user || !pass) {
      throw new Error("SMTP configuration missing");
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    return this.transporter;
  }

  async sendVerificationEmail(email: string, token: string, name: string): Promise<void> {
    const transporter = await this.getTransporter();
    const url = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
    const from = process.env.SMTP_FROM || process.env.SMTP_USER;

    await transporter.sendMail({
      from,
      to: email,
      subject: "Verify Your Email Address",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome ${name}!</h2>
          <p>Thank you for registering. Please verify your email address to activate your account.</p>
          <p>
            <a href="${url}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 4px;">
              Verify Email
            </a>
          </p>
          <p>Or copy this link to your browser:</p>
          <p style="word-break: break-all;">${url}</p>
          <p>This link expires in 24 hours.</p>
          <p>If you did not create an account, please ignore this email.</p>
        </div>
      `,
    });
  }

  async sendPasswordResetEmail(email: string, token: string, name: string): Promise<void> {
    const transporter = await this.getTransporter();
    const url = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    const from = process.env.SMTP_FROM || process.env.SMTP_USER;

    await transporter.sendMail({
      from,
      to: email,
      subject: "Reset Your Password",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Password Reset Request</h2>
          <p>Hello ${name},</p>
          <p>We received a request to reset your password. Click the button below to create a new password:</p>
          <p>
            <a href="${url}" style="display: inline-block; padding: 12px 24px; background-color: #dc3545; color: white; text-decoration: none; border-radius: 4px;">
              Reset Password
            </a>
          </p>
          <p>Or copy this link to your browser:</p>
          <p style="word-break: break-all;">${url}</p>
          <p>This link expires in 1 hour.</p>
          <p>If you did not request a password reset, please ignore this email and your password will remain unchanged.</p>
        </div>
      `,
    });
  }

  async sendWelcomeEmail(email: string, name: string): Promise<void> {
    const transporter = await this.getTransporter();
    const from = process.env.SMTP_FROM || process.env.SMTP_USER;

    await transporter.sendMail({
      from,
      to: email,
      subject: "Welcome to Project Management System",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome aboard, ${name}!</h2>
          <p>Your email has been verified successfully.</p>
          <p>You can now log in to your account and start managing projects.</p>
          <p>
            <a href="${process.env.FRONTEND_URL}/login" style="display: inline-block; padding: 12px 24px; background-color: #28a745; color: white; text-decoration: none; border-radius: 4px;">
              Go to Login
            </a>
          </p>
        </div>
      `,
    });
  }
}

export const emailService = new EmailService();
