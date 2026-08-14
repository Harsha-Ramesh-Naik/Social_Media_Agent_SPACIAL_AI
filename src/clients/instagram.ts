export interface InstagramMediaPostRequest {
  caption: string;
  imageUrl: string;
  mediaType?: "IMAGE" | "VIDEO";
}

export interface InstagramScheduledPostRequest extends InstagramMediaPostRequest {
  publishTime: Date;
}

export class InstagramClient {
  private readonly accessToken: string;
  private readonly igUserId: string;

  constructor(input: { accessToken: string; igUserId: string }) {
    if (!input.accessToken) {
      throw new Error("Missing Instagram access token.");
    }
    if (!input.igUserId) {
      throw new Error("Missing Instagram business account ID.");
    }

    this.accessToken = input.accessToken;
    this.igUserId = input.igUserId;
  }

  static fromEnv(): InstagramClient {
    const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
    const igUserId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;

    if (!accessToken || !igUserId) {
      throw new Error(
        "Instagram auth is not configured. Set INSTAGRAM_ACCESS_TOKEN and INSTAGRAM_BUSINESS_ACCOUNT_ID.",
      );
    }

    return new InstagramClient({ accessToken, igUserId });
  }

  private async makeRequest<T>(
    endpoint: string,
    body: Record<string, string | number | boolean | undefined>,
  ): Promise<T> {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ...body, access_token: this.accessToken }),
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(
        `Instagram API error (${response.status}): ${JSON.stringify(payload)}`,
      );
    }

    return payload as T;
  }

  async createMediaPost({
    caption,
    imageUrl,
    mediaType = "IMAGE",
  }: InstagramMediaPostRequest): Promise<{ id?: string; creation_id?: string }> {
    if (!imageUrl) {
      throw new Error("Instagram image posts require an image URL.");
    }

    const mediaResponse = await this.makeRequest<{ id?: string; creation_id?: string }>(
      `https://graph.facebook.com/v20.0/${this.igUserId}/media`,
      {
        caption,
        image_url: imageUrl,
        media_type: mediaType,
        is_carousel_item: false,
      },
    );

    const creationId = mediaResponse.id || mediaResponse.creation_id;
    if (!creationId) {
      throw new Error("Instagram media creation response did not include an ID.");
    }

    const publishResponse = await this.makeRequest<{ id?: string }>(
      `https://graph.facebook.com/v20.0/${this.igUserId}/media_publish`,
      {
        creation_id: creationId,
      },
    );

    return publishResponse;
  }

  async scheduleMediaPost({
    caption,
    imageUrl,
    mediaType = "IMAGE",
    publishTime,
  }: InstagramScheduledPostRequest): Promise<{ id?: string; creation_id?: string }> {
    if (!imageUrl) {
      throw new Error("Instagram scheduled posts require an image URL.");
    }

    const publishTimestamp = Math.floor(publishTime.getTime() / 1000);

    const mediaResponse = await this.makeRequest<{ id?: string; creation_id?: string }>(
      `https://graph.facebook.com/v20.0/${this.igUserId}/media`,
      {
        caption,
        image_url: imageUrl,
        media_type: mediaType,
        publish_time: publishTimestamp,
      },
    );

    const creationId = mediaResponse.id || mediaResponse.creation_id;
    if (!creationId) {
      throw new Error("Instagram media creation response did not include an ID.");
    }

    return mediaResponse;
  }
}
