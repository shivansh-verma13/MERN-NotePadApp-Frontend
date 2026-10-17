import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import { build, createServer, preview, resolveConfig } from "vite";

// HTTP/configuration checks only: no browser, live API, database or credentials.
const originalApiURL = process.env.REACT_APP_API_URL;
const originalPrivateValue = process.env.VITE_PRIVATE_VERIFICATION;
const originalNodeEnv = process.env.NODE_ENV;
const marker = "http://127.0.0.1:4040/synthetic-notepad";
const privateMarker = "synthetic-private-setting-must-not-be-exposed";
let dev;
let built;
try {
  delete process.env.REACT_APP_API_URL;
  const defaults = await resolveConfig({}, "build");
  assert.equal(defaults.define["process.env.REACT_APP_API_URL"], '""');
  assert.equal(defaults.build.outDir, "build");
  assert.equal(defaults.server.port, 3000);
  assert.equal(defaults.server.strictPort, true);
  assert.equal(defaults.define["process.env"], undefined);

  process.env.REACT_APP_API_URL = marker;
  process.env.VITE_PRIVATE_VERIFICATION = privateMarker;
  const configured = await resolveConfig({}, "build");
  assert.equal(configured.define["process.env.REACT_APP_API_URL"], JSON.stringify(marker));
  assert.ok(!JSON.stringify(configured.define).includes(privateMarker));
  assert.ok(!JSON.stringify(configured.env).includes(privateMarker));

  process.env.NODE_ENV = "development";
  dev = await createServer({ server: { port: 0, strictPort: false }, logLevel: "error" });
  await dev.listen();
  const devURL = `http://127.0.0.1:${dev.httpServer.address().port}`;
  const client = await fetch(`${devURL}/src/helpers/api-client.js`);
  assert.equal(client.status, 200);
  const transformed = await client.text();
  assert.ok(!transformed.includes(privateMarker), "private setting stays out of client source");
  // Vite defines globals through its dev bootstrap; static replacement is build-only.
  const viteClient = await (await fetch(`${devURL}/@vite/client`)).text();
  const bootstrapPath = viteClient.match(/^import "([^"]+\/env\.mjs)";/)?.[1];
  assert.ok(bootstrapPath, "dev client imports its globals bootstrap");
  const bootstrap = await fetch(`${devURL}${bootstrapPath}`);
  assert.equal(bootstrap.status, 200);
  const bootstrapSource = await bootstrap.text();
  assert.ok(!bootstrapSource.includes(privateMarker));
  const context = {};
  runInNewContext(bootstrapSource, context, { timeout: 1000 });
  assert.equal(context.process.env.REACT_APP_API_URL, marker);
  assert.equal(context.process.env.PUBLIC_URL, "");
  const entry = await fetch(`${devURL}/src/index.jsx`);
  assert.equal(entry.status, 200);
  assert.match(entry.headers.get("content-type"), /javascript/);
  assert.ok(!(await entry.text()).includes("<React.StrictMode>"), "JSX was transformed");
  for (const route of ["/", "/auth", "/notes"]) {
    const response = await fetch(`${devURL}${route}`, { headers: { Accept: "text/html" } });
    assert.equal(response.status, 200);
    const devHTML = await response.text();
    assert.ok(devHTML.includes('/src/index.jsx'));
    assert.ok(devHTML.includes('/@vite/client'));
  }
  await dev.close();
  dev = undefined;

  // Compile a synthetic override in memory; preserve the normal build/ output.
  process.env.NODE_ENV = "production";
  const overridden = await build({ build: { write: false }, logLevel: "error" });
  const chunks = (Array.isArray(overridden) ? overridden : [overridden]).flatMap(result => result.output);
  assert.ok(chunks.some(chunk => chunk.type === "chunk" && chunk.code.includes(marker)));
  assert.ok(!chunks.some(chunk => chunk.type === "chunk" && chunk.code.includes(privateMarker)));

  const html = await readFile("build/index.html", "utf8");
  assert.match(html, /type="module"/);
  assert.ok(!html.includes("/src/"), "built HTML references generated modules");
  const scripts = [...html.matchAll(/src="([^"]+\.js)"/g)].map(match => match[1]);
  assert.ok(scripts.length > 0);
  built = await preview({ preview: { port: 0, strictPort: false }, logLevel: "error" });
  const builtURL = `http://127.0.0.1:${built.httpServer.address().port}`;
  for (const route of ["/", "/auth", "/notes"]) {
    const response = await fetch(`${builtURL}${route}`, { headers: { Accept: "text/html" } });
    assert.equal(response.status, 200);
    assert.equal(await response.text(), html, "preview deep routes serve the built SPA");
  }
  for (const name of await readdir("public")) {
    const response = await fetch(`${builtURL}/${name}`);
    assert.equal(response.status, 200, `public asset ${name} exists`);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), await readFile(`public/${name}`));
  }
  for (const script of scripts) {
    const response = await fetch(`${builtURL}${script}`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type"), /javascript/);
    const source = await response.text();
    assert.ok(!source.includes("process.env.REACT_APP_API_URL"));
    assert.ok(!source.includes("process.env.PUBLIC_URL"));
    assert.ok(!source.includes(privateMarker));
  }
  console.log("Toolchain checks passed: compiled public API URL/default, private setting exclusion, dev JSX/routes, build entrypoint, all public assets and preview SPA fallback.");
} finally {
  await dev?.close();
  if (built) await new Promise((resolve, reject) => built.httpServer.close(error => error ? reject(error) : resolve()));
  if (originalApiURL === undefined) delete process.env.REACT_APP_API_URL;
  else process.env.REACT_APP_API_URL = originalApiURL;
  if (originalPrivateValue === undefined) delete process.env.VITE_PRIVATE_VERIFICATION;
  else process.env.VITE_PRIVATE_VERIFICATION = originalPrivateValue;
  if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = originalNodeEnv;
}
