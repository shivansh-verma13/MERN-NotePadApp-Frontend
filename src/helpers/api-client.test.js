/** @vitest-environment node */
import { createServer } from "http";
import { api } from "./api-client";

// Exercise the installed Axios HTTP adapter against a disposable synthetic API.
// This does not establish browser cookie acceptance or a live Notes backend.
// Node environment selects Axios's real HTTP adapter without a module mock.

let server;
let baseURL;
let received;

beforeAll(async () => {
  server = createServer((request, response) => {
    let body = "";
    request.on("data", chunk => { body += chunk; });
    request.on("end", () => {
      received = { method: request.method, headers: request.headers, body };
      if (request.url === "/slow" || request.url.startsWith("/hold/")) return;
      const status = request.url === "/conflict" ? 409 : request.url === "/limited" ? 429 : request.url.includes("updateNote") || request.url.includes("deleteNote") || request.url.includes("all-notes") ? 200 : 201;
      response.writeHead(status, { "Content-Type": "application/json", "Retry-After": "60" });
      response.end(JSON.stringify({ message: "Synthetic response" }));
    });
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  baseURL = `http://127.0.0.1:${server.address().port}`;
});

test('comparison read helper preserves the existing GET contract and propagates cancellation',async()=>{
  const {getAllUserNotes}=await import('./api-communicators');
  const previousURL=api.defaults.baseURL;const previousProxy=api.defaults.proxy;
  api.defaults.baseURL=baseURL;api.defaults.proxy=false;
  try {
    await getAllUserNotes();
    expect(received.method).toBe('GET');
    expect(received.headers['x-notes-request']).toBe('1');
    api.defaults.baseURL=baseURL+'/hold';
    const controller=new AbortController();
    const request=getAllUserNotes(controller.signal);
    controller.abort();
    await expect(request).rejects.toMatchObject({code:'ERR_CANCELED'});
  } finally {api.defaults.baseURL=previousURL;api.defaults.proxy=previousProxy;}
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

test('create helper transmits the retry key through the real Axios HTTP adapter', async () => {
  const {createNote}=await import('./api-communicators');
  const previousURL=api.defaults.baseURL;
  const previousProxy=api.defaults.proxy;
  api.defaults.baseURL=baseURL;api.defaults.proxy=false;
  try {
    const createKey='1800000000000.11111111-1111-4111-8111-111111111111';
    await createNote('Synthetic','Fixture',createKey);
    expect(JSON.parse(received.body)).toEqual({title:'Synthetic',content:'Fixture',createKey});
  } finally {api.defaults.baseURL=previousURL;api.defaults.proxy=previousProxy;}
});


test('edit and delete helpers serialize conditional revisions through real Axios HTTP',async()=>{
  const {updateUserNote,deleteUserNote}=await import('./api-communicators');
  const previousURL=api.defaults.baseURL;const previousProxy=api.defaults.proxy;
  api.defaults.baseURL=baseURL;api.defaults.proxy=false;
  try {
    await updateUserNote('Synthetic edit','synthetic-note',5);
    expect(received.method).toBe('PATCH');
    expect(JSON.parse(received.body)).toEqual({content:'Synthetic edit',noteID:'synthetic-note',expectedRevision:5});
    await deleteUserNote('synthetic-note',6);
    expect(received.method).toBe('DELETE');
    expect(JSON.parse(received.body)).toEqual({expectedRevision:6});
    expect(received.headers['x-notes-request']).toBe('1');
  } finally {api.defaults.baseURL=previousURL;api.defaults.proxy=previousProxy;}
});
