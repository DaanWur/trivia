export class EntityError extends Error {
    constructor(message?: string) {
        super(message);
        this.name = 'EntityError';
    }
}

export class NotFoundError extends EntityError {
    constructor(message?: string) {
        super(message ?? 'Not found');
        this.name = 'NotFoundError';
    }
}

export class DuplicateError extends EntityError {
    constructor(message?: string) {
        super(message ?? 'Duplicate entity');
        this.name = 'DuplicateError';
    }
}

export class InvalidOperationError extends EntityError {
    constructor(message?: string) {
        super(message ?? 'Invalid operation');
        this.name = 'InvalidOperationError';
    }
}
