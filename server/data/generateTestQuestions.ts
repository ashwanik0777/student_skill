import { db } from '../db';
import { tests, subjects, questions, testQuestions } from '@shared/schema';
import { log } from '../vite';
import { eq } from 'drizzle-orm';
import { generateQuestionsForTest } from '../lib/questionGenerator';
import { chaptersData } from './subjectsData';

/**
 * Generates questions for a specific test
 */
export async function generateQuestionsForSingleTest(testId: number) {
  // Get the test details
  const test = await db.query.tests.findFirst({
    where: eq(tests.id, testId),
  });

  if (!test) {
    log(`Test with ID ${testId} not found`, 'generateQuestions');
    return;
  }

  // Get the subject
  const subject = await db.query.subjects.findFirst({
    where: eq(subjects.id, test.subjectId),
  });

  if (!subject) {
    log(`Subject with ID ${test.subjectId} not found`, 'generateQuestions');
    return;
  }

  // Check if we already have questions for this test
  const existingTestQuestions = await db.query.testQuestions.findMany({
    where: eq(testQuestions.testId, testId),
  });

  if (existingTestQuestions.length > 0) {
    log(`Test ${test.title} already has ${existingTestQuestions.length} questions, skipping`, 'generateQuestions');
    return;
  }

  // Extract chapter from the test title (assuming format: "Subject: Chapter")
  let chapter = '';
  if (!test.isSpecial) {
    const titleParts = test.title.split(':');
    if (titleParts.length > 1) {
      chapter = titleParts[1].trim();
    }
  }

  try {
    // For special tests, generate a mix of questions from all chapters
    if (test.isSpecial) {
      log(`Generating ${test.questionCount} questions for special test: ${test.title}`, 'generateQuestions');
      
      // Get chapters for this subject
      const subjectChapters = chaptersData[subject.name as keyof typeof chaptersData];
      if (!subjectChapters || !Array.isArray(subjectChapters)) {
        log(`No chapters found for subject ${subject.name}`, 'generateQuestions');
        return;
      }

      // Calculate questions per chapter (approximately)
      const questionsPerChapter = Math.max(1, Math.floor(test.questionCount / subjectChapters.length));
      let totalQuestionsGenerated = 0;
      
      // Generate questions for each chapter
      for (const chapterName of subjectChapters) {
        if (totalQuestionsGenerated >= test.questionCount) break;
        
        // For the last chapter, generate remaining questions
        const questionsToGenerate = 
          totalQuestionsGenerated + questionsPerChapter > test.questionCount 
            ? test.questionCount - totalQuestionsGenerated 
            : questionsPerChapter;
            
        // Generate questions for this chapter
        const generatedQuestions = await generateQuestionsForTest(
          subject.id, 
          subject.displayName,
          chapterName, 
          questionsToGenerate
        );
        
        // Add questions to database
        for (const question of generatedQuestions) {
          const [insertedQuestion] = await db.insert(questions).values(question).returning();
          
          // Link question to test
          await db.insert(testQuestions).values({
            testId,
            questionId: insertedQuestion.id,
            order: totalQuestionsGenerated + 1,
          });
          
          totalQuestionsGenerated++;
        }
      }
    } 
    // For regular chapter tests
    else if (chapter) {
      log(`Generating ${test.questionCount} questions for chapter test: ${test.title}`, 'generateQuestions');
      
      // Generate questions for the specific chapter
      const generatedQuestions = await generateQuestionsForTest(
        subject.id, 
        subject.displayName,
        chapter, 
        test.questionCount
      );
      
      // Add questions to database and link to test
      for (let i = 0; i < generatedQuestions.length; i++) {
        const [insertedQuestion] = await db.insert(questions).values(generatedQuestions[i]).returning();
        
        // Link question to test
        await db.insert(testQuestions).values({
          testId,
          questionId: insertedQuestion.id,
          order: i + 1,
        });
      }
    }
    
    log(`Successfully generated questions for test: ${test.title}`, 'generateQuestions');
  } catch (error) {
    log(`Error generating questions for test ${test.title}: ${error}`, 'generateQuestions');
  }
}

/**
 * Generates questions for a specific subject
 */
export async function generateQuestionsForSubject(subjectId: number) {
  const subjectTests = await db.query.tests.findMany({
    where: eq(tests.subjectId, subjectId),
  });
  
  for (const test of subjectTests) {
    await generateQuestionsForSingleTest(test.id);
  }
}

/**
 * Generates questions for all tests in the database
 */
export async function generateAllTestQuestions() {
  const allTests = await db.select().from(tests);
  log(`Found ${allTests.length} tests, will generate questions for each`, 'generateQuestions');
  
  for (const test of allTests) {
    await generateQuestionsForSingleTest(test.id);
  }
}