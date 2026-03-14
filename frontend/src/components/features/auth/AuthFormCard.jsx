const AuthFormCard = ({
  mode,
  setMode,
  email,
  setEmail,
  password,
  onPasswordChange,
  error,
  isLoading,
  isRegister,
  requirementChecks,
  areAllRequirementsMet,
  onSubmit,
  onContinueAsGuest,
}) => {
  return (
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

      <form onSubmit={onSubmit} className="auth-form">
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
          onChange={(e) => onPasswordChange(e.target.value)}
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
        onClick={onContinueAsGuest}
        type="button"
        disabled={isLoading}
      >
        Continue as Guest
      </button>
    </section>
  );
};

export default AuthFormCard;
