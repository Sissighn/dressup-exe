import { useMemo, useState } from "react";
import { API_BASE } from "../../../lib/authSession";

const PASSWORD_REQUIREMENTS = [
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
];

export const useAuthFlow = (onAuthSuccess) => {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const isRegister = mode === "register";

  const requirementChecks = useMemo(
    () =>
      PASSWORD_REQUIREMENTS.map((rule) => ({
        ...rule,
        valid: rule.test(password),
      })),
    [password],
  );

  const areAllRequirementsMet = requirementChecks.every((rule) => rule.valid);

  const handlePasswordChange = (value) => {
    setPassword(value);
    if (error) setError("");
  };

  const submitAuth = async (event) => {
    event.preventDefault();
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

  return {
    mode,
    setMode,
    email,
    setEmail,
    password,
    handlePasswordChange,
    error,
    isLoading,
    isRegister,
    requirementChecks,
    areAllRequirementsMet,
    submitAuth,
    continueAsGuest,
  };
};
