import type { ID } from "./types.js";
import { DuplicateError, NotFoundError } from "./Errors/errors.js";
import { v4 as uuidv4 } from "uuid";

export class Category {
  id: ID;
  name: string;
  private static byId: Map<ID, Category> = new Map();
  private static byName: Map<string, Category> = new Map();

  constructor(id: ID, name: string) {
    this.id = id;
    this.name = name;
  }

  toJSON() {
    return { id: this.id, name: this.name };
  }

  static getById(id: ID): Category | undefined {
    return Category.byId.get(id);
  }

  static getByIdOrThrow(id: ID): Category {
    const c = Category.getById(id);
    if (!c) throw new NotFoundError(`Category with id=${id} not found`);
    return c;
  }

  static getByName(name: string): Category | undefined {
    return Category.byName.get(name);
  }

  static getByNameOrThrow(name: string): Category {
    const c = Category.getByName(name);
    if (!c) throw new NotFoundError(`Category with name='${name}' not found`);
    return c;
  }

  static getOrCreate(id: ID, name: string): Category {
    const existingById = Category.byId.get(id);

    if (existingById) {
      // if name differs, that's a conflict
      if (existingById.name !== name) {
        throw new DuplicateError(
          `Category id=${id} already exists with a different name ('${existingById.name}' != '${name}')`
        );
      }
      return existingById;
    }

    const existingByName = Category.byName.get(name);

    if (existingByName) {
      // if id differs, that's a conflict
      if (existingByName.id !== id) {
        throw new DuplicateError(
          `Category name='${name}' already exists with a different id (${existingByName.id} != ${id})`
        );
      }
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

  static all(): Category[] {
    return Array.from(Category.byId.values());
  }
}
