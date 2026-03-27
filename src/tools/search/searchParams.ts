import { z } from 'zod';

export const TOOL_NAME = "congress_search";

export const TOOL_DESCRIPTION = `Searches or lists items within a specified Congress.gov collection (e.g., 'bill', 'member').

**Best-practice workflow (for maximum retrieval quality):**
1) Use **congress_search** to find the correct entity and extract its identifiers (e.g., memberId, or bill congress/type/number).
2) Use **congress_getSubResource** with a *real* parentUri (not guessed) to fetch related lists (actions, text, cosponsors, etc.).

**Rate limits & gateway behavior (api.data.gov):**
- The upstream gateway may return **X-RateLimit-Limit** / **X-RateLimit-Remaining** headers (this server will surface a snapshot after calls).
- Standard gateway error codes may appear in responses: API_KEY_MISSING / API_KEY_INVALID / API_KEY_DISABLED / API_KEY_UNAUTHORIZED / API_KEY_UNVERIFIED / OVER_RATE_LIMIT.

**Important limitation:**
Filtering by 'congress' using the 'filters' parameter is **NOT SUPPORTED** by the underlying API for general collection lists (e.g., /v3/bill) and will be ignored; congress-specific filtering typically requires a different path shape.`;

// Define allowed collections based on API documentation
const SearchableCollectionEnum = z.enum([
    'bill',
    'amendment',
    'committee-report',
    'committee',
    'committee-print',
    'congressional-record',
    'daily-congressional-record',
    'bound-congressional-record',
    'house-communication',
    'senate-communication',
    'nomination',
    'treaty',
    'member' // Added member based on API docs
]).describe("REQUIRED: The specific collection within Congress.gov to search (e.g., 'bill', 'member', 'committee'). Determines the API endpoint used (e.g., /v3/bill, /v3/member).");

// Define allowed sort orders
const SortOrderEnum = z.enum([
    'updateDate+asc',
    'updateDate+desc'
]).describe("OPTIONAL: Specifies the sort order based on the update date. 'updateDate+asc' for ascending (oldest first), 'updateDate+desc' for descending (newest first). If omitted, API default sorting applies (usually descending).");

// Define optional filters (can be expanded based on API capabilities per collection)
// NOTE: Filtering by 'congress' using this filter object is NOT supported by the underlying API for base collection searches (e.g., /v3/bill).
// The API ignores the 'congress' query parameter in these cases. Congress filtering typically happens via the URL path (e.g., /v3/bill/117), which this tool does not construct.
const SearchFiltersSchema = z.object({
    type: z.string().optional()
        .describe("OPTIONAL: Filter by a specific type within the collection (e.g., for 'bill' collection, use 'hr', 's', 'hres'; for 'committee-report', use 'hrpt', 'srpt'). Check API docs for valid types per collection."),
    fromDateTime: z.string().datetime({ message: 'Must be a valid ISO 8601 datetime string, e.g., YYYY-MM-DDTHH:MM:SSZ' }).optional()
        .describe("OPTIONAL: Filter results updated *after* this timestamp (inclusive). Format: YYYY-MM-DDTHH:MM:SSZ (e.g., '2023-01-01T00:00:00Z'). Check API docs for which collections support this filter."),
    toDateTime: z.string().datetime({ message: 'Must be a valid ISO 8601 datetime string, e.g., YYYY-MM-DDTHH:MM:SSZ' }).optional()
        .describe("OPTIONAL: Filter results updated *before* this timestamp (inclusive). Format: YYYY-MM-DDTHH:MM:SSZ (e.g., '2023-12-31T23:59:59Z'). Check API docs for which collections support this filter.")
}).strict().describe("OPTIONAL: An object containing specific filters to apply to the search. Availability of filters depends on the selected 'collection'. Check Congress.gov API documentation for supported filters per collection.");

// Define the main search parameters schema
export const TOOL_PARAMS = {
    collection: SearchableCollectionEnum,
    query: z.string().min(1).optional()
        .describe("OPTIONAL: The search keyword(s) or query string. If omitted, typically returns a list of all items in the collection, subject to filters and pagination."),
    filters: SearchFiltersSchema.optional(),
    limit: z.number().int().min(1).max(250).optional()
        .describe("OPTIONAL: The maximum number of results to return per page. Default is usually 20, maximum is 250. Example: 50"),
    offset: z.number().int().min(0).optional()
        .describe("OPTIONAL: The starting record number for pagination. 0 is the first record. Use with 'limit' to page through results. Example: 100 (to get the third page if limit is 50)"),
    sort: SortOrderEnum.optional()
};

// Define the input type for the tool's handler function for type safety
export type CongressSearchParams = z.infer<z.ZodObject<typeof TOOL_PARAMS>>;
