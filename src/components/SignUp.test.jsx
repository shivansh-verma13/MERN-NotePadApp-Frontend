import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import SignUp from "./SignUp";
import { useAuth } from "../context/AuthContext";

jest.mock("../context/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("./Heading", () => () => null);
jest.mock("./Footer", () => () => null);
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({ useNavigate: () => mockNavigate }));
jest.mock("react-hot-toast", () => ({ loading: jest.fn(), success: jest.fn(), error: jest.fn() }));
afterEach(() => jest.clearAllMocks());

test.each(["register", "login"])("%s explains throttling and preserves the draft", async mode => {
  const fail = jest.fn().mockRejectedValue({ response: { status: 429, headers: { "retry-after": "60" } } });
  useAuth.mockReturnValue({ register: fail, login: fail, isLoggedIn: false, username: "" });
  render(<SignUp />);
  if (mode === "login") fireEvent.click(screen.getByRole("button", { name: /Already Registered/ }));
  fireEvent.change(screen.getByLabelText("Username"), { target: { value: "synthetic" } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "test password" } });
  fireEvent.submit(screen.getByRole("form"));
  expect(await screen.findByRole("alert")).toHaveTextContent("Try again in 60 seconds");
  expect(screen.getByLabelText("Username")).toHaveValue("synthetic");
  expect(screen.getByLabelText("Password")).toHaveValue("test password");
  expect(mockNavigate).not.toHaveBeenCalled();
});

test("registration blocks duplicate submits and retains fields after a failure", async () => {
  let reject;
  const register = jest.fn(() => new Promise((_resolve, fail) => { reject = fail; }));
  useAuth.mockReturnValue({ register, isLoggedIn: false, username: "" });
  render(<SignUp />);
  fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Synthetic Owner" } });
  fireEvent.change(screen.getByLabelText("Username"), { target: { value: "synthetic" } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "test password" } });
  const form = screen.getByRole("form", { name: "Create account" });
  fireEvent.submit(form); fireEvent.submit(form);
  expect(register).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("button", { name: "Please wait…" })).toBeDisabled();
  reject(new Error("offline"));
  expect(await screen.findByRole("alert")).toHaveTextContent("try again");
  expect(screen.getByLabelText("Username")).toHaveValue("synthetic");
  expect(screen.getByRole("button", { name: "Sign Up" })).toBeEnabled();
  expect(mockNavigate).not.toHaveBeenCalled();
});

test("successful login navigates to notes", async () => {
  const login = jest.fn().mockResolvedValue(undefined);
  useAuth.mockReturnValue({ login, isLoggedIn: false, username: "" });
  render(<SignUp />);
  fireEvent.click(screen.getByRole("button", { name: /Already Registered/ }));
  fireEvent.change(screen.getByLabelText("Username"), { target: { value: "synthetic" } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "test password" } });
  fireEvent.submit(screen.getByRole("form", { name: "Log in" }));
  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/notes"));
  expect(login).toHaveBeenCalledWith("synthetic", "test password");
});
