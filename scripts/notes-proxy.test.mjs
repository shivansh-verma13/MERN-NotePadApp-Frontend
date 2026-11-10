import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes, createHmac } from "node:crypto";
import { createProxy } from "../netlify/functions/notes-proxy.mjs";

test("proxy signs the platform IP, preserves API cookies and never trusts client proxy headers", async () => {
  const secret = randomBytes(32).toString("hex");
  const now = 1792644000000;
  let forwarded;
  const proxy = createProxy({ secret, now: () => now, fetchImpl: async (url, options) => {
    forwarded = { url, ...options };
    return new Response('{"ok":true}', { headers: { "Set-Cookie": "synthetic=session; HttpOnly; Secure; Path=/", "Content-Type": "application/json" } });
  } });
  const response = await proxy(new Request("https://notes.example.test/notepad/user/login?mode=test", {
    method: "POST", body: "{}", headers: { Origin: "https://notes.example.test", "X-Notes-Request": "1", Cookie: "synthetic=old",
      "X-Notes-Client-IP": "198.51.100.99", "X-Forwarded-For": "198.51.100.99", "X-Notes-Proxy-Signature": "forged" }
  }), { ip: "192.0.2.5" });
  assert.equal(forwarded.url, "https://notepadapp.onrender.com/notepad/user/login?mode=test");
  assert.equal(forwarded.headers.get("X-Notes-Client-IP"), "192.0.2.5");
  assert.equal(forwarded.headers.get("X-Forwarded-For"), null);
  assert.equal(forwarded.headers.get("Cookie"), "synthetic=old");
  assert.equal(forwarded.body.toString("utf8"), "{}");
  assert.equal(forwarded.headers.get("X-Notes-Proxy-Signature"), createHmac("sha256", secret)
    .update(JSON.stringify([String(now), "192.0.2.5", "POST", "/notepad/user/login?mode=test"])).digest("hex"));
  assert.match(response.headers.get("Set-Cookie"), /HttpOnly/);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.equal(forwarded.redirect, "manual");
});

test("proxy fails closed on configuration, oversize bodies, redirects and transport errors", async () => {
  const req = () => new Request("https://notes.example.test/notepad/user/login");
  assert.equal((await createProxy()(req(), { ip: "192.0.2.1" })).status, 503);
  const secret = randomBytes(32).toString("hex");
  let calls = 0;
  const proxy = createProxy({ secret, fetchImpl: async () => { calls++; return new Response(null, { status: 302, headers: { Location: "https://evil.test" } }); } });
  assert.equal((await proxy(req(), { ip: "not-an-IP" })).status, 503);
  assert.equal((await proxy(new Request("https://notes.example.test/notepad/notes/newNote", { method: "POST", body: "x".repeat(128 * 1024 + 1) }), { ip: "192.0.2.1" })).status, 413);
  assert.equal(calls, 0);
  assert.equal((await proxy(req(), { ip: "192.0.2.1" })).status, 502);
  const unavailable = createProxy({ secret, fetchImpl: async () => { throw new Error("private transport detail"); } });
  const failed = await unavailable(req(), { ip: "192.0.2.1" });
  assert.equal(failed.status, 502);
  assert.doesNotMatch(await failed.text(), /private transport/);
});

test("proxy rejects an interrupted upload without forwarding its partial body", async () => {
  let reads = 0;
  const body = new ReadableStream({
    pull(controller) {
      if (++reads === 1) controller.enqueue(new TextEncoder().encode('{"title":'));
      else controller.error(new Error("private upload detail"));
    },
  });
  let calls = 0;
  const proxy = createProxy({
    secret: randomBytes(32).toString("hex"),
    fetchImpl: async () => { calls++; return new Response(); },
  });
  const response = await proxy(new Request("https://notes.example.test/notepad/notes/newNote", {
    method: "POST", body, duplex: "half",
  }), { ip: "192.0.2.1" });
  assert.equal(response.status, 400);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(await response.json(), { message: "Unable to read request body. Please retry." });
  assert.equal(calls, 0);
});
