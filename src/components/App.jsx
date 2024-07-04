import React, { useEffect, useLayoutEffect, useState } from "react";
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
    }
  }

  const capitalizeFirstLetter = (str) => {
    return str && str.length > 0 ? str[0].toUpperCase() : "";
  };

  const addNote = (response) => {
    setListItem(response.notes);
  };

  useEffect(() => {
    if (!auth?.isLoggedIn && !auth?.username.length > 0) {
      navigate("/auth");
    }
  }, [auth?.isLoggedIn, auth?.username.length, navigate]);

  useLayoutEffect(() => {
    const getUserNotes = async () => {
      try {
        toast.loading("Loading User Note's...", { id: "notes" });
        const response = await getAllUserNotes();
        setListItem(response.userNotes);
        toast.success("Loaded User's Note Successfully", { id: "notes" });
      } catch (error) {
        console.error(error.message);
        toast.error("Loading User Note Failed", { id: "notes" });
      }
    };
    getUserNotes();
  }, []);

  return (
    <div>
      <Heading />
      <h1 className="note-heading">
        <Avatar sx={{ mr: 2, bgcolor: "#80BCBD" }}>
          {auth && auth?.username ? capitalizeFirstLetter(auth?.username) : ""}
        </Avatar>{" "}
        Welcome, {auth && auth?.username ? auth?.username : ""}
      </h1>
      <AddNote addNote={addNote} />
      <div>
        <h1 className="noteHeading">{listItems[0] && "My Notes"}</h1>
        <ul className="noteContainer">
          {listItems.map((listItem, index) => {
            return (
              <Note
                key={index}
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
