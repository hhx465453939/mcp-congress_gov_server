import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { CongressApiService } from "./services/CongressApiService.js"; // Import class
import { ResourceNotFoundError, ResourceError, NotFoundError, ApiError, RateLimitError, InvalidParameterError, ApiDataGovError } from "./utils/errors.js"; // Added InvalidParameterError
import { logger } from "./utils/logger.js";
// Import all needed param types
import {
    BillResourceParams, MemberResourceParams, CongressResourceParams, CommitteeResourceParams,
    AmendmentResourceParams // Add others if handlers are implemented
} from "./types/index.js";

/**
 * Formats successful API data into the MCP ResourceContents structure (array).
 */
function formatSuccessResponse(uri: string, data: any, service?: CongressApiService): any[] { // Use any[] return type
    const contents: any[] = [{
        uri: uri,
        mimeType: "application/json",
        text: JSON.stringify(data, null, 2),
    }];
    if (service) {
        contents.push({
            uri: `${uri}#mcp-hints`,
            mimeType: "text/plain",
            text: `Hints:\n- Prefer tools for search + related lists (congress_search -> congress_getSubResource)\n- Rate limit snapshot:\n${JSON.stringify(service.getRateLimitSnapshot(), null, 2)}`,
        });
    }
    return contents;
}

/**
 * Handles errors during resource fetching, throwing appropriate McpErrors.
 */
function handleResourceError(uri: string, error: unknown): never {
    // Use structured logging for errors
    logger.error(`Error handling resource`, error, { uri });

    if (error instanceof ResourceNotFoundError || error instanceof NotFoundError) {
        // URI parsing error or 404 from API
        throw new McpError(ErrorCode.InvalidRequest, `Resource not found: ${uri}. Details: ${error.message}`);
    } else if (error instanceof RateLimitError) {
        // Rate limit error from API service - use InternalError as planned
        throw new McpError(ErrorCode.InternalError, `Rate limit exceeded for ${uri}. Details: ${error.message}`);
    } else if (error instanceof ApiDataGovError) {
        throw new McpError(
            ErrorCode.InternalError,
            `api.data.gov gateway error (${error.gatewayCode}) for ${uri}: ${error.message}`,
            { statusCode: error.statusCode, gatewayCode: error.gatewayCode, details: error.details }
        );
    } else if (error instanceof InvalidParameterError) {
        // Invalid params detected during URI parsing or service call
        throw new McpError(ErrorCode.InvalidParams, `Invalid parameters for resource ${uri}: ${error.message}`);
    } else if (error instanceof ApiError) {
        // Other specific API errors (non-404, non-429)
        throw new McpError(ErrorCode.InternalError, `API error fetching resource ${uri}: ${error.message}`, { statusCode: error.statusCode, details: error.details });
    } else if (error instanceof ResourceError) {
        // Other resource handling errors (e.g., invalid params in URI)
        throw new McpError(ErrorCode.InvalidRequest, `Invalid resource request for ${uri}: ${error.message}`, error.details);
    } else if (error instanceof Error) {
        // Unexpected JS errors
        throw new McpError(ErrorCode.InternalError, `Unexpected error processing resource ${uri}: ${error.message}`, error.stack);
    } else {
        // Fallback for non-Error throws
        throw new McpError(ErrorCode.InternalError, `Unknown error processing resource ${uri}`, error);
    }
}

// --- Resource Handler Implementations (Refactored for RFC-002) ---
// Each handler now accepts the service instance

export async function handleBillResource(uri: string, congressApiService: CongressApiService): Promise<any> {
    logger.debug("Handling handleBillResource", { uri });
    // Use more specific regex, ensure case-insensitivity if needed for type
    const match = uri.match(/^congress-gov:\/\/bill\/(\d+)\/([a-z]+)\/(\d+)$/i);
    if (!match) throw new ResourceNotFoundError(`Invalid bill resource URI format: ${uri}`);
    const [_, congressStr, billType, billNumberStr] = match;
    // Validate and convert params
    const congress = parseInt(congressStr, 10);
    const billNumber = parseInt(billNumberStr, 10); // Assuming API needs number
    if (isNaN(congress) || isNaN(billNumber)) {
        throw new InvalidParameterError(`Invalid numeric identifier in bill URI: ${uri}`);
    }
    // TODO: Add validation for billType if needed
    const params: BillResourceParams = { congress: congressStr, billType: billType.toLowerCase(), billNumber: billNumberStr }; // Keep original strings for params if service expects them
    try {
        // Call specific service method
        const billData = await congressApiService.getBillDetails(params);
        return { contents: formatSuccessResponse(uri, billData, congressApiService) };
    } catch (error) { handleResourceError(uri, error); }
}

