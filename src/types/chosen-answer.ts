// CR: this is a weird class, especially combined with the "multiple-choice-answer" type
export type ChosenAnswer = {
    correct: boolean;
    choice?: number | boolean | undefined;
};
