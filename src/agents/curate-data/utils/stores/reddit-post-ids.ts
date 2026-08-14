import { BaseStore } from "@langchain/langgraph";

export const NAMESPACE = ["saved_data", "reddit"];
export const KEY = "post_ids";
export const OBJECT_KEY = "data";

export async function putRedditPostIds(
  postIds: string[],
  store: BaseStore | undefined,
) {
  if (!store) {
    throw new Error("No store provided");
  }
  await store.put(NAMESPACE, KEY, {
    [OBJECT_KEY]: postIds,
  });
}

export async function getRedditPostIds(
  store: BaseStore | undefined,
): Promise<string[]> {
  if (!store) {
    throw new Error("No store provided");
  }
  const savedPostIds = await store.get(NAMESPACE, KEY);
  if (!savedPostIds) {
    return [];
  }
  return savedPostIds.value?.[OBJECT_KEY] || [];
}
