import axios from 'axios';
import * as fs from 'fs';
import _ from 'lodash';
import { NotFoundError } from '../entities/Errors/errors.ts';

export default class QuestionService {
    private apiUrl: string = 'https://opentdb.com/api.php';

    async getQuestionsFromApi(
        amountToFetch: number,
        difficulty?: string,
        type?: 'multiple' | 'boolean'
    ) {
        try {
            const url = new URL(this.apiUrl);
            url.searchParams.append('amount', amountToFetch.toString());
            if (difficulty) {
                url.searchParams.append('difficulty', difficulty);
            }
            if (type) {
                url.searchParams.append('type', type);
            }

            const res = await axios.get(url.toString());
            if (res.status !== 200) {
                throw new Error('Failed to fetch questions');
            }
            const data = await res.data;
            const shuffled = _.shuffle(data.results);
            return shuffled;
        } catch (error) {
            console.error('Error fetching questions from API:', error);
            throw new NotFoundError('Failed to fetch questions');
        }
    }

    async readQuestionsFromJson(filePath: string) {
        try {
            const data = await fs.promises.readFile(filePath, 'utf-8');
            const { questions } = JSON.parse(data);

            const shuffled = _.shuffle(questions);
            return shuffled;
        } catch (error) {
            const message = `Could not read questions from the specified file. ${error}`;
            console.error('Error reading questions from JSON:', message);
            throw new NotFoundError(message);
        }
    }
}
