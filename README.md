# Social Media Agent

This repository contains an 'agent' which can take in a URL, and generate a Twitter & LinkedIn post based on the content of the URL. It uses a human-in-the-loop (HITL) flow to handle authentication with different social media platforms, and to allow the user to make changes, or accept/reject the generated post.



## Table of contents

- [Quickstart](#quickstart)
  - [Environment variables](#set-environment-variables)
  - [LangGraph Server](#start-the-langgraph-server)
- [Full setup](#advanced-setup)
  - [Environment variables](#set-environment-variables-1)
  - [Authentication](#setup-authentication)
  - [Supabase](#setup-supabase)
  - [Slack](#setup-slack)
  - [GitHub](#setup-github)
- [Usage](#usage)
  - [Generate Post](#generate-post)
  - [Setup Crons](#setup-crons)
  - [Prebuilt Scripts](#prebuilt-scripts)
- [Setup Agent Inbox](#setup-agent-inbox)
  - [Using the deployed inbox](#using-the-deployed-inbox)
  - [Using the local inbox](#using-the-local-inbox)
- [Customization](#customization)
  - [Prompts](#prompts)
  - [Post Style](#post-style)

# Quickstart

This quickstart covers how to setup the Social Media Agent in a basic setup mode. This is the quickest way to get up and running, however it will lack some of the features of the full setup mode. See [Advanced Setup](#advanced-setup) for the full setup guide.

<details>
<summary>Running in basic setup mode will lack the following features:</summary>

- Parsing content from GitHub, Twitter or YouTube URLs
- Ingesting data from Slack, or sending updates to Slack
- Image selection & uploads

</details>

To get started, you'll need the following API keys/software:

- [Anthropic API](https://console.anthropic.com/) - General LLM
- [LangSmith](https://smith.langchain.com/) - LangSmith API key required to run the LangGraph server locally (free)
- [FireCrawl API](https://www.firecrawl.dev/) - Web scraping. New users get 500 credits for free
- [Arcade](https://www.arcade.dev/) - Easy authentication for reading & writing to social media platforms

## Setup Instructions

### Clone the repository:

```bash
git clone 
```

```bash
cd social-media-agent
```

### Install dependencies:

```bash
yarn install
```

### Set environment variables.

Copy the values of the quickstart `.env.quickstart.example` to `.env`, then add the values:

```bash
cp .env.quickstart.example .env
```

Once done, ensure you have the following environment variables set:

```bash
# For LangSmith tracing (optional)
LANGSMITH_API_KEY=
LANGSMITH_TRACING_V2=true

# For LLM generations
ANTHROPIC_API_KEY=

# For web scraping
FIRECRAWL_API_KEY=

# Arcade API key - used for fetching Tweets, and scheduling LinkedIn/Twitter posts
ARCADE_API_KEY=
```


### Install LangGraph CLI

```bash
pip install langgraph-cli
```

Then run the following command to check the CLI is installed:

```bash
langgraph --version
```

Click [here](https://langchain-ai.github.io/langgraph/cloud/reference/cli/) to read the full download instructions for the LangGraph CLI.

### Start the LangGraph server:

To start the LangGraph server, run this script:

```bash
yarn langgraph:in_mem:up
```

Under the hood, this will execute the following command:

```bash
npx @langchain/langgraph-cli dev --port 54367
```

> [!NOTE]
> The first time running this command (or if a new version of `@langchain/langgraph-cli` has been released), it will ask you to accept an install for the CLI. Enter `y` to accept.

Once the server is ready, you can execute the following command to generate a post:

```bash
yarn generate_post
```

You may also modify this script to pass different URLs to generate posts for other content.


To view the output, either inspect it in LangSmith, or use Agent Inbox.


# Advanced Setup


To use all of the features of the Social Media Agent, you'll need the following:

- [Anthropic API](https://console.anthropic.com/) - General LLM
- [LangSmith](https://smith.langchain.com/) - LangSmith API key required to run the LangGraph server locally (free)
- [FireCrawl API](https://www.firecrawl.dev/) - Web scraping
- [Arcade](https://www.arcade.dev) - Social media authentication and scheduling
- [Twitter Developer Account](https://developer.twitter.com/en/portal/dashboard) - For uploading media to Twitter
- [LinkedIn Developer Account](https://developer.linkedin.com/) - Posting to LinkedIn
- [GitHub API](https://github.com/settings/personal-access-tokens) - Reading GitHub content

## Setup Instructions

### Clone the repository:

```bash
git clone 
```

```bash
cd social-media-agent
```

### Install dependencies:

```bash
yarn install
```

### Set environment variables.

Copy the values of the full env example file `.env.quickstart.example` to `.env`, then update the values as needed.

```bash
cp .env.quickstart.example .env
```

### Setup authentication

The agent needs your authorization to read and write to social media platforms. There are two ways to authorize the agent:

1. Use Arcade (quickest to set up)


#### Arcade setup

Create an Arcade account [here](https://www.arcade.dev). After you register, [get an Arcade API key](https://docs.arcade.dev/home/quickstart?lang=typescript). Set this value as `ARCADE_API_KEY` in your `.env` file.

Then, you will need to set these environment variables in your `.env` file:

- `TWITTER_USER_ID` - The ID/email of the Twitter account you want to use to post to Twitter.
- `LINKEDIN_USER_ID` - The ID/email of the LinkedIn account you want to use to post to LinkedIn.

Make sure you have the `USE_ARCADE_AUTH` environment variable set to `true` to have the graph use Arcade authentication.


#### Twitter app setup

You'll need to follow these instructions if you plan on uploading media to Twitter, and/or you are not using Arcade for authorization.

1. Create a Twitter developer account
2. Create a new app and give it a name.
3. Copy the `API Key`, `API Key Secret` user token , user secret token  and set them as `TWITTER_API_KEY`, `TWITTER_API_KEY_SECRET`, TWITTER_USER_TOKEN
TWITTER_USER_TOKEN_SECRET in your `.env` file.
4. After saving, visit the App Dashboard. Find the `User authentication settings` section, and click the `Set up` button. This is how you will authorize users to use the Twitter API on their behalf.
5. Set the following fields:

- `App permissions`: `Read and write`
- `Type of App`: `Web App, Automated App or Bot`
- `App info`:
  - `Callback URI/Redirect URL`: `http://localhost:3000/auth/twitter/callback`
  - `Website URL`: Your website URL

6. Save. You'll then be given a `Client ID` and `Client Secret`. Set these as `TWITTER_CLIENT_ID` and `TWITTER_CLIENT_SECRET` in your `.env` file.

Once done, run the `yarn start:auth` command to run the Twitter OAuth server. Open [http://localhost:3000](http://localhost:3000) in your browser, and click `Login with Twitter`.

After authorizing your account with the app, navigate to your terminal where you'll see a JSON object logged. Copy the `token` and `tokenSecret` values and set them as `TWITTER_USER_TOKEN` and `TWITTER_USER_TOKEN_SECRET` in your `.env` file.

#### LinkedIn app setup

You'll need to follow these instructions if you plan on posting to LinkedIn and are not using Arcade for authorization.

1. Create a new LinkedIn developer account, and app [here](https://developer.linkedin.com/)
2. After creating your app, navigate to the `Auth` tab, and add a new authorized redirect URL for OAuth 2.0. Set it to `http://localhost:3000/auth/linkedin/callback`
3. Go to the `Products` tab and enable the `Share on LinkedIn` and `Sign In with LinkedIn using OpenID Connect` products.



## Generate Post

Once all the setup steps have been completed, start your graph server by running:

```bash
yarn langgraph:in_mem:up
```

> [!NOTE]
> The first time running this command (or if a new version of `@langchain/langgraph-cli` has been released), it will ask you to accept an install for the CLI. Enter `y` to accept.

Once the server is ready, you can execute the following command to generate a post:

(before doing this, you should edit the file so that the text only mode is set to false: `[TEXT_ONLY_MODE]: false` if using advanced setup mode)

```bash
yarn generate_post
```

This will kick off a new run to generate a post on a social media platform based on the source URL configuration.

To view the output, either inspect it in LangSmith, or use [the Agent Inbox](#setup-agent-inbox).

You may also modify this script to pass different URLs to generate posts for other content.


# Setup Agent Inbox

The Agent Inbox is the easiest way to view interrupted events, and manage accepting, responding, or other allowed actions. To view your events in the inbox, you can either add your graph to the deployed version of the Agent Inbox, or clone & run the Agent Inbox locally.

## Using the deployed inbox

The Agent Inbox is setup in a way that allows for any graph --local or deployed-- to be added & accessed via the UI.

To add your local graph to the inbox, visit the deployed site here: [dev.agentinbox.ai](https://dev.agentinbox.ai/).

If it's your first time vising the site, you'll immediately be prompted to add a new graph. Fill out the form with the following values:

- Graph ID: `generate_post`
- Graph API URL: `http://localhost:54367`
- Name: (optional) `Generate Post (local)`

After saving, you should be able to view your graph in the inbox. If you do this after invoking your graph (and waiting for the thread to interrupt), it will automatically fetch the interrupted event.

## Using the local inbox

To run the Agent Inbox locally, follow the setup instructions [here](https://github.com/langchain-ai/agent-inbox/blob/main/README.md).

Once the web server is running, open your browser and visit [http://localhost:3000](http://localhost:3000). This will then prompt you to add your graph to the inbox.

Fill out the form with the following values:

- Graph ID: `generate_post`
- Graph API URL: `http://localhost:54367`
- Name: (optional) `Generate Post (local)`

## Using the Agent Inbox with a graph deployed on LangGraph Platform

The Agent Inbox can also be used with graph's deployed in production on LangGraph Platform. To use these graphs, the setup steps are the exact same, with the only difference being the graph API URL should be the URL of the deployed graph, and you're required to set a LangSmith API key. This is required to fetch & invoke the deployed graph. LangSmith API keys are stored in your browser's local storage, and never stored on the server.

# Customization

## Prompts

This agent is setup to generate posts for LangChain, using LangChain products as context. To use the agent for your own use case, you should update the following prompts/prompt sections inside the [`prompts`](./src/agents/generate-post/prompts/index.ts) folder:

- `BUSINESS_CONTEXT` - Context to be used when checking whether or not content is relevant to your business/use case.
- `TWEET_EXAMPLES` ([`prompts/examples.ts`](./src/agents/generate-post/prompts/examples.ts)) - A list of examples of posts you'd like the agent to use as a guide when generating the final post.
- `POST_STRUCTURE_INSTRUCTIONS` - A set of structure instructions for the agent to follow when generating the final post.
- `POST_CONTENT_RULES` - A set of general writing style/content guidelines for the agent to follow when generating a post.

The prompt for the marketing report is located in the [`generate-post/nodes/generate-report/prompts.ts`](./src/agents/generate-post/nodes/generate-report/prompts.ts) file. You likely don't need to update this, as it's already structured to be general.

## Post Style

There are two main prompts to modify to change the style of the posts.

1. Post structure instructions (`POST_STRUCTURE_INSTRUCTIONS`). These are the instructions the LLM will follow for how to structure the post generations. This should _not_ be where you specify tone, or writing style. This prompt is used to set the structure each post should follow. By default, it's prompted to include three parts: `Header`, `Body`, `Call to action`. When experimenting with this prompt this, try removing it completely, instead relying on the few-shot examples (`TWEET_EXAMPLES`) and the content rules (`POST_CONTENT_RULES`).
2. Few-shot examples (`TWEET_EXAMPLES`). These are the examples given to the LLM of which it's prompted to use as examples for style, content, tone and structure. This is arguably one of the most important parts of the prompt. Currently, these are set to a handful of Tweets by popular AI focused Twitter accounts. You should _definitely_ update these if you want to generate non-AI focused Tweets, instead with examples of Tweets/posts on your target content.
3. "Business context" (`BUSINESS_CONTEXT`). This prompt is used widely throughout the agent to provide context into your main goal of the social media agent. For us at LangChain, this prompt is used to describe the different LangChain products and services. The default prompt is focused on AI content, but should be updated/edited to match your use case. This prompt is used in verifying content is relevant for you, generating marketing reports, and generating tweets.

# Reference: Environment Variables, Mock vs. Live, & Limitations

## Environment Variables Configuration

The following environment variables configure the social media agent. Ensure these are set in your `.env` file:

| Variable | Description | Required / Optional |
|---|---|---|
| `LANGCHAIN_API_KEY` | LangSmith API key for monitoring, debugging, and tracing agent runs. | Optional (Recommended) |
| `LANGCHAIN_TRACING_V2` | Set to `true` to enable tracing to LangSmith. | Optional |
| `ANTHROPIC_API_KEY` | API key for Anthropic Claude (e.g., `claude-sonnet-4-5`) to generate posts and reports. | **Required** |
| `FIRECRAWL_API_KEY` | API key for FireCrawl web scraping to extract text from submitted URLs. | **Required** |
| `ARCADE_API_KEY` | API key for Arcade.dev to manage social authentication and post scheduling. | Required if `USE_ARCADE_AUTH="true"` |
| `USE_ARCADE_AUTH` | Set to `"true"` to use Arcade OAuth authentication for publishing. | Optional |
| `USE_ARCADE_AUTH_TWITTER` | Override to control whether Twitter uses Arcade auth. | Optional |
| `USE_ARCADE_AUTH_LINKEDIN` | Override to control whether LinkedIn uses Arcade auth. | Optional |
| `USE_TWITTER_API_ONLY` | Force direct Twitter API client authentication. | Optional |
| `TWITTER_API_KEY` / `TWITTER_API_KEY_SECRET` | Developer App key credentials for direct Twitter authentication. | Required if not using Arcade |
| `TWITTER_USER_TOKEN` / `TWITTER_USER_TOKEN_SECRET` | User access token credentials for posting to a specific Twitter profile. | Required if not using Arcade |
| `LINKEDIN_ACCESS_TOKEN` | OAuth Access Token for direct LinkedIn posting. | Required if not using Arcade |
| `LINKEDIN_PERSON_URN` | Person URN (e.g., `urn:li:person:abc`) for your LinkedIn user account. | Required if not using Arcade |
| `POST_TO_LINKEDIN_ORGANIZATION` | Set to `"true"` if you want posts published on behalf of a company page. | Optional |
| `LINKEDIN_ORGANIZATION_ID` | The ID of the LinkedIn company page admin account. | Required if posting to LinkedIn Org |
| `TWITTER_USER_ID` / `LINKEDIN_USER_ID` | Email/Username used for user lookup when connecting via Arcade auth. | Required for Arcade |
| `SKIP_CONTENT_RELEVANCY_CHECK` | Set to `"true"` to bypass content checks and accept all input URLs. | Optional |
| `SKIP_USED_URLS_CHECK` | Set to `"true"` to skip verification of whether a URL was previously posted. | Optional |
| `GITHUB_TOKEN` | Personal access token (read-only) for fetching details of GitHub URLs. | Required for GitHub URLs |
| `SOURCE_URL` | The fallback URL processed by the agent when running `yarn generate_post`. | Optional |
| `ENABLE_INSTAGRAM_UPLOAD` | Set to `"true"` to enable automatic Instagram posting (disabled by default). | Optional |

---

## What's Mocked vs. Live

To facilitate development, safety reviews, and testing, some operations behave as dry-runs or are sandboxed by default:

* **Live Components**:
  * **Scraping**: Reading URLs via Firecrawl or Playwright executes active network requests.
  * **Generations**: All LLM calls (Claude) actively hit the Anthropic API.
  * **OAuth Verification**: Authentication setups communicate directly with the Twitter, LinkedIn, and Arcade servers.
  * **Publishing**: Completed threads/posts are uploaded live to Twitter/LinkedIn using the configured API keys.
* **Mocked / Dry-run / Sandboxed Components**:
  * **Instagram Publishing**: By default, Instagram posts are review-only drafts that do not publish live. Set `ENABLE_INSTAGRAM_UPLOAD=true` to post live.
  * **Human Approval Interrupt**: Before publishing, the workflow stops at `humanNode`. Posts are only sent live once approved by a human through the Agent Inbox UI.

---

## Known Limitations

1. **Twitter Character Constraints & Truncation**:
   Twitter has a strict **280-character limit**.
   The uploader automatically prepends the signature spotlight prefix (e.g. `"LangChain Community Spotlight: "` which is 31 characters).
   Therefore, the actual budget for the generated post body is dynamically restricted to **255 minus the signature length** (approximately **224–255 characters**). If the post text exceeds this limit, the uploader will automatically truncate it with trailing ellipses `...` to prevent API errors.
2. **Arcade Media Uploads**:
   Arcade does not support direct binary media uploads to Twitter without additional developer console keys. For tweets containing images, direct developer tokens are required.
3. **Scraping Timeouts**:
   Sites using heavy client-side JavaScript may time out during extraction. Scraping failures will be logged locally to the `URL_checker_Log` file.
4. **Rate Limits**:
   Running large cron batches of links can trigger rate limiting from social media APIs or Firecrawl. The agent handles this by applying a progressive 30-second delay per link (60 seconds for Twitter links).

