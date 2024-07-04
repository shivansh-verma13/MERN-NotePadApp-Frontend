import * as React from "react";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";

export default function UpdateNoteDialog(props) {
  const handleClose = () => {
    props.setOpen(false);
  };

  return (
    <React.Fragment>
      <Dialog
        open={props.open}
        onClose={handleClose}
        PaperProps={{
          component: "form",
          onSubmit: (event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            const formJson = Object.fromEntries(formData.entries());
            const content = formJson.content;
            props.updateNote(content, props.noteID);
            handleClose();
          },
        }}
        sx={{ fontFamily: "Lilita One, cursive" }}
      >
        <DialogTitle
          sx={{
            bgcolor: "#96B6C5",
            color: "#f8fdcf",
            fontFamily: "Lilita One, cursive",
            fontSize: "1.4rem",
          }}
        >
          Update Note's Content
        </DialogTitle>
        <DialogContent
          sx={{
            bgcolor: "#e7b10a",
          }}
        >
          <DialogContentText
            sx={{ fontFamily: "Lilita One, cursive", fontWeight: "bold" }}
          >
            <span style={{ fontSize: "1.2rem" }}>TITLE:</span>{" "}
            <span style={{ fontWeight: "lighter" }}>{props.title}</span>
          </DialogContentText>
          <DialogContentText
            sx={{ fontFamily: "Lilita One, cursive", fontWeight: "bold" }}
          >
            <span style={{ fontSize: "1.2rem" }}>CONTENT:</span>{" "}
            <span style={{ fontWeight: "lighter" }}>{props.text}</span>
          </DialogContentText>
          <TextField
            autoComplete="off"
            autoFocus
            required
            margin="dense"
            id="content"
            name="content"
            label="Update Content"
            type="text"
            fullWidth
            variant="standard"
            helperText="Please enter your new content"
            sx={{ fontFamily: "Lilita One, cursive" }}
            InputLabelProps={{
              style: { color: "#000", fontFamily: "Lilita One, cursive" },
            }}
            InputProps={{
              style: {
                color: "#000",
                "&:focus": {
                  borderBottomColor: "#000",
                  fontFamily: "Lilita One, cursive",
                },
              },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ bgcolor: "#96B6C5" }}>
          <Button
            onClick={handleClose}
            sx={{ color: "#B70404", fontFamily: "Lilita One, cursive" }}
            endIcon={<CancelIcon />}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            sx={{ color: "#11235A", fontFamily: "Lilita One, cursive" }}
            endIcon={<CheckCircleIcon />}
          >
            Update
          </Button>
        </DialogActions>
      </Dialog>
    </React.Fragment>
  );
}
