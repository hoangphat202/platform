import { BaseExecutor } from "./base.js";
import { PROVIDERS } from "../config/providers.js";
import { injectReasoningContent } from "../utils/reasoningContentInjector.js";

// Models that use /zen/v1/messages (claude format)
const MESSAGES_MODELS = new Set();

// Valid reasoning effort levels (appended as model name suffix by clients like OpenCode CLI)
const EFFORT_LEVELS = ['none', 'low', 'medium', 'high', 'xhigh'];

export class OpenCodeExecutor extends BaseExecutor {
  constructor() {
    super("opencode", PROVIDERS.opencode);
  }

  transformRequest(model, body) {
    // Extract reasoning effort from model name suffix
    // e.g., gpt-5.5-xhigh → effort "xhigh", model "gpt-5.5"
    let modelEffort = null;
    for (const level of EFFORT_LEVELS) {
      if (body.model?.endsWith(`-${level}`) || model?.endsWith(`-${level}`)) {
        modelEffort = level;
        if (body.model?.endsWith(`-${level}`)) {
          body.model = body.model.slice(0, -(level.length + 1));
        }
        break;
      }
    }

    // Priority: explicit reasoning_effort in body > model name suffix
    // Pass reasoning_effort in body for OpenAI-compatible upstream
    if (!body.reasoning_effort && modelEffort) {
      body.reasoning_effort = modelEffort;
    }

    return injectReasoningContent({ provider: this.provider, model: body.model || model, body });
  }

  buildUrl(model) {
    // Strip effort suffix from model name for URL routing decision
    const cleanModel = EFFORT_LEVELS.reduce(
      (m, level) => m.endsWith(`-${level}`) ? m.slice(0, -(level.length + 1)) : m,
      model || ""
    );
    const base = "https://opencode.ai";
    return MESSAGES_MODELS.has(cleanModel)
      ? `${base}/zen/v1/messages`
      : `${base}/zen/v1/chat/completions`;
  }

  buildHeaders() {
    return {
      "Content-Type": "application/json",
      "Authorization": "Bearer public",
      "x-opencode-client": "desktop",
      "Accept": "text/event-stream"
    };
  }
}
