import React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { routes } from "./routes";
import { AuthProvider } from "./context/AuthContext";
import { checkAuth, getAllUserNotes, userLogin, userLogout } from "./helpers/api-communicators";

jest.mock("./helpers/api-communicators", () => ({
  checkAuth: jest.fn(), getAllUserNotes: jest.fn(),
  userLogin: jest.fn(), userLogout: jest.fn(), userSignUp: jest.fn(),
}));
jest.mock("react-hot-toast", () => ({ loading: jest.fn(), success: jest.fn(), error: jest.fn() }));

let router;
function open(path) {
  router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<AuthProvider><RouterProvider router={router} /></AuthProvider>);
  return router;
}
beforeEach(() => {
  jest.resetAllMocks();
  getAllUserNotes.mockResolvedValue({ userNotes: [] });
});
afterEach(() => { cleanup(); router?.dispose(); });

test("a direct notes route waits for restored auth before reading private notes", async () => {
  let restore;
  checkAuth.mockReturnValue(new Promise(resolve => { restore = resolve; }));
  open("/notes");
  expect(screen.getByRole("status")).toHaveTextContent("Checking your session");
  expect(router.state.location.pathname).toBe("/notes");
  expect(getAllUserNotes).not.toHaveBeenCalled();
  await act(async () => restore({ name: "Synthetic Owner" }));
  expect(await screen.findByRole("heading", { name: /Welcome, Synthetic Owner/ })).toBeVisible();
  await waitFor(() => expect(getAllUserNotes).toHaveBeenCalledTimes(1));
});

test("anonymous deep links replace the protected history entry with auth", async () => {
  checkAuth.mockRejectedValue({ response: { status: 401 } });
  open("/notes");
  expect(await screen.findByRole("form", { name: "Create account" })).toBeVisible();
  expect(router.state.location.pathname).toBe("/auth");
  expect(router.state.historyAction).toBe("REPLACE");
  expect(getAllUserNotes).not.toHaveBeenCalled();
});

test("session service failure stays on notes and retry restores the same route", async () => {
  checkAuth.mockRejectedValueOnce({ response: { status: 503 } })
    .mockResolvedValueOnce({ name: "Synthetic Owner" });
  open("/notes");
  expect(await screen.findByRole("alert")).toHaveTextContent("Unable to check your session");
  expect(router.state.location.pathname).toBe("/notes");
  expect(getAllUserNotes).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Retry session check" }));
  expect(await screen.findByRole("heading", { name: /Welcome, Synthetic Owner/ })).toBeVisible();
  expect(router.state.location.pathname).toBe("/notes");
});

test("actual login and logout navigate between auth and protected notes", async () => {
  checkAuth.mockRejectedValue({ response: { status: 401 } });
  userLogin.mockResolvedValue({ name: "Synthetic Owner" });
  userLogout.mockResolvedValue({ message: "Logged out" });
  open("/auth");
  await waitFor(() => expect(checkAuth).toHaveBeenCalled());
  fireEvent.click(screen.getByRole("button", { name: /Already Registered/ }));
  fireEvent.change(screen.getByRole("textbox", { name: "Username" }), { target: { value: "synthetic" } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "synthetic password" } });
  fireEvent.submit(screen.getByRole("form", { name: "Log in" }));
  expect(await screen.findByRole("heading", { name: /Welcome, Synthetic Owner/ })).toBeVisible();
  expect(userLogin).toHaveBeenCalledWith("synthetic", "synthetic password");
  expect(router.state.location.pathname).toBe("/notes");
  fireEvent.click(screen.getByRole("button", { name: "LOGOUT" }));
  expect(await screen.findByRole("form", { name: "Create account" })).toBeVisible();
  expect(userLogout).toHaveBeenCalledTimes(1);
  expect(router.state.location.pathname).toBe("/auth");
});

test("restored users visiting auth are sent to their notes", async () => {
  checkAuth.mockResolvedValue({ name: "Synthetic Owner" });
  open("/auth");
  expect(await screen.findByRole("heading", { name: /Welcome, Synthetic Owner/ })).toBeVisible();
  expect(router.state.location.pathname).toBe("/notes");
});

test.each(["/", "/unknown/nested/path"])("public route %s retains the landing fallback", async path => {
  checkAuth.mockRejectedValue({ response: { status: 401 } });
  open(path);
  await waitFor(() => expect(checkAuth).toHaveBeenCalledTimes(1));
  expect(router.state.location.pathname).toBe(path);
  expect(screen.queryByRole("form", { name: "Create account" })).not.toBeInTheDocument();
  expect(screen.getByRole("banner")).toBeVisible();
  expect(getAllUserNotes).not.toHaveBeenCalled();
});
