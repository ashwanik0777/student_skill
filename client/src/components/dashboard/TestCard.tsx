import { Test, Subject } from "@/types";
import { Link } from "wouter";

interface TestCardProps {
  test: Test;
  subject: Subject;
}

export default function TestCard({ test, subject }: TestCardProps) {
  const colorClass = subject.color;
  
  return (
    <div className="test-card bg-white rounded-lg shadow-md overflow-hidden">
      <div className={`h-3 bg-${colorClass}`}></div>
      <div className="p-5">
        <div className="flex justify-between items-start">
          <div>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${colorClass}-light text-${colorClass}`}>
              <span className="material-icons text-xs mr-1">{subject.icon}</span>
              {subject.displayName}
            </span>
            <h4 className="mt-2 text-md font-medium">{test.title}</h4>
          </div>
          <span className={`flex items-center justify-center h-10 w-10 rounded-full bg-${colorClass}-light`}>
            <span className={`material-icons text-${colorClass}`}>{subject.icon}</span>
          </span>
        </div>
        
        <div className="mt-4 flex items-center text-sm">
          <span className="material-icons text-gray-400 text-sm mr-1">schedule</span>
          <span className="text-gray-600">{test.duration} min</span>
          <span className="mx-3 text-gray-300">|</span>
          <span className="material-icons text-gray-400 text-sm mr-1">help_outline</span>
          <span className="text-gray-600">{test.questionCount} questions</span>
        </div>
        
        <div className="mt-5">
          <Link href={`/test/${test.id}`}>
            <button 
              className={`w-full bg-${colorClass} hover:bg-${colorClass}/90 text-white font-medium py-2 px-4 rounded-lg transition duration-300`}
            >
              Start Test
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
