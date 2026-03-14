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
      {
        key: "length",
        label: "At least 12 characters",
        test: (value) => value.length >= 12,
      },
      {
        key: "uppercase",
        label: "At least 1 uppercase letter",
        test: (value) => /[A-Z]/.test(value),
      },
      {
        key: "lowercase",
        label: "At least 1 lowercase letter",
        test: (value) => /[a-z]/.test(value),
      },
      {
        key: "number",
        label: "At least 1 number",
        test: (value) => /\d/.test(value),
      },
      {
        key: "special",
        label: "At least 1 special character",
        test: (value) => /[^A-Za-z0-9]/.test(value),
      },
    ],
    [],
  );

  const requirementChecks = useMemo(
    () =>
      requirements.map((rule) => ({
        ...rule,
        valid: rule.test(password),
      })),
    [requirements, password],
  );

  const areAllRequirementsMet = requirementChecks.every((rule) => rule.valid);

  const submitAuth = async (e) => {
    e.preventDefault();
    setError("");

    if (isRegister && !areAllRequirementsMet) {
      setError("Please satisfy all password rules before creating an account.");
      return;
    }

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
      <div className="auth-shell">
        <section className="auth-preview">
          <p className="auth-kicker">WELCOME</p>
          <h1 className="auth-preview-title">dressup.exe</h1>
          <p className="auth-preview-subtitle">
            Build your digital model, style complete outfits, and save your
            looks in a personal AI lookbook.
          </p>

          <div className="auth-preview-demo" aria-hidden="true">
            <div className="auth-demo-topbar">
              <span>PRODUCT PREVIEW</span>
              <span>What you unlock after login</span>
            </div>
            <div className="auth-demo-grid">
              <div className="auth-demo-step">
                <small>STEP 01</small>
                <strong>Create your model</strong>
                <span>Face scan + biometrics</span>
              </div>
              <div className="auth-demo-step">
                <small>STEP 02</small>
                <strong>Build your closet</strong>
                <span>Upload tops & bottoms</span>
              </div>
              <div className="auth-demo-step">
                <small>STEP 03</small>
                <strong>Generate outfits</strong>
                <span>AI-styled full-body looks</span>
              </div>
              <div className="auth-demo-step">
                <small>STEP 04</small>
                <strong>Archive in lookbook</strong>
                <span>Save and compare results</span>
              </div>
            </div>

            <div className="auth-demo-lookbook-strip">
              <div className="auth-demo-look" />
              <div className="auth-demo-look" />
              <div className="auth-demo-look" />
            </div>
          </div>

          <div className="auth-preview-block">
            <h3>How it works</h3>
            <ul>
              <li>Upload a face scan and create your digital twin</li>
              <li>Select tops and bottoms from your closet</li>
              <li>Generate and archive your styled outfit results</li>
            </ul>
          </div>
        </section>

        <section className="auth-card">
          <h2 className="auth-title">Get Started</h2>
          <p className="auth-subtitle">Choose your preferred access method</p>

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
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError("");
              }}
              placeholder="••••••••••••"
              required
            />

            {isRegister && (
              <ul className="password-rules">
                {requirementChecks.map((rule) => (
                  <li
                    key={rule.key}
                    className={`password-rule ${rule.valid ? "valid" : "invalid"}`}
                  >
                    <span className="password-rule-dot" aria-hidden="true" />
                    <span>{rule.label}</span>
                  </li>
                ))}
              </ul>
            )}

            {error && <p className="auth-error">{error}</p>}

            <button
              className="auth-primary"
              type="submit"
              disabled={isLoading || (isRegister && !areAllRequirementsMet)}
            >
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
        </section>
      </div>
    </div>
  );
};

export default Auth;
