import { END, START, StateGraph } from "@langchain/langgraph";
import {
  CuratedPostInterruptAnnotation,
  CuratedPostInterruptConfigurableAnnotation,
  CuratedPostInterruptState,
  CuratedPostInterruptUpdate,
} from "./types.js";
import { updateScheduledDate } from "../shared/nodes/update-scheduled-date.js";
import { humanNode } from "../shared/nodes/generate-post/human-node.js";
import { schedulePost } from "../shared/nodes/generate-post/schedule-post.js";
import { rewritePost } from "../shared/nodes/generate-post/rewrite-post.js";

function rewriteOrEndConditionalEdge(
  state: CuratedPostInterruptState,
):
  | "rewritePost"
  | "schedulePost"
  | "humanNode"
  | "updateScheduleDate"
  | typeof END {
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
  CuratedPostInterruptAnnotation,
  CuratedPostInterruptConfigurableAnnotation,
)
  // Interrupts the node for human in the loop.
  .addNode(
    "humanNode",
    humanNode<CuratedPostInterruptState, CuratedPostInterruptUpdate>,
  )
  // Schedules the post for Twitter/LinkedIn.
  .addNode(
    "schedulePost",
    schedulePost<CuratedPostInterruptState, CuratedPostInterruptUpdate>,
  )
  // Rewrite a post based on the user's response.
  .addNode(
    "rewritePost",
    rewritePost<CuratedPostInterruptState, CuratedPostInterruptUpdate>,
  )
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

export const curatedPostInterruptGraph = workflow.compile();
curatedPostInterruptGraph.name = "Curated Post Interrupt Graph";
