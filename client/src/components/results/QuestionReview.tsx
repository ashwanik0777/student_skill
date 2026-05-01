import { useState } from "react";
import { UserAnswer, Question } from "@/types";

interface QuestionReviewProps {
  answers: UserAnswer[];
  questions: Question[];
}

export default function QuestionReview({ answers, questions }: QuestionReviewProps) {
  const [showAll, setShowAll] = useState(false);
  
  // Combine answers with questions
  const answersWithQuestions = answers.map(answer => {
    const question = questions.find(q => q.id === answer.questionId);
    return { ...answer, question };
  }).filter(a => a.question !== undefined);
  
  // Display only first 2 questions unless "Show all" is clicked
  const displayAnswers = showAll ? answersWithQuestions : answersWithQuestions.slice(0, 2);
  
  return (
    <div className="mt-8">
      <h3 className="text-lg font-medium mb-4">Question Review</h3>
      
      <div className="space-y-4">
        {displayAnswers.map((answer, index) => {
          const isCorrect = answer.isCorrect;
          const bgColorClass = isCorrect ? "bg-green-50" : "bg-red-50";
          const borderColorClass = isCorrect ? "border-green-100" : "border-red-100";
          const textColorClass = isCorrect ? "text-green-800" : "text-red-800";
          const iconColorClass = isCorrect ? "text-green-500" : "text-red-500";
          const iconName = isCorrect ? "check_circle" : "cancel";
          
          return (
            <div key={index} className={`${bgColorClass} border ${borderColorClass} p-4 rounded-lg`}>
              <div className="flex justify-between">
                <h4 className={`font-medium flex items-center ${textColorClass}`}>
                  <span className={`material-icons mr-2 ${iconColorClass}`}>{iconName}</span>
                  Question {index + 1}
                </h4>
                <span className={isCorrect ? "text-green-600" : "text-red-600"} text-sm>
                  {isCorrect ? "Correct" : "Incorrect"}
                </span>
              </div>
              <p className="mt-2 text-gray-700">{answer.question?.text}</p>
              <div className="mt-2 text-sm">
                <p className={isCorrect ? "text-green-700" : "text-red-700"}>
                  Your answer: {answer.selectedOption !== undefined && answer.question?.options[answer.selectedOption]}
                </p>
                {!isCorrect && (
                  <p className="text-green-700">
                    Correct answer: {answer.question?.options[answer.question.correctOption]}
                  </p>
                )}
                {!isCorrect && (
                  <p className="mt-2 text-gray-600">
                    <span className="font-medium">Explanation:</span> {answer.question?.explanation}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      {answersWithQuestions.length > 2 && (
        <div className="mt-4 text-center">
          <button 
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 inline-flex items-center"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? "Show fewer questions" : "Show all questions"}
            <span className="material-icons ml-1">
              {showAll ? "expand_less" : "expand_more"}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
