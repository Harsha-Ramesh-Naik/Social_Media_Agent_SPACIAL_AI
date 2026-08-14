# Reflection - Social Media Agent

This document outlines the design decisions, prompt engineering strategies, and future roadmap for the Social Media Agent.

---

## ⚖️ Tradeoffs Made & Rationale

1. **Dynamic Length Checks vs. Hard Truncation**
   To prevent Twitter posts from getting truncated with trailing ellipses `...`, we replaced the hardcoded `280` limit with a runtime calculation (`getMaxTwitterBodyLength()`). This subtracts signature prefixes (31 characters) and URL redirects (25 characters) to establish a safe body limit (224–255 characters). While this couples prompt checks to configuration values, it ensures high-quality posts without truncation bugs.
2. **Graceless Cutoff vs. LLM Condensation**
   We chose to execute a dedicated `condensePost` loop using Claude rather than relying on regex slicing. It is more expensive computationally but results in coherent copy, preserving structural meaning rather than cutting off sentences mid-word.
3. **Basic Quickstart vs. Advanced Setup**
   We defaulted to text-only mode for quickstarts to lower setup friction (skipping Supabase/Vertex AI setup), trading off rich media support for speed of deployment.

---

## Prompt Engineering Approach

We structured prompts dynamically by explicitly defining the **Audience, Platform Constraints, and Tone** for each target platform inside the system prompts. This provides the LLM with multi-dimensional guardrails:

### 👥 Audience Framing
We define the exact target demographic to align the vocabulary and context:
* **LinkedIn**: tech professionals, engineering managers, and CTOs (requires focus on developer velocity, technical value, and high-level strategy).
* **X / Twitter**: fast-moving developers, creators, and tech enthusiasts looking for quick, high-signal technical news.
* **Instagram**: visual-first community members and general tech creators.

### ⛓️ Platform Constraints
Constraints force compliance with platform layouts and limits:
* **LinkedIn**: allows longer text format, supports structured paragraph breaks, bold key details, and exactly 1-3 hashtags.
* **X / Twitter**: strict dynamic budget limits (usually 224-255 characters for the body text) to accommodate links and spotlights. Zero hashtags allowed.
* **Instagram**: caption-first layout paired with visuals. Instructed to keep call-to-actions text-based (no clickable links in captions) and avoid bio/profile redirect jargon.

### 🗣️ Tone & Style Alignment
The tone acts as a voice filter for the copy:
* **LinkedIn**: professional, insightful, and value-oriented.
* **X / Twitter**: punchy, direct, energetic, and highly scannable.
* **Instagram**: casual, friendly, community-oriented, and storytelling-driven.

---

## Future Roadmap: A Full Sprint Horizon

Given a full sprint, this agent would evolve into a production-grade content engine:
* **Dynamic Few-Shot Retrievals**: Use RAG to query historical tweets, choosing templates that align with the input URL's topic (e.g. research papers vs. feature releases).
* **Multi-Image Graphic Renderers**: Integrate DALL-E / Canva SDKs to auto-generate customized marketing infographics based on the scraped content.
* **Conversational HITL**: Enable a direct chat interface inside the Agent Inbox so human editors can instruct the agent to make specific revisions interactively.
