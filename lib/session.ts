import { createHmac } from "crypto";

const getSecret = () =>
  process.env.CUSTOMER_SESSION_SECRET || "dev-fallback-secret-change-in-prod";

export function signSession(email: string): string {
  const sig = createHmac("sha256", getSecret()).update(email).digest("hex");
  return `${Buffer.from(email).toString("base64url")}.${sig}`;
}

export function verifySession(cookie: string): string | null {
  const dotIdx = cookie.lastIndexOf(".");
  if (dotIdx === -1) return null;
  const b64 = cookie.slice(0, dotIdx);
  const sig = cookie.slice(dotIdx + 1);
  try {
    const email = Buffer.from(b64, "base64url").toString("utf-8");
    const expected = createHmac("sha256", getSecret()).update(email).digest("hex");
    if (sig !== expected) return null;
    return email;
  } catch {
    return null;
  }
}
