import { db } from '../db';
import { subjects, tests, InsertTest } from '@shared/schema';
import { subjectsData, chaptersData, generateTestDates } from './subjectsData';
import { log } from '../vite';

/**
 * Seeds the database with subjects and chapter-wise tests
 */
export async function seedDatabase() {
  try {
    // First check if we already have subjects
    const existingSubjects = await db.select().from(subjects);
    
    if (existingSubjects.length > 0) {
      log('Subjects already exist in the database, skipping subject seeding.', 'seed');
    } else {
      // Insert all subjects
      log('Seeding subjects...', 'seed');
      await db.insert(subjects).values(subjectsData);
      log(`Added ${subjectsData.length} subjects to the database`, 'seed');
    }
    
    // Get inserted subjects to use their IDs
    const allSubjects = await db.select().from(subjects);
    
    // Check if tests already exist
    const existingTests = await db.select().from(tests);
    
    if (existingTests.length > 0) {
      log('Tests already exist in the database, skipping test seeding.', 'seed');
      return;
    }
    
    // Generate test dates starting today
    const testDates = generateTestDates(0, 60); // Generate 60 days of tests
    
    log('Seeding tests...', 'seed');
    
    // For each subject
    for (const subject of allSubjects) {
      // Find the chapters for this subject
      const subjectChapters = chaptersData[subject.displayName as keyof typeof chaptersData];
      
      if (!subjectChapters || !Array.isArray(subjectChapters)) {
        log(`No chapters found for ${subject.displayName}, skipping.`, 'seed');
        continue;
      }
      
      // For each chapter, create a test
      for (const [index, chapter] of Object.entries(subjectChapters)) {
        const chapterIndex = parseInt(index);
        // Use modulo to cycle through dates for different chapters
        const dateIndex = chapterIndex % testDates.length;
        
        const testData: InsertTest = {
          subjectId: subject.id,
          title: `${subject.displayName}: ${chapter}`,
          description: `Chapter test for ${chapter} from ${subject.displayName} syllabus.`,
          duration: 30, // 30 minutes per test
          questionCount: 30, // 30 questions per test
          isSpecial: false,
          availableAt: testDates[dateIndex]
        };
        
        await db.insert(tests).values(testData);
      }
      
      log(`Created ${subjectChapters.length} chapter tests for ${subject.displayName}`, 'seed');
    }
    
    // Create one special test per week (on Sundays) for each subject
    // These are comprehensive tests covering multiple chapters
    for (let i = 0; i < 8; i++) { // 8 weeks of special tests
      const specialTestDate = new Date();
      specialTestDate.setDate(specialTestDate.getDate() + (7 * i) + (7 - specialTestDate.getDay())); // Next Sunday
      specialTestDate.setHours(0, 0, 0, 0);
      
      for (const subject of allSubjects) {
        const specialTest: InsertTest = {
          subjectId: subject.id,
          title: `${subject.displayName} Comprehensive Test #${i + 1}`,
          description: `Special comprehensive test covering multiple chapters from the ${subject.displayName} syllabus.`,
          duration: 60, // 60 minutes for special tests
          questionCount: 50, // 50 questions for special tests
          isSpecial: true,
          availableAt: specialTestDate
        };
        
        await db.insert(tests).values(specialTest);
      }
    }
    
    log('Database seeding completed successfully!', 'seed');
  } catch (error) {
    log(`Error seeding database: ${error}`, 'seed');
    throw error;
  }
}