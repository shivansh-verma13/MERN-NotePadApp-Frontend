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

function deferred() {
  let resolve, reject;
  const promise = new Promise((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}

test("a delayed create prevents overlapping delete/edit and cannot restore a later deletion", async () => {
  authenticated();
  getAllUserNotes.mockResolvedValueOnce({ userNotes: fixtures });
  const creation = deferred();
  createNote.mockReturnValueOnce(creation.promise);
  const added = { _id: "synthetic-d", title: "Budget", content: "Expenses" };
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
  deleteUserNote.mockResolvedValueOnce({ userNotes: [...fixtures.slice(1), added] });
  render(<App />);
  await screen.findByRole("searchbox");
  fireEvent.change(screen.getByLabelText("Title"), { target: { value: added.title } });
  fireEvent.change(screen.getByLabelText("Content"), { target: { value: added.content } });
  fireEvent.submit(screen.getByRole("form", { name: "Create note" }));
  fireEvent.submit(screen.getByRole("form", { name: "Create note" }));
  const remove = screen.getByRole("button", { name: "Delete Travel plans" });
  expect(remove).toBeDisabled();
  expect(screen.getByRole("button", { name: "Edit Groceries" })).toBeDisabled();
  expect(screen.getByText(/Please wait before changing another note/)).toHaveTextContent("Saving note");
  fireEvent.click(remove);
  expect(deleteUserNote).not.toHaveBeenCalled();
  expect(updateUserNote).not.toHaveBeenCalled();
  expect(confirm).not.toHaveBeenCalled();
  expect(createNote).toHaveBeenCalledTimes(1);
  // Search stays usable while persistence is pending.
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "Travel" } });
  await act(async () => creation.resolve({ notes: [...fixtures, added] }));
  fireEvent.click(screen.getByRole("button", { name: "Delete Travel plans" }));
  await waitFor(() => expect(screen.getByText(/0 of 3 notes shown/)).toBeVisible());
  expect(deleteUserNote).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
  expect(screen.queryByRole("heading", { name: "Travel plans" })).not.toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Budget" })).toBeVisible();
  confirm.mockRestore();
});

test("a pending delete blocks creation and other note writes; failure unlocks a retained draft for retry", async () => {
  authenticated();
  getAllUserNotes.mockResolvedValueOnce({ userNotes: fixtures });
  const deletion = deferred();
  deleteUserNote.mockReturnValueOnce(deletion.promise).mockResolvedValueOnce({ userNotes: fixtures.slice(1) });
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
  render(<App />);
  await screen.findByRole("searchbox");
  fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Retained draft" } });
  fireEvent.change(screen.getByLabelText("Content"), { target: { value: "Not yet saved" } });
  fireEvent.click(screen.getByRole("button", { name: "Delete Travel plans" }));
  expect(screen.getByRole("button", { name: "Save note" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Delete Groceries" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Edit Groceries" })).toBeDisabled();
  fireEvent.submit(screen.getByRole("form", { name: "Create note" }));
  fireEvent.click(screen.getByRole("button", { name: "Delete Groceries" }));
  expect(createNote).not.toHaveBeenCalled();
  expect(deleteUserNote).toHaveBeenCalledTimes(1);
  await act(async () => deletion.reject(new Error("Synthetic outage")));
  expect(screen.getByRole("heading", { name: "Travel plans" })).toBeVisible();
  expect(screen.getByLabelText("Title")).toHaveValue("Retained draft");
  expect(screen.getByLabelText("Content")).toHaveValue("Not yet saved");
  expect(screen.getByRole("button", { name: "Save note" })).toBeEnabled();
  fireEvent.click(screen.getByRole("button", { name: "Delete Travel plans" }));
  await waitFor(() => expect(screen.queryByRole("heading", { name: "Travel plans" })).not.toBeInTheDocument());
  confirm.mockRestore();
});

test("pending edits block overlapping writes and a failed edit retains content and releases the guard", async () => {
  authenticated();
  getAllUserNotes.mockResolvedValueOnce({ userNotes: fixtures });
  const editing = deferred();
  updateUserNote.mockReturnValueOnce(editing.promise).mockResolvedValueOnce({ notes: fixtures });
  render(<App />);
  await screen.findByRole("searchbox");
  const createForm = screen.getByRole("form", { name: "Create note" });
  const createButton = within(createForm).getByRole("button");
  const deleteButton = screen.getByRole("button", { name: "Delete Travel plans" });
  fireEvent.click(screen.getByRole("button", { name: "Edit Groceries" }));
  const dialog = await screen.findByRole("dialog");
  fireEvent.change(within(dialog).getByLabelText("Content"), { target: { value: "Keep my changes" } });
  fireEvent.click(within(dialog).getByRole("button", { name: "Save changes" }));
  fireEvent.submit(within(dialog).getByRole("button", { name: /Saving/ }).closest("form"));
  expect(deleteButton).toBeDisabled();
  expect(createButton).toBeDisabled();
  fireEvent.submit(createForm);
  fireEvent.click(deleteButton);
  expect(createNote).not.toHaveBeenCalled();
  expect(deleteUserNote).not.toHaveBeenCalled();
  expect(updateUserNote).toHaveBeenCalledTimes(1);
  expect(within(dialog).getByRole("button", { name: "Cancel" })).toBeDisabled();
  await act(async () => editing.reject(new Error("Synthetic outage")));
  expect(within(dialog).getByRole("alert")).toHaveTextContent("Keep editing or retry");
  expect(within(dialog).getByLabelText("Content")).toHaveValue("Keep my changes");
  expect(deleteButton).toBeEnabled();
  fireEvent.click(within(dialog).getByRole("button", { name: "Save changes" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(updateUserNote).toHaveBeenCalledTimes(2);
});

test.each(["before", "after"])("an older session's response arriving %s the newer mutation cannot overwrite it or release its guard", async (order) => {
  authenticated();
  getAllUserNotes.mockResolvedValueOnce({ userNotes: fixtures }).mockResolvedValueOnce({ userNotes: [] });
  const oldCreation = deferred();
  const newCreation = deferred();
  createNote.mockReturnValueOnce(oldCreation.promise).mockReturnValueOnce(newCreation.promise);
  const { rerender } = render(<App />);
  await screen.findByRole("searchbox");
  function submit(title) {
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: title } });
    fireEvent.change(screen.getByLabelText("Content"), { target: { value: "Synthetic content" } });
    fireEvent.submit(screen.getByRole("form", { name: "Create note" }));
  }
  submit("Old owner draft");
  useAuth.mockReturnValue({ status: "authenticated", isLoggedIn: true, username: "Other synthetic owner" });
  rerender(<App />);
  await screen.findByText(/No notes yet/);
  submit("New owner draft");
  if (order === "before") {
    await act(async () => oldCreation.resolve({ notes: fixtures }));
  }
  expect(screen.queryByRole("heading", { name: "Travel plans" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Saving note" })).toBeDisabled();
  expect(createNote).toHaveBeenCalledTimes(2);
  await act(async () => newCreation.resolve({ notes: [{ _id: "new-owner-note", title: "New owner draft", content: "Synthetic content" }] }));
  if (order === "after") {
    await act(async () => oldCreation.resolve({ notes: fixtures }));
  }
  expect(screen.queryByRole("heading", { name: "Travel plans" })).not.toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "New owner draft" })).toBeVisible();
  expect(screen.getByRole("button", { name: "Save note" })).toBeEnabled();
});
