import type { ID } from './types.js';
import { v4 as uuidv4 } from 'uuid';

export class User {
    id: ID;
    createdAt: string;

    constructor() {
        this.id = uuidv4();
        this.createdAt = new Date().toISOString();
    }
}
