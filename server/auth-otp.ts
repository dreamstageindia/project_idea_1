// server/auth-otp.ts
import type { Request, Response } from "express";
import { storage } from "./storage";
import "dotenv/config";

/* ──────────────────────────────────────────────────────────────
   Phone helpers (same style as server/auth.ts)
   ────────────────────────────────────────────────────────────── */
function normalizePhonePlus(input?: string | null): string {
  if (!input) return "";
  const digits = String(input).trim().replace(/\D+/g, "");
  return digits ? `+${digits}` : "";
}

/** Split E.164 like +919876543210 -> { countryCode: "91", mobile: "9876543210" } */
function splitE164(phone: string) {
  const digits = phone.replace(/\D+/g, "");
  if (digits.length <= 10) {
    const cc = process.env.MESSAGECENTRAL_COUNTRY?.trim() || "91";
    return { countryCode: cc, mobile: digits };
  }
  const mobile = digits.slice(-10);
  const countryCode = digits.slice(0, digits.length - 10);
  return { countryCode, mobile };
}

/* ──────────────────────────────────────────────────────────────
   MessageCentral token helper (same approach as server/auth.ts)
   ────────────────────────────────────────────────────────────── */
const MC_BASE = "https://cpaas.messagecentral.com";

async function mcGetToken() {
  // In FAKE mode we don’t call MC at all
  if (process.env.MESSAGECENTRAL_FAKE === "1") return "FAKE_TOKEN";

  const customerId = process.env.MESSAGECENTRAL_CUSTOMER_ID?.trim();
  const key = process.env.MESSAGECENTRAL_KEY?.trim(); // Base64 of MC password
  const country = process.env.MESSAGECENTRAL_COUNTRY?.trim() || "91";
  const email = process.env.MESSAGECENTRAL_EMAIL?.trim(); // optional

  if (!customerId || !key) {
    const e: any = new Error(
      "MessageCentral credentials missing (MESSAGECENTRAL_CUSTOMER_ID / MESSAGECENTRAL_KEY)"
    );
    e.code = "MC_CONFIG_MISSING";
    throw e;
  }

  const url = new URL(`${MC_BASE}/auth/v1/authentication/token`);
  url.searchParams.set("customerId", customerId);
  url.searchParams.set("key", key);
  url.searchParams.set("scope", "NEW");
  if (country) url.searchParams.set("country", country);
  if (email) url.searchParams.set("email", email);

  const controller = new AbortController();
  const to = setTimeout(() => controller.abort(), 8000);

  let resp: any;
  try {
    resp = await fetch(url.toString(), {
      method: "GET",
      headers: { accept: "application/json" },
      signal: controller.signal,
    });
  } catch (netErr: any) {
    clearTimeout(to);
    console.error("MessageCentral token network error:", netErr?.message || netErr);
    throw new Error("MessageCentral token network error");
  }
  clearTimeout(to);

  const bodyText = await resp.text().catch(() => "");
  if (!resp.ok) {
    console.error("MessageCentral token error:", resp.status, bodyText?.slice(0, 300));
    throw new Error(`MessageCentral token error: ${resp.status}`);
  }

  let data: any = {};
  try {
    data = bodyText ? JSON.parse(bodyText) : {};
  } catch {
    // ignore
  }
  if (!data?.token) {
    console.error("MessageCentral token missing in response body:", bodyText?.slice(0, 300));
    throw new Error("MessageCentral token missing in response");
  }
  return data.token as string;
}

/* ──────────────────────────────────────────────────────────────
   OTP persistence (compatible with your storage.ts)
   ────────────────────────────────────────────────────────────── */
type OtpIssue = {
  id: string;
  phoneNumber: string;
  expiresAt: Date | string | null;
  metadata?: { verificationId?: string | null; localCode?: string | null } | null;
};

