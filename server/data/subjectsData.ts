import { InsertSubject } from "@shared/schema";

export const subjectsData: InsertSubject[] = [
  {
    name: "english",
    displayName: "English",
    color: "#4f46e5", // Indigo
    icon: "book"
  },
  {
    name: "mathematics",
    displayName: "Mathematics",
    color: "#0891b2", // Cyan
    icon: "calculator"
  },
  {
    name: "science",
    displayName: "Science",
    color: "#16a34a", // Green
    icon: "flask"
  },
  {
    name: "socialscience",
    displayName: "Social Science",
    color: "#b91c1c", // Red
    icon: "globe"
  },
  {
    name: "hindi",
    displayName: "Hindi",
    color: "#ea580c", // Orange
    icon: "pencil"
  }
];

// Each subject's chapters
export const chaptersData = {
  "English": [
    "First Flight: A Letter to God",
    "First Flight: Nelson Mandela: Long Walk to Freedom",
    "First Flight: Two Stories about Flying",
    "First Flight: From the Diary of Anne Frank",
    "First Flight: The Hundred Dresses—I",
    "First Flight: The Hundred Dresses—II",
    "First Flight: Glimpses of India",
    "First Flight: Mijbil the Otter",
    "First Flight: Madam Rides the Bus",
    "First Flight: The Sermon at Benares",
    "First Flight: The Proposal",
    "Footprints without Feet: A Triumph of Surgery",
    "Footprints without Feet: The Thief's Story",
    "Footprints without Feet: The Midnight Visitor",
    "Footprints without Feet: A Question of Trust",
    "Footprints without Feet: Footprints without Feet",
    "Footprints without Feet: The Making of a Scientist",
    "Footprints without Feet: The Necklace",
    "Footprints without Feet: The Hack Driver",
    "Footprints without Feet: Bholi",
    "Grammar and Writing Skills",
    "Reading Comprehension"
  ],
  "Mathematics": [
    "Real Numbers",
    "Polynomials",
    "Pair of Linear Equations in Two Variables",
    "Quadratic Equations",
    "Arithmetic Progressions",
    "Triangles",
    "Coordinate Geometry",
    "Introduction to Trigonometry",
    "Some Applications of Trigonometry",
    "Circles",
    "Constructions",
    "Areas Related to Circles",
    "Surface Areas and Volumes",
    "Statistics",
    "Probability"
  ],
  "Science": [
    "Chemical Reactions and Equations",
    "Acids, Bases and Salts",
    "Metals and Non-metals",
    "Carbon and its Compounds",
    "Periodic Classification of Elements",
    "Life Processes",
    "Control and Coordination",
    "How do Organisms Reproduce?",
    "Heredity and Evolution",
    "Light – Reflection and Refraction",
    "Human Eye and Colorful World",
    "Electricity",
    "Magnetic Effects of Electric Current",
    "Sources of Energy",
    "Our Environment",
    "Management of Natural Resources"
  ],
  "Social Science": [
    "The Rise of Nationalism in Europe",
    "Nationalism in India",
    "The Making of a Global World",
    "The Age of Industrialisation",
    "Print Culture and the Modern World",
    "Resources and Development",
    "Forest and Wildlife Resources",
    "Water Resources",
    "Agriculture",
    "Minerals and Energy Resources",
    "Manufacturing Industries",
    "Lifelines of National Economy",
    "Power Sharing",
    "Federalism",
    "Democracy and Diversity",
    "Gender, Religion and Caste",
    "Popular Struggles and Movements",
    "Political Parties",
    "Outcomes of Democracy",
    "Challenges to Democracy",
    "Development",
    "Sectors of the Indian Economy",
    "Money and Credit",
    "Globalisation and the Indian Economy",
    "Consumer Rights"
  ],
  "Hindi": [
    "क्षितिज: सूरदास - पद",
    "क्षितिज: तुलसीदास - राम-लक्ष्मण-परशुराम संवाद",
    "क्षितिज: देव - सवैये",
    "क्षितिज: जयशंकर प्रसाद - आत्मकथ्य",
    "क्षितिज: सूर्यकांत त्रिपाठी निराला - उत्साह और अट नहीं रही है",
    "क्षितिज: नागार्जुन - यह दंतुरित मुसकान और फसल",
    "क्षितिज: गिरिजाकुमार माथुर - छाया मत छूना",
    "क्षितिज: ऋतुराज - कन्यादान",
    "क्षितिज: मंगलेश डबराल - संगतकार",
    "क्षितिज: स्वयं प्रकाश - नेताजी का चश्मा",
    "क्षितिज: रामवृक्ष बेनीपुरी - बालगोबिन भगत",
    "क्षितिज: शरद जोशी - माता का अंचल",
    "क्षितिज: हजारीप्रसाद द्विवेदी - नाना साहब की पुत्री देवी मैना को भस्म कर दिया गया",
    "क्षितिज: सवेश्वरदयाल सक्सेना - मानवीय करुणा की दिव्य चमक",
    "क्षितिज: मन्नू भंडारी - एक कहानी यह भी",
    "क्षितिज: महावीरप्रसाद द्विवेदी - स्त्री शिक्षा के विरोधी कुतर्कों का खंडन",
    "क्षितिज: यतीन्द्र मिश्र - नौबतखाने में इबादत",
    "कृतिका: माता का अँचल",
    "कृतिका: जॉर्ज पंचम की नाक",
    "कृतिका: साना-साना हाथ जोड़ि",
    "कृतिका: एही ठैया झुलनी हेरानी हो रामा",
    "कृतिका: मैं क्यों लिखता हूँ",
    "व्याकरण और रचना"
  ]
};

// Helper function to generate test dates (starting from today)
export function generateTestDates(startDaysFromNow: number = 0, count: number = 30): Date[] {
  const dates: Date[] = [];
  const today = new Date();
  
  for (let i = 0; i < count; i++) {
    const date = new Date();
    date.setDate(today.getDate() + startDaysFromNow + i);
    date.setHours(0, 0, 0, 0);
    dates.push(date);
  }
  
  return dates;
}