"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Wraps the browser's built-in Web Speech API (window.SpeechRecognition /
// webkitSpeechRecognition) — no API key, no server round-trip. Support is Chrome/Edge-first;
// Firefox and Safari either lack it or support it inconsistently. isSupported lets callers hide
// or disable the mic button so typing is always the fallback, never a dead end.
export function useSpeechToText(onResult: (text: string) => void) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef("");

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setIsSupported(Boolean(SpeechRecognition));
  }, []);

  const toggle = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }

    finalTranscriptRef.current = "";
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    // "continuous" recognition fires onresult once per recognized phrase, and event.results
    // keeps growing across the whole session — reading the whole array every time and handing
    // it to the caller (who appends it to existing text) multiplied the transcript on every
    // pause. Only pick up NEW final segments here (event.resultIndex), and only hand the
    // complete text to the caller once, when the mic is stopped — one onResult call per
    // recording, never a running total re-delivered mid-session.
    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscriptRef.current += `${event.results[i][0].transcript} `;
        }
      }
    };
    recognition.onend = () => {
      setIsListening(false);
      const text = finalTranscriptRef.current.trim();
      if (text) onResult(text);
    };
    recognition.onerror = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isListening, onResult]);

  return { isListening, isSupported, toggle };
}
