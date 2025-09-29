import type { ID } from './types.js';
import { v4 as uuidv4 } from 'uuid';

export class Category {
    id: ID;
    name: string;
    private static byId: Map<ID, Category> = new Map();
    private static byName: Map<string, Category> = new Map();

    constructor(id: ID, name: string) {
        this.id = id;
        this.name = name;
    }

    static getById(id: ID): Category | undefined {
        return Category.byId.get(id);
    }

    static getByName(name: string): Category | undefined {
        return Category.byName.get(name);
    }

    static findOrCreateByName(name: string): Category {
        const existingByName = Category.byName.get(name);
        if (existingByName) {
            return existingByName;
        }
        return Category.createCategory(name);
    }

    private static createCategory(name: string) {
        const newId = uuidv4();
        const c = new Category(newId, name);
        Category.byId.set(newId, c);
        Category.byName.set(name, c);
        return c;
    }
}
