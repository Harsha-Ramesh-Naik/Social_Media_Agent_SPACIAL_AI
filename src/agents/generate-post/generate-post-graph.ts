import {
  END,
  LangGraphRunnableConfig,
  START,
  StateGraph,
} from "@langchain/langgraph";
import {
  GeneratePostAnnotation,
  GeneratePostConfigurableAnnotation,
  GeneratePostState,
  GeneratePostUpdate,
} from "./generate-post-state.js";
import { generateContentReport } from "./nodes/generate-report/index.js";
import { generatePost } from "./nodes/generate-post/index.js";
import { condensePost } from "./nodes/condense-post.js";
import {
  isTextOnly,
  removeUrls,
  shouldPostToLinkedInOrg,
  skipUsedUrlsCheck,
  getMaxTwitterBodyLength,
} from "../utils.js";
import { verifyLinksGraph } from "../verify-links/verify-links-graph.js";
import { authSocialsPassthrough } from "./nodes/auth-socials.js";
import { findAndGenerateImagesGraph } from "../find-and-generate-images/find-and-generate-images-graph.js";
import { updateScheduledDate } from "../shared/nodes/update-scheduled-date.js";
import { getSavedUrls } from "../shared/stores/post-subject-urls.js";
import { humanNode } from "../shared/nodes/generate-post/human-node.js";
import { schedulePost } from "../shared/nodes/generate-post/schedule-post.js";
import { rewritePost } from "../shared/nodes/generate-post/rewrite-post.js";
import { Client } from "@langchain/langgraph-sdk";
import { POST_TO_LINKEDIN_ORGANIZATION } from "./constants.js";
import { rewritePostWithSplitUrl } from "./nodes/rewrite-with-split-url.js";

/**
 * Handles image rendering inside a try-catch blocks to catch errors
 * and prevent complete flow failures.
 */
async function processImagesWithErrorRecovery(
  state: GeneratePostState,
  config: LangGraphRunnableConfig,
): Promise<Partial<GeneratePostUpdate>> {
  try {
    const imagesResult = await findAndGenerateImagesGraph.invoke(
      {
        post: state.post,
        report: state.report,
        imageOptions: state.imageOptions,
        relevantLinks: state.relevantLinks,
        pageContents: state.pageContents,
      },
      config,
    );
    return {
      imageOptions: imagesResult.imageOptions,
      image: imagesResult.image,
    };
  } catch (renderingError) {
    console.error(
      "Image processing failed, falling back to text-only mode:",
      renderingError,
    );
    return {};
  }
}

/**
 * Evaluates whether report data was built and forwards to social copy generation.
 */
function decideNextStepAfterReport(
  state: GeneratePostState,
): "generatePost" | typeof END {
  if (state.report) {
    return "generatePost";
  }
  return END;
}

/**
 * Parses dynamic routing options after human interaction finishes.
 */
function determineActionAfterInterrupt(
  state: GeneratePostState,
):
  | "rewritePost"
  | "schedulePost"
  | "updateScheduleDate"
  | "humanNode"
  | "rewriteWithSplitUrl"
  | typeof END {
  if (state.next) {
    if (state.next === "unknownResponse") {
      return "humanNode";
    }
    return state.next;
  }
  return END;
}

/**
 * Directs post content drafts either to the text condenser or the review inbox.
 */
async function routePostToCondenserOrInbox(
  state: GeneratePostState,
  config: LangGraphRunnableConfig,
): Promise<
  "condensePost" | "humanNode" | "findAndGenerateImagesSubGraph" | typeof END
> {
  const twitterPost = state.twitterPost || state.post;
  const postWithoutUrls = removeUrls(twitterPost || "");
  const maxTwitterLength = getMaxTwitterBodyLength();
  if (postWithoutUrls.length > maxTwitterLength && state.condenseCount <= 3) {
    return "condensePost";
  }

  const isTextOnlyEnabled = isTextOnly(config);
  if (isTextOnlyEnabled) {
    return delegateToCuratedInboxOrLocal(state, config);
  }
  return "findAndGenerateImagesSubGraph";
}

/**
 * Verifies that the source link inputs have not been previously processed.
 */
async function verifyUrlsNotDuplicated(
  urlList: string[],
  config: LangGraphRunnableConfig,
) {
  if (await skipUsedUrlsCheck(config.configurable)) {
    return false;
  }
  const previouslyUsedUrls = await getSavedUrls(config);
  return urlList.some((url) =>
    previouslyUsedUrls.some((usedUrl) => url === usedUrl),
  );
}

