import React, { useEffect, useRef, useState } from "react";
import Button from "@mui/material/Button";
import AssignmentIcon from "@mui/icons-material/Assignment";
import Header from "./Heading";
import Footer from "./Footer";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

function accountError(error, fallback) {
  if (error?.response?.status !== 429) return fallback;
  const seconds = Number(error.response.headers?.["retry-after"]);
  return Number.isInteger(seconds) && seconds > 0 && seconds <= 900
    ? `Too many account attempts. Try again in ${seconds} seconds.`
    : "Too many account attempts. Please wait before trying again.";
}

function SignUp() {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isRegisterOrLogin, setIsRegisterOrLogin] = useState("register");
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const submitting = useRef(false);

  const auth = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (auth?.isLoggedIn && auth?.username.length > 0) {
      navigate("/notes");
    }
  }, [auth?.isLoggedIn, auth?.username.length, navigate]);

  const handleRegistrationOrLogin = async (e) => {
    e.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setPending(true);
    setErrorMessage("");
    try {
      if (isRegisterOrLogin === "register") {
        try {
          toast.loading("Signing In User...", { id: "register" });
          await auth?.register(name, username, password);
          toast.success("Signed In User Successfully", { id: "register" });
          navigate("/notes");
        } catch (error) {
          setErrorMessage(accountError(error, "Could not create your account. Check your details and try again."));
          toast.error("User Signing In Failed", { id: "register" });
        }
      } else if (isRegisterOrLogin === "login") {
        try {
          toast.loading("Logging In User...", { id: "login" });
          await auth?.login(username, password);
          toast.success("Logged In User Successfully", { id: "login" });
          navigate("/notes");
        } catch (error) {
          setErrorMessage(accountError(error, "Could not log in. Check your details and try again."));
          toast.error("User Logging In Failed", { id: "login" });
        }
      }
    } finally {
      submitting.current = false;
      setPending(false);
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
              aria-label={isRegisterOrLogin === "register" ? "Create account" : "Log in"}
              onSubmit={handleRegistrationOrLogin}
              className="custom-form-tags"
            >
              {isRegisterOrLogin === "register" && (
                <input
                  aria-label="Name"
                  autoComplete="name"
                  required
                  maxLength={100}
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
                aria-label="Username"
                autoComplete="username"
                required
                maxLength={100}
                name="username"
                placeholder="Username"
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                }}
              />
              <input
                aria-label="Password"
                autoComplete={isRegisterOrLogin === "register" ? "new-password" : "current-password"}
                required
                minLength={6}
                maxLength={72}
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
                disabled={pending}
                variant="contained"
                sx={{
                  backgroundColor: "#e7b10a",
                  "&:hover": { backgroundColor: "#F29727" },
                  fontFamily: "'Lilita One', cursive;",
                  m: 1,
                }}
                endIcon={<AssignmentIcon />}
              >
                {pending ? "Please wait…" : isRegisterOrLogin === "register" ? "Sign Up" : "Log In"}
              </Button>
              {errorMessage && <p role="alert">{errorMessage}</p>}
              {isRegisterOrLogin === "register" && (
                <Button
                  type="button"
                  disabled={pending}
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
                  disabled={pending}
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
