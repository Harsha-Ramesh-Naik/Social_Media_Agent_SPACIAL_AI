import { BaseStore } from "@langchain/langgraph";

export const NAMESPACE = ["saved_data", "latent_space"];
export const KEY = "links";
export const OBJECT_KEY = "data";

export async function putLatentSpaceLinks(
  links: string[],
  store: BaseStore | undefined,
) {
  if (!store) {
    throw new Error("No store provided");
  }
  await store.put(NAMESPACE, KEY, {
    [OBJECT_KEY]: links,
  });
}

export async function getLatentSpaceLinks(
  store: BaseStore | undefined,
): Promise<string[]> {
  if (!store) {
    throw new Error("No store provided");
  }
  const links = await store.get(NAMESPACE, KEY);
  if (!links) {
    return [];
  }
  return links.value?.[OBJECT_KEY] || [];
}
