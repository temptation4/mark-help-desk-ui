import { useCallback, useRef, useState } from "react";

// The backend's SpeechToTextService sends the raw bytes to Ollama labeled as
// "wav", so the browser has to hand it real WAV - MediaRecorder only produces
// webm/ogg, which would silently fail to decode. Capturing PCM via the Web
// Audio API and encoding a WAV header ourselves avoids adding an
// audio-conversion dependency for what's really just a 44-byte header.
const TARGET_SAMPLE_RATE = 16000;

function downsampleTo16k(samples, inputSampleRate) {
  if (inputSampleRate === TARGET_SAMPLE_RATE) return samples;

  const ratio = inputSampleRate / TARGET_SAMPLE_RATE;
  const outLength = Math.round(samples.length / ratio);
  const result = new Float32Array(outLength);

  for (let i = 0; i < outLength; i++) {
    result[i] = samples[Math.round(i * ratio)] ?? 0;
  }
  return result;
}

function encodeWav(samples, sampleRate) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  function writeString(offset, text) {
    for (let i = 0; i < text.length; i++) {
      view.setUint8(offset + i, text.charCodeAt(i));
    }
  }

  writeString(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeString(36, "data");
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
  }

  return new Blob([buffer], { type: "audio/wav" });
}

/**
 * Records the microphone as mono 16kHz PCM and resolves to a playable WAV
 * Blob on stop() - ready to send straight to /voice/speech-to-text or
 * /voice/chat as multipart form data.
 */
export function useVoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const contextRef = useRef(null);
  const streamRef = useRef(null);
  const processorRef = useRef(null);
  const sourceRef = useRef(null);
  const chunksRef = useRef([]);

  const start = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const context = new (window.AudioContext || window.webkitAudioContext)();
    const source = context.createMediaStreamSource(stream);
    // ScriptProcessorNode is deprecated but needs no build-time worklet file
    // and every browser still supports it - simplest option for this scope.
    const processor = context.createScriptProcessor(4096, 1, 1);

    chunksRef.current = [];
    processor.onaudioprocess = (event) => {
      chunksRef.current.push(new Float32Array(event.inputBuffer.getChannelData(0)));
    };

    source.connect(processor);
    processor.connect(context.destination);

    streamRef.current = stream;
    contextRef.current = context;
    sourceRef.current = source;
    processorRef.current = processor;
    setIsRecording(true);
  }, []);

  const stop = useCallback(() => {
    return new Promise((resolve) => {
      const context = contextRef.current;
      if (!context) {
        resolve(null);
        return;
      }

      processorRef.current.disconnect();
      sourceRef.current.disconnect();
      streamRef.current.getTracks().forEach((track) => track.stop());

      const totalLength = chunksRef.current.reduce((sum, chunk) => sum + chunk.length, 0);
      const merged = new Float32Array(totalLength);
      let offset = 0;
      for (const chunk of chunksRef.current) {
        merged.set(chunk, offset);
        offset += chunk.length;
      }

      const downsampled = downsampleTo16k(merged, context.sampleRate);
      const wavBlob = encodeWav(downsampled, TARGET_SAMPLE_RATE);

      context.close();
      contextRef.current = null;
      setIsRecording(false);
      resolve(wavBlob);
    });
  }, []);

  return { isRecording, start, stop };
}
