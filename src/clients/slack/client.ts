import { traceable } from "langsmith/traceable";
import {
  WebClient,
  ConversationsHistoryResponse,
  ChatPostMessageResponse,
  ChatDeleteResponse,
  FilesSharedPublicURLResponse,
  FilesInfoResponse,
} from "@slack/web-api";
import moment from "moment";

// Slack does not export their message type so we must extract it from another type they expose.
export type SlackMessage = NonNullable<
  NonNullable<ConversationsHistoryResponse["messages"]>[number]
>;
export type SlackMessageAttachment = NonNullable<
  NonNullable<SlackMessage["attachments"]>[number]
>;
export type SlackMessageFile = NonNullable<
  NonNullable<SlackMessage["files"]>[number]
>;

export interface SimpleSlackMessage {
  id: string;
  threadId?: string;
  username?: string;
  userId?: string;
  text: string;
  type?: string;
  attachmentIds?: string[];
  fileIds?: string[];
}

export interface SlackClientArgs {
  /**
   * An OAuth token for the Slack API.
   * If not provided, the token will be read from the SLACK_BOT_OAUTH_TOKEN environment variable.
   */
  token?: string;
}

export type GetChannelMessagesArgs = {
  /**
   * The maximum number of messages to fetch.
   * @default 100
   */
  maxMessages?: number;
  /**
   * The maximum number of hours of history to fetch.
   * @default 24
   */
  maxHoursHistory?: number;
  /**
   * Whether or not to filter out messages which were sent as "thread_broadcast" messages
   * These are messages which are sent as replies to a thread, but also sent as a top level
   * message to the channel.
   * @default false
   */
  filterMessageBroadcasts?: boolean;
};

export class SlackClient {
  private client: WebClient;

  constructor(args?: SlackClientArgs) {
    const slackToken = process.env.SLACK_BOT_OAUTH_TOKEN || args?.token;
    if (!slackToken) {
      throw new Error(
        "Missing slack OAuth token. Please provide via the 'token' arg, or process.env.SLACK_BOT_OAUTH_TOKEN.",
      );
    }
    this.client = new WebClient(slackToken);

    // Wrap methods with traceable
    this.getChannelMessages = this._wrapWithTraceable(
      this.getChannelMessages,
      "get_channel_messages",
    );
    this.getReplies = this._wrapWithTraceable(this.getReplies, "get_replies");
    this.sendMessage = this._wrapWithTraceable(
      this.sendMessage,
      "send_message",
    );
    this.deleteMessage = this._wrapWithTraceable(
      this.deleteMessage,
      "delete_message",
    );
    this.getPublicFile = this._wrapWithTraceable(
      this.getPublicFile,
      "get_public_file",
    );
    this.makeFilePublic = this._wrapWithTraceable(
      this.makeFilePublic,
      "make_file_public",
    );
  }

  // Helper method to wrap methods with traceable
  private _wrapWithTraceable<T extends (...args: any[]) => Promise<any>>(
    method: T,
    name: string,
  ): T {
    const boundMethod = method.bind(this);
    return traceable(boundMethod, { name }) as T;
  }

  private _convertToSimpleMessages(
    messages: SlackMessage[],
  ): SimpleSlackMessage[] {
    const messagesWithContent = messages.filter((m) => {
      if (
        m.type !== "message" ||
        (!m.username && !m.text) ||
        !m.text ||
        !m.ts
      ) {
        return false;
      }
      return true;
    });

    const simpleMsgs: SimpleSlackMessage[] = messagesWithContent.map((m) => {
      if (!m.ts) {
        throw new Error(
          `Failed to convert Slack message. Missing 'ts':\n${JSON.stringify(m, null, 2)}`,
        );
      }
      return {
        id: m.ts,
        threadId: m.thread_ts,
        username: m.username,
        userId: m.user,
        text: m.text ?? "",
        type: m.type,
        attachmentIds:
          m.attachments?.flatMap((a) => a.id?.toString() ?? []) ?? [],
        fileIds: m.files?.flatMap((f) => f.id?.toString() ?? []) ?? [],
      };
    });

    return simpleMsgs;
  }

  async getChannelMessages(
    channelId: string,
    args?: GetChannelMessagesArgs,
  ): Promise<SimpleSlackMessage[]> {
    try {
      const { maxMessages, maxHoursHistory } = {
        maxMessages: 100,
        maxHoursHistory: 24,
        ...args,
      };
      const oldest = moment()
        .subtract(maxHoursHistory, "hours")
        .unix()
        .toString();
      let messages: SlackMessage[] = [];
      let cursor: string | undefined;

      do {
        // Adjust limit based on remaining messages needed
        const limit = Math.min(100, (maxMessages ?? 0) - messages.length);

        const result = await this.client.conversations.history({
          channel: channelId,
          oldest: oldest,
          limit: limit,
          cursor: cursor,
        });

        if (result.messages && Array.isArray(result.messages)) {
          messages.push(...result.messages);
        }

        cursor = (result.response_metadata?.next_cursor as string) || undefined;

        // Break the loop if we've reached maxMessages
        if (messages.length >= maxMessages) {
          break;
        }
      } while (cursor);

      // If the type if `thread_broadcast`, it's a thread reply which was also sent
      // as a top level message to the channel.
      if (args?.filterMessageBroadcasts) {
        messages = messages.filter((m) => m.subtype !== "thread_broadcast");
      }

      // Trim any excess messages if we went over maxMessages
      return this._convertToSimpleMessages(messages.slice(0, maxMessages));
    } catch (error) {
      console.error("Error fetching Slack messages:", error);
      throw error;
    }
  }

  async getReplies(
    channelId: string,
    parentMessageId: string,
  ): Promise<SimpleSlackMessage[]> {
    const results = await this.client.conversations.replies({
      channel: channelId,
      ts: parentMessageId,
    });
    return this._convertToSimpleMessages(results.messages || []);
  }

  async sendMessage(
    channelId: string,
    message: string,
  ): Promise<ChatPostMessageResponse> {
    const res = await this.client.chat.postMessage({
      channel: channelId,
      text: message,
    });
    return res;
  }

  async deleteMessage(
    channelId: string,
    messageId: string,
  ): Promise<ChatDeleteResponse> {
    const res = await this.client.chat.delete({
      channel: channelId,
      ts: messageId,
    });
    return res;
  }

  async getPublicFile(fileId: string): Promise<FilesInfoResponse> {
    const file = await this.client.files.info({
      file: fileId,
    });
    return file;
  }

  async makeFilePublic(fileId: string): Promise<FilesSharedPublicURLResponse> {
    const res = await this.client.files.sharedPublicURL({
      file: fileId,
      token: process.env.SLACK_BOT_USER_OAUTH_TOKEN,
    });
    return res;
  }
}
