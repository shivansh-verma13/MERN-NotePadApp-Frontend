import React, { useState } from "react";
import AddIcon from "@mui/icons-material/Add";
import Zoom from "@mui/material/Zoom";
import toast from "react-hot-toast";
import { createNote } from "../helpers/api-communicators";

function AddNote(props) {
  const [note, setNote] = useState({
    title: "",
    content: "",
  });

  const [isClicked, setClicked] = useState(false);

  const [isMouseOver, setMouseOver] = useState(false);

  function handleClick() {
    setClicked(true);
  }

  function handleNote(event) {
    const { name, value } = event.target;

    setNote((prevValue) => {
      return {
        ...prevValue,
        [name]: value,
      };
    });
  }

  const handleNoteCreation = async () => {
    try {
      toast.loading("Creating your Note...", { id: "note-creation" });
      const response = await createNote(note.title, note.content);
      props.addNote(response);
      toast.success("Note Created Successfully", { id: "note-creation" });
    } catch (error) {
      console.log(error.message);
      toast.error("Note Creation Failed", { id: "note-creation" });
    }
  };

  function handleMouseOver() {
    setMouseOver(true);
  }

  function handleMouseOut() {
    setMouseOver(false);
  }

  return (
    <div className="addNote">
      {isClicked && (
        <input
          autoComplete="off"
          className="title"
          type="text"
          name="title"
          placeholder="Title"
          onChange={handleNote}
          value={note.title}
        ></input>
      )}

      <textarea
        autoComplete="off"
        className="content"
        type="text"
        name="content"
        placeholder="Take a note..."
        row={isClicked ? "3" : "1"}
        onChange={handleNote}
        onClick={handleClick}
        value={note.content}
      ></textarea>
      <Zoom in={isClicked && true}>
        <button
          type="submit"
          onClick={() => {
            handleNoteCreation();
            setNote({
              title: "",
              content: "",
            });
          }}
          onMouseOver={handleMouseOver}
          onMouseOut={handleMouseOut}
          style={{
            backgroundColor: isMouseOver ? "#91C8E4" : "#9BE8D8",
            cursor: "pointer",
          }}
        >
          <span>
            <AddIcon />
          </span>
        </button>
      </Zoom>
    </div>
  );
}

export default AddNote;
