import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";

interface AudioRecorderButtonProps {
  onRecordingComplete: (blob: Blob, durationSeconds: number) => void;
  minDurationSeconds?: number;
  maxDurationSeconds?: number;
  promptText?: string;
  showWaveform?: boolean;
}

const formatTime = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
};

const AudioRecorderButton: React.FC<AudioRecorderButtonProps> = ({
  onRecordingComplete,
  minDurationSeconds = 0,
  maxDurationSeconds = 300,
  promptText = "Tap the mic to start recording",
  showWaveform = true,
}) => {
  const { isRecording, startRecording, stopRecording, audioBlob, audioURL, durationSeconds, error, reset } = useAudioRecorder();
  const [confirmed, setConfirmed] = useState(false);
  const autoStoppedRef = useRef(false);

  // Auto-stop at max duration
  useEffect(() => {
    if (isRecording && durationSeconds >= maxDurationSeconds && !autoStoppedRef.current) {
      autoStoppedRef.current = true;
      stopRecording();
    }
  }, [isRecording, durationSeconds, maxDurationSeconds, stopRecording]);

  // Reset auto-stop flag when starting new recording
  useEffect(() => {
    if (isRecording) autoStoppedRef.current = false;
  }, [isRecording]);

  const handleUseThis = () => {
    if (audioBlob) {
      setConfirmed(true);
      onRecordingComplete(audioBlob, durationSeconds);
    }
  };

  const handleRecordAgain = () => {
    reset();
    setConfirmed(false);
  };

  const meetsMin = durationSeconds >= minDurationSeconds;
  const remaining = minDurationSeconds - durationSeconds;

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-6">
        <span className="text-3xl">🎤</span>
        <p className="text-sm text-destructive font-body text-center">{error}</p>
        <button onClick={startRecording} className="text-sm text-primary font-body underline">Try Again</button>
      </div>
    );
  }

  // Post-recording review
  if (audioBlob && audioURL && !isRecording && !confirmed) {
    return (
      <div className="flex flex-col items-center gap-4 py-4 w-full">
        <p className="text-xs text-foreground/40 font-body uppercase tracking-wider">Review your recording</p>
        <audio controls src={audioURL} className="w-full max-w-xs" />
        <p className="text-xs text-foreground/40 font-body">{formatTime(durationSeconds)}</p>
        <div className="flex gap-3 w-full">
          <button
            onClick={handleRecordAgain}
            className="flex-1 glass-card border border-foreground/10 text-foreground/60 font-body py-3 rounded-xl text-sm"
          >
            Record Again
          </button>
          <button
            onClick={handleUseThis}
            className="flex-1 bg-primary text-primary-foreground font-body font-semibold py-3 rounded-xl text-sm"
          >
            Use This ✓
          </button>
        </div>
      </div>
    );
  }

  // Recording state
  if (isRecording) {
    return (
      <div className="flex flex-col items-center gap-4 py-4">
        {/* Waveform */}
        {showWaveform && (
          <div className="flex items-end gap-[4px] h-10">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="wave-bar w-[4px] rounded-full bg-destructive"
                style={{ height: `${12 + Math.random() * 16}px` }}
              />
            ))}
          </div>
        )}

        {/* Timer */}
        <p className="font-mono-ub text-2xl text-destructive font-bold">{formatTime(durationSeconds)}</p>

        {/* Duration guidance */}
        {!meetsMin && (
          <p className="text-xs text-foreground/40 font-body">
            Keep speaking... {remaining} seconds to go
          </p>
        )}
        {meetsMin && durationSeconds < maxDurationSeconds && (
          <p className="text-xs text-primary font-body font-medium">
            Perfect! Submit when ready ✓
          </p>
        )}
        {durationSeconds >= maxDurationSeconds && (
          <p className="text-xs text-primary font-body font-medium">
            Great length! Recording complete ✦
          </p>
        )}

        {/* Stop button */}
        <motion.button
          onClick={stopRecording}
          whileTap={{ scale: 0.95 }}
          className="w-20 h-20 rounded-full bg-destructive flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.4)]"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <div className="w-6 h-6 rounded-sm bg-primary-foreground" />
        </motion.button>
        <p className="text-xs text-foreground/30 font-body">Tap to stop</p>
      </div>
    );
  }

  // Idle state — ready to record
  return (
    <div className="flex flex-col items-center gap-4 py-4">
      <p className="text-sm text-foreground/50 font-body text-center">{promptText}</p>
      <motion.button
        onClick={startRecording}
        whileTap={{ scale: 0.95 }}
        whileHover={{ scale: 1.05 }}
        className="w-20 h-20 rounded-full bg-primary flex items-center justify-center shadow-[0_0_30px_hsl(var(--gold-glow))]"
      >
        <span className="text-3xl">🎤</span>
      </motion.button>
      <p className="text-xs text-foreground/30 font-body">Tap to start</p>
      {minDurationSeconds > 0 && (
        <p className="text-xs text-foreground/20 font-body">Min: {formatTime(minDurationSeconds)} · Max: {formatTime(maxDurationSeconds)}</p>
      )}
    </div>
  );
};

export default AudioRecorderButton;
