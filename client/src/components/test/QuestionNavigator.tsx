import { TestStatus } from "@/types";

interface QuestionNavigatorProps {
  totalQuestions: number;
  currentQuestion: number;
  answeredQuestions: number[];
  onNavigate: (questionIndex: number) => void;
  subjectColor: string;
}

export default function QuestionNavigator({ 
  totalQuestions, 
  currentQuestion, 
  answeredQuestions,
  onNavigate,
  subjectColor
}: QuestionNavigatorProps) {
  const handleNavigate = (index: number) => {
    onNavigate(index);
  };
  
  return (
    <div className="mt-8">
      <h3 className="text-md font-medium mb-4">Question Navigator</h3>
      
      <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
        {Array.from({ length: totalQuestions }, (_, i) => i).map(questionIndex => {
          let buttonClasses = "h-10 w-10 rounded-lg flex items-center justify-center border font-medium";
          
          if (questionIndex === currentQuestion) {
            buttonClasses += ` bg-${subjectColor} text-white`;
          } else if (answeredQuestions.includes(questionIndex)) {
            buttonClasses += " bg-green-100 text-green-800 border-green-200";
          } else {
            buttonClasses += " border-gray-200";
          }
          
          return (
            <button 
              key={questionIndex}
              className={buttonClasses}
              onClick={() => handleNavigate(questionIndex)}
            >
              {questionIndex + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}
