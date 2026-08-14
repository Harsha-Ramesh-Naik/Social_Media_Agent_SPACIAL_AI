import { ChatAnthropic } from "@langchain/anthropic";
import { z } from "zod";

const ROUTING_DECISION_PROMPT = `You are an AI assistant tasked with routing a user's response to one of two possible routes based on their intention. The two possible routes are:

1. Rewrite post - The user's response indicates they want to rewrite the generated post.
2. Update scheduled date - The user wants to update the scheduled date for the post. This can either be a new date or a priority level (P1, P2, P3).
3. Rewrite with split URL - Split the call to action URL in the post into a reply.

Here is the generated post:
<post>
{POST}
</post>

Here is the current date/priority level for scheduling the post:
<date-or-priority>
{DATE_OR_PRIORITY}
</date-or-priority>

Carefully analyze the user's response:
<user-response>
{USER_RESPONSE}
</user-response>

Based on the user's response, determine which of the two routes they intend to take. Consider the following:

1. If the user mentions editing, changing, or rewriting the content of the post, choose the "rewrite_post" route.
2. If the user mentions changing the date, time, or priority level of the post, choose the "update_date" route. Ensure you only call this if the user mentions a date, or one of P1, P2 or P3.

If the user's response can not be handled by one of the two routes, choose the "unknown_response" route.

Provide your answer in the following format:
<explanation>
[A brief explanation of why you chose this route based on the user's response]
</explanation>
(call the 'route' tool to choose the route)

Here are some examples of possible user responses and the corresponding routes:

Example 1:
User: "Can we change the wording in the second paragraph?"
Route: rewrite_post
Explanation: The user is requesting changes to the content of the post.

Example 2:
User: "Schedule this for next Tuesday."
Route: update_date
Explanation: The user wants to change the posting date.

Example 3:
User: "Split the URL from the post"
Route: rewrite_with_split_url
Explanation: The user wants to split the post into two unique posts, one without the URL and the second with the URL.

Example 4:
User: "This should be a P1 priority."
Route: update_date
Explanation: The user wants to change the priority level of the post.

Example 5:
User: "This should be a P0 priority."
Route: unknown_response
Explanation: P0 is not a valid priority level.

Example 6:
User: "Hi! How are you?"
Route: unknown_response
Explanation: The user is engaging in general conversation, not a request to change the post.

Example 7:
User: "Can you split the post into two?"
Route: rewrite_with_split_url
Explanation: The user wants to split the post into two unique posts, one without the URL and the second with the URL.

Once again, here is the users response:
<user-response>
{USER_RESPONSE}
</user-response>

Remember to always base your decision on the actual content of the user's response, not on these examples.`;

interface RoutingContextParams {
  post: string;
  dateOrPriority: string;
  userResponse: string;
}

/**
 * Fallback routing validator based on explicit keyword matching.
 * Quickly determines intent without invoking LLM tokens.
 */
function evaluateRouteUsingKeywords(userResponse: string):
  | "rewrite_post"
  | "update_date"
  | "rewrite_with_split_url"
  | "unknown_response" {
  const normalizedQuery = userResponse.trim().toLowerCase();
  if (!normalizedQuery) {
    return "unknown_response";
  }

  const contentEditKeywords = [
    "rewrite",
    "reword",
    "reframe",
    "rephrase",
    "phrase",
    "phrasing",
    "sentence",
    "sentences",
    "format",
    "reformat",
    "formatting",
    "short",
    "catchy",
    "snappy",
    "professional",
    "casual",
    "friendly",
    "creative",
    "tone",
    "style",
    "bullet",
    "bullets",
    "emoji",
    "emojis",
    "fix",
    "correct",
    "adjust",
    "wording",
    "paragraph",
    "paragraphs",
    "line",
    "lines",
    "modify",
    "edit",
    "change wording",
    "make it",
    "different way",
    "more concise",
    "different version",
    "improve",
    "shorter",
    "split the post",
    "split the url",
    "split the call to action",
  ];

  const schedulingKeywords = [
    "p1",
    "p2",
    "p3",
    "schedule",
    "date",
    "time",
    "tomorrow",
    "next week",
    "next monday",
    "next tuesday",
    "next wednesday",
    "next thursday",
    "next friday",
    "next saturday",
    "next sunday",
  ];

  const splitActionKeywords = [
    "split url",
    "split the url",
    "rewrite with split url",
    "split the post into two",
    "two posts",
  ];

  if (splitActionKeywords.some((pattern) => normalizedQuery.includes(pattern))) {
    return "rewrite_with_split_url";
  }

  if (contentEditKeywords.some((pattern) => normalizedQuery.includes(pattern))) {
    return "rewrite_post";
  }

  if (schedulingKeywords.some((pattern) => normalizedQuery.includes(pattern))) {
    return "update_date";
  }

  return "unknown_response";
}

/**
 * Orchestrator to route user feedback to the correct graph execution path.
 * Primarily uses LLM structured output, falling back to evaluateRouteUsingKeywords on failure.
 */
export async function routeResponse({
  post,
  dateOrPriority,
  userResponse,
}: RoutingContextParams) {
  const preEvaluatedRoute = evaluateRouteUsingKeywords(userResponse);
  if (preEvaluatedRoute !== "unknown_response") {
    return { route: preEvaluatedRoute } as z.infer<typeof intentRoutingSchema>;
  }

  const intentClassifierModel = new ChatAnthropic({
    model: "claude-sonnet-4-5",
    temperature: 0,
  });

  const intentRoutingSchema = z.object({
    route: z.enum([
      "rewrite_post",
      "update_date",
      "unknown_response",
      "rewrite_with_split_url",
    ]),
  });
  const structuredClassifier = intentClassifierModel.withStructuredOutput(intentRoutingSchema, {
    name: "route",
  });

  const preparedRoutingPrompt = ROUTING_DECISION_PROMPT.replace("{POST}", post)
    .replace("{DATE_OR_PRIORITY}", dateOrPriority)
    .replace("{USER_RESPONSE}", userResponse);

  try {
    const classifiedIntent = await structuredClassifier.invoke([
      {
        role: "user",
        content: preparedRoutingPrompt,
      },
    ]);

    if (!classifiedIntent || !classifiedIntent.route || classifiedIntent.route === "unknown_response") {
      return { route: "rewrite_post" } as z.infer<typeof intentRoutingSchema>;
    }

    return classifiedIntent;
  } catch (intentRoutingError) {
    console.warn(
      "routeResponse structured output parse failed; falling back to rewrite_post.",
      intentRoutingError,
    );

    return { route: "rewrite_post" } as z.infer<typeof intentRoutingSchema>;
  }
}
