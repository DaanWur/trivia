import { Question } from "./question.js";

export class TrueFalse extends Question {
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
    labelFalse: string = "False"
  ) {
    super(text, categoryName, "true-false", points);
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
