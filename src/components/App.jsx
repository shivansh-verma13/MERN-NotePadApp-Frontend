import React, { useEffect, useState } from "react";
import Footer from "./Footer";
import Heading from "./Heading";
import Note from "./Note";
import AddNote from "./AddNote";
import { useAuth } from "../context/AuthContext";
import { Avatar } from "@mui/material";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  deleteUserNote,
  getAllUserNotes,
  updateUserNote,
} from "../helpers/api-communicators";

function App() {
  const [listItems, setListItem] = useState([]);
  const [query, setQuery] = useState("");
  const [notesStatus, setNotesStatus] = useState("loading");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const auth = useAuth();
  const navigate = useNavigate();
  const search = query.trim().toLowerCase();
  const visibleNotes = listItems.filter(note =>
    note.title.toLowerCase().includes(search) || note.content.toLowerCase().includes(search)
  );

  async function deleteItem(noteID) {
    try {
      toast.loading("Deleting a Note...", { id: "delete-note" });
      const response = await deleteUserNote(noteID);
      setListItem(response.userNotes);
      toast.success("Deleted a Note Successfully", { id: "delete-note" });
    } catch (error) {
      console.log(error.message);
      toast.error("Note Deletion Failed", { id: "delete-note" });
    }
  }

  async function updateNote(content, noteID) {
    try {
      toast.loading("Updating the Note...", { id: "update-note" });
      const response = await updateUserNote(content, noteID);
      setListItem(response.notes);
      toast.success("Updated Note Successfully", { id: "update-note" });
    } catch (error) {
      console.log(error.message);
      toast.error("Failed to Update Note", { id: "update-note" });
      throw error;
    }
  }

  const capitalizeFirstLetter = (str) => {
    return str && str.length > 0 ? str[0].toUpperCase() : "";
  };

  const addNote = (response) => {
    setListItem(response.notes);
  };

  useEffect(() => {
    if (auth?.status === "anonymous") {
      navigate("/auth", { replace: true });
    }
  }, [auth?.status, navigate]);

  useEffect(() => {
    setListItem([]);
    setQuery("");
    setNotesStatus("loading");
    if (!auth?.isLoggedIn) return;
    let active = true;
    const getUserNotes = async () => {
      try {
        toast.loading("Loading User Note's...", { id: "notes" });
        const response = await getAllUserNotes();
        if (!active) return;
        setListItem(response.userNotes);
        setNotesStatus("ready");
        toast.success("Loaded User's Note Successfully", { id: "notes" });
      } catch (error) {
        if (!active) return;
        setNotesStatus("error");
        toast.error("Loading User Note Failed", { id: "notes" });
      }
    };
    getUserNotes();
    return () => { active = false; };
  }, [auth?.isLoggedIn, auth?.username, loadAttempt]);

  if (auth?.status === "error") return <main><p role="alert">Unable to check your session. Your notes have not been loaded.</p><button onClick={auth.refreshAuth}>Retry session check</button></main>;
  if (!auth?.isLoggedIn) return <main><p role="status">Checking your session…</p></main>;

  return (
    <div className="notes-workspace">
      <Heading />
      <h1 className="note-heading">
        <Avatar sx={{ mr: 2, bgcolor: "#80BCBD" }}>
          {auth && auth?.username ? capitalizeFirstLetter(auth?.username) : ""}
        </Avatar>{" "}
        Welcome, {auth && auth?.username ? auth?.username : ""}
      </h1>
      {notesStatus === "ready" && <AddNote addNote={addNote} />}
      <section aria-labelledby="my-notes-heading" className="notes-library">
        <h2 id="my-notes-heading" className="noteHeading">My Notes</h2>
        {notesStatus === "loading" && <p role="status">Loading your notes…</p>}
        {notesStatus === "error" && <div>
          <p role="alert">Your notes could not be loaded. Please retry.</p>
          <button type="button" onClick={() => setLoadAttempt(attempt => attempt + 1)}>Retry loading notes</button>
        </div>}
        {notesStatus === "ready" && <>
          <div className="notes-search" role="search" aria-label="Search your notes">
            <label htmlFor="notes-search">Search notes</label>
            <div className="notes-search-controls">
              <input id="notes-search" type="search" maxLength={200} value={query}
                placeholder="Search titles and content" aria-describedby="notes-search-help"
                onChange={event => setQuery(event.target.value)} />
              <button type="button" disabled={!query} onClick={() => setQuery("")}>Clear search</button>
            </div>
            <p id="notes-search-help">Search only your loaded notes. Your search stays in this page.</p>
          </div>
          <p role="status" aria-live="polite" aria-atomic="true">{visibleNotes.length} of {listItems.length} notes shown</p>
          {listItems.length === 0 ? <p>No notes yet. Save your first note above.</p> :
            visibleNotes.length === 0 && <p>No notes match your search. Try another word or clear the search.</p>}
        <ul className="noteContainer" aria-label="Your notes">
          {visibleNotes.map((listItem) => {
            return (
              <Note
                key={listItem._id}
                listItem={listItem}
                deleteItem={deleteItem}
                updateNote={updateNote}
              />
            );
          })}
        </ul>
        </>}
      </section>
      <Footer />
    </div>
  );
}

export default App;