/**
 * Evaluates link duplicates to determine if summary report is required.
 */
async function shouldGenerateSummaryReport(
  state: GeneratePostState,
  config: LangGraphRunnableConfig,
): Promise<"generateContentReport" | typeof END> {
  const isDuplicate = await verifyUrlsNotDuplicated(
    [...(state.relevantLinks ?? []), ...state.links],
    config,
  );

  if (isDuplicate || !state.pageContents?.length) {
    console.log(
      "Skipping post generation. URLs have already been used or there are no page contents.",
      {
        isDuplicate,
        pageContentsLength: state.pageContents?.length,
      },
    );
    return END;
  }

  return "generateContentReport";
}

/**
 * Routes curated threads to the dedicated curated post interrupt sub-state.
 */
async function delegateToCuratedInboxOrLocal(
  state: GeneratePostState,
  config: LangGraphRunnableConfig,
): Promise<"humanNode" | typeof END> {
  if (config.configurable?.origin === "curate-data") {
    const postToLinkedInOrg = shouldPostToLinkedInOrg(config);
    const apiSDKClient = new Client({
      apiUrl: process.env.LANGGRAPH_API_URL,
      apiKey: process.env.LANGCHAIN_API_KEY,
    });

    const inboxThread = await apiSDKClient.threads.create();
    await apiSDKClient.runs.create(inboxThread.thread_id, "curated_post_interrupt", {
      input: state,
      config: {
        configurable: {
          [POST_TO_LINKEDIN_ORGANIZATION]: postToLinkedInOrg,
        },
      },
    });

    return END;
  }

  return "humanNode";
}

const postGenerationWorkflowBuilder = new StateGraph(
  GeneratePostAnnotation,
  GeneratePostConfigurableAnnotation,
)
  .addNode("authSocialsPassthrough", authSocialsPassthrough)

  .addNode("verifyLinksSubGraph", verifyLinksGraph)

  // Social copy generation
  .addNode("generatePost", generatePost)
  // Text condenser
  .addNode("condensePost", condensePost)
  // Human feedback review
  .addNode("humanNode", humanNode<GeneratePostState, GeneratePostUpdate>)
  // Post publisher scheduler
  .addNode("schedulePost", schedulePost<GeneratePostState, GeneratePostUpdate>)
  // LLM copy revisions
  .addNode("rewritePost", rewritePost<GeneratePostState, GeneratePostUpdate>)
  // Content summarization
  .addNode("generateContentReport", generateContentReport)
  // Image parsing
  .addNode("findAndGenerateImagesSubGraph", processImagesWithErrorRecovery)
  // Schedule configurations
  .addNode("updateScheduleDate", updateScheduledDate)
  // Post splitting
  .addNode("rewriteWithSplitUrl", rewritePostWithSplitUrl)

  // Workflow paths
  .addEdge(START, "authSocialsPassthrough")
  .addEdge("authSocialsPassthrough", "verifyLinksSubGraph")

  .addConditionalEdges(
    "verifyLinksSubGraph",
    shouldGenerateSummaryReport,
    ["generateContentReport", END],
  )

  .addConditionalEdges("generateContentReport", decideNextStepAfterReport, [
    "generatePost",
    END,
  ])

  .addConditionalEdges("generatePost", routePostToCondenserOrInbox, [
    "condensePost",
    "findAndGenerateImagesSubGraph",
    "humanNode",
    END,
  ])
  .addConditionalEdges("condensePost", routePostToCondenserOrInbox, [
    "condensePost",
    "findAndGenerateImagesSubGraph",
    "humanNode",
    END,
  ])

  .addConditionalEdges(
    "findAndGenerateImagesSubGraph",
    delegateToCuratedInboxOrLocal,
    ["humanNode", END],
  )

  .addEdge("rewritePost", "humanNode")
  .addEdge("updateScheduleDate", "humanNode")
  .addEdge("rewriteWithSplitUrl", "humanNode")

  .addConditionalEdges("humanNode", determineActionAfterInterrupt, [
    "rewritePost",
    "schedulePost",
    "updateScheduleDate",
    "humanNode",
    "rewriteWithSplitUrl",
    END,
  ])
  .addEdge("schedulePost", END);

export const generatePostGraph = postGenerationWorkflowBuilder.compile();

generatePostGraph.name = "Generate Post Subgraph";
