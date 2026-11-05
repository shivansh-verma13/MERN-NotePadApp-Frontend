import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Explicit cleanup keeps DOM isolation independent of test-global discovery.
afterEach(cleanup);
