import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import App from "./App";
import { useAuth } from "../context/AuthContext";
import { getAllUserNotes } from "../helpers/api-communicators";

jest.mock("../context/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("../helpers/api-communicators", () => ({ getAllUserNotes: jest.fn() }));
jest.mock("./Heading", () => () => null);
jest.mock("./Footer", () => () => null);
jest.mock("./AddNote", () => () => null);
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({ useNavigate: () => mockNavigate }));
jest.mock("react-hot-toast", () => ({ loading: jest.fn(), success: jest.fn(), error: jest.fn() }));
afterEach(() => jest.clearAllMocks());

test("notes wait for session restoration without redirect or a premature API call", () => {
  useAuth.mockReturnValue({ status: "loading", isLoggedIn: false, username: "" });
  render(<App />);
  expect(screen.getByRole("status")).toHaveTextContent("Checking your session");
  expect(mockNavigate).not.toHaveBeenCalled();
  expect(getAllUserNotes).not.toHaveBeenCalled();
});
test("session failure shows retry; anonymous session redirects", () => {
  const refreshAuth = jest.fn();
  useAuth.mockReturnValue({ status: "error", isLoggedIn: false, username: "", refreshAuth });
  const { rerender } = render(<App />);
  expect(screen.getByRole("alert")).toHaveTextContent("Unable to check your session");
  expect(screen.getByRole("button", { name: "Retry session check" })).toBeEnabled();
  expect(mockNavigate).not.toHaveBeenCalled();
  useAuth.mockReturnValue({ status: "anonymous", isLoggedIn: false, username: "" });
  rerender(<App />);
  expect(mockNavigate).toHaveBeenCalledWith("/auth", { replace: true });
  expect(getAllUserNotes).not.toHaveBeenCalled();
});
