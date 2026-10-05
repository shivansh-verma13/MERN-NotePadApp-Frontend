import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { checkAuth, userLogin, userLogout, userSignUp } from "../helpers/api-communicators";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [username, setUsername] = useState("");
  const [status, setStatus] = useState("loading");
  const generation = useRef(0);

  const refreshAuth = useCallback(async () => {
    const attempt = ++generation.current;
    setStatus("loading");
    try {
      const data = await checkAuth();
      if (attempt !== generation.current) return;
      setUsername(data.name);
      setStatus("authenticated");
    } catch (error) {
      if (attempt !== generation.current) return;
      setUsername("");
      setStatus(error.response?.status === 401 ? "anonymous" : "error");
    }
  }, []);

  useEffect(() => {
    refreshAuth();
    return () => { generation.current += 1; };
  }, [refreshAuth]);

  const login = async (username, password) => {
    generation.current += 1;
    const data = await userLogin(username, password);
    setUsername(data.name);
    setStatus("authenticated");
  };
  const register = async (name, username, password) => {
    generation.current += 1;
    const data = await userSignUp(name, username, password);
    setUsername(data.userName);
    setStatus("authenticated");
  };
  const logout = async () => {
    await userLogout();
    generation.current += 1;
    setUsername("");
    setStatus("anonymous");
  };

  return <AuthContext.Provider value={{ username, status, isLoggedIn: status === "authenticated", refreshAuth, login, register, logout }}>{children}</AuthContext.Provider>;
};
export const useAuth = () => useContext(AuthContext);
