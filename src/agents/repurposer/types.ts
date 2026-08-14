import { Annotation, END } from "@langchain/langgraph";
import { AdditionalContext, DateType, RepurposedPost } from "../types.js";
import { DEFAULT_POST_QUANTITY } from "../ingest-repurposed-data/constants.js";
import { POST_TO_LINKEDIN_ORGANIZATION } from "../generate-post/constants.js";

export type Image = { imageUrl: string; mimeType: string; index: number };

export const RepurposerGraphAnnotation = Annotation.Root({
  /**
   * The link to the original post/content the new campaign is based on.
   */
  originalLink: Annotation<string>,
  /**
   * The original content input as a string. Contains all extracted/scraped
   * content from the original link.
   */
  originalContent: Annotation<string>,
  /**
   * The links to use to generate a series of posts.
   */
  contextLinks: Annotation<string[] | undefined>,
  /**
   * The additional context to use for generating posts.
   */
  additionalContexts: Annotation<AdditionalContext[] | undefined>,
  /**
   * The pageContents field is required as it's the input to the generateReportGraph.
   * It will contain a string, combining the above originalContent and additionalContexts.
   */
  pageContents: Annotation<string[]>,
  /**
   * The quantity of posts to generate.
   */
  quantity: Annotation<number>({
    reducer: (_state, update) => update,
    default: () => DEFAULT_POST_QUANTITY,
  }),
  /**
   * The report generated on the content of the message. Used
   * as context for generating the post.
   */
  reports: Annotation<
    Array<{
      report: string;
      keyDetails: string;
    }>
  >({
    reducer: (state, update) => state.concat(update),
    default: () => [],
  }),
  /**
   * The image options extracted from the original/additional contexts.
   */
  imageOptions: Annotation<string[]>(),
  /**
   * The generated campaign plan to generate posts from.
   */
  campaignPlan: Annotation<string>,
  /**
   * The generated posts for LinkedIn/Twitter.
   */
  posts: Annotation<RepurposedPost[]>,
  /**
   * A human response if the user submitted feedback after the interrupt.
   */
  userResponse: Annotation<string | undefined>(),
  /**
   * The next node to execute.
   */
  next: Annotation<
    "rewritePosts" | "schedulePosts" | "unknownResponse" | typeof END
  >(),
  /**
   * The images to use for the posts. Each 'index' field in the images corresponds to the 'index' field in the posts.
   */
  images: Annotation<Image[]>({
    reducer: (state, update) => state.concat(update),
    default: () => [],
  }),
  /**
   * The date to schedule the posts for. Only one priority level can be specified.
   * If a date is specified, every post will be posted on that date.
   * (this is only intended to be used for testing/single posts)
   */
  scheduleDate: Annotation<DateType | undefined>(),
  /**
   * The number of weeks between each post.
   */
  numWeeksBetween: Annotation<number>({
    reducer: (_state, update) => update,
    default: () => 1,
  }),
});

export type RepurposerState = typeof RepurposerGraphAnnotation.State;
export type RepurposerUpdate = typeof RepurposerGraphAnnotation.Update;

export const RepurposerInputAnnotation = Annotation.Root({
  /**
   * The link to the original post/content the new campaign is based on.
   */
  originalLink: Annotation<string>,
  /**
   * The links to additional contexts to use for generating the new posts.
   */
  contextLinks: Annotation<string[] | undefined>,
  /**
   * The quantity of posts to generate.
   */
  quantity: Annotation<number>,
});

export const RepurposerConfigurableAnnotation = Annotation.Root({
  /**
   * Whether to post to the LinkedIn organization or the user's profile.
   * If true, [LINKEDIN_ORGANIZATION_ID] is required.
   */
  [POST_TO_LINKEDIN_ORGANIZATION]: Annotation<boolean | undefined>,
});
