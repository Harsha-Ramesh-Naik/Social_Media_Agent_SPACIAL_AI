import { Client } from "@langchain/langgraph-sdk";
import { LangGraphRunnableConfig } from "@langchain/langgraph";
import { BaseGeneratePostState, BaseGeneratePostUpdate } from "./types.js";
import { ChatAnthropic } from "@langchain/anthropic";
import {
  getReflectionsPrompt,
  REFLECTIONS_PROMPT,
} from "../../../../utils/reflections.js";
import {
  extractPlatformPosts,
  parseGeneration,
} from "../../../generate-post/nodes/generate-post/utils.js";

const REVISION_SYSTEM_INSTRUCTIONS = `You're a highly regarded marketing employee, working on crafting thoughtful and engaging content for LinkedIn, Twitter/X, and Instagram pages.
You wrote posts for these platforms, however your boss has asked for some changes to be made before they can be published.

The original posts you wrote are as follows:
<original-posts>
{originalPost}
</original-posts>

{reflectionsPrompt}

Listen to your boss closely, and make the necessary changes to the posts.
Respond with the updated versions inside their respective tags: <linkedin-post>, <twitter-post>, and <instagram-post>.
Even if you only modify one platform, you MUST return all platforms inside their respective tags (keeping the unmodified ones as-is) so they can be parsed correctly.
Do not include any additional commentary or text before or after the tags.`;

interface FeedbackAnalysisParams {
  originalPost: string;
  newPost: string;
  userResponse: string;
}

/**
 * Triggers background analytics processing to document styling revisions
 * and log user refinement patterns.
 */
async function triggerBackgroundFeedbackAnalysis({
  originalPost,
  newPost,
  userResponse,
}: FeedbackAnalysisParams) {
  const analyticsClient = new Client({
    apiUrl: process.env.LANGGRAPH_API_URL,
    apiKey: process.env.LANGCHAIN_API_KEY,
  });

  const analyticsThread = await analyticsClient.threads.create();
  await analyticsClient.runs.create(analyticsThread.thread_id, "reflection", {
    input: {
      originalPost,
      newPost,
      userResponse,
    },
  });
}

/**
 * Node execution handler to process copy revisions based on direct feedback.
 * Invokes LLM, parses platform-specific overrides, and persists analytics.
 */
export async function rewritePost<
  State extends BaseGeneratePostState = BaseGeneratePostState,
  Update = BaseGeneratePostUpdate,
>(state: State, config: LangGraphRunnableConfig): Promise<Update> {
  if (!state.post && !state.linkedinPost && !state.twitterPost) {
    throw new Error("No post found");
  }
  if (!state.userResponse) {
    throw new Error("No user response found");
  }

  const draftEditorModel = new ChatAnthropic({
    model: "claude-sonnet-4-5",
    temperature: 0.5,
  });

  const historicalFeedbackRules = await getReflectionsPrompt(config);
  const formattedStyleGuides = REFLECTIONS_PROMPT.replace(
    "{reflections}",
    historicalFeedbackRules,
  );

  const existingLinkedinCopy = state.linkedinPost || state.post;
  const existingTwitterCopy = state.twitterPost || state.post;
  const existingInstagramCopy = (state as any).instagramPost || "";

  let currentSourceCopy = "";
  if (existingLinkedinCopy) {
    currentSourceCopy += `<linkedin-post>\n${existingLinkedinCopy}\n</linkedin-post>\n\n`;
  }
  if (existingTwitterCopy) {
    currentSourceCopy += `<twitter-post>\n${existingTwitterCopy}\n</twitter-post>\n\n`;
  }
  if (existingInstagramCopy) {
    currentSourceCopy += `<instagram-post>\n${existingInstagramCopy}\n</instagram-post>\n\n`;
  }
  if (!currentSourceCopy) {
    currentSourceCopy = state.post;
  }

  const customSystemPrompt = REVISION_SYSTEM_INSTRUCTIONS.replace(
    "{originalPost}",
    currentSourceCopy,
  ).replace("{reflectionsPrompt}", formattedStyleGuides);

  const editorRevisionResponse = await draftEditorModel.invoke([
    {
      role: "system",
      content: customSystemPrompt,
    },
    {
      role: "user",
      content: state.userResponse,
    },
  ]);

  const revisedPayload = editorRevisionResponse.content as string;
  const parsedPlatformOutput = extractPlatformPosts(revisedPayload);
  const extractedMainPost = parseGeneration(revisedPayload);

  try {
    await triggerBackgroundFeedbackAnalysis({
      originalPost: currentSourceCopy,
      newPost: revisedPayload,
      userResponse: state.userResponse,
    });
  } catch (analyticsError) {
    console.error("Failed to run reflections background task:", analyticsError);
  }

  const containsSplitChannels = !!(
    parsedPlatformOutput.linkedinPost ||
    parsedPlatformOutput.twitterPost ||
    parsedPlatformOutput.instagramPost
  );

  return {
    post: extractedMainPost || revisedPayload,
    linkedinPost: containsSplitChannels
      ? parsedPlatformOutput.linkedinPost || state.linkedinPost || state.post
      : extractedMainPost || revisedPayload,
    twitterPost: containsSplitChannels
      ? parsedPlatformOutput.twitterPost || state.twitterPost || state.post
      : extractedMainPost || revisedPayload,
    instagramPost: containsSplitChannels
      ? parsedPlatformOutput.instagramPost || (state as any).instagramPost || ""
      : extractedMainPost || revisedPayload,
    next: undefined,
    userResponse: undefined,
  } as unknown as Update;
}
