"use client";

import { useSpeechToText } from "./useSpeechToText";

interface MicButtonProps {
  onTranscript: (text: string) => void;
  label?: string;
}

// Small mic toggle for voice-filling any single field. Renders nothing (not even a disabled
// button) when the browser doesn't support speech recognition — typing is already the field's
// normal path, so there's nothing useful to show instead of a working control.
export function MicButton({ onTranscript, label = "Voice input" }: MicButtonProps) {
  const { isListening, isSupported, toggle } = useSpeechToText(onTranscript);

  if (!isSupported) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={isListening ? "Listening… click to stop" : label}
      className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition ${
        isListening
          ? "border-teal bg-teal text-white"
          : "border-navy/20 bg-white text-navy hover:border-teal hover:text-teal"
      }`}
    >
      {isListening ? (
        <span className="flex gap-0.5">
          <span className="h-2 w-0.5 animate-pulse rounded-full bg-white" />
          <span className="h-2 w-0.5 animate-pulse rounded-full bg-white [animation-delay:0.15s]" />
          <span className="h-2 w-0.5 animate-pulse rounded-full bg-white [animation-delay:0.3s]" />
        </span>
      ) : (
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
          <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Z" />
          <path d="M19 11a1 1 0 1 0-2 0 5 5 0 0 1-10 0 1 1 0 1 0-2 0 7 7 0 0 0 6 6.93V20H9a1 1 0 1 0 0 2h6a1 1 0 1 0 0-2h-2v-2.07A7 7 0 0 0 19 11Z" />
        </svg>
      )}
    </button>
  );
}
