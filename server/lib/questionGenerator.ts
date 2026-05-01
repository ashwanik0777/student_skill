import OpenAI from "openai";
import { log } from "../vite";
import { InsertQuestion } from "@shared/schema";
import { loadEnv } from "./env";

// Initialize OpenAI with API key
loadEnv();
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  throw new Error("Missing OPENAI_API_KEY in environment. Check your .env file.");
}
const openai = new OpenAI({
  apiKey
});

// Interface for the question format expected from OpenAI
interface AIGeneratedQuestion {
  question: string;
  options: string[];
  correctOption: number; // 0-based index
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
  topic: string; // Topic within the chapter
  importance: "high" | "medium" | "low"; // Importance level of the topic
}

interface GenerateQuestionOptions {
  subject: string;
  chapter?: string;
  difficulty?: "easy" | "medium" | "hard";
  prioritizeImportantTopics?: boolean;
}

// Key important topics for different subjects to prioritize when generating questions
const importantTopics: Record<string, Record<string, string[]>> = {
  "Mathematics": {
    "Real Numbers": ["Euclid's Division Lemma", "Fundamental Theorem of Arithmetic", "Irrational Numbers"],
    "Polynomials": ["Zeros of Polynomials", "Relationship between Zeros and Coefficients", "Division Algorithm"],
    "Quadratic Equations": ["Quadratic Formula", "Nature of Roots", "Relationship between Discriminant and Nature of Roots"],
    "Arithmetic Progressions": ["nth Term of an AP", "Sum of n Terms of an AP", "Applications of AP"],
    "Triangles": ["Similarity of Triangles", "Pythagoras Theorem", "Areas of Similar Triangles"],
    "Coordinate Geometry": ["Distance Formula", "Section Formula", "Area of Triangle"],
    "Trigonometry": ["Trigonometric Ratios", "Trigonometric Identities", "Heights and Distances"],
    "Circles": ["Tangent to a Circle", "Number of Tangents from a Point to a Circle"],
    "Areas Related to Circles": ["Area of Circle", "Area of Sector and Segment"],
    "Surface Areas and Volumes": ["Surface Area of Combination of Solids", "Volume of Combination of Solids"],
    "Statistics": ["Mean, Median and Mode", "Cumulative Frequency"],
    "Probability": ["Classical Definition of Probability", "Simple Problems on Single Events"]
  },
  "Science": {
    "Chemical Reactions and Equations": ["Balancing Chemical Equations", "Types of Chemical Reactions", "Oxidation and Reduction"],
    "Acids, Bases and Salts": ["Properties of Acids and Bases", "pH Scale", "Important Chemical Compounds"],
    "Metals and Non-metals": ["Properties of Metals and Non-metals", "Metal Reactivity Series", "Ionic Bond Formation"],
    "Carbon and its Compounds": ["Covalent Bonding", "Homologous Series", "Important Carbon Compounds"],
    "Periodic Classification of Elements": ["Modern Periodic Table", "Trends in the Periodic Table"],
    "Life Processes": ["Nutrition", "Respiration", "Transportation", "Excretion"],
    "Control and Coordination": ["Nervous System", "Hormones in Animals", "Coordination in Plants"],
    "Heredity and Evolution": ["Mendel's Laws of Inheritance", "Sex Determination", "Evolution"],
    "Light – Reflection and Refraction": ["Laws of Reflection", "Spherical Mirrors", "Refractive Index", "Lens Formula"],
    "Electricity": ["Ohm's Law", "Resistors in Series and Parallel", "Electric Power"],
    "Magnetic Effects of Electric Current": ["Magnetic Field due to Current", "Electric Motor", "Electromagnetic Induction"]
  },
  "Social Science": {
    "The Rise of Nationalism in Europe": ["The French Revolution", "The Making of Germany and Italy", "Nationalism and Imperialism"],
    "Nationalism in India": ["The First World War and Khilafat Movement", "Non-Cooperation Movement", "Civil Disobedience Movement"],
    "Resources and Development": ["Types of Resources", "Resource Conservation", "Land Degradation and Conservation Measures"],
    "Agriculture": ["Types of Farming", "Major Crops", "Food Security"],
    "Manufacturing Industries": ["Classification of Industries", "Industrial Pollution and Environmental Degradation"],
    "Democracy and Diversity": ["Differences, Similarities, Divisions", "Politics of Social Divisions"],
    "Political Parties": ["Necessity of Political Parties", "National and Regional Parties", "Challenges to Political Parties"],
    "Development": ["Different Perspectives on Development", "Human Development Indicators"]
  }
};

