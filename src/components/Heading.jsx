import React from "react";
import AssignmentIcon from "@mui/icons-material/Assignment";
import { Avatar, Button } from "@mui/material";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

function Heading() {
  const auth = useAuth();
  const navigate = useNavigate();

  // const capitalizeFirstLetter = (str) => {
  //   return str[0].toUpperCase() + str.slice(1);
  // };

  const handleLogout = async () => {
    try {
      toast.loading("Logging Out User...", { id: "logout" });
      await auth?.logout();
      toast.success("Logged Out User Successfully", { id: "logout" });
    } catch (error) {
      console.log(error.message);
      toast.error("Logging Out User Failed", { id: "logout" });
    }
  };

  return (
    <header
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <h1 style={{ flexGrow: 1 }}>
        <AssignmentIcon
          onClick={() => navigate("/")}
          sx={{ cursor: "pointer" }}
        />
        Note.
      </h1>
      {auth?.isLoggedIn && auth?.username.length > 0 ? (
        <div
          style={{
            backgroundColor: "#da3d3d",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            margin: "auto 20px",
            borderRadius: 35,
            fontWeight: "bold",
            boxShadow: "0.5px 0.5px 10px #000",
          }}
        >
          <div
            style={{
              backgroundColor: "#e7b10a",
              padding: "12px 12px",
              borderTopLeftRadius: 35,
              borderBottomLeftRadius: 35,
              fontWeight: "bold",
              fontFamily: "Lilita One, cursive",
            }}
          >
            {/* {capitalizeFirstLetter(auth?.username[0])} */}
            <AssignmentIcon />
          </div>
          <Button
            onClick={handleLogout}
            sx={{
              color: "#000",
              fontFamily: "Lilita One, cursive",
              // letterSpacing: 1,
              fontWeight: "800",
              fontSize: "1.2rem",
              paddingLeft: 2,
            }}
          >
            LOGOUT
          </Button>
        </div>
      ) : (
        <>
          <Avatar sx={{ bgcolor: "#80BCBD", mr: 2 }}></Avatar>
        </>
      )}
    </header>
  );
}

export default Heading;
