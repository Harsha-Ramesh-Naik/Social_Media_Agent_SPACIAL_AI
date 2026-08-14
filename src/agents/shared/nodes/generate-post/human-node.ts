import { END, LangGraphRunnableConfig, interrupt } from "@langchain/langgraph";
import { BaseGeneratePostState, BaseGeneratePostUpdate } from "./types.js";
import { formatInTimeZone } from "date-fns-tz";
import { isTextOnly, processImageInput } from "../../../utils.js";
import {
  getNextSaturdayDate,
  parseDateResponse,
} from "../../../../utils/date.js";
import { routeResponse } from "../../../shared/nodes/route-response.js";
import { saveUsedUrls } from "../../../shared/stores/post-subject-urls.js";
import { HumanInterrupt, HumanResponse } from "@langchain/langgraph/prebuilt";
import { DateType } from "../../../types.js";

interface ConstructDescriptionArgs {
  unknownResponseDescription: string;
  report: string;
  originalLink: string;
  relevantLinks: string[];
  imageOptions?: string[];
  isTextOnlyMode: boolean;
}

function constructDescription({
  unknownResponseDescription,
  report,
  originalLink,
  relevantLinks,
  imageOptions,
  isTextOnlyMode,
}: ConstructDescriptionArgs): string {
  const linksText = `
<div style="background-color: #f8f9fa; border-left: 4px solid #1da1f2; padding: 12px; border-radius: 6px; margin: 10px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <strong style="color: #1c1e21;">Original Source URL:</strong> <a href="${originalLink}" target="_blank" style="color: #1da1f2; text-decoration: none; font-weight: bold;">${originalLink}</a>
  ${relevantLinks?.length ? `
  <br /><br />
  <strong style="color: #1c1e21;">Related Research URLs:</strong>
  <ul style="margin: 5px 0 0 20px; padding: 0;">
    ${relevantLinks.map(link => `<li style="margin-bottom: 4px;"><a href="${link}" target="_blank" style="color: #0056b3; text-decoration: none;">${link}</a></li>`).join("")}
  </ul>
  ` : ""}
</div>
`;

  const imageOptionsText =
    imageOptions?.length && !isTextOnlyMode
      ? `
<div style="margin-top: 20px; border-top: 1px solid #e1e8ed; padding-top: 15px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <h3 style="color: #1c1e21; font-size: 1.1em; margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">🖼️ Image Library Options</h3>
  <p style="color: #657786; font-size: 0.9em; margin-bottom: 12px;">Copy and paste one of these public image URLs into the <strong>'image'</strong> field to attach it to the post.</p>
  ${imageOptions.map((url, index) => `
    <div style="background-color: #f8f9fa; border: 1px solid #e1e8ed; border-radius: 6px; padding: 10px; margin-bottom: 10px;">
      <span style="background-color: #007bff; color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.8em; font-weight: bold;">${index === 0 ? "DEFAULT" : `OPTION ${index + 1}`}</span>
      <code style="display: block; background: #e9ecef; padding: 6px; border-radius: 4px; margin: 6px 0; font-size: 0.85em; word-break: break-all; color: #d63384;">${url}</code>
      <details style="margin-top: 4px;">
        <summary style="cursor: pointer; color: #007bff; font-weight: 500; font-size: 0.9em; outline: none;">🔍 Preview Image</summary>
        <div style="margin-top: 8px; text-align: center;">
          <img src="${url}" style="max-width: 100%; max-height: 220px; border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" />
        </div>
      </details>
    </div>
  `).join("")}
</div>`
      : "";

  const unknownResponseString = unknownResponseDescription
    ? `${unknownResponseDescription}\n\n`
    : "";

  const imageInstructionsString =
    imageOptions?.length && !isTextOnlyMode
      ? `To attach an image, paste a public image URL into the <strong>'image'</strong> field.<br />
         • Set to <code>remove</code> (or leave empty) to detach the image.<br />
         • Formats supported: <code>JPEG</code>, <code>PNG</code>, <code>GIF</code>, <code>WEBP</code>.`
      : isTextOnlyMode
        ? "<strong>Text only mode enabled.</strong> Image support is currently disabled."
        : "No images were found in the source content.";

  return `
${unknownResponseString}

<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1c1e21; line-height: 1.5;">

  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 18px 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 4px 12px rgba(118, 75, 162, 0.15);">
    <h1 style="margin: 0; font-size: 1.5em; font-weight: 800; display: flex; align-items: center; gap: 8px; letter-spacing: -0.5px;">⚡ Publisher Control Center</h1>
    <p style="margin: 4px 0 0 0; font-size: 0.9em; opacity: 0.85;">Review, polish, and configure scheduling details for your generated posts.</p>
  </div>

  <h3 style="color: #1c1e21; font-size: 1.15em; font-weight: 700; margin-bottom: 8px; border-bottom: 2px solid #e1e8ed; padding-bottom: 4px; display: flex; align-items: center; gap: 6px;">📥 Source Context</h3>
  ${linksText}

  ${imageOptionsText}

  <h3 style="color: #1c1e21; font-size: 1.15em; font-weight: 700; margin-top: 20px; margin-bottom: 10px; border-bottom: 2px solid #e1e8ed; padding-bottom: 4px; display: flex; align-items: center; gap: 6px;">⚙️ Action Matrix</h3>
  
  <div style="display: grid; grid-template-columns: 1fr; gap: 8px; margin-bottom: 20px;">
    <div style="background-color: #f8f9fa; border: 1px solid #e1e8ed; border-radius: 6px; padding: 10px; display: flex; align-items: center; gap: 10px;">
      <span style="background-color: #28a745; color: white; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 0.8em; min-width: 60px; text-align: center; display: inline-block;">ACCEPT</span>
      <span style="color: #495057; font-size: 0.85em;">Approves and queues all posts for immediate upload.</span>
    </div>
    <div style="background-color: #f8f9fa; border: 1px solid #e1e8ed; border-radius: 6px; padding: 10px; display: flex; align-items: center; gap: 10px;">
      <span style="background-color: #007bff; color: white; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 0.8em; min-width: 60px; text-align: center; display: inline-block;">EDIT</span>
      <span style="color: #495057; font-size: 0.85em;">Modify the posts in the text boxes directly and click Accept.</span>
    </div>
    <div style="background-color: #f8f9fa; border: 1px solid #e1e8ed; border-radius: 6px; padding: 10px; display: flex; align-items: center; gap: 10px;">
      <span style="background-color: #17a2b8; color: white; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 0.8em; min-width: 105px; text-align: center; display: inline-block;">SEND RESPONSE</span>
      <span style="color: #495057; font-size: 0.85em;">Type rewrite feedback (e.g. <i>"make it catchy"</i>) in the text field and click Send Response for AI Assist.</span>
    </div>
    <div style="background-color: #f8f9fa; border: 1px solid #e1e8ed; border-radius: 6px; padding: 10px; display: flex; align-items: center; gap: 10px;">
      <span style="background-color: #dc3545; color: white; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 0.8em; min-width: 60px; text-align: center; display: inline-block;">IGNORE</span>
      <span style="color: #495057; font-size: 0.85em;">Discards post scheduling and ends the workflow run.</span>
    </div>
  </div>

  <h3 style="color: #1c1e21; font-size: 1.15em; font-weight: 700; margin-top: 20px; margin-bottom: 10px; border-bottom: 2px solid #e1e8ed; padding-bottom: 4px; display: flex; align-items: center; gap: 6px;">📅 Smart Schedule Date</h3>
  
  <div style="background-color: #f8f9fa; border: 1px solid #e1e8ed; border-radius: 6px; padding: 12px; margin-bottom: 20px;">
    <p style="margin-top: 0; color: #495057; font-size: 0.9em;">Update scheduled date by typing in a natural timestamp (e.g. <code>12/25/2026 10:00 AM PST</code>) or set a priority queue tier:</p>
    <table style="width: 100%; border-collapse: collapse; font-size: 0.85em; text-align: left;">
      <tr style="border-bottom: 2px solid #dee2e6; color: #495057; font-weight: bold;">
        <th style="padding: 6px 4px;">Tier</th>
        <th style="padding: 6px 4px;">Distribution Strategy</th>
      </tr>
      <tr style="border-bottom: 1px solid #e1e8ed;">
        <td style="padding: 6px 4px; font-weight: 800; color: #dc3545;">P1</td>
        <td style="padding: 6px 4px; color: #657786;">Weekend Morning Spike (Sat/Sun 8:00 AM - 10:00 AM PST)</td>
      </tr>
      <tr style="border-bottom: 1px solid #e1e8ed;">
        <td style="padding: 6px 4px; font-weight: 800; color: #ffc107;">P2</td>
        <td style="padding: 6px 4px; color: #657786;">Weekday Opening & Weekend Lunch (Fri/Mon 8:00 - 10:00 AM OR Sat/Sun 11:30 AM - 1:00 PM PST)</td>
      </tr>
      <tr>
        <td style="padding: 6px 4px; font-weight: 800; color: #17a2b8;">P3</td>
        <td style="padding: 6px 4px; color: #657786;">Weekend Afternoon Catchup (Sat/Sun 1:00 PM - 5:00 PM PST)</td>
      </tr>
    </table>
  </div>

  <h3 style="color: #1c1e21; font-size: 1.15em; font-weight: 700; margin-top: 20px; margin-bottom: 10px; border-bottom: 2px solid #e1e8ed; padding-bottom: 4px; display: flex; align-items: center; gap: 6px;">📝 Source Ingestion Summary</h3>
  <div style="background-color: #fdfdfd; border: 1px dashed #ced4da; border-radius: 6px; padding: 12px; font-family: monospace; font-size: 0.85em; color: #495057; white-space: pre-wrap; max-height: 350px; overflow-y: auto;">
${report}
  </div>

</div>
`;
}

