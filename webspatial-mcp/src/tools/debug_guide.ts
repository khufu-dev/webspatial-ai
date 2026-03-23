/**
 * MCP tools: WebSpatial multi-platform debug routing
 */

import { z } from "zod";
import { routeDebugFromPrompt, STATIC_PLATFORM_GUIDE } from "../utils/debug_platform_guide.js";

export const webspatialDebugRouteTool = {
  name: "webspatial_debug_route",
  description:
    "Given the user's goal or question (natural language), infer whether to debug WebSpatial on PICO OS 6 (ADB/Android) or visionOS Simulator (macOS/simctl), or both. " +
    "Returns structured JSON: primary_route, matched keyword signals, rationale, next_step, and full per-platform workflows, tool names, and resources. " +
    "Call this early when the target device is ambiguous.",
  schema: z.object({
    prompt: z
      .string()
      .min(1)
      .describe(
        "User message, task, or error description to classify (e.g. 'screenshot on Swan emulator', 'visionOS sim black screen').",
      ),
  }),
  handler: async ({ prompt }: { prompt: string }) => {
    const result = routeDebugFromPrompt(prompt);
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  },
};

export const webspatialPlatformGuideTool = {
  name: "webspatial_platform_guide",
  description:
    "Return the full static reference for debugging WebSpatial on PICO OS 6 vs visionOS: prerequisites, workflows, tool lists, and MCP resources. " +
    "Does not analyze a prompt; use webspatial_debug_route when you need routing.",
  schema: z.object({}),
  handler: async () => {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              server_purpose:
                "This MCP bridges WebSpatial debugging for PICO OS 6 (ADB) and visionOS Simulator (simctl), with different tools per platform.",
              how_to_route:
                "Call webspatial_debug_route with the user's prompt to pick pico_os6 | visionos | both | unclear and get next_step.",
              ...STATIC_PLATFORM_GUIDE,
            },
            null,
            2,
          ),
        },
      ],
    };
  },
};

export const debugGuideTools = [webspatialDebugRouteTool, webspatialPlatformGuideTool];
