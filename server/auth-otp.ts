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

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export async function lookupByEmail(req: Request, res: Response) {
  try {
    const email = normalizeEmail(req.query.email);
    if (!email) return res.status(400).json({ message: "email required" });

    const emp = await storage.getEmployeeByEmail(email);
    if (!emp) {
      // Check if domain is whitelisted for auto-creation
      const domainCheck = await storage.checkDomainWhitelisted(email);
      return res.json({
        firstName: null,
        lastName: null,
        exists: false,
        domainWhitelisted: domainCheck.isWhitelisted,
        autoCreate: domainCheck.domain?.autoCreateUser || false,
        defaultPoints: domainCheck.domain?.defaultPoints || 0
      });
    }
    return res.json({
      firstName: emp.firstName || null,
      lastName: emp.lastName || null,
      exists: true,
      domainWhitelisted: true,
      autoCreate: false
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

    // Check if domain is whitelisted
    const domainCheck = await storage.checkDomainWhitelisted(email);
    if (!domainCheck.isWhitelisted) {
      return res.status(403).json({ 
        message: "Your email domain is not authorized to access this platform. Please contact your administrator." 
      });
    }

    const domainConfig = domainCheck.domain;

    // Check if user exists or should be auto-created
    let user = await storage.getEmployeeByEmail(email);
    let isNewUser = false;

    // Auto-create user if enabled and user doesn't exist
    if (!user && domainConfig?.autoCreateUser) {
      // Extract name from email or use defaults
      const emailName = email.split('@')[0];
      const firstName = emailName.split('.')[0] || "User";
      const lastName = emailName.split('.')[1] || "";
      
      user = await storage.createEmployee({
        firstName: firstName.charAt(0).toUpperCase() + firstName.slice(1),
        lastName: lastName.charAt(0).toUpperCase() + lastName.slice(1),
        email: email,
        points: domainConfig.defaultPoints || 0,
      } as any);
      isNewUser = true;
    } else if (!user && !domainConfig?.autoCreateUser) {
      return res.status(404).json({ 
        message: "Account not found. Please contact your administrator to create an account." 
      });
    }

    const employeePrefill = user
      ? { firstName: user.firstName ?? "", lastName: user.lastName ?? "" }
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
      isNewUser,
      message: isNewUser 
        ? "Account created! OTP sent to your email." 
        : "OTP sent to your email." 
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
    const firstName = (req.body as any)?.firstName || "";
    const lastName = (req.body as any)?.lastName || "";

    const email = normalizeEmail(rawEmail);
    if (!email || !code) {
      return res.status(400).json({ message: "email and code required" });
    }

    // Check domain whitelist first
    const domainCheck = await storage.checkDomainWhitelisted(email);
    if (!domainCheck.isWhitelisted) {
      return res.status(403).json({ 
        message: "Your email domain is not authorized to access this platform." 
      });
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
    const domainConfig = domainCheck.domain;

    // If user doesn't exist but domain allows auto-creation, create user
    if (!user && domainConfig?.autoCreateUser) {
      const emailName = email.split('@')[0];
      const defaultFirstName = firstName || emailName.split('.')[0] || "User";
      const defaultLastName = lastName || emailName.split('.')[1] || "";
      
      user = await storage.createEmployee({
        firstName: defaultFirstName.charAt(0).toUpperCase() + defaultFirstName.slice(1),
        lastName: defaultLastName.charAt(0).toUpperCase() + defaultLastName.slice(1),
        email: email,
        points: domainConfig.defaultPoints || 0,
      } as any);
    } else if (!user) {
      return res.status(404).json({ 
        message: "Account not found. Please contact your administrator." 
      });
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