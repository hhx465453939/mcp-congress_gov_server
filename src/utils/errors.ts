/**
* Base custom error class for application-specific errors.
*/
export class BaseError extends Error {
    public code: string; // Removed readonly
    public status: number; // Removed readonly
    public details?: unknown; // Removed readonly

    constructor(message: string, code: string, status: number, details?: unknown) {
        super(message);
        this.name = this.constructor.name; // Set the error name to the class name
        this.code = code;
        this.status = status;
        this.details = details;
        // Capture stack trace (excluding constructor)
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Error for invalid parameters passed to a function or tool.
 * Maps typically to a 400 Bad Request or MCP InvalidParams.
 */
export class InvalidParameterError extends BaseError {
    constructor(message: string, details?: unknown) {
        super(message, 'INVALID_PARAMETER', 400, details);
    }
}

/**
 * Error for validation failures (e.g., invalid input).
 * Maps typically to a 400 Bad Request or MCP InvalidParams.
 */
export class ValidationError extends BaseError {
    constructor(message: string, details?: unknown) {
        super(message, 'VALIDATION_ERROR', 400, details);
    }
}

/**
 * Error when an expected entity or resource is not found.
 * Maps typically to a 404 Not Found.
 */
export class NotFoundError extends BaseError {
    constructor(message: string = "Resource not found") {
        super(message, 'NOT_FOUND', 404);
    }
}

/**
 * Error for configuration problems.
 */
export class ConfigurationError extends BaseError {
    constructor(message: string) {
        super(message, 'CONFIG_ERROR', 500);
    }
}

/**
 * Error for issues during service processing unrelated to input validation.
 * Maps typically to a 500 Internal Server Error or MCP InternalError.
 */
export class ServiceError extends BaseError {
    constructor(message: string, details?: unknown) {
        super(message, 'SERVICE_ERROR', 500, details);
    }
}

// --- Resource Specific Errors ---

/**
 * Base error for MCP resource handling issues.
 */
export class ResourceError extends BaseError {
    constructor(message: string, details?: unknown) {
        // Using 500 as a default, specific handlers might map differently
        super(message, 'RESOURCE_ERROR', 500, details);
    }
}

/**
 * Error when a specific MCP resource URI cannot be found or matched.
 * Extends ResourceError.
 */
export class ResourceNotFoundError extends ResourceError {
    constructor(message: string = "MCP Resource not found") {
        // Call ResourceError constructor (which calls BaseError)
        super(message); // Assuming ResourceError just needs message
        this.name = 'ResourceNotFoundError';
        this.code = 'RESOURCE_NOT_FOUND'; // Set specific code
        this.status = 404; // Set specific status
    }
}


// --- API Specific Errors ---

/**
 * Error specifically for failures when interacting with the Congress.gov API.
 */
export class ApiError extends BaseError {
    public readonly statusCode: number; // Store the original HTTP status code

    constructor(message: string, statusCode: number, details?: unknown) {
        // Call BaseError constructor directly with all args
        super(message, 'API_ERROR', statusCode, details);
        this.name = 'ApiError'; // Ensure name is correct
        this.statusCode = statusCode;
    }
}

/**
 * Error for when the Congress.gov API rate limit is exceeded.
 */
export class RateLimitError extends ApiError {
    constructor(message: string = "Rate limit exceeded") {
        // Call the ApiError constructor
        super(message, 429, undefined); // Pass undefined for details
        this.name = 'RateLimitError'; // Override name
    }
}

/**
 * Error for standardized api.data.gov (API Umbrella) gateway errors.
 * These include API_KEY_* and OVER_RATE_LIMIT codes described in the developer manual.
 */
export class ApiDataGovError extends ApiError {
    public readonly gatewayCode: string;

    constructor(message: string, statusCode: number, gatewayCode: string, details?: unknown) {
        super(message, statusCode, details);
        this.name = 'ApiDataGovError';
        this.gatewayCode = gatewayCode;
        this.code = gatewayCode; // Override BaseError code to match gateway code for easier routing/logging
    }
}


// Add other specific error types as needed (e.g., DatabaseError, AuthenticationError)
