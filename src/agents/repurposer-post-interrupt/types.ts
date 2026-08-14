import { Annotation, END } from "@langchain/langgraph";
import {
  AdditionalContext,
  DateType,
  Image,
  RepurposedPost,
} from "../types.js";
import { POST_TO_LINKEDIN_ORGANIZATION } from "../generate-post/constants.js";

export const RepurposerPostInterruptAnnotation = Annotation.Root({
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
   * The generated post for LinkedIn/Twitter.
   */
  post: Annotation<string>,
  /**
   * A human response if the user submitted feedback after the interrupt.
   */
  userResponse: Annotation<string | undefined>,
  /**
   * The next node to execute.
   */
  next: Annotation<
    "rewritePost" | "schedulePost" | "unknownResponse" | typeof END
  >(),
  /**
   * The image to use for the post.
   */
  image: Annotation<Image | undefined>,
  /**
   * The date to schedule the posts for. Only one priority level can be specified.
   * If a date is specified, every post will be posted on that date.
   * (this is only intended to be used for testing/single posts)
   */
  scheduleDate: Annotation<DateType | undefined>(),
});

export type RepurposerPostInterruptState =
  typeof RepurposerPostInterruptAnnotation.State;
export type RepurposerPostInterruptUpdate =
  typeof RepurposerPostInterruptAnnotation.Update;

export const RepurposerPostInterruptConfigurableAnnotation = Annotation.Root({
  /**
   * Whether to post to the LinkedIn organization or the user's profile.
   * If true, [LINKEDIN_ORGANIZATION_ID] is required.
   */
  [POST_TO_LINKEDIN_ORGANIZATION]: Annotation<boolean | undefined>,
});
