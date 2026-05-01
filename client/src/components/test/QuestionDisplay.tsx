import { useState } from "react";
import { Question } from "@/types";

interface QuestionDisplayProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  onAnswer: (selectedOption: number) => void;
  subjectColor: string;
  hasAnswered: boolean;
  selectedOption?: number;
}

export default function QuestionDisplay({
  question,
  questionNumber,
  totalQuestions,
  onAnswer,
  subjectColor,
  hasAnswered,
  selectedOption
}: QuestionDisplayProps) {
  const handleOptionSelect = (optionIndex: number) => {
    if (hasAnswered) return;
    onAnswer(optionIndex);
  };
  
  return (
    <div className="bg-gray-50 rounded-lg p-6 mb-6">
      <h2 className="text-lg font-medium mb-4">{question.text}</h2>
      
      <div className="space-y-3">
        {question.options.map((option, index) => {
          let optionClasses = "flex items-center p-3 bg-white rounded-lg border cursor-pointer";
          
          if (hasAnswered && selectedOption === index) {
            optionClasses += selectedOption === question.correctOption
              ? " border-2 border-green-500 bg-green-50"
              : " border-2 border-red-500 bg-red-50";
          } else if (hasAnswered && index === question.correctOption) {
            optionClasses += " border-2 border-green-500 bg-green-50";
          } else {
            optionClasses += ` border-gray-200 hover:border-${subjectColor}`;
          }
          
          return (
            <div 
              key={index} 
              className={optionClasses}
              onClick={() => handleOptionSelect(index)}
            >
              <input 
                type="radio" 
                name="answer" 
                id={`option${index}`} 
                className={`h-4 w-4 text-${subjectColor} focus:ring-${subjectColor} mr-3`}
                checked={selectedOption === index}
                onChange={() => handleOptionSelect(index)}
                disabled={hasAnswered}
              />
              <label htmlFor={`option${index}`} className="w-full cursor-pointer">
                {option}
              </label>
              
              {hasAnswered && index === question.correctOption && (
                <span className="material-icons text-green-500 ml-2">check_circle</span>
              )}
              
              {hasAnswered && selectedOption === index && selectedOption !== question.correctOption && (
                <span className="material-icons text-red-500 ml-2">cancel</span>
              )}
            </div>
          );
        })}
      </div>
      
      {hasAnswered && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-medium text-blue-800 mb-1">Explanation:</h3>
          <p className="text-blue-700 text-sm">{question.explanation}</p>
        </div>
      )}
    </div>
  );
}
