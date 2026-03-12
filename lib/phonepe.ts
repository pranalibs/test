import crypto from "crypto";
import https from "https";
import { URL } from "url";

export function httpsPost(
  url: string,
  headers: Record<string, string>,
  body: string
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const { hostname, pathname, search } = new URL(url);
    const req = https.request(
      {
        hostname,
        path: pathname + search,
        method: "POST",
        port: 443,
        headers: { ...headers, "Content-Length": Buffer.byteLength(body) },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => { data += chunk; });
        res.on("end", () => resolve({ status: res.statusCode ?? 0, body: data }));
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

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
