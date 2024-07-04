import React from "react";
import Button from "@mui/material/Button";
import AssignmentIcon from "@mui/icons-material/Assignment";
import { useNavigate } from "react-router-dom";

function GetStarted() {
  const navigate = useNavigate();
  return (
    <div className="get-started" id="getStarted">
      <div className="get-started-card">
        <img
          className="note-get-started"
          src={process.env.PUBLIC_URL + "/note.png"}
          alt="Note-img"
        />
        <div className="get-started-content">
          <h1>
            Get Your <span className="content-span">NoteBook</span> Now.
          </h1>
          <p>Sign Up For Now Your NoteBook Now.</p>
          <Button
            onClick={() => navigate("/auth")}
            variant="contained"
            sx={{
              backgroundColor: "#e7b10a",
              "&:hover": { backgroundColor: "#F29727" },
              fontFamily: "'Lilita One', cursive;",
            }}
            endIcon={<AssignmentIcon />}
          >
            Get Started
          </Button>
        </div>
      </div>
    </div>
  );
}

export default GetStarted;
