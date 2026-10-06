import React, { useState } from "react";
import MoodAvatar from "../components/MoodAvatar";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent } from "../components/ui/card";
import { Spinner } from "../components/ui/spinner";
import { isLoggedIn } from "../lib/auth";
import { DEMO } from "../lib/demo";
import { login, register } from "../services/auth.service";

/** One page for both "Sign in" and "Create account"; a link underneath switches between them. */
function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const [mode, setMode] = useState("login"); // "login" | "register"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isRegister = mode === "register";

  // Already signed in: no reason to show the form.
  if (isLoggedIn()) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await (isRegister ? register : login)(email, password);
      // Back to the page they were trying to open (set by RequireAuth), or the home page.
      navigate(location.state?.from || "/", { replace: true });
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  function switchMode() {
    setMode(isRegister ? "login" : "register");
    setError("");
  }

  return (
    <div className="h-screen w-screen flex flex-col justify-center items-center gap-6">
      {/* happy to see you, and sad when the sign-in is refused */}
      <MoodAvatar mood={error ? "sad" : "happy"} size={140} />
      <h1 className="text-3xl font-bold">Help Desk System</h1>
      {DEMO && <p className="-mt-3 text-sm text-muted-foreground">This is a demo: sign in with any email and password.</p>}

      <Card className="w-full max-w-sm">
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <h2 className="text-lg font-medium">
              {isRegister ? "Create your account" : "Sign in to continue"}
            </h2>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="password"
                type="password"
                autoComplete={isRegister ? "new-password" : "current-password"}
                placeholder={isRegister ? "At least 8 characters" : "Your password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {/* role="alert" makes screen readers announce the message when it appears */}
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}

            <Button type="submit" disabled={submitting} className="cursor-pointer">
              {submitting ? <Spinner /> : isRegister ? "Create account" : "Sign in"}
            </Button>

            <p className="text-sm text-muted-foreground text-center">
              {isRegister ? "Already have an account?" : "New here?"}{" "}
              <button
                type="button"
                onClick={switchMode}
                className="underline cursor-pointer text-foreground"
              >
                {isRegister ? "Sign in" : "Create an account"}
              </button>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default Login;
