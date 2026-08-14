import "dotenv/config";
import { Client } from "@langchain/langgraph-sdk";
import { Image } from "../src/agents/types.js";
import { createSupabaseClient } from "../src/utils/supabase.js";

async function getInterrupts(client: Client) {
  const interrupts = await client.threads.search({
    status: "interrupted",
    limit: 1000,
  });
  return interrupts;
}

async function updateImageUrls(
  values: Record<string, any> & { image?: Image; imageOptions?: string[] },
): Promise<Record<string, any>> {
  if (!values.image && !values.imageOptions) return values;
  if (!process.env.SUPABASE_URL) return values;

  const bucketUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/images/`;

  const supabase = createSupabaseClient();

  if (
    values.image?.imageUrl.startsWith(bucketUrl) &&
    values.image.imageUrl.endsWith(".jpeg")
  ) {
    const path = values.image.imageUrl.split(bucketUrl).pop();
    if (!path) {
      throw new Error("Invalid image URL" + values.image.imageUrl);
    }
    const expiresIn = 60 * 60 * 24 * 180; // 90 days
    const { data: signedUrlData } = await supabase.storage
      .from("images")
      .createSignedUrl(path, expiresIn);

    if (!signedUrlData) {
      throw new Error(
        "[value.image.imageUrl] Failed to create signed URL for image" +
          values.image.imageUrl,
      );
    }
    values.image.imageUrl = signedUrlData.signedUrl;
  }

  const imageOptionsPromise = values.imageOptions?.map(async (url) => {
    if (!url.startsWith(bucketUrl) || !url.endsWith(".jpeg")) {
      // Not a supabase URL. can return
      return url;
    }
    const path = url.split(bucketUrl).pop();
    if (!path) {
      throw new Error("[value.imageOptions] Invalid image URL" + url);
    }
    const expiresIn = 60 * 60 * 24 * 180; // 90 days
    const { data: signedUrlData } = await supabase.storage
      .from("images")
      .createSignedUrl(path, expiresIn);

    if (!signedUrlData) {
      throw new Error(
        "[value.imageOptions] Failed to create signed URL for image" + path,
      );
    }
    return signedUrlData.signedUrl;
  });

  if (imageOptionsPromise) {
    values.imageOptions = await Promise.all(imageOptionsPromise);
  }

  return values;
}

export async function redoInterrupts() {
  const client = new Client({
    apiUrl: process.env.LANGGRAPH_API_URL,
  });

  const allInterrupts = await getInterrupts(client);
  const interrupts = [allInterrupts[9]];

  for await (const item of interrupts) {
    const values = item.values as Record<string, any>;

    console.log("values BEFORE:");
    console.dir(
      {
        image: values.image,
        imageOptions: values.imageOptions,
      },
      { depth: null },
    );
    const updatedValues = await updateImageUrls(values);

    console.log("updatedValues:");
    console.dir(
      {
        image: updatedValues.image,
        imageOptions: updatedValues.imageOptions,
      },
      { depth: null },
    );

    console.log("item.thread_id", item.thread_id);

    await client.runs.create(item.thread_id, "generate_post", {
      command: {
        update: {
          ...updatedValues,
        },
        goto: "humanNode",
      },
    });
  }
}

redoInterrupts().catch(console.error);

export async function getAllRuns() {
  const client = new Client({
    apiUrl: process.env.LANGGRAPH_API_URL,
  });
  const threads = await client.threads.search({
    status: "interrupted",
    limit: 1000,
  });
  console.log("threads", threads.length);

  for (const { thread_id } of threads) {
    const runs = await client.runs.list(thread_id);
    await Promise.all(runs.map((r) => client.runs.delete(thread_id, r.run_id)));
    await client.threads.delete(thread_id);
  }
}

// getAllRuns().catch(console.error);
