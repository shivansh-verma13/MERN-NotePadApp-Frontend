import { createHmac } from "node:crypto";
import { isIP } from "node:net";

const API = "https://notepadapp.onrender.com";
const MAX_BODY = 128 * 1024;
const jsonError = (message, status) => Response.json({ message }, { status, headers: { "Cache-Control": "no-store" } });

export function createProxy({ secret, fetchImpl = fetch, now = Date.now } = {}) {
  return async (request, context) => {
    if (typeof secret !== "string" || secret.length < 32 || !isIP(context?.ip || "")) {
      return jsonError("API proxy is not configured", 503);
    }
    const incoming = new URL(request.url);
    if (!incoming.pathname.startsWith("/notepad/") || !["GET", "HEAD", "POST", "PATCH", "DELETE", "OPTIONS"].includes(request.method)) {
      return jsonError("Unknown API route", 404);
    }
    let body;
    if (request.body) {
      const reader = request.body.getReader();
      const chunks = [];
      let size = 0;
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > MAX_BODY) { await reader.cancel(); return jsonError("Invalid request body", 413); }
        chunks.push(value);
      }
      body = Buffer.concat(chunks);
    }
    const headers = new Headers();
    for (const name of ["Accept", "Content-Type", "Cookie", "Origin", "X-Notes-Request", "Access-Control-Request-Method", "Access-Control-Request-Headers"]) {
      if (request.headers.has(name)) headers.set(name, request.headers.get(name));
    }
    const time = String(now());
    const path = incoming.pathname + incoming.search;
    headers.set("X-Notes-Client-IP", context.ip);
    headers.set("X-Notes-Proxy-Time", time);
    headers.set("X-Notes-Proxy-Signature", createHmac("sha256", secret)
      .update(JSON.stringify([time, context.ip, request.method, path])).digest("hex"));
    try {
      const upstream = await fetchImpl(API + path, { method: request.method, headers, body,
        redirect: "manual", signal: AbortSignal.timeout(20000) });
      // Never forward proxy credentials to a redirect destination.
      if (upstream.status >= 300 && upstream.status < 400) return jsonError("Unexpected API redirect", 502);
      const responseHeaders = new Headers(upstream.headers);
      for (const name of ["Content-Length", "Content-Encoding", "Transfer-Encoding", "Connection"]) responseHeaders.delete(name);
      responseHeaders.set("Cache-Control", "no-store");
      return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
    } catch {
      return jsonError("API temporarily unavailable. Please retry.", 502);
    }
  };
}

export default (request, context) => createProxy({ secret: process.env.NOTES_PROXY_SECRET })(request, context);
export const config = { path: "/notepad/*" };
