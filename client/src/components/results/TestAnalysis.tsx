import { useEffect, useState } from "react";
import { UserAnswer, Question } from "@/types";
import { analyzeTestPerformance } from "@/lib/testUtils";

interface TestAnalysisProps {
  answers: UserAnswer[];
  questions: Question[];
}

export default function TestAnalysis({ answers, questions }: TestAnalysisProps) {
  const [analysis, setAnalysis] = useState<{
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
  }>({
    strengths: [],
    weaknesses: [],
    recommendations: []
  });
  
  useEffect(() => {
    if (answers.length > 0 && questions.length > 0) {
      const result = analyzeTestPerformance(answers, questions);
      setAnalysis(result);
    }
  }, [answers, questions]);
  
  return (
    <div className="mt-8">
      <h3 className="text-lg font-medium mb-4">Test Analysis</h3>
      
      <div className="space-y-4">
        {/* Strengths */}
        <div className="bg-green-50 border border-green-100 rounded-lg p-4">
          <h4 className="flex items-center text-green-800 font-medium">
            <span className="material-icons mr-2 text-green-500">trending_up</span>
            Your Strengths
          </h4>
          {analysis.strengths.length > 0 ? (
            <ul className="mt-2 pl-8 space-y-2 text-sm list-disc text-green-800">
              {analysis.strengths.map((strength, index) => (
                <li key={index}>{strength}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-green-700">
              Keep practicing to identify your strengths.
            </p>
          )}
        </div>
        
        {/* Areas for Improvement */}
        <div className="bg-amber-50 border border-amber-100 rounded-lg p-4">
          <h4 className="flex items-center text-amber-800 font-medium">
            <span className="material-icons mr-2 text-amber-500">trending_down</span>
            Areas for Improvement
          </h4>
          {analysis.weaknesses.length > 0 ? (
            <ul className="mt-2 pl-8 space-y-2 text-sm list-disc text-amber-800">
              {analysis.weaknesses.map((weakness, index) => (
                <li key={index}>{weakness}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-amber-700">
              No specific weaknesses identified in this test.
            </p>
          )}
        </div>
        
        {/* Recommended Practice */}
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
          <h4 className="flex items-center text-blue-800 font-medium">
            <span className="material-icons mr-2 text-blue-500">psychology</span>
            AI Recommendations
          </h4>
          {analysis.recommendations.length > 0 ? (
            <p className="mt-2 text-sm text-blue-800">
              {analysis.recommendations.join(' ')}
            </p>
          ) : (
            <p className="mt-2 text-sm text-blue-800">
              Based on your performance, we recommend continuing to take daily tests to build a consistent study habit.
            </p>
          )}
          <div className="mt-3">
            <button className="px-4 py-2 bg-primary text-white rounded-lg text-sm flex items-center">
              View recommended tests
              <span className="material-icons ml-1 text-sm">arrow_forward</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
