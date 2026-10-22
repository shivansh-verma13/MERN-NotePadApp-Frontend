import React, { useEffect, useRef, useState } from "react";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
export default function UpdateNoteDialog({open,setOpen,text,title,updateNote,loadLatestNote,noteID,expectedRevision = 0,disabled = false}) {
  const [content,setContent]=useState(text);
  const [busy,setBusy]=useState(false);
  const [revision,setRevision]=useState(expectedRevision);
  const [conflict,setConflict]=useState(false);
  const [error,setError]=useState("");
  const pending=useRef(false);
  const draftInput=useRef(null);
  const comparisonRequest=useRef(null);
  const [latest,setLatest]=useState(null);
  const [comparisonStatus,setComparisonStatus]=useState("idle");
  useEffect(() => () => comparisonRequest.current?.abort(), []);
  const close=()=>{if(!pending.current){comparisonRequest.current?.abort();setOpen(false);}};
  async function compareLatest() {
    if (comparisonRequest.current || disabled || !conflict) return;
    const controller = new AbortController();
    comparisonRequest.current=controller;
    setLatest(null);setComparisonStatus("loading");
    try {
      const note=await loadLatestNote(noteID,controller.signal);
      if(controller.signal.aborted)return;
      setLatest(note);setComparisonStatus(note ? "ready" : "missing");
    } catch {
      if(!controller.signal.aborted)setComparisonStatus("error");
    } finally {
      if(comparisonRequest.current===controller)comparisonRequest.current=null;
    }
  }
  function continueEditing() {
    if(!latest || comparisonStatus!=="ready" || disabled)return;
    setRevision(latest.revision);setConflict(false);setError("");
    draftInput.current?.focus();
  }
  async function save(event) {
    event.preventDefault();if(pending.current || disabled || conflict)return;
    if(!content.trim()){setError("Add content before saving.");return;}
    pending.current=true;setBusy(true);setError("");
    try {await updateNote(content,noteID,revision);setOpen(false);}
    catch (failure) {
      if (failure?.response?.data?.code === "NOTE_CONFLICT") {
        setConflict(true);
        setLatest(null);setComparisonStatus("idle");
        setError("This note changed in another session. Your draft is kept here. Copy it or compare the latest saved note before choosing to continue editing. Closing or reloading loses this unsaved draft.");
      } else setError("The save result could not be confirmed. Your draft is kept here. Retrying uses the same revision; if it conflicts, copy your draft and reload to check the saved note.");
    }
    finally {pending.current=false;setBusy(false);}
  }
  return <Dialog open={open} onClose={close} aria-labelledby="edit-note-title" fullWidth maxWidth="sm" PaperProps={{component:"form",onSubmit:save}}>
    <DialogTitle id="edit-note-title">Edit: {title}</DialogTitle>
    <DialogContent><TextField autoFocus inputRef={draftInput} fullWidth multiline minRows={4} label="Content" value={content} disabled={busy} inputProps={{maxLength:20000,readOnly:conflict}} onChange={event=>setContent(event.target.value)} />
      {error && <p role="alert">{error}</p>}
      {conflict && <Button type="button" onClick={compareLatest} disabled={disabled || comparisonStatus==="loading"}>
        {comparisonStatus==="loading" ? "Loading latest note…" : "Compare latest saved note"}
      </Button>}
      {comparisonStatus==="loading" && <p role="status">Loading the latest saved version. Your draft stays here.</p>}
      {comparisonStatus==="error" && <p role="alert">The latest note could not be loaded. Your draft is unchanged. Try comparing again.</p>}
      {comparisonStatus==="missing" && <p role="alert">This note is no longer available in your library. Copy your draft before closing; this editor cannot recreate it.</p>}
      {latest && <section aria-label="Latest saved note">
        <h3>Latest saved note</h3>
        <TextField fullWidth label="Latest saved title" value={latest.title} inputProps={{readOnly:true}} margin="normal" />
        <TextField fullWidth multiline minRows={4} label="Latest saved content" value={latest.content} inputProps={{readOnly:true}} />
        <p>Saved revision {latest.revision}. This is a snapshot; another change can still cause a conflict.</p>
        {conflict ? <><p>Compare both versions. Continuing keeps your draft and uses this saved revision for your next save. Review and combine changes yourself; nothing is saved automatically.</p>
          <Button type="button" onClick={continueEditing} disabled={disabled}>Continue editing my draft</Button></> :
          <p role="status">Your draft is editable against revision {revision}. Review both versions before saving.</p>}
      </section>}
    </DialogContent>
    <DialogActions><Button onClick={close} disabled={busy}>Cancel</Button><Button type="submit" disabled={busy || disabled || conflict}>{busy ? "Saving…" : "Save changes"}</Button></DialogActions>
  </Dialog>;
}
