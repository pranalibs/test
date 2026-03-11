import crypto from "crypto";

export function generateChecksum(payload: string, endpoint: string, saltKey: string, saltIndex: string) {
  const base64Payload = Buffer.from(payload).toString("base64");
  const stringToSign = base64Payload + endpoint + saltKey;
  const sha256 = crypto.createHash("sha256").update(stringToSign).digest("hex");
  return `${sha256}###${saltIndex}`;
}

export function verifyChecksum(base64Payload: string, responseChecksum: string, saltKey: string, saltIndex: string) {
  const stringToSign = base64Payload + saltKey;
  const sha256 = crypto.createHash("sha256").update(stringToSign).digest("hex");
  const expectedChecksum = `${sha256}###${saltIndex}`;
  return expectedChecksum === responseChecksum;
}
