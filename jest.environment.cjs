const { TestEnvironment } = require("jest-environment-jsdom");
const { TextEncoder, TextDecoder } = require("node:util");

// Router uses the Web Request API even for client-only navigation. Use Node's
// real implementations in jsdom rather than mocking router internals.
module.exports = class extends TestEnvironment {
  async setup() {
    await super.setup();
    Object.assign(this.global, {
      TextEncoder, TextDecoder, Request, Response, Headers,
      AbortController, AbortSignal,
    });
  }
};
