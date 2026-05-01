import { Test } from "@/types";

interface SpecialTestCardProps {
  test: Test;
}

export default function SpecialTestCard({ test }: SpecialTestCardProps) {
  // Format date to show day of the week
  const testDate = new Date(test.availableAt);
  const dayOfWeek = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(testDate);
  
  return (
    <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg shadow-lg p-6 text-white">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <div className="flex items-center">
            <span className="material-icons mr-2">event_available</span>
            <h3 className="text-lg font-bold">Sunday Special: PCMB Combo Test</h3>
          </div>
          <p className="mt-2 md:mt-1">
            {test.description || "Challenge yourself with a comprehensive test covering Physics, Chemistry, Math and Biology."}
          </p>
          
          <div className="mt-4 flex items-center text-sm">
            <span className="flex items-center">
              <span className="material-icons text-white text-sm mr-1">schedule</span>
              {test.duration} min
            </span>
            <span className="mx-3 text-gray-300">|</span>
            <span className="flex items-center">
              <span className="material-icons text-white text-sm mr-1">help_outline</span>
              {test.questionCount} questions
            </span>
            <span className="mx-3 text-gray-300">|</span>
            <span className="flex items-center">
              <span className="material-icons text-white text-sm mr-1">calendar_today</span>
              This {dayOfWeek}
            </span>
          </div>
        </div>
        
        <button className="mt-4 md:mt-0 bg-white text-primary-600 hover:bg-gray-100 font-medium py-2 px-4 rounded-lg transition duration-300 flex items-center">
          Set Reminder
          <span className="material-icons ml-1">notification_add</span>
        </button>
      </div>
    </div>
  );
}
