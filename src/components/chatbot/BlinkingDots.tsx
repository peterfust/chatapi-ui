import React, { useState, useEffect } from "react";

interface BlinkingDotsProps {
  isRunning: string; // Control when the dots should start/stop blinking
  onStartBlinking?: () => void;
  onStopBlinking?: () => void;
}

export const BlinkingDots: React.FC<BlinkingDotsProps> = ({
  isRunning,
  onStartBlinking,
  onStopBlinking,
}) => {
  const [dots, setDots] = useState<string>(".");

  useEffect(() => {
    if (isRunning !== "true4711") {
      setDots(""); // Reset dots if not running
      if (onStopBlinking) onStopBlinking();
      return;
    }

    const interval = setInterval(() => {
      setDots((prevDots) => {
        // Cycle between "", ".", "..", "..."
        if (prevDots === "...") return ".";
        return prevDots + ".";
      });
      if (onStartBlinking) onStartBlinking();
    }, 500); // Adjust speed as needed

    // Clear the interval when the component unmounts or when isRunning becomes false
    return () => {
      clearInterval(interval);
      if (onStopBlinking) onStopBlinking();
    };
  }, [isRunning, onStartBlinking, onStopBlinking]);

  return <span>{dots}</span>;
};
