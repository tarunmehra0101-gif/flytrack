function b64UrlDecode(value) {
  if (!value) return "";
  return Buffer.from(String(value).replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
}

function b64UrlDecodeBuffer(value) {
  return Buffer.from(String(value || "").replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

async function refreshGoogleAccessToken(refreshToken) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    const err = new Error("Google OAuth server credentials are not configured.");
    err.statusCode = 503;
    throw err;
  }
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    const err = new Error(data.error_description || data.error || "Could not refresh Gmail access.");
    err.statusCode = 401;
    throw err;
  }
  return data.access_token;
}

async function gmailGet(accessToken, path) {
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.error?.message || "Gmail request failed.");
    err.statusCode = res.status;
    throw err;
  }
  return data;
}

function collectParts(part, out = []) {
  if (!part) return out;
  out.push(part);
  (part.parts || []).forEach((child) => collectParts(child, out));
  return out;
}

function messageText(payload) {
  const parts = collectParts(payload);
  const chunks = [];
  for (const part of parts) {
    if ((part.mimeType === "text/plain" || part.mimeType === "text/html") && part.body?.data) {
      chunks.push(b64UrlDecode(part.body.data));
    }
  }
  return chunks.join("\n").replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ");
}

function pdfAttachmentParts(payload) {
  return collectParts(payload).filter((part) => (
    part.body?.attachmentId &&
    (part.mimeType === "application/pdf" || String(part.filename || "").toLowerCase().endsWith(".pdf"))
  ));
}

async function attachmentBuffer(accessToken, messageId, attachmentId) {
  const data = await gmailGet(accessToken, `messages/${messageId}/attachments/${attachmentId}`);
  return b64UrlDecodeBuffer(data.data);
}

module.exports = {
  attachmentBuffer,
  gmailGet,
  messageText,
  pdfAttachmentParts,
  refreshGoogleAccessToken,
};