async function saveMcOtpIssue(args: {
  phoneNumber: string;
  verificationId: string;
  timeoutSec: number;
}): Promise<OtpIssue> {
  const expiresAt = new Date(Date.now() + args.timeoutSec * 1000);
  const rec = await storage.createOTP({
    phoneNumber: args.phoneNumber,
    code: "__MC__", // placeholder because schema requires non-null code
    expiresAt,
    metadata: { verificationId: args.verificationId },
  } as any);
  return rec as OtpIssue;
}

async function saveLocalOtpIssue(args: {
  phoneNumber: string;
  code: string;
  timeoutSec: number;
}): Promise<OtpIssue> {
  const expiresAt = new Date(Date.now() + args.timeoutSec * 1000);
  const rec = await storage.createOTP({
    phoneNumber: args.phoneNumber,
    code: args.code,
    expiresAt,
    metadata: { localCode: args.code },
  } as any);
  return rec as OtpIssue;
}

async function loadLatestOtpForPhone(phoneNumber: string): Promise<OtpIssue | null> {
  try {
    const rec = await storage.getLastOTPForPhone(phoneNumber);
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

/* ──────────────────────────────────────────────────────────────
   GET /api/auth/lookup-by-phone
   Returns { firstName, lastName, exists } for UI prefill
   ────────────────────────────────────────────────────────────── */
export async function lookupByPhone(req: Request, res: Response) {
  try {
    const raw = String(req.query.phoneNumber || "");
    const phone = normalizePhonePlus(raw);
    if (!phone) return res.status(400).json({ message: "phoneNumber required" });

    const emp = await storage.getEmployeeByPhone(phone);
    if (!emp) return res.json({ firstName: null, lastName: null, exists: false });
    return res.json({
      firstName: emp.firstName || null,
      lastName: emp.lastName || null,
      exists: true,
    });
  } catch (e) {
    console.error("lookupByPhone error:", (e as any)?.message || e);
    return res.status(500).json({ message: "Lookup failed" });
  }
}

/* ──────────────────────────────────────────────────────────────
   POST /api/auth/send-otp
   - If MESSAGECENTRAL_FAKE=1: generate & log a 6-digit code locally
   - Else: call MC /verification/v3/send, store verificationId
   Returns: { ok: true, timeoutSec, employee?: { firstName, lastName } }
   ────────────────────────────────────────────────────────────── */
export async function sendOTP(req: Request, res: Response) {
  try {
    const raw = (req.body as any)?.phoneNumber;
    if (!raw) return res.status(400).json({ message: "phoneNumber required" });

    const phone = normalizePhonePlus(raw);
    if (!phone) return res.status(400).json({ message: "Invalid phone number" });

    // Prefill for client
    const existing = await storage.getEmployeeByPhone(phone);
    const employeePrefill = existing
      ? { firstName: existing.firstName ?? "", lastName: existing.lastName ?? "" }
      : { firstName: "", lastName: "" };

    // FAKE (DEV) mode - no external API
    if (process.env.MESSAGECENTRAL_FAKE === "1") {
      const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit
      const timeoutSec = 120;
      await saveLocalOtpIssue({ phoneNumber: phone, code, timeoutSec });
      console.log(`[FAKE OTP] To ${phone}: ${code} (valid ${timeoutSec}s)`);
      return res.json({ ok: true, timeoutSec, employee: employeePrefill });
    }

    // MC token
    let authToken: string;
    try {
      authToken = await mcGetToken();
    } catch (err: any) {
      console.error("MessageCentral token error:", err?.message || err);
      return res.status(502).json({ message: "Failed to get SMS auth token" });
    }

    // MC send
    const { countryCode, mobile } = splitE164(phone);
    const url = new URL(`${MC_BASE}/verification/v3/send`);
    url.searchParams.set("countryCode", countryCode);
    url.searchParams.set("flowType", "SMS");
    url.searchParams.set("mobileNumber", mobile);

    const resp: any = await fetch(url.toString(), {
      method: "POST",
      headers: { authToken },
    });

    const bodyText = await resp.text().catch(() => "");
    if (!resp.ok) {
      console.error("MessageCentral send error:", resp.status, bodyText?.slice(0, 300));
      return res.status(502).json({ message: "Failed to send SMS OTP" });
    }

    let data: any = {};
    try {
      data = bodyText ? JSON.parse(bodyText) : {};
    } catch {
      // ignore
    }

    const verificationId: string | undefined = data?.data?.verificationId;
    const timeoutSec = Number(data?.data?.timeout ?? 60);
    if (!verificationId) {
      console.error("MC send: missing verificationId. Body:", bodyText?.slice(0, 300));
      return res.status(502).json({ message: "Failed to send SMS OTP" });
    }

    await saveMcOtpIssue({ phoneNumber: phone, verificationId, timeoutSec });
    return res.json({ ok: true, timeoutSec, employee: employeePrefill });
  } catch (e) {
    console.error("sendOTP error:", (e as any)?.message || e);
    return res.status(500).json({ message: "Failed to send OTP" });
  }
}

/* ──────────────────────────────────────────────────────────────
   POST /api/auth/verify-otp
   Body: { phoneNumber, code }
   - FAKE mode: validate against stored local code
   - MC mode : validate via /verification/v3/validateOtp
   On success: upsert employee, create session, return token + employee
   ────────────────────────────────────────────────────────────── */
export async function verifyOTP(req: Request, res: Response) {
  try {
    const rawPhone = (req.body as any)?.phoneNumber;
    const code = String((req.body as any)?.code || "").trim();

    const phone = normalizePhonePlus(rawPhone || "");
    if (!phone || !code) {
      return res.status(400).json({ message: "phoneNumber and code required" });
    }

    const otpRec = await loadLatestOtpForPhone(phone);
    if (!otpRec) return res.status(400).json({ message: "No OTP issued" });
    if (otpRec.expiresAt && new Date(otpRec.expiresAt) < new Date()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    if (process.env.MESSAGECENTRAL_FAKE === "1") {
      const localCode =
        (otpRec.metadata as any)?.localCode || (otpRec as any)?.code || "";
      if (!localCode || localCode !== code) {
        return res.status(401).json({ message: "Invalid or expired OTP" });
      }
      await markOtpUsed(otpRec.id);
    } else {
      const verificationId = String((otpRec.metadata as any)?.verificationId || "");
      if (!verificationId) {
        return res.status(400).json({ message: "No OTP verification in progress" });
      }

      const authToken = await mcGetToken();
      const vurl = new URL(`${MC_BASE}/verification/v3/validateOtp`);
      vurl.searchParams.set("verificationId", verificationId);
      vurl.searchParams.set("code", code);

      const vresp: any = await fetch(vurl.toString(), {
        method: "GET",
        headers: { authToken },
      });

      const vText = await vresp.text().catch(() => "");
      if (!vresp.ok) {
        console.error("MessageCentral validate error:", vresp.status, vText?.slice(0, 300));
        return res.status(401).json({ message: "Invalid or expired OTP" });
      }

      let vdata: any = {};
      try {
        vdata = vText ? JSON.parse(vText) : {};
      } catch {}

      const vCode = String(vdata?.data?.responseCode || "");
      const vStatus = String(vdata?.data?.verificationStatus || "");
      if (vCode !== "200" || vStatus !== "VERIFICATION_COMPLETED") {
        return res.status(401).json({ message: "Invalid or expired OTP" });
      }

      await markOtpUsed(otpRec.id);
    }

    // Upsert employee (phone is primary identity)
    let user = await storage.getEmployeeByPhone(phone);
    if (!user) {
      user = await storage.createEmployee({
        firstName: "User",
        lastName: "",
        phoneNumber: phone,
        points: 0,
      } as any);
    }

    // Create a short-lived API session for your app
    const session = await storage.createSession(user.id);

    return res.json({
      token: session.token,
      employee: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber,
        points: user.points ?? 0,
      },
      expiresAt: session.expiresAt,
    });
  } catch (e) {
    console.error("verifyOTP error:", (e as any)?.message || e);
    return res.status(500).json({ message: "Failed to verify OTP" });
  }
}
