import React, { useRef, useState } from "react";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
export default function UpdateNoteDialog({open,setOpen,text,title,updateNote,noteID}) {
  const [content,setContent]=useState(text);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const pending=useRef(false);
  const close=()=>{if(!pending.current)setOpen(false);};
  async function save(event) {
    event.preventDefault();if(pending.current)return;
    if(!content.trim()){setError("Add content before saving.");return;}
    pending.current=true;setBusy(true);setError("");
    try {await updateNote(content,noteID);setOpen(false);}
    catch {setError("Your changes were not saved. Keep editing or retry.");}
    finally {pending.current=false;setBusy(false);}
  }
  return <Dialog open={open} onClose={close} aria-labelledby="edit-note-title" fullWidth maxWidth="sm" PaperProps={{component:"form",onSubmit:save}}>
    <DialogTitle id="edit-note-title">Edit: {title}</DialogTitle>
    <DialogContent><TextField autoFocus fullWidth multiline minRows={4} label="Content" value={content} disabled={busy} inputProps={{maxLength:20000}} onChange={event=>setContent(event.target.value)} />
      {error && <p role="alert">{error}</p>}
    </DialogContent>
    <DialogActions><Button onClick={close} disabled={busy}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save changes"}</Button></DialogActions>
  </Dialog>;
}
