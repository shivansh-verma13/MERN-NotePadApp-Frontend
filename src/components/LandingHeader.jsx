import React from "react";
import AssignmentIcon from "@mui/icons-material/Assignment";

function LandingHeading() {
  return (
    <header className="landing-header" id="landing-page">
      <h1>
        <AssignmentIcon />
        Note.
      </h1>
      <div className="nav-bar" style={{ zIndex: 999 }}>
        <a
          href="#features"
          className="nav-1"
          style={{
            textDecoration: "none",
            color: "#f8fdcf",
            fontFamily: "Noto Sans, sans-serif",
            textShadow: "1px 1px 1px #4c4b16",
          }}
        >
          <p>Features</p>
        </a>
        <a
          href="#getStarted"
          className="nav-2"
          style={{
            textDecoration: "none",
            color: "#f8fdcf",
            fontFamily: "Noto Sans, sans-serif",
            textShadow: "1px 1px 1px #4c4b16",
          }}
        >
          <p>Get Started</p>
        </a>
        <a
          href="#contact-me"
          className="nav-3"
          style={{
            textDecoration: "none",
            color: "#f8fdcf",
            fontFamily: "Noto Sans, sans-serif",
            textShadow: "1px 1px 1px #4c4b16",
          }}
        >
          <p>Contact</p>
        </a>
      </div>
    </header>
  );
}

export default LandingHeading;
