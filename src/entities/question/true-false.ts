import { Question } from "./question.js";

export class BooleanQuestion extends Question {
  // the canonical correct answer for this question
  correctAnswer: boolean;
  // optional labels for the boolean choices
  labelTrue: string | undefined;
  labelFalse: string | undefined;

  constructor(
    text: string,
    categoryName: string,
    correctAnswer: boolean,
    points = 0,
    labelTrue: string = "True",
    labelFalse: string = "False",
    difficulty?: "easy" | "medium" | "hard"
  ) {
    super(text, categoryName, "boolean", points, difficulty);
    this.correctAnswer = correctAnswer;
    this.labelTrue = labelTrue;
    this.labelFalse = labelFalse;
  }

  checkAnswer(candidate: boolean): boolean {
    return candidate === this.correctAnswer;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      correctAnswer: this.correctAnswer,
      labelTrue: this.labelTrue,
      labelFalse: this.labelFalse,
    };
  }
}
