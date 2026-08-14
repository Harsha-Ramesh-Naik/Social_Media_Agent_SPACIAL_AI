import { IngestRepurposedDataState } from "../types.js";
import { LangGraphRunnableConfig } from "@langchain/langgraph";
import { SlackClient } from "../../../clients/slack/client.js";

const getChannelIdFromConfig = async (
  config: LangGraphRunnableConfig,
): Promise<string | undefined> => {
  if (config.configurable?.repurposerSlackChannelId) {
    return config.configurable?.repurposerSlackChannelId;
  }

  throw new Error("Repurposer Slack channel ID not found in config.");
};

export async function ingestSlackMessages(
  state: IngestRepurposedDataState,
  config: LangGraphRunnableConfig,
): Promise<Partial<IngestRepurposedDataState>> {
  if (config.configurable?.skipIngest) {
    if (state.contents.length === 0) {
      throw new Error("Can not skip ingest with no links");
    }
    return {};
  }

  const channelId = await getChannelIdFromConfig(config);
  if (!channelId) {
    throw new Error("Channel ID not found");
  }

  const client = new SlackClient();
  const recentMessages = await client.getChannelMessages(channelId);

  return {
    slackMessages: recentMessages,
  };
}
