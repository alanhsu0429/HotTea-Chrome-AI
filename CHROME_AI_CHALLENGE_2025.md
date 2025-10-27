# HotTea 🍵

## Inspiration

Reading news has become exhausting - dense articles, formal language, and no way to interact. We wanted to transform this experience into something as natural as chatting with friends at a tea house.

Chrome's Built-in AI made this possible with local processing, zero backend costs, and instant access. HotTea turns any news article into an engaging conversation where the key figures share insider perspectives directly with you.

## What it does

HotTea transforms news articles into engaging friend group conversations using Chrome's Built-in AI:

**Multi-Character Conversations**: Automatically identifies all key figures in the news and creates dynamic dialogues where they interact with each other and the user. An Nvidia earnings report becomes a 5-person chat with Jensen Huang, analysts, and industry experts.

**Progressive Streaming**: Messages appear one by one with typing animations using JSON Lines streaming, making it feel like a real chat app.

**Intelligent Q&A**: Context-aware follow-up questions with relevance scoring (0-100) and AI-generated suggested questions to guide deeper exploration.

**Smart Content Extraction**: 3-layer architecture (structured data → Readability → site-specific rules) supports 40+ news sites with quality validation.

## How we built it

**Chrome Extension (Manifest V3)**: Vanilla JavaScript with Chrome Side Panel API for native browser integration. Modular architecture separates content extraction, AI processing, and UI rendering.

**Prompt API Integration**: Complete rewrite from Gemini API to Chrome's Built-in AI. Implemented session reuse for Q&A (66% faster - 3s to 1s) and one-time sessions for dialogues to avoid context contamination.

**JSON Lines Streaming Parser**: Custom buffering system handles incomplete chunks, markdown cleanup, and progressive message display with typing animations.

**Prompt Engineering**: Reduced from 111 lines to 40 lines (64% reduction) by removing restrictive rules and embracing concise instructions that work better with local AI models.

## Challenges we ran into

**Session Management**: Initially destroyed Prompt API sessions after each Q&A, causing 2s overhead every time. Learned that sessions are stateless - context is controlled manually via `qaHistory` array. Keeping sessions alive reduced Q&A time from 3s to 1s.

**JSON Lines Parsing**: Streaming returns incomplete chunks mid-JSON. Built robust buffer system to handle split JSONs, markdown-wrapped responses, and multi-line content.

**Multi-Character Generation**: Original prompt limited to "2-3 key figures" and required "exact names as they appear". Too restrictive - AI often generated only 1 character. Changed to "ALL key figures" with flexible naming, now consistently gets 3-6 characters.

**AbortSignal Type Error**: Chrome Prompt API rejected `null` as signal parameter. Fixed with conditional spreading: `...(signal && { signal })` instead of always including it.

## Accomplishments that we're proud of

**Session Reuse Pattern**: Pioneered performance optimization for Prompt API - Q&A sessions persist for 66% speed improvement (3s → 1s) while dialogues use fresh sessions to avoid context contamination.

**Robust Streaming Parser**: Zero-failure JSON Lines parser handles markdown wrappers, incomplete chunks, and multi-line content. Enables smooth progressive display with typing animations.

**Prompt Engineering**: Reduced from 111 to 40 lines (64%) by removing restrictive rules. Proved "less is more" for local AI - simpler prompts, better results.

**Privacy-First Architecture**: All AI processing happens locally in browser. No API keys, no dialogue content passes through backend servers.

**Multi-Character Success**: Consistently generates 3-6 characters from news articles with natural interactions between them, not just Q&A format.

## What we learned

**Prompt API Session Lifecycle**: Sessions are stateless - context isn't remembered automatically. Reuse for Q&A (speed), one-time for dialogues (isolation). This understanding unlocked 66% performance gains.

**JSON Lines Streaming**: Best format for real-time UX. Always buffer incomplete chunks, clean markdown wrappers, and handle multi-line JSON. Progressive display feels 70% faster than waiting for complete responses.

**Local AI Prompt Engineering**: Less is more. Reduced 111-line verbose prompt to 40 lines - removed warnings, negative rules ("NEVER do X"), and over-constraints. Simpler prompts yield better, more creative results.

**Perceived Speed > Raw Speed**: Typing animations and progressive streaming make wait times feel engaging. First message appearing quickly matters more than total completion time.

**Multi-Perspective Value**: Users prefer ALL key figures in conversations, not arbitrary 2-3 limit. Richer dialogues with 3-6 characters feel more complete and engaging.

## What's next for HotTea

**Social Media Integration**: Fetch real social media posts from news figures to enrich dialogue content with their actual perspectives and statements.

**Authentic Q&A Responses**: Reference real quotes and public statements when answering questions, grounding responses in verified sources.

**Multi-Article Synthesis**: Combine multiple news articles to present complete event timelines and development arcs, connecting related stories for deeper understanding.
