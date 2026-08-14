import { describe, it, expect } from "@jest/globals";
process.env.POST_SPOTLIGHT_PREFIX = "LangChain Community Spotlight:";
import { ensureSignature } from "./index.js";
import { getMaxTwitterBodyLength } from "../utils.js";

describe("ensureSignature", () => {
  const PREFIX = "LangChain Community Spotlight:";

  describe("removes old signature text", () => {
    it("should remove 'Made by the LangChain Community' with newlines before and after", () => {
      const input = `${PREFIX} Project Name 🚀

Made by the LangChain Community

This is the content.`;

      const result = ensureSignature(input);

      expect(result).not.toContain("Made by the LangChain Community");
      expect(result).toBe(`${PREFIX} Project Name 🚀

This is the content.`);
    });

    it("should remove old signature case-insensitively", () => {
      const input = `${PREFIX} Project 🚀

MADE BY THE LANGCHAIN COMMUNITY

Content here.`;

      const result = ensureSignature(input);

      expect(result).not.toContain("MADE BY THE LANGCHAIN COMMUNITY");
      expect(result).toBe(`${PREFIX} Project 🚀

Content here.`);
    });

    it("should remove old signature with mixed case", () => {
      const input = `${PREFIX} Project 🚀

Made By The Langchain Community

Content here.`;

      const result = ensureSignature(input);

      expect(result).not.toContain("Made By The Langchain Community");
    });

    it("should handle old signature at the end of text", () => {
      const input = `${PREFIX} Project 🚀

Content here.

Made by the LangChain Community`;

      const result = ensureSignature(input);

      expect(result).not.toContain("Made by the LangChain Community");
      expect(result).toBe(`${PREFIX} Project 🚀

Content here.`);
    });

    it("should handle old signature at the start of text", () => {
      const input = `Made by the LangChain Community

Content here.`;

      const result = ensureSignature(input);

      expect(result).not.toContain("Made by the LangChain Community");
      expect(result).toContain(PREFIX);
      expect(result).not.toMatch(/^\n/);
    });
  });

  describe("handles newlines properly", () => {
    it("should not leave more than one blank line (two newlines)", () => {
      const input = `${PREFIX} Project 🚀

Made by the LangChain Community

Content here.`;

      const result = ensureSignature(input);

      expect(result).not.toMatch(/\n{3,}/);
    });

    it("should not have leading newlines", () => {
      const input = `Made by the LangChain Community

${PREFIX} Project 🚀

Content here.`;

      const result = ensureSignature(input);

      expect(result).not.toMatch(/^\n/);
    });

    it("should preserve single paragraph breaks", () => {
      const input = `${PREFIX} Project 🚀

Made by the LangChain Community

First paragraph.

Second paragraph.`;

      const result = ensureSignature(input);

      expect(result).toBe(`${PREFIX} Project 🚀

First paragraph.

Second paragraph.`);
    });

    it("should normalize multiple blank lines to single blank line", () => {
      const input = `${PREFIX} Project 🚀



Made by the LangChain Community



Content here.`;

      const result = ensureSignature(input);

      expect(result).not.toMatch(/\n{3,}/);
      expect(result).toBe(`${PREFIX} Project 🚀

Content here.`);
    });
  });

  describe("adds prefix when missing", () => {
    it("should add prefix if not present", () => {
      const input = `Project Name 🚀

Some content here.`;

      const result = ensureSignature(input);

      expect(result).toContain(PREFIX);
      expect(result.startsWith(PREFIX)).toBe(true);
    });

    it("should not add prefix if already present", () => {
      const input = `${PREFIX} Project Name 🚀

Some content here.`;

      const result = ensureSignature(input);

      const prefixCount = (
        result.match(/LangChain Community Spotlight:/gi) || []
      ).length;
      expect(prefixCount).toBe(1);
    });

    it("should handle prefix check case-insensitively", () => {
      const input = `langchain community spotlight: Project 🚀

Content here.`;

      const result = ensureSignature(input);

      const prefixCount = (
        result.match(/LangChain Community Spotlight:/gi) || []
      ).length;
      expect(prefixCount).toBe(1);
    });
  });

  describe("handles combined scenarios", () => {
    it("should remove old signature AND add prefix if both issues exist", () => {
      const input = `Project Name 🚀

Made by the LangChain Community

Content here.`;

      const result = ensureSignature(input);

      expect(result).not.toContain("Made by the LangChain Community");
      expect(result).toContain(PREFIX);
      expect(result).not.toMatch(/\n{3,}/);
    });

    it("should handle text that is already correct", () => {
      const input = `${PREFIX} Project Name 🚀

Content here.

https://example.com`;

      const result = ensureSignature(input);

      expect(result).toBe(input);
    });

    it("should handle real-world post format", () => {
      const input = `LangChain Community Spotlight: 🧠 HMLR: Long-Term Memory for AI Agents

Made by the LangChain Community

HMLR adds long-term memory to AI agents via LangGraph drop-in. Perfect RAGAS scores on hardest benchmarks using GPT-4.1-mini, maintains context across days/weeks without token

🔗 Try it: https://github.com/example/hmlr`;

      const result = ensureSignature(input);

      expect(result).not.toContain("Made by the LangChain Community");
      expect(result).toContain("LangChain Community Spotlight:");
      expect(result).toContain("HMLR adds long-term memory");
      expect(result).toContain("https://github.com/example/hmlr");
      expect(result).not.toMatch(/\n{3,}/);
    });
  });

  describe("spacing edge cases", () => {
    it("should have exactly one blank line between header and content after removal", () => {
      const input = `${PREFIX} Project 🚀

Made by the LangChain Community

Content starts here.`;

      const result = ensureSignature(input);
      const lines = result.split("\n");

      expect(lines[0]).toBe(`${PREFIX} Project 🚀`);
      expect(lines[1]).toBe("");
      expect(lines[2]).toBe("Content starts here.");
      expect(lines.length).toBe(3);
    });

    it("should not have double blank lines anywhere", () => {
      const input = `${PREFIX} Project 🚀


Made by the LangChain Community


First paragraph.


Second paragraph.`;

      const result = ensureSignature(input);

      expect(result).not.toMatch(/\n\n\n/);
    });

    it("should handle signature with no content after it", () => {
      const input = `${PREFIX} Project 🚀

Made by the LangChain Community`;

      const result = ensureSignature(input);

      expect(result).toBe(`${PREFIX} Project 🚀`);
      expect(result).not.toMatch(/\n$/);
    });

    it("should handle signature as the only content", () => {
      const input = `Made by the LangChain Community`;

      const result = ensureSignature(input);

      expect(result).toBe(`${PREFIX} `);
      expect(result).not.toContain("Made by the LangChain Community");
    });

    it("should handle multiple paragraphs correctly", () => {
      const input = `${PREFIX} Project 🚀

Made by the LangChain Community

First paragraph here.

Second paragraph here.

https://example.com`;

      const result = ensureSignature(input);

      expect(result).toBe(`${PREFIX} Project 🚀

First paragraph here.

Second paragraph here.

https://example.com`);
    });

    it("should handle bullet points correctly", () => {
      const input = `${PREFIX} AI Travel Agent ✈️

Made by the LangChain Community

Features:
- Stateful Interactions
- Human-in-the-Loop
- Dynamic LLMs

https://github.com/example`;

      const result = ensureSignature(input);

      expect(result).toBe(`${PREFIX} AI Travel Agent ✈️

Features:
- Stateful Interactions
- Human-in-the-Loop
- Dynamic LLMs

https://github.com/example`);
    });
  });
});

