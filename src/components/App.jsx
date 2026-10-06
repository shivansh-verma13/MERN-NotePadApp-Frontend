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
  const auth = useAuth();
  const navigate = useNavigate();

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
    if (!auth?.isLoggedIn) return;
    let active = true;
    const getUserNotes = async () => {
      try {
        toast.loading("Loading User Note's...", { id: "notes" });
        const response = await getAllUserNotes();
        if (!active) return;
        setListItem(response.userNotes);
        toast.success("Loaded User's Note Successfully", { id: "notes" });
      } catch (error) {
        if (!active) return;
        toast.error("Loading User Note Failed", { id: "notes" });
      }
    };
    getUserNotes();
    return () => { active = false; };
  }, [auth?.isLoggedIn]);

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
      <AddNote addNote={addNote} />
      <div>
        <h2 className="noteHeading">{listItems[0] && "My Notes"}</h2>
        <ul className="noteContainer">
          {listItems.map((listItem, index) => {
            return (
              <Note
                key={listItem._id}
                id={index}
                listItem={listItem}
                deleteItem={deleteItem}
                updateNote={updateNote}
              />
            );
          })}
        </ul>
      </div>
      <Footer />
    </div>
  );
}

export default App;
