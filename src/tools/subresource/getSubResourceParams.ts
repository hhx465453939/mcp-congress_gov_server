import { z } from 'zod';

export const TOOL_NAME = "congress_getSubResource";

export const TOOL_DESCRIPTION = `Fetches related data lists (sub-resources like 'actions', 'cosponsors', 'text') for a specific parent Congress.gov entity.

**Absolute prerequisite (do not guess):**
- 'parentUri' must be an exact MCP URI of the parent entity (usually obtained from **congress_search**).
- 'subResource' must be valid for the parent entity type (see list below).

**Rate limits & api.data.gov gateway:**
- If you hit upstream rate limits you may see HTTP 429 and/or gateway code **OVER_RATE_LIMIT**.
- Invalid/disabled/unverified keys may surface as gateway codes like API_KEY_INVALID / API_KEY_DISABLED / API_KEY_UNVERIFIED (this server will map these to structured errors).`;

// Define allowed sub-resource types based on API documentation, grouped by parent type
const SubResourceTypeEnum = z.enum([
    // === Bill Sub-Resources ===
    'actions',                 // Bill actions
    'amendments',              // Amendments TO the Bill
    'committees',              // Committees associated with the Bill
    'cosponsors',              // Cosponsors of the Bill
    'relatedbills',            // Bills related to the Bill
    'subjects',                // Subjects of the Bill
    'summaries',               // Summaries of the Bill
    'text',                    // Text versions of the Bill
    'titles',                  // Titles of the Bill

    // === Member Sub-Resources ===
    'sponsored-legislation',   // Legislation sponsored BY the Member
    'cosponsored-legislation', // Legislation cosponsored BY the Member

    // === Committee Sub-Resources ===
    'reports',                 // Committee Reports FROM the Committee
    'nominations',             // Nominations referred TO the Committee
    'house-communication',     // House Communications referred TO the Committee
    'senate-communication',    // Senate Communications referred TO the Committee
    'bills',                   // Bills referred TO the Committee

    // === Amendment Sub-Resources ===
    // 'actions', // Covered above
    // 'cosponsors', // Covered above
    // 'amendments', // Use 'amendments' for amendments TO this amendment
    // 'text', // Covered above

    // === Nomination Sub-Resources ===
    // 'actions', // Covered above
    // 'committees', // Covered above
    'hearings',                // Hearings related TO the Nomination

    // === Treaty Sub-Resources ===
    // 'actions', // Covered above
    // 'committees' // Covered above

]).describe(`REQUIRED: The type of related information (sub-resource) to retrieve for the parent entity specified in 'parentUri'.

**Valid Parent URI Types & Their Sub-Resources:**
*   **Bill ('congress-gov://bill/...'):** actions, amendments, committees, cosponsors, relatedbills, subjects, summaries, text, titles
*   **Member ('congress-gov://member/...'):** sponsored-legislation, cosponsored-legislation
*   **Committee ('congress-gov://committee/...'):** reports, nominations, house-communication, senate-communication, bills
*   **Amendment ('congress-gov://amendment/...'):** actions, amendments (to this amendment), cosponsors, text
*   **Nomination ('congress-gov://nomination/...'):** actions, committees, hearings
*   **Treaty ('congress-gov://treaty/...'):** actions, committees

**IMPORTANT:** You MUST provide a 'subResource' value that is valid for the type of entity specified in 'parentUri'.`);

// Define the main sub-resource parameters schema
export const TOOL_PARAMS = {
    parentUri: z.string().url()
        .startsWith('congress-gov://', { message: "Parent URI must start with 'congress-gov://'" })
        .describe("REQUIRED: The full MCP resource URI of the parent entity. Example: 'congress-gov://bill/117/hr/3076' or 'congress-gov://member/P000197'."),
    subResource: SubResourceTypeEnum,
    limit: z.number().int().min(1).max(250).optional()
        .describe("OPTIONAL: Max results per page for list sub-resources. Default 20, Max 250."),
    offset: z.number().int().min(0).optional()
        .describe("OPTIONAL: Starting record number for pagination (0-based).")
};

// Define the input type for the tool's handler function for type safety
export type CongressGetSubResourceParams = z.infer<z.ZodObject<typeof TOOL_PARAMS>>;
