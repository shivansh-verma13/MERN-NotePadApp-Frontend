import React from "react";
import Button from "@mui/material/Button";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import AssignmentIcon from "@mui/icons-material/Assignment";
import { useNavigate } from "react-router-dom";

function CustomizedButton() {
  const navigate = useNavigate();

  let theme = createTheme({
    // Theme customization goes here as usual, including tonalOffset and/or
    // contrastThreshold as the augmentColor() function relies on these
  });
  theme = createTheme(theme, {
    // Custom colors created with augmentColor go here
    typography: {
      button: {
        fontFamily: "Comic Neue, cursive",
        fontWeight: 900,
      },
    },
    palette: {
      yellow: theme.palette.augmentColor({
        color: {
          main: "#e7b10a",
          contrastText: "#f8fdcf",
        },
        name: "yellow",
      }),
    },
  });

  return (
    <div className="get-start-button">
      <ThemeProvider theme={theme}>
        <Button
          onClick={() => navigate("/auth")}
          variant="contained"
          sx={{ "&:hover": { backgroundColor: "#F29727" } }}
          color="yellow"
          endIcon={<AssignmentIcon />}
        >
          Get Started
        </Button>
      </ThemeProvider>
    </div>
  );
}

export default CustomizedButton;
