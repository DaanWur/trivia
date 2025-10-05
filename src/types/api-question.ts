// CR: should have you used some type of verification for questions from the API, like zod
export type ApiQuestion = {
    type: 'multiple' | 'boolean';
    difficulty: 'easy' | 'medium' | 'hard';
    category: string;
    question: string;
    correct_answer: string;
    incorrect_answers: string[];
};