describe("getMaxTwitterBodyLength", () => {
  const originalPrefix = process.env.POST_SPOTLIGHT_PREFIX;
  const originalUsePrompts = process.env.USE_LANGCHAIN_PROMPTS;

  afterEach(() => {
    process.env.POST_SPOTLIGHT_PREFIX = originalPrefix;
    process.env.USE_LANGCHAIN_PROMPTS = originalUsePrompts;
  });

  it("should calculate correct length with POST_SPOTLIGHT_PREFIX env set", () => {
    process.env.POST_SPOTLIGHT_PREFIX = "LangChain Community Spotlight:";
    // 255 - ("LangChain Community Spotlight:".length + 1) = 255 - 31 = 224
    expect(getMaxTwitterBodyLength()).toBe(224);
  });

  it("should calculate correct length with custom prefix", () => {
    process.env.POST_SPOTLIGHT_PREFIX = "Custom Prefix:";
    // 255 - ("Custom Prefix:".length + 1) = 255 - 15 = 240
    expect(getMaxTwitterBodyLength()).toBe(240);
  });

  it("should calculate correct length with no prefix spotlight", () => {
    delete process.env.POST_SPOTLIGHT_PREFIX;
    process.env.USE_LANGCHAIN_PROMPTS = "false";
    
    // 255 - 0 = 255
    expect(getMaxTwitterBodyLength()).toBe(255);
  });
});
