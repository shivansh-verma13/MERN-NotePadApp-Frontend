/** @jest-environment node */
import { createServer } from "http";
import { api } from "./api-client";

// Exercise the installed Axios HTTP adapter against a disposable synthetic API.
// This does not establish browser cookie acceptance or a live Notes backend.
jest.mock("axios", () => jest.requireActual("axios/dist/node/axios.cjs"));

let server;
let baseURL;
let received;

beforeAll(async () => {
  server = createServer((request, response) => {
    let body = "";
    request.on("data", chunk => { body += chunk; });
    request.on("end", () => {
      received = { method: request.method, headers: request.headers, body };
      if (request.url === "/slow") return;
      const status = request.url === "/conflict" ? 409 : request.url === "/limited" ? 429 : 201;
      response.writeHead(status, { "Content-Type": "application/json", "Retry-After": "60" });
      response.end(JSON.stringify({ message: "Synthetic response" }));
    });
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  baseURL = `http://127.0.0.1:${server.address().port}`;
});

afterAll(async () => {
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
});

test("patched client preserves JSON writes and the request boundary header", async () => {
  const response = await api.post("/notes/newNote", { title: "Synthetic", content: "Fixture" }, { baseURL, proxy: false });
  expect(response.status).toBe(201);
  expect(response.data.message).toBe("Synthetic response");
  expect(received.method).toBe("POST");
  expect(received.headers["x-notes-request"]).toBe("1");
  expect(JSON.parse(received.body)).toEqual({ title: "Synthetic", content: "Fixture" });
  expect(api.defaults.withCredentials).toBe(true);
  expect(api.defaults.timeout).toBe(15000);
});

test("conflicts and throttling retain status and retry metadata", async () => {
  await expect(api.post("/conflict", {}, { baseURL, proxy: false })).rejects.toMatchObject({ response: { status: 409 } });
  await expect(api.post("/limited", {}, { baseURL, proxy: false })).rejects.toMatchObject({ response: { status: 429, headers: { "retry-after": "60" } } });
});

test("an unresponsive synthetic API times out", async () => {
  await expect(api.get("/slow", { baseURL, proxy: false, timeout: 50 })).rejects.toMatchObject({ code: "ECONNABORTED" });
});

test("a cancelled request rejects without waiting for the API", async () => {
  const controller = new AbortController();
  const request = api.get("/slow", { baseURL, proxy: false, signal: controller.signal });
  controller.abort();
  await expect(request).rejects.toMatchObject({ code: "ERR_CANCELED" });
});
