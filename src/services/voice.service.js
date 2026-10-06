import axios from "axios";
import { authHeaders, handleUnauthorized } from "../lib/auth";

const client = axios.create({
  baseURL: "/api",
});

// Every voice request proves who the user is with their login token...
client.interceptors.request.use((config) => {
  Object.assign(config.headers, authHeaders());
  return config;
});

// ...and a 401 back means the token is missing or expired, so go and log in again.
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      handleUnauthorized();
    }
    return Promise.reject(error);
  }
);

/**
 * POST /api/v1/helpdesk/voice/speech-to-text - audio in, transcript out.
 * `signal` lets the caller abort mid-request (e.g. the user hits Cancel).
 */
export async function transcribeAudio(wavBlob, signal) {
  const form = new FormData();
  form.append("audio", wavBlob, "voice-message.wav");

  const { data } = await client.post("/v1/helpdesk/voice/speech-to-text", form, { signal });
  return data.text;
}

/**
 * POST /api/v1/helpdesk/voice/text-to-speech - raw text in, WAV audio out.
 * Returns an object URL the caller can hand straight to an <audio> element;
 * the caller is responsible for revoking it once playback is done.
 */
export async function synthesizeSpeech(text) {
  const response = await client.post("/v1/helpdesk/voice/text-to-speech", text, {
    headers: { "Content-Type": "text/plain" },
    responseType: "blob",
  });
  return URL.createObjectURL(response.data);
}
