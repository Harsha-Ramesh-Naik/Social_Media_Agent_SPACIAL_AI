import { traceable } from "langsmith/traceable";
import { SlackClient } from "./client.js";
import { File } from "./types.js";

export function getUrlForPublicFile(file: File) {
  if (!file.permalink_public || !file.url_private) {
    return undefined;
  }

  const pubSecret = file.permalink_public.split("-").pop();
  return `${file.url_private}?pub_secret=${pubSecret}`;
}

async function getPublicFileUrlsFunc(
  fileIds: string[] | undefined,
): Promise<string[] | undefined> {
  if (!fileIds) return undefined;

  const slackClient = new SlackClient();

  try {
    const publicUrlPromises = fileIds.map(async (fileId) => {
      try {
        const publicFile = await slackClient.makeFilePublic(fileId);
        if (!publicFile.file) {
          return undefined;
        }

        return getUrlForPublicFile(publicFile.file as File);
      } catch (e: any) {
        const isAlreadyPublic = e?.message?.includes("already_public");
        if (!isAlreadyPublic) {
          console.error("Failed to make public URL for file ID:", fileId, e);
          return undefined;
        }

        // File has already been made public.
        // Attempt to get the URL from the file info endpoint
        try {
          const fileInfo = await slackClient.getPublicFile(fileId);
          if (!fileInfo.file) {
            return undefined;
          }

          return getUrlForPublicFile(fileInfo.file as File);
        } catch (e) {
          console.error("Failed to get public file:", fileId, e);
          return undefined;
        }
      }
    });

    return (await Promise.all(publicUrlPromises))
      .filter((u) => u !== undefined)
      .flat();
  } catch (e) {
    console.error(`Failed to make public URLs for file IDs:`, fileIds, e);
    return undefined;
  }
}

export const getPublicFileUrls = traceable(getPublicFileUrlsFunc, {
  name: "get_public_file_urls",
});