/**
 * Generate multiple questions for a specific subject and chapter with importance-based distribution
 */
export async function generateQuestionsForTest(
  subjectId: number,
  subjectName: string, 
  chapter: string, 
  count: number = 30,
  prioritizeImportantTopics: boolean = true
): Promise<InsertQuestion[]> {
  const questions: InsertQuestion[] = [];
  
  // Set difficulty distribution
  const difficultyDistribution = {
    easy: Math.floor(count * 0.3), // 30% easy
    medium: Math.floor(count * 0.5), // 50% medium
    hard: Math.floor(count * 0.2), // 20% hard
  };

  // Adjust if rounding caused fewer questions
  const totalAllocated = difficultyDistribution.easy + difficultyDistribution.medium + difficultyDistribution.hard;
  if (totalAllocated < count) {
    difficultyDistribution.medium += (count - totalAllocated);
  }

  try {
    // Generate questions with each difficulty level
    for (const [difficulty, questionCount] of Object.entries(difficultyDistribution)) {
      if (questionCount <= 0) continue;
      
      // Generate questions with importance distribution
      const generatedQuestions = await generateBatchQuestions({
        subject: subjectName,
        chapter: chapter,
        difficulty: difficulty as "easy" | "medium" | "hard",
        count: questionCount,
        prioritizeImportantTopics: prioritizeImportantTopics
      });

      // Convert to InsertQuestion format and add to array
      for (const q of generatedQuestions) {
        // Create topics array with both chapter and specific topic
        const topicsArray = [chapter];
        if (q.topic && !topicsArray.includes(q.topic)) {
          topicsArray.push(q.topic);
        }
        
        questions.push({
          subjectId,
          text: q.question,
          options: JSON.stringify(q.options),
          correctOption: q.correctOption,
          explanation: q.explanation,
          difficulty: getDifficultyScore(difficulty as "easy" | "medium" | "hard"),
          topics: JSON.stringify(topicsArray),
          createdAt: new Date()
        });
      }
    }
  } catch (error) {
    log(`Error generating questions for ${chapter}: ${error}`, "questionGenerator");
  }

  return questions;
}

/**
 * Instantly generate a test for a specific chapter
 * This is optimized for speed to generate tests within seconds of selection
 */
export async function generateChapterTestInstantly(
  subjectId: number,
  subjectName: string,
  chapter: string,
  count: number = 30
): Promise<InsertQuestion[]> {
  try {
    log(`Instantly generating test for ${subjectName} - ${chapter}`, "questionGenerator");
    
    // Use a more efficient prompt strategy for faster generation
    const questions = await generateBatchQuestionsOptimized({
      subject: subjectName,
      chapter: chapter,
      count: count
    });
    
    // Convert to InsertQuestion format
    return questions.map(q => {
      const topicsArray = [chapter];
      if (q.topic && !topicsArray.includes(q.topic)) {
        topicsArray.push(q.topic);
      }
      
      return {
        subjectId,
        text: q.question,
        options: JSON.stringify(q.options),
        correctOption: q.correctOption,
        explanation: q.explanation,
        difficulty: getDifficultyScore(q.difficulty),
        topics: JSON.stringify(topicsArray),
        createdAt: new Date()
      };
    });
  } catch (error) {
    log(`Error generating instant test for ${chapter}: ${error}`, "questionGenerator");
    throw error;
  }
}

/**
 * Optimized version of question generation for instant test creation
 * Uses a single API call with a specialized prompt
 */
