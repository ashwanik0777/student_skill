import { useState, useEffect } from "react";
import { formatTime } from "@/lib/testUtils";

interface TestTimerProps {
  duration: number; // in minutes
  onTimeUp: () => void;
  isPaused?: boolean;
}

export default function TestTimer({ duration, onTimeUp, isPaused = false }: TestTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState(duration * 60); // Convert to seconds
  
  useEffect(() => {
    if (isPaused) return;
    
    if (timeRemaining <= 0) {
      onTimeUp();
      return;
    }
    
    const timer = setInterval(() => {
      setTimeRemaining(prev => prev - 1);
    }, 1000);
    
    return () => clearInterval(timer);
  }, [timeRemaining, onTimeUp, isPaused]);
  
  // Warning color when less than 5 minutes remain
  const isLowTime = timeRemaining < 300;
  
  return (
    <div className={`mr-4 p-2 ${isLowTime ? 'bg-red-500' : 'bg-white bg-opacity-20'} rounded-lg flex items-center`}>
      <span className="material-icons mr-1">schedule</span>
      <span className="font-medium" id="timer">{formatTime(timeRemaining)}</span>
    </div>
  );
}
