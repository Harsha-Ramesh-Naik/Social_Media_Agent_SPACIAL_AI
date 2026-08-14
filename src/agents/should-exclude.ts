import { useLangChainPrompts } from "./utils.js";

export const LANGCHAIN_DOMAINS = [
  "langchain.com",
  "langchain.dev",
  "langchain-ai.github.io",
];

export function shouldExcludeGeneralContent(url: string): boolean {
  // Do not exclude any content if USE_LANGCHAIN_PROMPTS is not set to true.
  if (!useLangChainPrompts()) {
    return false;
  }

  // We don't want to generate posts on LangChain website content.
  if (LANGCHAIN_DOMAINS.some((lcUrl) => url.includes(lcUrl))) {
    return true;
  }

  return false;
}

export function shouldExcludeGitHubContent(link: string): boolean {
  // Do not exclude any content if USE_LANGCHAIN_PROMPTS is not set to true.
  if (!useLangChainPrompts()) {
    return false;
  }

  const langChainGitHubOrg = "github.com/langchain-ai/";
  // Do not generate posts on LangChain repos.
  return link.includes(langChainGitHubOrg);
}

export function shouldExcludeYouTubeContent(channelName: string): boolean {
  // Do not exclude any content if USE_LANGCHAIN_PROMPTS is not set to true.
  if (!useLangChainPrompts()) {
    return false;
  }

  return channelName.toLowerCase() === "langchain";
}

export function shouldExcludeTweetContent(externalUrls: string[]): boolean {
  // Do not exclude any content if USE_LANGCHAIN_PROMPTS is not set to true.
  if (!useLangChainPrompts()) {
    return false;
  }

  // If there are no external URLs, then we should exclude the tweet. Return true.
  return externalUrls.length === 0;
}
