import "dotenv/config";
import { Client } from "@langchain/langgraph-sdk";

async function invokeGraph() {
  const client = new Client({
    apiUrl: process.env.LANGGRAPH_API_URL || "http://localhost:54367",
  });

  const { thread_id } = await client.threads.create();
  await client.runs.create(thread_id, "ingest_repurposed_data", {
    input: {},
    config: {
      configurable: {
        repurposerSlackChannelId: "",
      },
    },
  });
}

invokeGraph().catch(console.error);
