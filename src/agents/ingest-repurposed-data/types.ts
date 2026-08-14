import { Annotation, MessagesAnnotation } from "@langchain/langgraph";
import { SimpleSlackMessage } from "../../clients/slack/client.js";
import { POST_TO_LINKEDIN_ORGANIZATION } from "../generate-post/constants.js";

export type RepurposedContent = {
  originalLink: string;
  additionalContextLinks?: string[];
  quantity: number;
  attachmentUrls: string[] | undefined;
};

export const IngestRepurposedDataAnnotation = Annotation.Root({
  /**
   * The message that triggered the repurposer. Must be of type list, but it will only
   * ever contain a single message from the user.
   */
  messages: MessagesAnnotation.spec["messages"],
  /**
   * The contents to use for generating repurposed posts.
   */
  contents: Annotation<RepurposedContent[]>,
  /**
   * The Slack messages ingested.
   */
  slackMessages: Annotation<SimpleSlackMessage[]>,
});

export type IngestRepurposedDataState =
  typeof IngestRepurposedDataAnnotation.State;
export type IngestRepurposedDataUpdate =
  typeof IngestRepurposedDataAnnotation.Update;

export const IngestRepurposedDataConfigurableAnnotation = Annotation.Root({
  /**
   * The ID of the slack channel to use when ingesting data.
   */
  repurposerSlackChannelId: Annotation<string | undefined>,
  /**
   * Whether or not to skip ingesting messages from Slack.
   * This will throw an error if slack messages are not
   * pre-provided in state.
   */
  skipIngest: Annotation<boolean | undefined>,
  /**
   * Whether to post to the LinkedIn organization or the user's profile.
   * If true, [LINKEDIN_ORGANIZATION_ID] is required.
   */
  [POST_TO_LINKEDIN_ORGANIZATION]: Annotation<boolean | undefined>,
});
