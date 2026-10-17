import { vi } from "vitest";
import React from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import App from "./App";
import { useAuth } from "../context/AuthContext";
import { createNote, deleteUserNote, getAllUserNotes, updateUserNote } from "../helpers/api-communicators";

vi.mock("../context/AuthContext", () => ({ useAuth: vi.fn() }));
vi.mock("../helpers/api-communicators", () => ({ getAllUserNotes: vi.fn(), createNote: vi.fn(), deleteUserNote: vi.fn(), updateUserNote: vi.fn() }));
vi.mock("./Heading", () => ({ default: () => null }));
vi.mock("./Footer", () => ({ default: () => null }));
const { mockNavigate } = vi.hoisted(() => ({ mockNavigate: vi.fn() }));
vi.mock("react-router-dom", () => ({ useNavigate: () => mockNavigate }));
vi.mock("react-hot-toast", () => ({ default: { loading: vi.fn(), success: vi.fn(), error: vi.fn() } }));
afterEach(() => vi.clearAllMocks());

const fixtures = [
  { _id: "synthetic-a", title: "Travel plans", content: "Book the train" },
  { _id: "synthetic-b", title: "Groceries", content: "Buy TRAIL mix" },
  { _id: "synthetic-c", title: "Literal [draft]", content: "Unpublished ideas" },
];
function authenticated() {
  useAuth.mockReturnValue({ status: "authenticated", isLoggedIn: true, username: "Synthetic owner" });
}

test("loading is distinct from an empty library and ignores a response after unmount", async () => {
  authenticated();
  let resolve;
  getAllUserNotes.mockReturnValueOnce(new Promise(done => { resolve = done; }));
  const { unmount } = render(<App />);
  expect(screen.getByRole("status")).toHaveTextContent("Loading your notes");
  expect(screen.queryByText(/No notes yet/)).not.toBeInTheDocument();
  expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Save note" })).not.toBeInTheDocument();
  unmount();
  await act(async () => resolve({ userNotes: fixtures }));
});

test("failed reads show a retry that can recover to an honest empty library", async () => {
  authenticated();
  getAllUserNotes.mockRejectedValueOnce(new Error("Synthetic outage"))
    .mockResolvedValueOnce({ userNotes: [] });
  render(<App />);
  expect(await screen.findByRole("alert")).toHaveTextContent("could not be loaded");
  expect(screen.queryByText(/No notes yet/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Retry loading notes" }));
  expect(await screen.findByText(/No notes yet/)).toBeVisible();
  expect(screen.getByRole("status")).toHaveTextContent("0 of 0 notes shown");
  expect(getAllUserNotes).toHaveBeenCalledTimes(2);
});

test("search matches title and content without case, trims whitespace, treats symbols literally and clears", async () => {
  authenticated();
  getAllUserNotes.mockResolvedValueOnce({ userNotes: fixtures });
  render(<App />);
  const search = await screen.findByRole("searchbox", { name: "Search notes" });
  fireEvent.change(search, { target: { value: "  TRA  " } });
  expect(within(screen.getByRole("list", { name: "Your notes" })).getAllByRole("listitem")).toHaveLength(2);
  expect(screen.getByRole("status")).toHaveTextContent("2 of 3 notes shown");
  fireEvent.change(search, { target: { value: "[draft]" } });
  expect(screen.getByRole("heading", { name: "Literal [draft]" })).toBeVisible();
  expect(screen.queryByRole("heading", { name: "Travel plans" })).not.toBeInTheDocument();
  fireEvent.change(search, { target: { value: "missing" } });
  expect(screen.getByText(/No notes match/)).toBeVisible();
  expect(screen.queryByText(/No notes yet/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
  expect(search).toHaveValue("");
  expect(screen.getByRole("status")).toHaveTextContent("3 of 3 notes shown");
  expect(getAllUserNotes).toHaveBeenCalledTimes(1);
});

test("creation keeps the filter while counting the saved note from the API response", async () => {
  authenticated();
  getAllUserNotes.mockResolvedValueOnce({ userNotes: fixtures });
  createNote.mockResolvedValueOnce({ notes: [...fixtures, { _id: "synthetic-d", title: "Budget", content: "Expenses" }] });
  render(<App />);
  fireEvent.change(await screen.findByRole("searchbox"), { target: { value: "train" } });
  fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Budget" } });
  fireEvent.change(screen.getByLabelText("Content"), { target: { value: "Expenses" } });
  fireEvent.click(screen.getByRole("button", { name: "Save note" }));
  await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("1 of 4 notes shown"));
  expect(screen.getByRole("searchbox")).toHaveValue("train");
  expect(createNote).toHaveBeenCalledWith("Budget", "Expenses");
  fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
  expect(screen.getByRole("heading", { name: "Budget" })).toBeVisible();
});

test("filtered edit and deletion retain note IDs and recompute matches from saved responses", async () => {
  authenticated();
  getAllUserNotes.mockResolvedValueOnce({ userNotes: fixtures });
  updateUserNote.mockResolvedValueOnce({ notes: fixtures.map(note => note._id === "synthetic-b" ? { ...note, content: "Buy milk" } : note) });
  deleteUserNote.mockResolvedValueOnce({ userNotes: fixtures.filter(note => note._id !== "synthetic-c") });
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
  render(<App />);
  fireEvent.change(await screen.findByRole("searchbox"), { target: { value: "trail" } });
  fireEvent.click(screen.getByRole("button", { name: "Edit Groceries" }));
  const dialog = await screen.findByRole("dialog");
  fireEvent.change(within(dialog).getByLabelText("Content"), { target: { value: "Buy milk" } });
  fireEvent.click(within(dialog).getByRole("button", { name: "Save changes" }));
  await waitFor(() => expect(screen.getByText(/No notes match/)).toBeVisible());
  expect(updateUserNote).toHaveBeenCalledWith("Buy milk", "synthetic-b");
  fireEvent.change(await screen.findByRole("searchbox"), { target: { value: "[draft]" } });
  fireEvent.click(screen.getByRole("button", { name: "Delete Literal [draft]" }));
  await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("0 of 2 notes shown"));
  expect(deleteUserNote).toHaveBeenCalledWith("synthetic-c");
  confirm.mockRestore();
});

test("notes wait for session restoration without redirect or a premature API call", () => {
  useAuth.mockReturnValue({ status: "loading", isLoggedIn: false, username: "" });
  render(<App />);
  expect(screen.getByRole("status")).toHaveTextContent("Checking your session");
  expect(mockNavigate).not.toHaveBeenCalled();
  expect(getAllUserNotes).not.toHaveBeenCalled();
});
test("session failure shows retry; anonymous session redirects", () => {
  const refreshAuth = vi.fn();
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
