import React, { useEffect, useState } from "react";
import Button from "@mui/material/Button";
import AssignmentIcon from "@mui/icons-material/Assignment";
import Header from "./Heading";
import Footer from "./Footer";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

function SignUp() {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isRegisterOrLogin, setIsRegisterOrLogin] = useState("register");

  const auth = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (auth?.isLoggedIn && auth?.username.length > 0) {
      navigate("/notes");
    }
  }, [auth?.isLoggedIn, auth?.username.length, navigate]);

  const handleRegistrationOrLogin = async (e) => {
    e.preventDefault();
    if (isRegisterOrLogin === "register") {
      try {
        toast.loading("Signing In User...", { id: "register" });
        await auth?.register(name, username, password);
        toast.success("Signed In User Successfully", { id: "register" });
        window.location.reload();
        navigate("/notes");
      } catch (error) {
        console.error(error.message);
        toast.error("User Signing In Failed", { id: "register" });
      }
    } else if (isRegisterOrLogin === "login") {
      try {
        toast.loading("Logging In User...", { id: "login" });
        await auth?.login(username, password);
        toast.success("Logged In User Successfully", { id: "login" });
        navigate("/notes");
      } catch (error) {
        console.log(error.message);
        toast.error("User Logging In Failed", { id: "login" });
      }
    }
  };

  return (
    <div className="signUp">
      <Header />
      <div className="get-started" id="getStarted">
        <div className="get-started-card">
          <img
            className="note-get-started"
            src={process.env.PUBLIC_URL + "/note.png"}
            alt="Note-img"
          />
          <div className="sign-up-content">
            <h1>
              {isRegisterOrLogin === "register" ? "Sign Up!!" : "Log In!!"}
            </h1>
            <form
              onSubmit={handleRegistrationOrLogin}
              className="custom-form-tags"
            >
              {isRegisterOrLogin === "register" && (
                <input
                  autoComplete="off"
                  name="name"
                  placeholder="Name"
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                  }}
                />
              )}
              <input
                autoComplete="off"
                name="username"
                placeholder="Username"
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                }}
              />
              <input
                autoComplete="off"
                name="password"
                placeholder="Password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                }}
              />
              <Button
                type="submit"
                variant="contained"
                sx={{
                  backgroundColor: "#e7b10a",
                  "&:hover": { backgroundColor: "#F29727" },
                  fontFamily: "'Lilita One', cursive;",
                  m: 1,
                }}
                endIcon={<AssignmentIcon />}
              >
                {isRegisterOrLogin === "register" ? "Sign Up" : "Log In"}
              </Button>
              {isRegisterOrLogin === "register" && (
                <Button
                  type="button"
                  onClick={() => setIsRegisterOrLogin("login")}
                  sx={{
                    color: "#436850",
                    fontFamily: "'Lilita One', cursive;",
                  }}
                >
                  Already Registered? Login Here
                </Button>
              )}
              {isRegisterOrLogin === "login" && (
                <Button
                  type="button"
                  onClick={() => setIsRegisterOrLogin("register")}
                  sx={{
                    color: "#436850",
                    fontFamily: "'Lilita One', cursive;",
                  }}
                >
                  New User? Register Here
                </Button>
              )}
            </form>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default SignUp;
