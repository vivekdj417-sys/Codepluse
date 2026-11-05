import { useEffect, useState } from "react";
import { Route, Routes } from "react-router-dom";
import { getCurrentUser } from "./api.js";
import Auth from "./components/Auth.jsx";
import Workspace from "./components/Workspace.jsx";

export default function App() {
  const [user, setUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let active = true;
    const token = localStorage.getItem("codepulse_token");
    if (!token) {
      localStorage.removeItem("codepulse_user");
      setCheckingSession(false);
      return () => {
        active = false;
      };
    }

    getCurrentUser()
      .then((result) => {
        if (!active) return;
        const verifiedUser = result.data.user;
        localStorage.setItem("codepulse_user", JSON.stringify(verifiedUser));
        setUser(verifiedUser);
      })
      .catch((error) => {
        if (!active) return;
        if ([401, 404].includes(error.response?.status)) {
          localStorage.removeItem("codepulse_token");
          localStorage.removeItem("codepulse_user");
          localStorage.removeItem("codepulse_username");
          setUser(null);
          return;
        }

        try {
          setUser(JSON.parse(localStorage.getItem("codepulse_user") || "null"));
        } catch {
          localStorage.removeItem("codepulse_user");
          setUser(null);
        }
      })
      .finally(() => {
        if (active) setCheckingSession(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const onAuth = (nextUser) => {
    localStorage.setItem("codepulse_user", JSON.stringify(nextUser));
    setUser(nextUser);
  };
  const logout = () => {
    localStorage.removeItem("codepulse_token");
    localStorage.removeItem("codepulse_user");
    localStorage.removeItem("codepulse_username");
    setUser(null);
  };

  if (checkingSession) {
    return (
      <main className="auth-screen">
        <p className="session-check">Checking your session...</p>
      </main>
    );
  }

  return user ? (
    <Workspace user={user} onLogout={logout} />
  ) : (
    <Routes>
      <Route path="*" element={<Auth onAuth={onAuth} />} />
    </Routes>
  );
}
