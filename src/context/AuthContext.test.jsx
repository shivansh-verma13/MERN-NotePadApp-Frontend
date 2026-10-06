import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { AuthProvider, useAuth } from "./AuthContext";
import { checkAuth, userLogin, userLogout } from "../helpers/api-communicators";

jest.mock("../helpers/api-communicators", () => ({ checkAuth: jest.fn(), userLogin: jest.fn(), userLogout: jest.fn(), userSignUp: jest.fn() }));
function Harness() {
  const auth = useAuth();
  return <><p role="status">{auth.status}:{auth.username}</p><button onClick={auth.refreshAuth}>Retry</button><button onClick={() => auth.login("synthetic", "test password")}>Login</button><button onClick={auth.logout}>Logout</button></>;
}
afterEach(() => jest.resetAllMocks());

test("session stays loading until authentication resolves", async () => {
  let resolve;
  checkAuth.mockReturnValue(new Promise(done => { resolve = done; }));
  render(<AuthProvider><Harness /></AuthProvider>);
  expect(screen.getByRole("status")).toHaveTextContent("loading:");
  await act(async () => resolve({ name: "Synthetic Owner" }));
  expect(screen.getByRole("status")).toHaveTextContent("authenticated:Synthetic Owner");
});

test("401 is anonymous, infrastructure failure remains retryable", async () => {
  checkAuth.mockRejectedValueOnce({ response: { status: 401 } }).mockRejectedValueOnce({ response: { status: 503 } }).mockResolvedValueOnce({ name: "Synthetic Owner" });
  render(<AuthProvider><Harness /></AuthProvider>);
  await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("anonymous:"));
  fireEvent.click(screen.getByText("Retry"));
  await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("error:"));
  fireEvent.click(screen.getByText("Retry"));
  await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("authenticated:Synthetic Owner"));
});

test("a stale startup request cannot overwrite login; logout clears in-memory session", async () => {
  let reject;
  checkAuth.mockReturnValue(new Promise((_resolve, fail) => { reject = fail; }));
  userLogin.mockResolvedValue({ name: "Synthetic Owner" });
  userLogout.mockResolvedValue({ message: "User logged out" });
  render(<AuthProvider><Harness /></AuthProvider>);
  fireEvent.click(screen.getByText("Login"));
  await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("authenticated:Synthetic Owner"));
  await act(async () => reject({ response: { status: 401 } }));
  expect(screen.getByRole("status")).toHaveTextContent("authenticated:Synthetic Owner");
  fireEvent.click(screen.getByText("Logout"));
  await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("anonymous:"));
});
