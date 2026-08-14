import { END, START, StateGraph } from "@langchain/langgraph";
import {
  RepurposerGraphAnnotation,
  RepurposerInputAnnotation,
  RepurposerConfigurableAnnotation,
} from "./types.js";
import { extractContent } from "./nodes/extract-content/index.js";
import { generateCampaignPlan } from "./nodes/generate-campaign-plan.js";
import { generatePosts } from "./nodes/generate-posts.js";
import { generateReportGraph } from "../generate-report/index.js";
import { validateImages } from "./nodes/validate-images.js";
import { startInterruptGraphRuns } from "./nodes/start-interrupt-graph.js";

const repurposerBuilder = new StateGraph(
  {
    stateSchema: RepurposerGraphAnnotation,
    input: RepurposerInputAnnotation,
  },
  RepurposerConfigurableAnnotation,
)
  .addNode("extractContent", extractContent)
  .addNode("validateImages", validateImages)
  .addNode("generateReport", generateReportGraph)
  .addNode("generateCampaignPlan", generateCampaignPlan)
  .addNode("generatePosts", generatePosts)
  .addNode("startInterruptGraphRuns", startInterruptGraphRuns)

  .addEdge(START, "extractContent")
  .addEdge("extractContent", "validateImages")
  .addEdge("validateImages", "generateReport")
  .addEdge("generateReport", "generateCampaignPlan")
  .addEdge("generateCampaignPlan", "generatePosts")
  .addEdge("generatePosts", "startInterruptGraphRuns")
  .addEdge("startInterruptGraphRuns", END);

export const repurposerGraph = repurposerBuilder.compile();

repurposerGraph.name = "Repurposer Graph";
