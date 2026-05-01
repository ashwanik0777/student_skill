import OpenAI from "openai";
import { Subject } from "@shared/schema";
import { loadEnv } from "./env";

// Initialize OpenAI client
loadEnv();
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  throw new Error("Missing OPENAI_API_KEY in environment. Check your .env file.");
}
const openai = new OpenAI({ apiKey });

// Interface for user answers data from the database
interface UserAnswer {
  questionId: number;
  selectedOption: number;
  isCorrect: boolean;
  question: {
    text: string;
    subjectId: number;
    topic?: string;
    difficulty?: string;
  };
}

/**
 * Generate a question for a specific subject
 */
export async function generateQuestion(subject: string, difficulty: 'easy' | 'medium' | 'hard' = 'medium'): Promise<{
  text: string;
  options: string[];
  correctOption: number;
  explanation: string;
  topic?: string;
  difficulty?: string;
}> {
  try {
    // Create system message to direct the model on what to generate
    const systemPrompt = `You are an expert educational content creator for 10th-grade students. 
    Create a multiple-choice question about ${subject} at a ${difficulty} difficulty level.
    The question should be clear, engaging, and appropriate for 10th-grade students.
    The options should be plausible but with only one clearly correct answer.
    Provide a brief explanation of the correct answer that helps the student understand the concept.`;
    
    // Create user message with specific requirements
    const userPrompt = `Please generate one multiple-choice question about ${subject} at ${difficulty} difficulty level.
    Format your response as a JSON object with the following structure:
    {
      "text": "The question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctOption": 0,
      "explanation": "Explanation of why this answer is correct",
      "topic": "Specific topic within the subject",
      "difficulty": "${difficulty}"
    }
    Note: correctOption should be a 0-indexed number referring to the correct option in the options array.`;
    
    // Request completion from OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });
    
    // Parse the response
    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("Empty response from OpenAI");
    }
    
    return JSON.parse(content);
  } catch (error: any) {
    console.error("OpenAI Error:", error);
    throw new Error(`Failed to generate question: ${error.message}`);
  }
}

/**
 * Generate a set of questions for a specific subject
 */
export async function generateQuestions(subject: string, count: number, difficulty: 'easy' | 'medium' | 'hard' = 'medium'): Promise<{
  text: string;
  options: string[];
  correctOption: number;
  explanation: string;
  topic?: string;
  difficulty?: string;
}[]> {
  try {
    // For better performance with larger sets, we'll batch the requests
    const batchSize = Math.min(count, 5); // No more than 5 questions per request
    const batches = Math.ceil(count / batchSize);
    const allQuestions = [];
    
    for (let i = 0; i < batches; i++) {
      const batchCount = Math.min(batchSize, count - i * batchSize);
      
      // Skip if no questions remain
      if (batchCount <= 0) break;
      
      // Create system message
      const systemPrompt = `You are an expert educational content creator for 10th-grade students. 
      Create ${batchCount} diverse multiple-choice questions about ${subject} at a ${difficulty} difficulty level.
      Questions should be clear, engaging, and appropriate for 10th-grade students.
      The options should be plausible but with only one clearly correct answer.
      Provide a brief explanation for each correct answer that helps students understand the concept.`;
      
      // Create user message with specific requirements
      const userPrompt = `Please generate ${batchCount} multiple-choice questions about ${subject} at ${difficulty} difficulty level.
      Format your response as a JSON array of question objects with the following structure:
      [
        {
          "text": "Question text",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correctOption": 0,
          "explanation": "Explanation of why this answer is correct",
          "topic": "Specific topic within the subject",
          "difficulty": "${difficulty}"
        }
      ]
      Each question should cover a different topic or concept within ${subject} if possible.
      Note: correctOption should be a 0-indexed number referring to the correct option in the options array.`;
      
      // Request completion from OpenAI
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      });
      
      // Parse the response
      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("Empty response from OpenAI");
      }
      
      const batchQuestions = JSON.parse(content);
      allQuestions.push(...batchQuestions);
    }
    
    return allQuestions.slice(0, count); // Ensure we return exactly the requested number
  } catch (error: any) {
    console.error("OpenAI Error:", error);
    throw new Error(`Failed to generate questions: ${error.message}`);
  }
}

/**
 * Analyze test performance to identify strengths and weaknesses
 */
