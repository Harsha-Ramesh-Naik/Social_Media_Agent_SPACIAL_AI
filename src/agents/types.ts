export type DateType = Date | "p1" | "p2" | "p3" | "r1" | "r2" | "r3";

export type Image = { imageUrl: string; mimeType: string };

export type AdditionalContext = {
  /**
   * The string content from the link.
   */
  content: string;
  /**
   * The link from which the content was extracted.
   */
  link: string;
};

export type RepurposedPost = {
  /**
   * The content of the specific post.
   */
  content: string;
  /**
   * The index of the post in the series.
   */
  index: number;
};
