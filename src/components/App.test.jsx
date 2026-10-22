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
  expect(createNote).toHaveBeenCalledWith("Budget", "Expenses", expect.stringMatching(/^\d{13}\.[a-f\d-]{36}$/i));
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
  expect(updateUserNote).toHaveBeenCalledWith("Buy milk", "synthetic-b", 0);
  fireEvent.change(await screen.findByRole("searchbox"), { target: { value: "[draft]" } });
  fireEvent.click(screen.getByRole("button", { name: "Delete Literal [draft]" }));
  await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("0 of 2 notes shown"));
  expect(deleteUserNote).toHaveBeenCalledWith("synthetic-c", 0);
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
  expect(within(dialog).getByRole("alert")).toHaveTextContent("Retrying uses the same revision");
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

test('workspace forwards the same create key after an uncertain save and applies the replayed library', async () => {
  authenticated();
  getAllUserNotes.mockResolvedValueOnce({userNotes:fixtures});
  const saved={_id:'synthetic-retry-note',title:'Retry draft',content:'Synthetic body'};
  createNote.mockRejectedValueOnce(new Error('synthetic timeout after commit')).mockResolvedValueOnce({notes:[...fixtures,saved]});
  render(<App />);
  await screen.findByRole('searchbox');
  fireEvent.change(screen.getByLabelText('Title'),{target:{value:saved.title}});
  fireEvent.change(screen.getByLabelText('Content'),{target:{value:saved.content}});
  fireEvent.submit(screen.getByRole('form',{name:'Create note'}));
  await screen.findByRole('alert');
  const first=createNote.mock.calls[0];
  expect(first[2]).toMatch(/^\d{13}\.[a-f\d-]{36}$/i);
  fireEvent.submit(screen.getByRole('form',{name:'Create note'}));
  await screen.findByRole('heading',{name:saved.title});
  expect(createNote.mock.calls).toEqual([first,first]);
  expect(screen.getAllByRole('heading',{name:saved.title})).toHaveLength(1);
  expect(screen.getByLabelText('Content')).toHaveValue('');
});


test('stale delete submits the loaded revision, retains the library and explains recovery',async()=>{
  authenticated();
  getAllUserNotes.mockResolvedValueOnce({userNotes:[{...fixtures[0],revision:7}]});
  deleteUserNote.mockRejectedValueOnce({response:{status:409,data:{code:'NOTE_CONFLICT'}}});
  const confirm=vi.spyOn(window,'confirm').mockReturnValue(true);
  render(<App />);
  fireEvent.click(await screen.findByRole('button',{name:'Delete Travel plans'}));
  expect(await screen.findByRole('alert')).toHaveTextContent('It was not deleted');
  expect(deleteUserNote).toHaveBeenCalledWith('synthetic-a',7);
  expect(screen.getByRole('heading',{name:'Travel plans'})).toBeVisible();
  expect(getAllUserNotes).toHaveBeenCalledTimes(1);
  confirm.mockRestore();
});


test('workspace pins a stale edit to the loaded revision and preserves its unsaved content',async()=>{
  authenticated();
  getAllUserNotes.mockResolvedValueOnce({userNotes:[{...fixtures[0],revision:4}]});
  updateUserNote.mockRejectedValueOnce({response:{status:409,data:{code:'NOTE_CONFLICT'}}});
  render(<App />);
  fireEvent.click(await screen.findByRole('button',{name:'Edit Travel plans'}));
  const dialog=screen.getByRole('dialog');
  fireEvent.change(within(dialog).getByLabelText('Content'),{target:{value:'Keep this private draft'}});
  fireEvent.click(within(dialog).getByRole('button',{name:'Save changes'}));
  expect(await within(dialog).findByRole('alert')).toHaveTextContent('Copy it');
  expect(updateUserNote).toHaveBeenCalledWith('Keep this private draft','synthetic-a',4);
  expect(within(dialog).getByLabelText('Content')).toHaveValue('Keep this private draft');
  expect(screen.getByText('Book the train')).toBeInTheDocument();
  expect(getAllUserNotes).toHaveBeenCalledTimes(1);
});

test('reopening a successful edit starts with the saved content and new revision',async()=>{
  authenticated();
  getAllUserNotes.mockResolvedValueOnce({userNotes:[{...fixtures[0],revision:4}]});
  updateUserNote.mockResolvedValueOnce({notes:[{...fixtures[0],content:'Saved edit',revision:5}]}).mockResolvedValueOnce({notes:[{...fixtures[0],content:'Second edit',revision:6}]});
  render(<App />);
  fireEvent.click(await screen.findByRole('button',{name:'Edit Travel plans'}));
  let dialog=screen.getByRole('dialog');
  fireEvent.change(within(dialog).getByLabelText('Content'),{target:{value:'Saved edit'}});
  fireEvent.click(within(dialog).getByRole('button',{name:'Save changes'}));
  await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  fireEvent.click(screen.getByRole('button',{name:'Edit Travel plans'}));
  dialog=screen.getByRole('dialog');
  expect(within(dialog).getByLabelText('Content')).toHaveValue('Saved edit');
  fireEvent.change(within(dialog).getByLabelText('Content'),{target:{value:'Second edit'}});
  fireEvent.click(within(dialog).getByRole('button',{name:'Save changes'}));
  await waitFor(()=>expect(updateUserNote).toHaveBeenLastCalledWith('Second edit','synthetic-a',5));
});

