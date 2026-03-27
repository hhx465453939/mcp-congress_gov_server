import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpError, ErrorCode, CallToolResult } from "@modelcontextprotocol/sdk/types.js"; // Ensure ErrorCode is imported
// NOTE: The SDK's RequestHandlerExtra typing varies by version; keep runtime-compatible typing.
import { z } from "zod";
import { TOOL_NAME, TOOL_DESCRIPTION, TOOL_PARAMS, CongressSearchParams } from "./searchParams.js";
// Import the service class, not the singleton instance, if we instantiate it here or pass it in
import { CongressApiService } from "../../services/CongressApiService.js";
import { ApiError, NotFoundError, RateLimitError, ValidationError, InvalidParameterError, ApiDataGovError } from "../../utils/errors.js"; // Import custom errors
import { logger } from "../../utils/index.js";
import { SearchParams } from "../../types/index.js"; // Import the SearchParams type

/**
 * Registers and defines the handler for the congress_search tool.
 * It validates input using Zod schema defined in searchParams.ts and calls
 * the CongressApiService.searchCollection method.
 */
export const searchTool = (server: McpServer, congressApiService: CongressApiService): void => { // Inject service instance

    // Type assertion for args based on Zod schema
    const processSearchRequest = async (args: CongressSearchParams, extra: any): Promise<CallToolResult> => {
        logger.debug(`Processing ${TOOL_NAME} request`, { args, sessionId: extra.sessionId });
        try {
            // Directly map validated args to the SearchParams type expected by the service
            const searchParams: SearchParams = {
                query: args.query,
                filters: args.filters, // Pass the filters object directly
                sort: args.sort,
                limit: args.limit,
                offset: args.offset
            };

            // Call the refactored service method
            const result = await congressApiService.searchCollection(args.collection, searchParams);

            // Format the successful output for MCP
            const rateLimit = congressApiService.getRateLimitSnapshot();
            return {
                content: [{
                    type: "text" as const,
                    text: JSON.stringify(result, null, 2) // Pretty print JSON
                }, {
                    type: "text" as const,
                    text: `Rate limit snapshot (upstream/api.data.gov headers if present):\n${JSON.stringify(rateLimit, null, 2)}`
                }]
            };

        } catch (error) {
            logger.error(`Error processing ${TOOL_NAME}`, { error: error instanceof Error ? error.message : String(error), args, sessionId: extra.sessionId });

            // Map errors to McpError
            if (error instanceof InvalidParameterError) { // Handle invalid filters/sort from service
                throw new McpError(ErrorCode.InvalidParams, error.message);
            }
            if (error instanceof ValidationError) { // Should be caught by Zod before handler, but handle defensively
                throw new McpError(ErrorCode.InvalidParams, `Validation failed: ${error.message}`, error.details);
            }
            if (error instanceof NotFoundError) { // Should not happen for list search, but handle defensively
                // Use InvalidRequest for a search that finds nothing, or InternalError if it's unexpected
                throw new McpError(ErrorCode.InvalidRequest, `Search failed: ${error.message}`);
            }
            if (error instanceof RateLimitError) {
                // Use InternalError for rate limits, as the server itself isn't unavailable, just the upstream API
                // Or potentially a custom error code if the spec allowed, but InternalError is safest.
                throw new McpError(ErrorCode.InternalError, `Rate limit exceeded: ${error.message}`);
            }
            if (error instanceof ApiDataGovError) {
                throw new McpError(
                    ErrorCode.InternalError,
                    `api.data.gov gateway error (${error.gatewayCode}): ${error.message}`,
                    { statusCode: error.statusCode, gatewayCode: error.gatewayCode }
                );
            }
            if (error instanceof ApiError) {
                throw new McpError(ErrorCode.InternalError, `API error during search: ${error.message}`, { statusCode: error.statusCode });
            }
            // Generic internal error
            throw new McpError(
                ErrorCode.InternalError,
                error instanceof Error ? error.message : 'An unexpected error occurred in congress_search.'
            );
        }
    };

    server.tool(
        TOOL_NAME,
        TOOL_DESCRIPTION,
        TOOL_PARAMS as any, // SDK typing differs across versions
        processSearchRequest as any
    );

    logger.info(`Tool registered`, { toolName: TOOL_NAME });
};

// Note: Removed direct import/use of singleton. Service instance should be passed in.
