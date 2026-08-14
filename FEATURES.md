# Detailed Feature List

This README contains a list of small features/logic flows which play a small, yet significate role in how the agents in the Social Media Agent work.

Each feature is nested under the graph it belongs to. If it does not belong to a graph, it will be under the [**Shared**](#shared) section.

## Main Key

- [**Generate Post**](#generate-post)
- [**Shared**](#shared)

## Generate Post

### Key

- [Used URLs](#used-urls)

### Used URLs

Once a run reaches the `humanNode`, all of the URLs inside the `relevantLinks` and `links` state fields will be stored in the LangGraph store. This is then referenced after the `verifyLinksSubGraph` executes, to see if any of the URLs (`relevantLinks` and `links`) have already been used in previous posts.

If _any_ of the URLs exist in the store, it will route the graph to the `END` node, and not generate a post.

This is implemented to ensure duplicated content is not generated.

#### Skipping Saved URLs check

If you are okay with duplicated content being generated, you can set the `SKIP_USED_URLS_CHECK` environment variable to `true`, or pass the `skipUsedUrlsCheck` configurable field ([variable](src/agents/generate-post/constants.ts#L103)) to the graph.

This will prevent the graph from saving any URLs, or reading URLs, ensuring the graph will never prevent a link from being used due to the URLs already being used in previous posts.

```typescript
import { Client } from "@langchain/langgraph-sdk";
import { SKIP_USED_URLS_CHECK } from "src/agents/generate-post/constants";

const client = new Client({
  apiUrl: process.env.LANGGRAPH_API_URL,
});

const { thread_id } = await client.threads.create();
const res = await client.runs.create(thread_id, "generate_post", {
  input: {
    links: ["https://www.example.com"],
  },
  config: {
    configurable: {
      // Pass this to the graph to skip used URLs check, or set the environment variable
      [SKIP_USED_URLS_CHECK]: true,
    },
  },
});
```

### Skip Content Verification

The `generate_post` graph by default always attempts to "verify" the content from the link provided is relevant to your [business context](src/agents/generate-post/prompts/index.ts#L60). If you want to bypass this step, and assume all input links are relevant, you can set the `SKIP_CONTENT_RELEVANCY_CHECK` environment variable to `true`, or pass the `skipContentRelevancyCheck` configurable field ([variable](src/agents/generate-post/constants.ts#L101)) to the graph.

```typescript
import { Client } from "@langchain/langgraph-sdk";
import { SKIP_CONTENT_RELEVANCY_CHECK } from "src/agents/generate-post/constants";

const client = new Client({
  apiUrl: process.env.LANGGRAPH_API_URL,
});

const { thread_id } = await client.threads.create();
const res = await client.runs.create(thread_id, "generate_post", {
  input: {
    links: ["https://www.example.com"],
  },
  config: {
    configurable: {
      // Pass this to the graph to skip content verification, or set the environment variable
      [SKIP_CONTENT_RELEVANCY_CHECK]: true,
    },
  },
});
```

## Shared

### Key

- [Exclude URLs](#exclude-urls)

### Exclude URLs

Inside each of the verify links subgraphs (`verify-general`, `verify-github`, `verify-youtube`, `verify-tweet`) there is a check (typically named `shouldExclude<type>Content`) which checks if the URL which was passed should be excluded, and thus, a post should _not_ be generated.

Each of these util functions can be found inside the [`should-exclude.ts`](src/agents/should-exclude.ts) file.

They will first check if the `USE_LANGCHAIN_PROMPTS` env variable is set to `true`. If it is not, then they will return `false` and the graph will continue as normal. If it is set to `true`, it will then check the URL against a list/single string to see if it should be excluded. This is because the exclusion logic for these functions is specific to LangChain, and we do not want it running (by default) for non-LangChain users.

If the input matches the exclusion string(s), it will return `true` to not generate a post for that URL.
