import { useState } from "react";
import { login, register, requestOtp, verifyOtp } from "../api.js";

export default function Auth({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const resetOtp = (nextMode = mode) => {
    setMode(nextMode);
    setOtpCode("");
    setOtpSent(false);
    setMessage("");
  };

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    try {
      if (mode === "register" && !otpSent) {
        await requestOtp({ email: form.email, purpose: "register" });
        setOtpSent(true);
        setMessage(`A verification code was sent to ${form.email}.`);
        return;
      }

      if (mode === "register") {
        await verifyOtp({
          email: form.email,
          code: otpCode,
          purpose: "register",
        });
      }
      const result = await (mode === "login" ? login(form) : register(form));
      localStorage.setItem("codepulse_token", result.data.token);
      onAuth(result.data.user);
    } catch (error) {
      setMessage(
        error.response?.data?.message || "Unable to connect to CodePulse API.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="auth-screen">
      <div className="auth-card">
        <div className="auth-copy">
          <p className="eyebrow">PRODUCT CONCEPT · 2026</p>
          <h1>
            Wellness Habits
            Don't Stick
            Alone.
          </h1>
          <p className="muted">
            50% of people struggle with accountability, not spreadsheets. Nurture your habits with social accountability, data, and community support.
          </p>
          <div className="auth-badges">
            <span>Behavioral Science</span>
            <span>Community Health</span>
            <span>Habit Design</span>
          </div>
        </div>

        <div className="auth-visual" aria-hidden="true">
          <div className="auth-glow" />
          <div className="auth-heart">♥</div>
          <div className="auth-avatar-pill">
            <span>◉</span>
          </div>
        </div>

        <div className="auth-form-shell">
          <form onSubmit={submit} className="auth-form">
            <div className="auth-tabs">
              <button
                className={mode === "login" ? "selected" : ""}
                onClick={() => resetOtp("login")}
                type="button"
              >
                Log in
              </button>
              <button
                className={mode === "register" ? "selected" : ""}
                onClick={() => resetOtp("register")}
                type="button"
              >
                Create account
              </button>
            </div>

            {mode === "register" && (
              <input
                required
                placeholder="Full name"
                value={form.name}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
              />
            )}
            <input
              required
              type="email"
              placeholder="Email address"
              value={form.email}
              onChange={(event) =>
                setForm({ ...form, email: event.target.value })
              }
            />
            <input
              required
              minLength="8"
              type="password"
              placeholder="Password (8+ characters)"
              value={form.password}
              onChange={(event) =>
                setForm({ ...form, password: event.target.value })
              }
            />
            {mode === "register" && otpSent && (
              <input
                required
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength="6"
                placeholder="6-digit verification code"
                value={otpCode}
                onChange={(event) =>
                  setOtpCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                }
              />
            )}
            <button className="primary" type="submit" disabled={submitting}>
              {submitting
                ? "Please wait..."
                : mode === "register" && otpSent
                  ? "Verify and create account"
                  : mode === "register"
                    ? "Send verification code"
                    : "Continue"}
              <span>→</span>
            </button>
            {mode === "register" && otpSent && (
              <button
                className="secondary otp-resend"
                type="button"
                disabled={submitting}
                onClick={() => {
                  setOtpSent(false);
                  setOtpCode("");
                  setMessage("");
                }}
              >
                Use a different email or resend code
              </button>
            )}
            <p className="message">{message}</p>
          </form>
        </div>
      </div>
    </main>
  );
}
