class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ValidationError';
    }
}

// The value comes from a request body, which an API client can fill with any JSON value
// (docs/tickets/location-search/issues/17-small-error-and-page-fixes.md)
function validateUsername(username: unknown): void {
    if (username == undefined) throw new ValidationError('Username is required');
    if (typeof username !== 'string') throw new ValidationError('Username must be text');
    if (!username.match(/^\w+$/)) throw new ValidationError('Username can only contain alphanumeric characters and underscore');
    if (username.length < 4) throw new ValidationError('Username must be at least 4 characters long');
    if (username.length > 30) throw new ValidationError('Username must be at most 30 characters long');
}

function validatePassword(password: unknown): void {
    if (password == undefined) throw new ValidationError('Password is required');
    if (typeof password !== 'string') throw new ValidationError('Password must be text');
    if (password.length < 8) throw new ValidationError('Password must be at least 8 characters long');
    if (password.length > 128) throw new ValidationError('Password must be at most 128 characters long');
}

export {
    ValidationError,
    validateUsername,
    validatePassword
};
