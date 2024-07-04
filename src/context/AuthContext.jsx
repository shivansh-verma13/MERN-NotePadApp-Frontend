import { createContext, useContext, useEffect, useState } from "react";
import {
  checkAuth,
  userLogin,
  userLogout,
  userSignUp,
} from "../helpers/api-communicators";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [username, setUsername] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const data = await checkAuth();
        if (data) {
          setUsername(data.name);
          setIsLoggedIn(true);
        }
      } catch (error) {
        console.error(error.message);
      }
    };
    checkAuthStatus();
  }, []);

  const login = async (username, password) => {
    const data = await userLogin(username, password);
    if (data) {
      setUsername(data.name);
      setIsLoggedIn(true);
    }
  };

  const register = async (name, username, password) => {
    const data = await userSignUp(name, username, password);
    if (data) {
      setUsername(data.userName);
      setIsLoggedIn(true);
    }
  };

  const logout = async () => {
    await userLogout();
    setUsername("");
    setIsLoggedIn(false);
    window.location.reload();
  };

  const value = { username, isLoggedIn, login, register, logout };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
