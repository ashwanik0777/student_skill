import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function FAQPage() {
  const faqItems = [
    {
      question: "What is TestPrep?",
      answer: "TestPrep is an educational platform designed specifically for 10th-grade students. It provides subject-specific tests, personalized learning paths, and comprehensive performance tracking to help students excel in their studies."
    },
    {
      question: "How do tests work?",
      answer: "Each test contains approximately 30 questions based on your grade 10 curriculum. Tests are timed and you'll receive immediate feedback on your performance. Our AI analyzes your results to identify strengths and areas for improvement."
    },
    {
      question: "How are questions generated?",
      answer: "Our questions are generated using advanced AI technology that follows the NCERT syllabus for 10th grade. Each question is designed to test your understanding of concepts and application of knowledge across different subjects."
    },
    {
      question: "What subjects are covered?",
      answer: "TestPrep covers all major subjects in the 10th-grade curriculum including Mathematics, Science (Physics, Chemistry, Biology), English, and Social Studies. We regularly update our question bank to align with the latest syllabus."
    },
    {
      question: "How does the learning path work?",
      answer: "After taking tests, our AI analyzes your performance to create a personalized learning path. This includes recommended topics to study, resources to use, and specific areas to focus on for improvement based on your unique strengths and weaknesses."
    },
    {
      question: "What are streaks and badges?",
      answer: "Streaks track your daily test completion consistency. Badges are awards you earn for various achievements like completing tests, maintaining streaks, improving scores, and mastering subjects. They help make learning more engaging and motivating."
    },
    {
      question: "Can I take a test again?",
      answer: "Yes! You can retake tests to improve your understanding and performance. However, for daily tests, you'll need to wait until the next day for a new set of questions on the same topic."
    },
    {
      question: "How is my performance tracked?",
      answer: "TestPrep tracks various metrics including your scores, time spent, correct answers, improvement over time, and subject-specific performance. You can view detailed analytics on your dashboard and results pages."
    },
    {
      question: "Is my data secure?",
      answer: "Yes, we take data security very seriously. All user data is encrypted and stored securely. We do not share your personal information or performance data with third parties without your consent."
    },
    {
      question: "How do I contact support?",
      answer: "For any technical issues or queries, you can reach out to our support team by clicking on the 'Help' button in your profile section or by emailing support@testprep.edu. We aim to respond within 24 hours."
    }
  ];

  return (
    <div className="container mx-auto py-16 px-4 max-w-4xl">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2 text-primary">Frequently Asked Questions</h1>
        <p className="text-gray-600">
          Find answers to common questions about TestPrep
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">General Questions</CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {faqItems.map((item, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left font-medium">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-gray-600">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      <div className="mt-12 text-center">
        <h2 className="text-xl font-semibold mb-4">Still have questions?</h2>
        <p className="text-gray-600 mb-6">
          If you couldn't find an answer to your question, feel free to contact our support team.
        </p>
        <button className="bg-primary text-white px-6 py-3 rounded-md hover:bg-primary/90 transition-colors">
          Contact Support
        </button>
      </div>
    </div>
  );
}