const getUnknownResponseDescription = (state: BaseGeneratePostState) => {
  if (state.next === "unknownResponse" && state.userResponse) {
    return `
<div style="background-color: #f8d7da; border-left: 5px solid #dc3545; color: #721c24; padding: 15px; border-radius: 6px; margin-bottom: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <h4 style="margin: 0 0 6px 0; font-weight: bold; font-size: 1.05em; display: flex; align-items: center; gap: 6px;">❌ Unknown Response: "${state.userResponse}"</h4>
  Please provide rewrite feedback (e.g. <i>"make it shorter"</i>) or set a valid schedule date/priority tier.
</div>
`;
  }
  return "";
};

export async function humanNode<
  State extends BaseGeneratePostState = BaseGeneratePostState,
  Update = BaseGeneratePostUpdate,
>(state: State, config: LangGraphRunnableConfig): Promise<Update> {
  if (!state.post) {
    throw new Error("No post found");
  }
  const isTextOnlyMode = isTextOnly(config);

  const unknownResponseDescription = getUnknownResponseDescription(state);
  const defaultDate = state.scheduleDate || getNextSaturdayDate();
  let defaultDateString = "";
  if (
    typeof state.scheduleDate === "string" &&
    ["p1", "p2", "p3"].includes(state.scheduleDate)
  ) {
    defaultDateString = state.scheduleDate as string;
  } else {
    defaultDateString = formatInTimeZone(
      defaultDate,
      "America/Los_Angeles",
      "MM/dd/yyyy hh:mm a z",
    );
  }

  const postArgs = state.complexPost
    ? {
        main_post: state.complexPost.main_post,
        reply_post: state.complexPost.reply_post,
      }
    : (() => {
        const originalLink = state.links?.[0];
        // Strip any full or partial URL the LLM may have added, then append the clean URL.
        // This matches what happens during upload so the user sees the true final tweet.
        const rawTwitter = state.twitterPost || state.post;
        let twitterBody = rawTwitter;
        if (originalLink) {
          twitterBody = rawTwitter
            .replace(originalLink, "")
            .replace(/\s*https?:\/\/\S*$/, "")
            .replace(/\s*https?:?\/?$/, "")
            .trimEnd();
        }
        const twitterForEditBox = originalLink
          ? `${twitterBody}\n\n${originalLink}`
          : twitterBody;

        return {
          linkedin_post: state.linkedinPost || state.post,
          twitter_post: twitterForEditBox,
          instagram_post: (state as any).instagramPost || state.post,
        };
      })();


  const interruptValue: HumanInterrupt = {
    action_request: {
      action: "Schedule LinkedIn/X post",
      args: {
        ...postArgs,
        date: defaultDateString,
        // Do not provide an image field if the mode is text only
        ...(!isTextOnlyMode && { image: state.image?.imageUrl ?? "" }),
      },
    },
    config: {
      allow_accept: true,
      allow_edit: true,
      allow_ignore: true,
      allow_respond: true,
    },
    description: constructDescription({
      report: state.report,
      originalLink: state.links[0],
      relevantLinks: state.relevantLinks || [],
      imageOptions: state.imageOptions,
      unknownResponseDescription,
      isTextOnlyMode,
    }),
  };

  // Save ALL links used to generate this post so that they are not used to generate future posts (duplicates).
  await saveUsedUrls([...(state.relevantLinks ?? []), ...state.links], config);

  const response = interrupt<HumanInterrupt[], HumanResponse[]>([
    interruptValue,
  ])[0];

  if (!["edit", "ignore", "accept", "response"].includes(response.type)) {
    throw new Error(
      `Unexpected response type: ${response.type}. Must be "edit", "ignore", "accept", or "response".`,
    );
  }
  if (response.type === "ignore") {
    return {
      next: END,
    } as Update;
  }
  if (!response.args) {
    throw new Error(
      `Unexpected response args: ${response.args}. Must be defined.`,
    );
  }

  if (response.type === "response") {
    if (typeof response.args !== "string") {
      throw new Error("Response args must be a string.");
    }

    const { route } = await routeResponse({
      post: state.post,
      dateOrPriority: defaultDateString,
      userResponse: response.args,
    });

    if (route === "rewrite_post") {
      return {
        userResponse: response.args,
        next: "rewritePost",
      } as Update;
    } else if (route === "update_date") {
      return {
        userResponse: response.args,
        next: "updateScheduleDate",
      } as Update;
    } else if (route === "rewrite_with_split_url") {
      return {
        userResponse: undefined,
        next: "rewriteWithSplitUrl",
      } as Update;
    }

    return {
      userResponse: response.args,
      next: "unknownResponse",
    } as Update;
  }

  if (typeof response.args !== "object") {
    throw new Error(
      `Unexpected response args type: ${typeof response.args}. Must be an object.`,
    );
  }
  if (!("args" in response.args)) {
    throw new Error(
      `Unexpected response args value: ${response.args}. Must be defined.`,
    );
  }

  const castArgs = response.args.args as unknown as Record<string, string>;

  const linkedinPost =
    castArgs.linkedin_post ||
    state.linkedinPost ||
    state.post;
  const twitterPost =
    castArgs.twitter_post ||
    state.twitterPost ||
    state.post;
  const instagramPost =
    castArgs.instagram_post || (state as any).instagramPost || state.post;
  const complexPost =
    castArgs.main_post && castArgs.reply_post
      ? {
          main_post: castArgs.main_post,
          reply_post: castArgs.reply_post,
        }
      : undefined;
  if (!complexPost && !linkedinPost && !twitterPost) {
    throw new Error(
      `Unexpected response args value. Must be defined.\n\nResponse args:\n${JSON.stringify(response.args, null, 2)}`,
    );
  }

  const postDateString = castArgs.date;
  let postDate: DateType | undefined;
  if (postDateString) {
    postDate = parseDateResponse(postDateString);
    if (!postDate) {
      throw new Error(
        "Invalid date provided.\n\n" +
          "Expected format: 'MM/dd/yyyy hh:mm a z' or 'P1'/'P2'/'P3' or leave empty to post now.\n\n" +
          `Received: '${postDateString}'`,
      );
    }
  }

  let imageState: { imageUrl: string; mimeType: string } | undefined =
    undefined;
  if (!isTextOnlyMode) {
    const processedImage = await processImageInput(castArgs.image);
    if (processedImage && processedImage !== "remove") {
      imageState = processedImage;
    } else if (processedImage === "remove") {
      imageState = undefined;
    } else {
      imageState = state.image;
    }
  }

  const finalPost = `${linkedinPost}\n\n---\n\n${twitterPost}`;

  return {
    next: "schedulePost",
    scheduleDate: postDate,
    ...(finalPost ? { post: finalPost } : {}),
    ...(linkedinPost ? { linkedinPost } : {}),
    ...(twitterPost ? { twitterPost } : {}),
    ...(instagramPost ? { instagramPost } : {}),
    ...(complexPost ? { complexPost } : {}),
    // TODO: Update so if the mime type is blacklisted, it re-routes to human node with an error message.
    image: imageState,
    userResponse: undefined,
  } as Update;
}
