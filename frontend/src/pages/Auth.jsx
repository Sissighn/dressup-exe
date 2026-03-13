import { useMemo, useState } from "react";
import "./auth.css";
import { API_BASE } from "../lib/authSession";

const Auth = ({ onAuthSuccess }) => {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const isRegister = mode === "register";

  const requirements = useMemo(
    () => [
      "At least 12 characters",
      "At least 1 uppercase letter",
      "At least 1 lowercase letter",
      "At least 1 number",
      "At least 1 special character",
    ],
    [],
  );

  const submitAuth = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const endpoint = isRegister ? "/auth/register" : "/auth/login";
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.detail || "Authentication failed.");
        return;
      }

      onAuthSuccess({
        token: data.access_token,
        user: data.user,
      });
    } catch {
      setError("Could not connect to server.");
    } finally {
      setIsLoading(false);
    }
  };

  const continueAsGuest = async () => {
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE}/auth/guest`, {
        method: "POST",
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.detail || "Guest mode failed.");
        return;
      }

      onAuthSuccess({
        token: data.access_token,
        user: data.user,
      });
    } catch {
      setError("Could not connect to server.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">dressup.exe</h1>
        <p className="auth-subtitle">Secure access for your digital wardrobe</p>

        <div className="auth-tabs">
          <button
            className={`auth-tab ${mode === "login" ? "active" : ""}`}
            onClick={() => setMode("login")}
            type="button"
          >
            Sign In
          </button>
          <button
            className={`auth-tab ${mode === "register" ? "active" : ""}`}
            onClick={() => setMode("register")}
            type="button"
          >
            Register
          </button>
        </div>

        <form onSubmit={submitAuth} className="auth-form">
          <label className="auth-label">Email</label>
          <input
            className="auth-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            required
          />

          <label className="auth-label">Password</label>
          <input
            className="auth-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••••"
            required
          />

          {isRegister && (
            <ul className="password-rules">
              {requirements.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
          )}

          {error && <p className="auth-error">{error}</p>}

          <button className="auth-primary" type="submit" disabled={isLoading}>
            {isLoading
              ? "Please wait..."
              : isRegister
                ? "Create Account"
                : "Sign In"}
          </button>
        </form>

        <button
          className="auth-guest"
          onClick={continueAsGuest}
          type="button"
          disabled={isLoading}
        >
          Continue as Guest
        </button>
      </div>
    </div>
  );
};

export default Auth;
