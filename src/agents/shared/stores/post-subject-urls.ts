import { LangGraphRunnableConfig } from "@langchain/langgraph";
import { skipUsedUrlsCheck } from "../../utils.js";

const NAMESPACE = ["saved_data", "used_urls"];
const KEY = "urls";
const OBJECT_KEY = "data";

/**
 * Save a list of URLs of which have been included in posts already.
 *
 * @param urls The list of URLs to save
 * @param config The configuration for the langgraph
 * @param overwrite Whether to overwrite the stored URLs if they already exist.
 *  If true, it will overwrite. If false (default), it will first fetch the current stored URLs and add the new ones.
 * @returns {Promise<void>}
 */
export async function saveUsedUrls(
  urls: string[],
  config: LangGraphRunnableConfig,
  overwrite = false,
): Promise<void> {
  if (await skipUsedUrlsCheck(config.configurable)) {
    return;
  }

  const store = config.store;
  if (!store) {
    throw new Error("No store provided");
  }

  const urlsToSaveSet = new Set(urls);
  if (!overwrite) {
    const existingUrls = await getSavedUrls(config);
    existingUrls.forEach((url) => urlsToSaveSet.add(url));
  }

  await store.put(NAMESPACE, KEY, {
    [OBJECT_KEY]: Array.from(urlsToSaveSet),
  });
}

/**
 * Get the list of URLs of which have been included in posts already.
 *
 * @param config The configuration for the langgraph
 * @returns {Promise<string[]>} The list of URLs which have been included in posts already.
 */
export async function getSavedUrls(
  config: LangGraphRunnableConfig,
): Promise<string[]> {
  if (await skipUsedUrlsCheck(config.configurable)) {
    return [];
  }

  const store = config.store;
  if (!store) {
    throw new Error("No store provided");
  }
  const urls = await store.get(NAMESPACE, KEY);
  if (!urls) {
    return [];
  }
  return urls.value?.[OBJECT_KEY] || [];
}
