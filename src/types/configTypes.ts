/**
 * Configuration options for the RateLimitService.
 */
export interface RateLimitConfig {
    maxRequests: number; // Max requests allowed
    perHours: number;    // Within this number of hours
    enableBackoff?: boolean; // Optional: Whether to implement backoff on 429 errors
}

export type ApiKeyMode = 'query' | 'header' | 'basic';

/**
 * Configuration options for the CongressGovService.
 */
export interface CongressGovConfig {
    apiKey: string;     // API key for api.data.gov
    baseUrl: string;    // Base URL for the Congress.gov API
    timeout: number;    // Request timeout in milliseconds
    /**
     * How to pass the api.data.gov API key.
     * - query: append as `api_key` query parameter (current behavior)
     * - header: send as `X-Api-Key` header
     * - basic: HTTP Basic Auth username = api key (empty password)
     */
    apiKeyMode?: ApiKeyMode;
    /** Header name used when apiKeyMode=header. Defaults to X-Api-Key. */
    apiKeyHeaderName?: string;
}

// Add other configuration interfaces as needed
