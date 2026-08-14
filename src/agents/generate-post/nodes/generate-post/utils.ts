import { filterLinksForPostContent } from "../../../utils.js";

export function extractPlatformPosts(generation: string): {
  linkedinPost?: string;
  twitterPost?: string;
  instagramPost?: string;
} {
  const linkedinMatch = generation.match(/<linkedin-post>([\s\S]*?)<\/linkedin-post>/i);
  const twitterMatch = generation.match(/<twitter-post>([\s\S]*?)<\/twitter-post>/i);
  const instagramMatch = generation.match(/<instagram-post>([\s\S]*?)<\/instagram-post>/i);

  return {
    ...(linkedinMatch ? { linkedinPost: linkedinMatch[1].trim() } : {}),
    ...(twitterMatch ? { twitterPost: twitterMatch[1].trim() } : {}),
    ...(instagramMatch ? { instagramPost: instagramMatch[1].trim() } : {}),
  };
}

export function getPlatformPost(generation: string, platform: "linkedin" | "twitter" | "instagram"): string {
  const platformPostRegex = new RegExp(
    `<${platform}-post>([\\s\\S]*?)<\\/${platform}-post>`,
    "i",
  );
  const match = generation.match(platformPostRegex);
  if (match) {
    return match[1].trim();
  }

  return generation.trim();
}

/**
 * Parse the LLM generation to extract the post content.
 * If the report can not be parsed, the original generation is returned.
 * @param generation The text generation to parse
 * @returns The parsed generation, or the unmodified generation if it cannot be parsed
 */
export function parseGeneration(generation: string): string {
  const platformPosts = extractPlatformPosts(generation);
  if (platformPosts.linkedinPost && platformPosts.twitterPost) {
    return `${platformPosts.linkedinPost}\n\n---\n\n${platformPosts.twitterPost}`;
  }
  if (platformPosts.twitterPost) {
    return platformPosts.twitterPost;
  }
  if (platformPosts.linkedinPost) {
    return platformPosts.linkedinPost;
  }

  const reportMatch = generation.match(/<post>([\s\S]*?)<\/post>/i);
  if (!reportMatch) {
    console.warn(
      "Could not parse post from generation:\nSTART OF POST GENERATION\n\n",
      generation,
      "\n\nEND OF POST GENERATION",
    );
  }
  return reportMatch ? reportMatch[1].trim() : generation;
}

export function formatPrompt(report: string, relevantLinks: string[]): string {
  return `Here is the report I wrote on the content I'd like promoted by LangChain:
<report>
${report}
</report>

Here are the relevant links used to create the report.
You should remove tracking query parameters from the link, if present.
If you are unsure whether a link's parameters are tracking, do not remove them. It's better to have a link with tracking parameters than a broken link.
The links do NOT contribute to the post's length. They are temporarily removed from the post before the length is calculated, and re-added afterwards.
<links>
${filterLinksForPostContent(relevantLinks)}
</links>`;
}