export async function handleMemberResource(uri: string, congressApiService: CongressApiService): Promise<any> {
    logger.debug("Handling handleMemberResource", { uri });
    const match = uri.match(/^congress-gov:\/\/member\/([A-Z0-9]+)$/i);
    if (!match) throw new ResourceNotFoundError(`Invalid member resource URI format: ${uri}`);
    const [_, memberId] = match;
    const params: MemberResourceParams = { memberId };
    try {
        // Call specific service method
        const memberData = await congressApiService.getMemberDetails(params);
        return { contents: formatSuccessResponse(uri, memberData, congressApiService) };
    } catch (error) { handleResourceError(uri, error); }
}

export async function handleCongressResource(uri: string, congressApiService: CongressApiService): Promise<any> {
    logger.debug("Handling handleCongressResource", { uri });
    const match = uri.match(/^congress-gov:\/\/congress\/(\d+)$/);
    if (!match) throw new ResourceNotFoundError(`Invalid congress resource URI format: ${uri}`);
    const [_, congress] = match;
    const params: CongressResourceParams = { congress };
    try {
        // Call specific service method
        const congressData = await congressApiService.getCongressDetails(params);
        return { contents: formatSuccessResponse(uri, congressData, congressApiService) };
    } catch (error) { handleResourceError(uri, error); }
}

export async function handleCommitteeResource(uri: string, congressApiService: CongressApiService): Promise<any> {
    logger.debug("Handling handleCommitteeResource", { uri });
    // Updated regex to handle optional congress in path (assuming format like /committee/house/hsju00 or /committee/117/house/hsju00)
    // This needs clarification based on actual desired URI structure vs API structure
    // Assuming format: congress-gov://committee/{chamber}/{code}?congress={congress}
    // Let's parse based on that assumption for now.
    const url = new URL(uri);
    const match = url.pathname.match(/^\/committee\/([a-z]+)\/([a-z0-9]+)$/i);
    if (url.protocol !== 'congress-gov:' || !match) {
        throw new ResourceNotFoundError(`Invalid committee resource URI format: ${uri}`);
    }
    const [_, chamber, committeeCode] = match;
    const congress = url.searchParams.get('congress') || undefined; // Get optional congress from query

    const params: CommitteeResourceParams = {
        chamber: chamber.toLowerCase(),
        committeeCode: committeeCode.toLowerCase(),
        congress: congress // Pass optional congress
    };
    try {
        // Call specific service method
        const committeeData = await congressApiService.getCommitteeDetails(params);
        return { contents: formatSuccessResponse(uri, committeeData, congressApiService) };
    } catch (error) { handleResourceError(uri, error); }
}

// Add handlers for Amendment, Nomination, Treaty etc. calling their specific service methods
// Example:
// export async function handleAmendmentResource(uri: string, congressApiService: CongressApiService): Promise<any> {
//     logger.debug("Handling handleAmendmentResource", { uri });
//     const match = uri.match(/^congress-gov:\/\/amendment\/(\d+)\/([a-z]+)\/(\d+)$/i);
//     if (!match) throw new ResourceNotFoundError(`Invalid amendment resource URI format: ${uri}`);
//     const [_, congress, amendmentType, amendmentNumber] = match;
//     const params: AmendmentResourceParams = { congress, amendmentType: amendmentType.toLowerCase(), amendmentNumber };
//     try {
//         const data = await congressApiService.getAmendmentDetails(params);
//         return { contents: formatSuccessResponse(uri, data) };
//     } catch (error) { handleResourceError(uri, error); }
// }


// --- Static Info Handlers (No service call needed) ---
export async function handleInfoOverviewResource(uri: string): Promise<any> { // Pass URI for consistency
    logger.debug("Handling handleInfoOverviewResource", { uri });
    try {
        // This data could potentially be fetched or configured, but static is fine for now
        const overviewData = { message: "Congress.gov API provides access to legislative data.", version: "v3", documentation: "https://api.congress.gov/" };
        return { contents: formatSuccessResponse(uri, overviewData) };
    } catch (error) { handleResourceError(uri, error); }
}

export async function handleInfoCurrentCongressResource(uri: string): Promise<any> { // Pass URI
    logger.debug("Handling handleInfoCurrentCongressResource", { uri });
    try {
        // This could also be fetched dynamically if needed
        const currentCongressData = { number: 118, startDate: "2023-01-03", endDate: "2025-01-03" }; // Example, update as needed
        return { contents: formatSuccessResponse(uri, currentCongressData) };
    } catch (error) { handleResourceError(uri, error); }
}