async function generateBatchQuestionsOptimized({
  subject,
  chapter,
  count = 30,
}: {
  subject: string;
  chapter: string;
  count: number;
}): Promise<AIGeneratedQuestion[]> {
  // Get important topics for this chapter if available
  const subjectTopics = importantTopics[subject] || {};
  const chapterImportantTopics = subjectTopics[chapter] || [];
  
  // Build an optimized prompt focusing on speed and important topics
  let contextPrompt = `Generate ${count} high-quality multiple-choice questions (MCQs) about the chapter "${chapter}" from ${subject} for Class 10 CBSE NCERT curriculum.`;
  
  if (chapterImportantTopics.length > 0) {
    contextPrompt += ` Prioritize these important topics: ${chapterImportantTopics.join(", ")}.`;
    contextPrompt += ` At least 60% of questions should be on these important topics.`;
  }
  
  contextPrompt += ` Include previous years' question patterns where appropriate.`;
  contextPrompt += ` Mix difficulty levels with approximately 30% easy, 50% medium, and 20% hard questions.`;
  contextPrompt += ` Each question must have exactly 4 options (A, B, C, D), with one correct answer.`;
  contextPrompt += ` For each question, specify: difficulty level (easy/medium/hard), the specific topic within the chapter, and importance level (high/medium/low).`;
  contextPrompt += ` Provide the answer as the index (0-based) of the correct option and include a concise explanation.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: `You are an expert CBSE 10th grade teacher and assessment creator specializing in ${subject}. Create precise NCERT curriculum-aligned questions that effectively test conceptual understanding, application of knowledge, and critical thinking. Focus on important topics that frequently appear in board exams. Respond only with the JSON containing the questions array.`
        },
        {
          role: "user",
          content: contextPrompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.5, // Lower temperature for more predictable output
      max_tokens: 4000, // Increase token limit for longer responses
    });

    // Parse the response
    const responseText = response.choices[0].message.content;
    if (!responseText) {
      throw new Error("Empty response from OpenAI");
    }

    // Parse the JSON response
    const parsedResponse = JSON.parse(responseText);
    if (!parsedResponse.questions || !Array.isArray(parsedResponse.questions)) {
      throw new Error("Invalid response format from OpenAI");
    }

    return parsedResponse.questions;
  } catch (error) {
    log(`OpenAI API error in optimized generation: ${error}`, "questionGenerator");
    throw error;
  }
}

/**
 * Generate a batch of questions from OpenAI with importance-based distribution
 */
async function generateBatchQuestions({
  subject,
  chapter,
  difficulty = "medium",
  count = 10,
  prioritizeImportantTopics = true
}: {
  subject: string;
  chapter?: string;
  difficulty?: "easy" | "medium" | "hard";
  count: number;
  prioritizeImportantTopics?: boolean;
}): Promise<AIGeneratedQuestion[]> {
  // Get important topics for this chapter if available
  const subjectTopics = importantTopics[subject] || {};
  const chapterImportantTopics = chapter ? (subjectTopics[chapter] || []) : [];
  
  // Build the prompt based on the subject and chapter
  let contextPrompt = `Generate ${count} multiple-choice questions (MCQs) about ${subject} for Class 10 NCERT curriculum.`;
  
  if (chapter) {
    contextPrompt += ` The questions should specifically focus on the chapter "${chapter}".`;
    
    // Add important topics if available and prioritization is enabled
    if (prioritizeImportantTopics && chapterImportantTopics.length > 0) {
      contextPrompt += ` Prioritize these important topics: ${chapterImportantTopics.join(", ")}.`;
      contextPrompt += ` At least 60% of questions should be on these important topics.`;
    }
  }
  
  contextPrompt += ` The questions should be of ${difficulty} difficulty level, suitable for 10th grade students.`;
  contextPrompt += ` Each question should have exactly 4 options, with one correct answer.`;
  contextPrompt += ` For each question, specify: the specific topic within the chapter and importance level (high/medium/low).`;
  contextPrompt += ` Provide the answer as the index (0-based) of the correct option and include a clear explanation.`;
  contextPrompt += ` Include previous years' question patterns where appropriate.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: `You are an expert in creating educational assessments for 10th grade CBSE NCERT curriculum. Generate high-quality, accurate MCQs that test conceptual understanding. Focus on important topics that frequently appear in board exams. Be precise and ensure answers are factually correct.`
        },
        {
          role: "user",
          content: contextPrompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    // Parse the response
    const responseText = response.choices[0].message.content;
    if (!responseText) {
      throw new Error("Empty response from OpenAI");
    }

    // Parse the JSON response
    const parsedResponse = JSON.parse(responseText);
    if (!parsedResponse.questions || !Array.isArray(parsedResponse.questions)) {
      throw new Error("Invalid response format from OpenAI");
    }

    return parsedResponse.questions;
  } catch (error) {
    log(`OpenAI API error: ${error}`, "questionGenerator");
    throw error;
  }
}

/**
 * Convert text difficulty to numeric score (1-3)
 */
function getDifficultyScore(difficulty: "easy" | "medium" | "hard"): number {
  switch (difficulty) {
    case "easy": return 1;
    case "medium": return 2;
    case "hard": return 3;
    default: return 2;
  }
}