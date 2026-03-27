import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpError, ErrorCode, CallToolResult } from "@modelcontextprotocol/sdk/types.js";
// NOTE: The SDK's RequestHandlerExtra typing varies by version; keep runtime-compatible typing.
import { z } from "zod";
import { TOOL_NAME, TOOL_DESCRIPTION, TOOL_PARAMS, CongressGetSubResourceParams } from "./getSubResourceParams.js";
// Import the service class, not the singleton instance
import { CongressApiService } from "../../services/CongressApiService.js";
import { ApiError, NotFoundError, RateLimitError, ValidationError, ResourceError, InvalidParameterError, ApiDataGovError } from "../../utils/errors.js"; // Added InvalidParameterError
import { logger } from "../../utils/index.js";
import { PaginationParams } from "../../types/index.js"; // Import PaginationParams

/**
 * Parses the parent URI and extracts the base API path segment.
 * e.g., "congress-gov://bill/117/hr/3076" -> "/bill/117/hr/3076"
 * e.g., "congress-gov://member/P000197" -> "/member/P000197"
 * Throws ResourceError if the URI format is invalid.
 */
// Removed getApiPathFromParentUri as the service now handles URI parsing internally

/**
 * Registers and defines the handler for the congress_getSubResource tool.
 */
export const getSubResourceTool = (server: McpServer, congressApiService: CongressApiService): void => { // Inject service instance

    const processGetSubResourceRequest = async (args: CongressGetSubResourceParams, extra: any): Promise<CallToolResult> => {
        logger.debug(`Processing ${TOOL_NAME} request`, { args, sessionId: extra.sessionId });
        try {
            // 1. Prepare pagination parameters
            const paginationParams: PaginationParams = {
                limit: args.limit,
                offset: args.offset
            };

            // 2. Call the dedicated service method
            const result = await congressApiService.getSubResource(
                args.parentUri,
                args.subResource,
                paginationParams
            );

            // 3. Format the successful output
            const rateLimit = congressApiService.getRateLimitSnapshot();
            return {
                content: [{
                    type: "text" as const,
                    text: JSON.stringify(result, null, 2)
                }, {
                    type: "text" as const,
                    text: `Rate limit snapshot (upstream/api.data.gov headers if present):\n${JSON.stringify(rateLimit, null, 2)}`
                }]
            };

        } catch (error) {
            logger.error(`Error processing ${TOOL_NAME}`, { error: error instanceof Error ? error.message : String(error), args, sessionId: extra.sessionId });

            // Map errors to McpError
            if (error instanceof InvalidParameterError) { // Handle invalid parentUri format from service
                throw new McpError(ErrorCode.InvalidParams, error.message);
            }
            if (error instanceof ValidationError) { // Should be caught by Zod, but handle defensively
                throw new McpError(ErrorCode.InvalidParams, `Validation failed: ${error.message}`, error.details);
            }
            if (error instanceof NotFoundError) { // Parent or sub-resource not found at API
                // Use InvalidRequest as the parent URI or subResource was likely invalid if API 404'd
                throw new McpError(ErrorCode.InvalidRequest, `Sub-resource or parent not found: ${error.message}`);
            }
            if (error instanceof RateLimitError) {
                // Use InternalError for rate limits, as the server itself isn't unavailable
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
                throw new McpError(ErrorCode.InternalError, `API error fetching sub-resource: ${error.message}`, { statusCode: error.statusCode });
            }
            // Generic internal error
            throw new McpError(
                ErrorCode.InternalError,
                error instanceof Error ? error.message : `An unexpected error occurred in ${TOOL_NAME}.`
            );
        }
    };

    server.tool(
        TOOL_NAME,
        TOOL_DESCRIPTION,
        TOOL_PARAMS as any,
        processGetSubResourceRequest as any
    );

    logger.info(`Tool registered`, { toolName: TOOL_NAME });
};

// Note: Removed direct import/use of singleton. Service instance should be passed in.
