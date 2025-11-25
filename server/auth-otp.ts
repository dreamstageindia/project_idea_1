import type { Request, Response } from "express";
import { storage } from "./storage";
import { emailService } from "./email-service";
import "dotenv/config";

function normalizeEmail(input?: string | null): string {
  if (!input) return "";
  return String(input).trim().toLowerCase();
}

type OtpIssue = {
  id: string;
  email: string;
  expiresAt: Date | string | null;
  metadata?: { localCode?: string | null } | null;
};

async function saveLocalOtpIssue(args: {
  email: string;
  code: string;
  timeoutSec: number;
}): Promise<OtpIssue> {
  const expiresAt = new Date(Date.now() + args.timeoutSec * 1000);
  const rec = await storage.createOTP({
    email: args.email,
    code: args.code,
    expiresAt,
    metadata: { localCode: args.code },
  } as any);
  return rec as OtpIssue;
}

async function loadLatestOtpForEmail(email: string): Promise<OtpIssue | null> {
  try {
    const rec = await storage.getLastOTPForEmail(email);
    return (rec as any) || null;
  } catch (e) {
    console.error("[otp] load latest failed:", (e as any)?.message || e);
    return null;
  }
}

async function markOtpUsed(otpId: string): Promise<void> {
  try {
    await storage.markOTPAsUsed(otpId);
  } catch (e) {
    console.warn("[otp] mark used failed:", (e as any)?.message || e);
  }
}

export async function lookupByEmail(req: Request, res: Response) {
  try {
    const email = normalizeEmail(req.query.email);
    if (!email) return res.status(400).json({ message: "email required" });

    const emp = await storage.getEmployeeByEmail(email);
    if (!emp) return res.json({ firstName: null, lastName: null, exists: false });
    return res.json({
      firstName: emp.firstName || null,
      lastName: emp.lastName || null,
      exists: true,
    });
  } catch (e) {
    console.error("lookupByEmail error:", (e as any)?.message || e);
    return res.status(500).json({ message: "Lookup failed" });
  }
}

export async function sendOTP(req: Request, res: Response) {
  try {
    const rawEmail = (req.body as any)?.email;
    if (!rawEmail) return res.status(400).json({ message: "email required" });

    const email = normalizeEmail(rawEmail);
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ message: "Invalid email address" });
    }

    const existing = await storage.getEmployeeByEmail(email);
    const employeePrefill = existing
      ? { firstName: existing.firstName ?? "", lastName: existing.lastName ?? "" }
      : { firstName: "", lastName: "" };

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const timeoutSec = 600;

    await saveLocalOtpIssue({ email, code, timeoutSec });
    
    const branding = await storage.getBranding();
    const companyName = branding?.companyName || "TechCorp";

    const emailSent = await emailService.sendOTP(email, code, companyName);
    
    if (!emailSent) {
      return res.status(500).json({ message: "Failed to send OTP email" });
    }

    console.log(`OTP sent to ${email}: ${code} (valid ${timeoutSec}s)`);
    
    return res.json({ 
      ok: true, 
      timeoutSec, 
      employee: employeePrefill,
      message: "OTP sent to your email" 
    });
  } catch (e) {
    console.error("sendOTP error:", (e as any)?.message || e);
    return res.status(500).json({ message: "Failed to send OTP" });
  }
}

export async function verifyOTP(req: Request, res: Response) {
  try {
    const rawEmail = (req.body as any)?.email;
    const code = String((req.body as any)?.code || "").trim();

    const email = normalizeEmail(rawEmail);
    if (!email || !code) {
      return res.status(400).json({ message: "email and code required" });
    }

    const otpRec = await loadLatestOtpForEmail(email);
    if (!otpRec) return res.status(400).json({ message: "No OTP issued" });
    
    if (otpRec.expiresAt && new Date(otpRec.expiresAt) < new Date()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    const localCode = (otpRec.metadata as any)?.localCode || (otpRec as any)?.code || "";
    if (!localCode || localCode !== code) {
      return res.status(401).json({ message: "Invalid or expired OTP" });
    }

    await markOtpUsed(otpRec.id);

    let user = await storage.getEmployeeByEmail(email);
    if (!user) {
      user = await storage.createEmployee({
        firstName: "User",
        lastName: "",
        email: email,
        points: 0,
      } as any);
    }

    const session = await storage.createSession(user.id);

    return res.json({
      token: session.token,
      employee: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        points: user.points ?? 0,
      },
      expiresAt: session.expiresAt,
    });
  } catch (e) {
    console.error("verifyOTP error:", (e as any)?.message || e);
    return res.status(500).json({ message: "Failed to verify OTP" });
  }
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}