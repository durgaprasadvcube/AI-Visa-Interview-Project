export interface VisaQuestion {
    id: number | string;
    category: string;
    question: string;
    tips: string;
    timeSeconds: number;
}

export const SAMPLE_VISA_QUESTIONS: VisaQuestion[] = [
    {
        id: 1,
        category: 'University Choice',
        question: 'Why did you choose this particular university for your studies?',
        tips: 'Mention specific programs, faculty, research opportunities, or rankings.',
        timeSeconds: 45,
    },
    {
        id: 2,
        category: 'Course Selection',
        question: 'Why did you choose this specific course or program of study?',
        tips: 'Explain how it aligns with your career goals and past experience.',
        timeSeconds: 45,
    },
    {
        id: 3,
        category: 'Financial',
        question: 'How will you fund your studies and living expenses abroad?',
        tips: 'Be specific about scholarships, family support, or savings. Mention amounts if possible.',
        timeSeconds: 40,
    },
    {
        id: 4,
        category: 'Return Intent',
        question: 'What are your plans after completing your studies?',
        tips: 'Focus on returning home, contributing to your country, or future career plans.',
        timeSeconds: 45,
    },
    {
        id: 5,
        category: 'Academic Background',
        question: 'Tell me about your academic background and how it prepares you for this program.',
        tips: 'Highlight relevant grades, projects, internships, or research.',
        timeSeconds: 45,
    },
    {
        id: 6,
        category: 'Language Proficiency',
        question: 'How proficient are you in the language of instruction? Have you taken any tests?',
        tips: 'Mention IELTS, TOEFL, or other scores. Explain how you plan to improve if needed.',
        timeSeconds: 35,
    },
    {
        id: 7,
        category: 'Country Choice',
        question: 'Why did you choose this particular country to study in?',
        tips: 'Mention education quality, cultural exposure, employment prospects, or safety.',
        timeSeconds: 40,
    },
    {
        id: 8,
        category: 'Ties to Home Country',
        question: 'What ties do you have to your home country that will ensure your return?',
        tips: 'Mention family, job offers, property, or community connections.',
        timeSeconds: 40,
    },
    {
        id: 9,
        category: 'Career Goals',
        question: 'What are your long-term career goals and how does this degree help you achieve them?',
        tips: 'Be specific, realistic, and show how the degree is a stepping stone.',
        timeSeconds: 45,
    },
    {
        id: 10,
        category: 'Preparation',
        question: 'How have you prepared for studying and living in a foreign country?',
        tips: 'Mention research, language learning, community connections abroad, or prior travel.',
        timeSeconds: 40,
    },
];
