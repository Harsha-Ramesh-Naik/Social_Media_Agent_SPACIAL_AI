import { END, START, StateGraph } from "@langchain/langgraph";
import {
  RepurposerPostInterruptAnnotation,
  RepurposerPostInterruptConfigurableAnnotation,
  RepurposerPostInterruptState,
} from "./types.js";
import { updateScheduledDate } from "../shared/nodes/update-scheduled-date.js";
import { schedulePost } from "../shared/nodes/generate-post/schedule-post.js";
import { rewritePost } from "./nodes/rewrite-posts.js";
import { humanNode } from "./nodes/human-node/index.js";

function rewriteOrEndConditionalEdge(
  state: RepurposerPostInterruptState,
): "rewritePost" | "schedulePost" | "humanNode" | typeof END {
  if (!state.next) {
    return END;
  }

  if (state.next === "unknownResponse") {
    // If the user's response is unknown, we should route back to the human node.
    return "humanNode";
  }
  return state.next;
}

const workflow = new StateGraph(
  RepurposerPostInterruptAnnotation,
  RepurposerPostInterruptConfigurableAnnotation,
)
  // Interrupts the node for human in the loop.
  .addNode("humanNode", humanNode)
  // Schedules the post for Twitter/LinkedIn.
  .addNode("schedulePost", schedulePost)
  // Rewrite a post based on the user's response.
  .addNode("rewritePost", rewritePost)
  // Updated the scheduled date from the natural language response from the user.
  .addNode("updateScheduleDate", updateScheduledDate)
  .addEdge(START, "humanNode")
  .addConditionalEdges("humanNode", rewriteOrEndConditionalEdge, [
    "rewritePost",
    "schedulePost",
    "updateScheduleDate",
    "humanNode",
    END,
  ])
  // Always route back to `humanNode` if the post was re-written or date was updated.
  .addEdge("rewritePost", "humanNode")
  .addEdge("updateScheduleDate", "humanNode")

  // Always end after scheduling the post.
  .addEdge("schedulePost", END);

export const repurposerPostInterruptGraph = workflow.compile();
repurposerPostInterruptGraph.name = "Repurposer Post Interrupt Graph";
