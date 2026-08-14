import "dotenv/config";
import { Client } from "@langchain/langgraph-sdk";
import {
  SKIP_CONTENT_RELEVANCY_CHECK,
  SKIP_USED_URLS_CHECK,
} from "../../src/agents/generate-post/constants.js";

/**
 * Creates a new cron job in LangGraph for data ingestion.
 *
 * This function sets up a daily cron job that runs at midnight (00:00) to ingest data.
 * It uses the LangGraph Client to create a new cron job with specified configuration
 * and then retrieves a list of all existing cron jobs.
 *
 * @async
 * @returns {Promise<void>} A promise that resolves when the cron job is created
 * and the list of crons is retrieved
 * @throws {Error} If there's an issue creating the cron job or retrieving the list
 *
 * @example
 * ```bash
 * yarn cron:create
 * ```
 */
async function createCron() {
  const client = new Client({
    apiUrl: process.env.LANGGRAPH_API_URL,
  });

  const res = await client.crons.create("ingest_data", {
    schedule: "0 8 * * *", // Runs at 8:00 AM UTC every day (1AM PST)
    config: {
      configurable: {
        slackChannelId: "ADD_SLACK_CHANNEL_ID_HERE",
        maxDaysHistory: 1,
        [SKIP_CONTENT_RELEVANCY_CHECK]: true,
        [SKIP_USED_URLS_CHECK]: true,
      },
    },
    input: {},
  });
  console.log("\n\nCreated cron\n\n");
  console.dir(res, { depth: null });

  const crons = await client.crons.search();
  console.log("\n\nAll Crons\n\n");
  console.dir(crons, { depth: null });
}

createCron().catch(console.error);
