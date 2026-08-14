import { test, expect } from "@jest/globals";
import { SlackClient } from "../clients/slack/client.js";

const TEST_CHANNEL_ID = "C06BU7XF5S7";

test("Slack client can fetch messages from channel name", async () => {
  const client = new SlackClient();

  const messages = await client.getChannelMessages(TEST_CHANNEL_ID, {
    maxMessages: 5,
  });
  console.log(messages);
  expect(messages).toBeDefined();
  expect(messages.length).toBeGreaterThan(0);
});
