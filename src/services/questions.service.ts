import axios from "axios";
import * as fs from "fs";

export default class GetQuestionsFromApiService {
  private apiUrl: string = "https://opentdb.com/api.php";

  async getQuestionsFromApi(
    amountToFetch: number,
    difficulty?: string,
    type?: "multiple" | "boolean"
  ) {
    const url = new URL(this.apiUrl);
    url.searchParams.append("amount", amountToFetch.toString());
    if (difficulty) {
      url.searchParams.append("difficulty", difficulty);
    }
    if (type) {
      url.searchParams.append("type", type);
    }

    const res = await axios.get(url.toString());
    if (res.status !== 200) {
      throw new Error("Failed to fetch questions");
    }
    const data = await res.data;
    return data.results;
  }

  async readQuestionsFromJson(filePath: string) {
    const data = await fs.promises.readFile(filePath, "utf-8");
    const json = JSON.parse(data);
    return json.questions;
  }
}
