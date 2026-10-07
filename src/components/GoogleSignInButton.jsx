import React, { useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";
import { DEMO } from "../lib/demo";
import { getAuthConfig } from "../services/auth.service";

// Google's own sign-in script (Google Identity Services). It draws Google's button and, after the user picks their Google account, hands us
// a signed ID token. We send that token to the auth service, which checks it with Google's public keys and signs the user in.
const GOOGLE_SCRIPT = "https://accounts.google.com/gsi/client";

function loadGoogleScript() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();
    const existing = document.querySelector("script[data-gsi]");
    const script = existing ?? document.createElement("script");
    script.addEventListener("load", resolve, { once: true });
    script.addEventListener("error", () => reject(new Error("Could not load Google's sign-in. Check your internet connection.")), { once: true });
    if (!existing) {
      script.src = GOOGLE_SCRIPT;
      script.async = true;
      script.dataset.gsi = "1";
      document.head.appendChild(script);
    }
  });
}

/** Google's multi-coloured "G". */
function GoogleG() {
  return (
    <svg viewBox="0 0 48 48" className="h-4 w-4" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.1 5.5c4.3-4 6.8-9.9 6.8-16.9z" />
      <path fill="#FBBC05" d="M10.5 28.7c-.5-1.4-.8-2.9-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.9-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.1-5.5c-2 1.4-4.9 2.3-8.8 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}

/**
 * "Continue with Google". Three cases:
 *  - the auth service has a Google client id: Google's own button is shown, and `onCredential(idToken)` is called when the user signs in;
 *  - it has none: a switched-off button says what is missing (GOOGLE_CLIENT_ID on the auth service);
 *  - the hosted demo: a demo button that signs in as a made-up Google user.
 */
function GoogleSignInButton({ onCredential, onError }) {
  const [config, setConfig] = useState(null); // null while checking
  const holder = useRef(null);
  const callbacks = useRef({ onCredential, onError }); // the latest callbacks, for Google's script to call

  useEffect(() => {
    callbacks.current = { onCredential, onError };
  });

  useEffect(() => {
    getAuthConfig().then(setConfig).catch(() => setConfig({ googleClientId: null }));
  }, []);

  const clientId = config?.googleClientId;

  useEffect(() => {
    if (!clientId || DEMO) return undefined;
    let cancelled = false;
    loadGoogleScript()
      .then(() => {
        if (cancelled || !holder.current) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => callbacks.current.onCredential(response.credential),
        });
        window.google.accounts.id.renderButton(holder.current, { theme: "outline", size: "large", text: "continue_with", width: 320 });
      })
      .catch((error) => callbacks.current.onError(error.message));
    return () => { cancelled = true; };
  }, [clientId]);

  if (config === null) return null;

  if (DEMO) {
    return (
      <Button type="button" variant="outline" className="w-full cursor-pointer" onClick={() => onCredential("demo")}>
        <GoogleG /> Continue with Google (demo)
      </Button>
    );
  }

  if (!clientId) {
    return (
      <div className="flex flex-col gap-1">
        <Button type="button" variant="outline" className="w-full" disabled>
          <GoogleG /> Continue with Google
        </Button>
        <p className="text-center text-xs text-muted-foreground">Not set up yet: start the auth service with GOOGLE_CLIENT_ID (see the README).</p>
      </div>
    );
  }

  return <div ref={holder} className="flex justify-center" aria-label="Continue with Google" />;
}

export default GoogleSignInButton;
