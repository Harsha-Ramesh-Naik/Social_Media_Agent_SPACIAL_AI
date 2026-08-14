import { LangGraphRunnableConfig } from "@langchain/langgraph";
import { GeneratePostAnnotation } from "../../generate-post-state.js";
import { ChatAnthropic } from "@langchain/anthropic";
import { GENERATE_POST_PROMPT } from "./prompts.js";
import {
  extractPlatformPosts,
  formatPrompt,
  parseGeneration,
} from "./utils.js";
import { ALLOWED_TIMES } from "../../constants.js";
import {
  getReflectionsPrompt,
  REFLECTIONS_PROMPT,
} from "../../../../utils/reflections.js";
import { getNextSaturdayDate } from "../../../../utils/date.js";
import { getMaxTwitterBodyLength } from "../../../utils.js";

/**
 * Main node execution function to generate native social posts.
 * Takes parsed content guidelines and maps structured posts across active channels.
 */
export async function generatePost(
  state: typeof GeneratePostAnnotation.State,
  config: LangGraphRunnableConfig,
): Promise<Partial<typeof GeneratePostAnnotation.State>> {
  if (!state.report) {
    throw new Error("No report found");
  }
  if (!state.relevantLinks?.length) {
    throw new Error("No relevant links found");
  }
  
  const creativeWriterModel = new ChatAnthropic({
    model: "claude-sonnet-4-5",
    temperature: 0.5,
  });

  const contentPrompt = formatPrompt(state.report, state.relevantLinks);

  const historicalFeedbackRules = await getReflectionsPrompt(config);
  const formattedStyleGuides = REFLECTIONS_PROMPT.replace(
    "{reflections}",
    historicalFeedbackRules,
  );

  const maxTwitterLength = getMaxTwitterBodyLength().toString();
  const finalSystemPrompt = GENERATE_POST_PROMPT.replace(
    "{reflectionsPrompt}",
    formattedStyleGuides,
  ).replace(/{maxTwitterLength}/g, maxTwitterLength);

  const generationOutput = await creativeWriterModel.invoke([
    {
      role: "system",
      content: finalSystemPrompt,
    },
    {
      role: "user",
      content: contentPrompt,
    },
  ]);

  const generatedText = generationOutput.content as string;
  const splitPlatformContent = extractPlatformPosts(generatedText);
  const extractedMainPost = parseGeneration(generatedText);

  // Pick a randomized schedule slot from allowed intervals
  const [selectedHour, selectedMinute] = ALLOWED_TIMES[
    Math.floor(Math.random() * ALLOWED_TIMES.length)
  ]
    .split(" ")[0]
    .split(":");
  const calculatedScheduleDate = getNextSaturdayDate(Number(selectedHour), Number(selectedMinute));

  const unfilteredTwitterCopy = splitPlatformContent.twitterPost || extractedMainPost;
  const finalTwitterCopy = (() => {
    if (typeof unfilteredTwitterCopy !== "string") return unfilteredTwitterCopy;
    const text = unfilteredTwitterCopy.trim();
    if (text.length <= 280) return text;

    // Prune copy back to the last clean word boundary within 280 chars limit
    const truncatedDraft = text.slice(0, 280);
    const wordBoundaryPattern = /[\s\n\t\u00A0\.,;:!\?\)\]]/g;
    let cutPosition = -1;
    let regexMatch: RegExpExecArray | null;
    while ((regexMatch = wordBoundaryPattern.exec(truncatedDraft)) !== null) {
      cutPosition = regexMatch.index;
    }

    if (cutPosition > 0) {
      return truncatedDraft.slice(0, cutPosition).trim();
    }

    // Default hard boundary fallback
    return truncatedDraft.trim();
  })();

  return {
    post: extractedMainPost,
    linkedinPost: splitPlatformContent.linkedinPost || extractedMainPost,
    twitterPost: finalTwitterCopy,
    instagramPost: splitPlatformContent.instagramPost || undefined,
    scheduleDate: calculatedScheduleDate,
  };
}
