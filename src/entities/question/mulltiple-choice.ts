import type Answer from "../../types/multiple-choice-asnwer.js";
import { Question } from "./question.js";

export class MultipleChoice extends Question {
  options: Map<number, Answer>;

  constructor(
    text: string,
    categoryName: string,
    points = 0,
    options: Map<number, Answer>
  ) {
    super(text, categoryName, "multiple-choice", points);
    this.options = options;
  }
  checkAnswer(userChoice: number): boolean {
    const answer = this.options.get(userChoice);
    return answer ? answer.isCorrect : false;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      options: this.options,
    };
  }
}
