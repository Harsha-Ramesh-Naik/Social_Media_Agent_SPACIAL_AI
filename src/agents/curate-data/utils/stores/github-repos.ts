import { BaseStore } from "@langchain/langgraph";

export const NAMESPACE = ["saved_data", "github_repos"];
export const KEY = "urls";
export const OBJECT_KEY = "data";

export async function putGitHubRepoURLs(
  repoUrls: string[],
  store: BaseStore | undefined,
) {
  if (!store) {
    throw new Error("No store provided");
  }
  await store.put(NAMESPACE, KEY, {
    [OBJECT_KEY]: repoUrls,
  });
}

export async function getGitHubRepoURLs(
  store: BaseStore | undefined,
): Promise<string[]> {
  if (!store) {
    throw new Error("No store provided");
  }
  const repoUrls = await store.get(NAMESPACE, KEY);
  if (!repoUrls) {
    return [];
  }
  return repoUrls.value?.[OBJECT_KEY] || [];
}
