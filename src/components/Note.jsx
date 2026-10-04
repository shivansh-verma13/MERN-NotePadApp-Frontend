import React, { useState } from "react";
import DeleteIcon from "@mui/icons-material/Delete";
import Zoom from "@mui/material/Zoom";
import EditIcon from "@mui/icons-material/Edit";
import UpdateNoteDialog from "./Dialog";

function Note(notes) {
  const [isMouseOver, setMouseOver] = useState(false);
  const [isMouseOverEditBtn, setMouseOverEditBtn] = useState(false);
  const [hideDialog, setHideDialog] = useState(true);
  const [open, setOpen] = React.useState(true);

  function handleMouseOver() {
    setMouseOver(true);
  }

  function handleMouseOut() {
    setMouseOver(false);
  }

  function handleMouseOverEditBtn() {
    setMouseOverEditBtn(true);
  }

  function handleMouseOutEditBtn() {
    setMouseOverEditBtn(false);
  }

  return (
    <>
      {!hideDialog && (
        <UpdateNoteDialog
          open={open}
          setOpen={setOpen}
          text={notes.listItem.content}
          title={notes.listItem.title}
          updateNote={notes.updateNote}
          noteID={notes.listItem._id.toString()}
        />
      )}
      <li className="note">
        <h2 className="title">{notes.listItem.title}</h2>
        <p className="content">{notes.listItem.content}</p>
        <Zoom in={true}>
          <button
            className="editbtn"
            aria-label={"Edit " + notes.listItem.title}
            type="submit"
            onClick={() => {
              setHideDialog(false);
              setOpen(true);
            }}
            onMouseOver={handleMouseOverEditBtn}
            onMouseOut={handleMouseOutEditBtn}
            style={{
              backgroundColor: isMouseOverEditBtn ? "#80BCBD" : "#96B6C5",
              cursor: "pointer",
            }}
          >
            <span>
              <EditIcon />
            </span>
          </button>
        </Zoom>
        <Zoom in={true}>
          <button aria-label={"Delete " + notes.listItem.title}
            type="button"
            onClick={() => {
              if (window.confirm("Delete this note? This cannot be undone.")) notes.deleteItem(notes.listItem._id.toString());
            }}
            onMouseOver={handleMouseOver}
            onMouseOut={handleMouseOut}
            style={{
              backgroundColor: isMouseOver ? "#B70404" : "#da3d3d",
              cursor: "pointer",
            }}
          >
            <span>
              <DeleteIcon />
            </span>
          </button>
        </Zoom>
      </li>
    </>
  );
}

export default Note;
