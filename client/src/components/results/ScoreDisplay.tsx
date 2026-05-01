import { TestAttempt } from "@/types";
import { formatTime } from "@/lib/testUtils";

interface ScoreDisplayProps {
  testAttempt: TestAttempt;
}

export default function ScoreDisplay({ testAttempt }: ScoreDisplayProps) {
  if (!testAttempt.completedAt || testAttempt.score === undefined || 
      testAttempt.correctAnswers === undefined || testAttempt.timeTaken === undefined) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-50 p-4 rounded-lg text-center">
          <div className="h-24 flex items-center justify-center">
            <span className="material-icons text-4xl text-gray-400">help_outline</span>
          </div>
          <h3 className="mt-2 font-medium">Test not completed</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Score Card */}
      <div className="bg-gray-50 p-4 rounded-lg text-center">
        <div className="relative inline-block">
          <svg className="w-24 h-24" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e6e6e6" strokeWidth="2"></circle>
            <circle 
              cx="18" 
              cy="18" 
              r="15.9" 
              fill="none" 
              stroke="hsl(var(--primary))" 
              strokeDasharray={`${testAttempt.score} 100`}
              strokeDashoffset="0" 
              strokeWidth="2" 
              className="progress-ring-circle"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-bold text-primary">{testAttempt.score}%</span>
          </div>
        </div>
        <h3 className="mt-2 font-medium">Your Score</h3>
        <p className="text-sm text-gray-500">
          {testAttempt.correctAnswers}/{testAttempt.totalQuestions} correct answers
        </p>
      </div>
      
      {/* Time Card */}
      <div className="bg-gray-50 p-4 rounded-lg text-center">
        <div className="h-24 flex items-center justify-center">
          <span className="material-icons text-4xl text-gray-400">schedule</span>
        </div>
        <h3 className="mt-2 font-medium">Time Taken</h3>
        <p className="text-sm text-gray-500">
          {formatTime(testAttempt.timeTaken)}
        </p>
      </div>
      
      {/* Class Ranking */}
      <div className="bg-gray-50 p-4 rounded-lg text-center">
        <div className="h-24 flex items-center justify-center">
          <span className="material-icons text-4xl text-achievement">leaderboard</span>
        </div>
        <h3 className="mt-2 font-medium">Class Ranking</h3>
        <p className="text-sm text-gray-500">
          View the leaderboard to see your position
        </p>
      </div>
    </div>
  );
}