export async function analyzePerformance(
  answers: UserAnswer[],
  subjects: Subject[]
): Promise<{
  overall: {
    score: number;
    strengths: string[];
    weaknesses: string[];
    timeEfficiency: string;
  };
  subjectBreakdown: {
    [subject: string]: {
      score: number;
      strengths: string[];
      weaknesses: string[];
    };
  };
  recommendations: string[];
}> {
  try {
    // Calculate the overall score
    const correctAnswers = answers.filter(a => a.isCorrect).length;
    const totalQuestions = answers.length;
    const overallScore = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
    
    // Group answers by subject
    const subjectMap = new Map<number, string>();
    subjects.forEach(s => subjectMap.set(s.id, s.displayName));
    
    const answersBySubject = new Map<string, UserAnswer[]>();
    
    answers.forEach(answer => {
      const subjectId = answer.question.subjectId;
      const subjectName = subjectMap.get(subjectId) || 'Unknown';
      
      if (!answersBySubject.has(subjectName)) {
        answersBySubject.set(subjectName, []);
      }
      
      answersBySubject.get(subjectName)?.push(answer);
    });
    
    // Format the data for OpenAI analysis
    const analysisData = {
      overallScore,
      totalQuestions,
      correctAnswers,
      subjects: Array.from(answersBySubject.entries()).map(([subject, subjectAnswers]) => {
        const correctInSubject = subjectAnswers.filter(a => a.isCorrect).length;
        return {
          name: subject,
          totalQuestions: subjectAnswers.length,
          correctAnswers: correctInSubject,
          score: subjectAnswers.length > 0 ? (correctInSubject / subjectAnswers.length) * 100 : 0,
          questions: subjectAnswers.map(a => ({
            question: a.question.text,
            correct: a.isCorrect,
            topic: a.question.topic || 'General',
            difficulty: a.question.difficulty || 'Medium'
          }))
        };
      })
    };
    
    // Create prompt for OpenAI
    const systemPrompt = `You are an expert educational analyst who specializes in helping 10th-grade students improve their academic performance. 
    Analyze the provided test performance data to identify strengths, weaknesses, and provide personalized recommendations.
    Your analysis should be encouraging yet honest, highlighting areas where the student is excelling and providing constructive guidance on areas for improvement.`;
    
    const userPrompt = `Please analyze this test performance data and provide a detailed assessment:
    ${JSON.stringify(analysisData, null, 2)}
    
    Format your response as a JSON object with the following structure:
    {
      "overall": {
        "score": 75.5,
        "strengths": ["Strong critical thinking", "Good at conceptual questions"],
        "weaknesses": ["Needs work on mathematical problems", "Difficulty with application questions"],
        "timeEfficiency": "Good pace, completed within expected time"
      },
      "subjectBreakdown": {
        "Mathematics": {
          "score": 80.0,
          "strengths": ["Algebra", "Basic arithmetic"],
          "weaknesses": ["Geometry", "Word problems"]
        },
        "Science": {
          "score": 70.0,
          "strengths": ["Biology concepts", "Scientific method"],
          "weaknesses": ["Physics calculations", "Chemistry formulas"]
        }
      },
      "recommendations": [
        "Focus on practicing geometry problems daily",
        "Review chemistry formulas with flashcards",
        "Continue strengthening algebra skills through advanced exercises"
      ]
    }
    
    Ensure your analysis is specific, actionable, and encouraging for a 10th-grade student.`;
    
    // Request completion from OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.5,
    });
    
    // Parse the response
    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("Empty response from OpenAI");
    }
    
    return JSON.parse(content);
  } catch (error: any) {
    console.error("OpenAI Error:", error);
    throw new Error(`Failed to analyze performance: ${error.message}`);
  }
}

/**
 * Generate personalized learning path recommendations
 */
export async function generateLearningPath(
  performance: {
    subject: string;
    averageScore: number;
    testsCompleted: number;
    strengths: string[];
    weaknesses: string[];
  }[]
): Promise<{
  subjectRecommendations: {
    [subject: string]: {
      focusAreas: string[];
      recommendedResources: string[];
      practiceStrategies: string[];
    };
  };
  dailyStudyPlan: {
    [day: string]: {
      subjects: string[];
      activities: string[];
      timeAllocation: { [subject: string]: number };
    };
  };
  longTermGoals: string[];
}> {
  try {
    // Create prompt for OpenAI
    const systemPrompt = `You are an expert educational coach who specializes in creating personalized learning paths for 10th-grade students.
    Based on the student's performance data, create a comprehensive and actionable learning path that will help them improve in areas of weakness while building on their strengths.
    Your recommendations should be specific, realistic for a 10th-grade student's schedule, and designed to maximize learning efficiency.`;
    
    const userPrompt = `Please create a personalized learning path based on this student performance data:
    ${JSON.stringify(performance, null, 2)}
    
    Format your response as a JSON object with the following structure:
    {
      "subjectRecommendations": {
        "Mathematics": {
          "focusAreas": ["Geometry", "Trigonometry", "Word problems"],
          "recommendedResources": ["Khan Academy Geometry course", "Math textbook Chapter 7-9", "IXL Math practice problems"],
          "practiceStrategies": ["Daily practice of 5 problems", "Create visual diagrams for word problems", "Join study group"]
        }
      },
      "dailyStudyPlan": {
        "Monday": {
          "subjects": ["Mathematics", "Science"],
          "activities": ["Review geometry formulas", "Practice science lab questions"],
          "timeAllocation": {"Mathematics": 45, "Science": 30}
        },
        "Tuesday": {
          "subjects": ["English", "Social Science"],
          "activities": ["Reading comprehension practice", "Historical timeline review"],
          "timeAllocation": {"English": 40, "Social Science": 35}
        }
      },
      "longTermGoals": [
        "Improve Mathematics score to above 85% within 2 months",
        "Master all core science concepts by the end of the semester",
        "Develop consistent daily study habits"
      ]
    }
    
    Include all 7 days of the week in the daily study plan.
    Ensure your recommendations are specific, age-appropriate, and achievable for a 10th-grade student.`;
    
    // Request completion from OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });
    
    // Parse the response
    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("Empty response from OpenAI");
    }
    
    return JSON.parse(content);
  } catch (error: any) {
    console.error("OpenAI Error:", error);
    throw new Error(`Failed to generate learning path: ${error.message}`);
  }
}