async function openConflictedDraft() {
  fireEvent.click(await screen.findByRole('button',{name:'Edit Travel plans'}));
  const dialog=screen.getByRole('dialog');
  fireEvent.change(within(dialog).getByLabelText('Content'),{target:{value:'Retained owner draft'}});
  fireEvent.click(within(dialog).getByRole('button',{name:'Save changes'}));
  await within(dialog).findByRole('alert');
  return dialog;
}

test('comparison uses authenticated reads without replacing the library and saves only after explicit choice',async()=>{
  authenticated();
  const original={...fixtures[0],revision:4};
  const latest={...original,title:'Remote title',content:'Remote content',revision:5};
  getAllUserNotes.mockResolvedValueOnce({userNotes:[original]}).mockResolvedValueOnce({userNotes:[latest]});
  updateUserNote.mockRejectedValueOnce({response:{status:409,data:{code:'NOTE_CONFLICT'}}})
    .mockResolvedValueOnce({notes:[{...latest,content:'Combined by owner',revision:6}]});
  render(<App />);
  const dialog=await openConflictedDraft();
  fireEvent.click(within(dialog).getByRole('button',{name:'Compare latest saved note'}));
  expect(await within(dialog).findByLabelText('Latest saved content')).toHaveValue('Remote content');
  expect(screen.getByText('Book the train')).toBeInTheDocument();
  expect(within(dialog).getByLabelText('Content')).toHaveValue('Retained owner draft');
  expect(updateUserNote).toHaveBeenCalledTimes(1);
  expect(getAllUserNotes.mock.calls[1][0].aborted).toBe(false);
  fireEvent.click(within(dialog).getByRole('button',{name:'Continue editing my draft'}));
  fireEvent.change(within(dialog).getByLabelText('Content'),{target:{value:'Combined by owner'}});
  fireEvent.click(within(dialog).getByRole('button',{name:'Save changes'}));
  await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(updateUserNote).toHaveBeenLastCalledWith('Combined by owner','synthetic-a',5);
  expect(screen.getByRole('heading',{name:'Remote title'})).toBeVisible();
  expect(screen.getByText('Combined by owner')).toBeVisible();
});

test.each([
  ['deleted',{userNotes:[]},/no longer available/],
  ['malformed revision',{userNotes:[{...fixtures[0],revision:-1}]},/could not be loaded/],
  ['malformed content',{userNotes:[{...fixtures[0],content:null,revision:5}]},/could not be loaded/],
  ['malformed library',{userNotes:null},/could not be loaded/],
])('a %s comparison keeps the workspace and draft intact',async(label,response,message)=>{
  authenticated();
  getAllUserNotes.mockResolvedValueOnce({userNotes:[{...fixtures[0],revision:4}]}).mockResolvedValueOnce(response);
  updateUserNote.mockRejectedValueOnce({response:{status:409,data:{code:'NOTE_CONFLICT'}}});
  render(<App />);const dialog=await openConflictedDraft();
  fireEvent.click(within(dialog).getByRole('button',{name:'Compare latest saved note'}));
  await within(dialog).findByText(message);
  expect(within(dialog).getByLabelText('Content')).toHaveValue('Retained owner draft');
  expect(within(dialog).getByRole('button',{name:'Save changes'})).toBeDisabled();
  expect(screen.getByText('Book the train')).toBeInTheDocument();
  expect(updateUserNote).toHaveBeenCalledTimes(1);
});

test('an old-session comparison is cancelled and cannot expose the previous owner snapshot',async()=>{
  authenticated();const comparison=deferred();
  getAllUserNotes.mockResolvedValueOnce({userNotes:[{...fixtures[0],revision:4}]}).mockReturnValueOnce(comparison.promise)
    .mockResolvedValueOnce({userNotes:[]});
  updateUserNote.mockRejectedValueOnce({response:{status:409,data:{code:'NOTE_CONFLICT'}}});
  const {rerender}=render(<App />);const dialog=await openConflictedDraft();
  fireEvent.click(within(dialog).getByRole('button',{name:'Compare latest saved note'}));
  const signal=getAllUserNotes.mock.calls[1][0];
  useAuth.mockReturnValue({status:'authenticated',isLoggedIn:true,username:'Different synthetic owner'});
  rerender(<App />);
  await screen.findByText(/No notes yet/);
  expect(signal.aborted).toBe(true);
  await act(async()=>comparison.resolve({userNotes:[{...fixtures[0],content:'Private previous-owner content',revision:5}]}));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.queryByDisplayValue('Private previous-owner content')).not.toBeInTheDocument();
  expect(screen.queryByText('Book the train')).not.toBeInTheDocument();
});
