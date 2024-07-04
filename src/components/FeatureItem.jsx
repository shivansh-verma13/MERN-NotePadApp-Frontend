import React from "react";
import AdjustIcon from "@mui/icons-material/Adjust";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import CoPresentIcon from "@mui/icons-material/CoPresent";
import { createTheme, ThemeProvider } from "@mui/material/styles";

function featureItem(props) {
  let theme = createTheme({});
  theme = createTheme(theme, {
    palette: {
      yellow: theme.palette.augmentColor({
        color: {
          main: "#e7b10a",
        },
        name: "yellow",
      }),
    },
  });

  return (
    <div className="features-section" id="features">
      <ThemeProvider theme={theme}>
        <AdjustIcon
          color="yellow"
          sx={{
            "&:hover": { color: "#F29727" , width: "7rem", height: "7rem", marginLeft: "-5%"},
            width: "5rem",
            height: "5rem",
            transition: "width 1s, height 1s",
            transitionTimingFunction: "ease",
            overflow: "hidden",
          }}
        />
        <AddCircleIcon
          color="yellow"
          sx={{
            "&:hover": { color: "#F29727",  width: "7rem", height: "7rem", marginLeft: "-8%" },
            width: "5rem",
            height: "5rem",
            marginLeft: "-3%",
            transition: "width 1s, height 1s",
            transitionTimingFunction: "ease",
            overflow: "hidden",
          }}
        />
        <CoPresentIcon
          color="yellow"
          sx={{
            "&:hover": { color: "#F29727",  width: "7rem", height: "7rem", marginLeft: "-5%" },
            width: "5rem",
            height: "5rem",
            transition: "width 1s, height 1s",
            transitionTimingFunction: "ease",
            overflow: "hidden",
          }}
        />
        <p className="feature-heading">CONCISE.</p>
        <p className="feature-heading">SIMPLE.</p>
        <p className="feature-heading">ELEGANT.</p>

        <p className="feature-text">All your notes at one place.</p>
        <p className="feature-text">Add new notes with a simple click.</p>
        <p className="feature-text">Simple User Interface.</p>
      </ThemeProvider>
    </div>
  );
}

export default featureItem;
