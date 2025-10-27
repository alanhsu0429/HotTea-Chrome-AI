// api-client.js - Chrome Prompt API Client with Session Management
import { logger } from './utils/logger.js';
import { getSupabaseConfig } from './config.js';
import { getMessage } from './utils/i18n-helper.js';
import { promptAPIService } from './services/prompt-api-service.js';

// --- Schemas for Response Constraint ---
const DIALOGUE_SCHEMA = { type: 'object', properties: { characters: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, role: { type: 'string' } }, required: ['name', 'role'] } }, dialogue: { type: 'array', items: { type: 'object', properties: { speaker: { type: 'string' }, content: { type: 'string' } }, required: ['speaker', 'content'] } }, summary: { type: 'string' } }, required: ['characters', 'dialogue', 'summary'] };
const SINGLE_MESSAGE_SCHEMA = { type: 'object', properties: { speaker: { type: 'string' }, content: { type: 'string' } }, required: ['speaker', 'content'] };
const QA_SCHEMA = { type: 'object', properties: { relevanceScore: { type: 'number' }, isRelevant: { type: 'boolean' }, response: { type: 'string' }, responseType: { type: 'string' }, suggestedQuestions: { type: 'array', items: { type: 'string' } }, sources: { type: 'array', items: { type: 'string' } }, searchQueries: { type: 'array', items: { type: 'string' } } }, required: ['relevanceScore', 'isRelevant', 'response', 'responseType'] };
const SUGGESTIONS_SCHEMA = { type: 'object', properties: { questions: { type: 'array', items: { type: 'string' } } }, required: ['questions'] };

// --- Prompt Generation Functions ---

// 1. For Dialogue Generation
function generateDialoguePrompt(newsTitle, newsContent, userName) {
  return `Transform this news article into a natural friend group chat conversation.

**Character Identification:**
1. Identify key figures from the news using their full names
2. Naming rules:
   - Prioritize real people's full names (e.g., Jensen Huang, Elon Musk, Terry Gou)
   - Use media identities if needed (e.g., Bloomberg Reporter, WSJ Journalist)
   - Avoid: Simplified names (Alan, Billy), company names, conjunctions

**Conversation Style:**
1. Friend group: Everyone's friends, chatting naturally and casually
2. User role: Loves gossip, asks curious follow-up questions
3. News figures: Share insider stories and personal experiences, never say "I can't disclose"
4. Multi-character interaction: News figures also chat with each other
5. Content delivery: Based on facts, each response includes 2-3 specific info points

**Key Rules:**
1. Character naming: User is called "${userName || 'User'}", others must use full names
2. Conversation structure: 10-18 exchanges, covering all 5W1H elements
3. Information completeness: All data, times, locations must be mentioned

Output in JSON format:
{
  "characters": [
    {"name": "${userName || 'User'}", "role": "The curious friend"},
    {"name": "Full Name", "role": "Role description"}
  ],
  "dialogue": [
    {"speaker": "${userName || 'User'}", "content": "Question or comment"},
    {"speaker": "Full Name", "content": "Response with details"}
  ],
  "summary": "Brief summary"
}

Title: ${newsTitle}
Content: ${newsContent}`;
}

// 1b. For Dialogue Generation (JSON Lines format for progressive streaming)
function generateDialoguePromptJSONLines(newsTitle, newsContent, userName) {
  return `Transform this news article into a natural friend group chat conversation.

**Character Identification:**
1. Identify ALL key figures mentioned in the news (not just 2-3)
2. Include everyone who plays a significant role in the story
3. Use their full names as they appear in the article
4. If no specific individuals: use media/organization representatives
5. More characters = richer conversation

**Conversation Style:**
1. Friend group: Everyone's friends, chatting naturally and casually
2. User role ("${userName || 'User'}"): Loves gossip, asks curious follow-up questions
3. News figures: Share insider stories and personal experiences
4. Multi-character interaction: News figures also chat with each other
5. Content delivery: Based on facts, each response includes 2-3 specific info points

**Key Rules:**
1. User is called "${userName || 'User'}", others use full names from the article
2. Conversation length: 15-25 exchanges (adjust based on number of characters)
3. Information completeness: All data, times, locations must be mentioned
4. Let each character contribute their unique perspective

**Output Format:**
- Each line = ONE complete JSON object
- Message format: {"speaker":"[full name]","content":"[message text]"}
- Final line format: {"summary":"[brief summary]"}
- NO markdown blocks, NO explanatory text
- Output ONLY JSON lines

---

**Article Title:** ${newsTitle}

**Article Content:**
${newsContent}

---

START OUTPUT (JSON lines only):`;
}

// 2. For Q&A Feature
function generateQAPrompt(question, newsContent, newsTitle, qaHistory) {
  const basePrompt = `You are a professional news analysis assistant. The user is reading a news article and has follow-up questions about it.

**Relevance Scoring Criteria (0-100 scale):**
• 90-100: Directly discusses people, events, data, or details from the news
• 80-89: Questions about impact, background, causes, or future developments
• 70-79: Related industries, competitors, or similar event comparisons
• 60-69: Broader topic discussions (e.g., news about TSMC, asking about semiconductor industry)
• 50-59: Indirectly related (e.g., news about US policy, asking about Asian impact)
• Below 50: No clear connection to the news topic

**Response Strategy:**
• 70+: Use Google Search to provide complete answer (max 80 words, 3-4 sentences)
• 50-69: Provide brief answer and guide back to news topic (max 50 words, 2-3 sentences)
• Below 50: Politely decline and offer 2-3 suggested questions

**Response Format Requirement:**
Answer using the following JSON format:
{
  "relevanceScore": 85,
  "isRelevant": true,
  "response": "Your answer content",
  "responseType": "full|brief|rejected",
  "suggestedQuestions": ["Suggested question 1", "Suggested question 2"],
  "sources": ["Up to 6 source URLs"],
  "searchQueries": ["Up to 6 search keywords"]
}

Note: Do not list sources in your response; sources are for system logging only.`;
  let contextInfo = '';
  if (newsContent && newsTitle) {
    const truncatedContent = newsContent.length > 1500 ? newsContent.substring(0, 1500) + '...' : newsContent;
    contextInfo = `
**News Title:** ${newsTitle}

**News Content:**
${truncatedContent}`;
  }
  if (qaHistory && qaHistory.trim().length > 0) {
    const truncatedQAHistory = qaHistory.length > 800 ? qaHistory.substring(0, 800) + '...' : qaHistory;
    contextInfo += `

**Q&A History:**
${truncatedQAHistory}`;
  }
  return `${basePrompt}${contextInfo}

**User Question:**
${question}`;
}

// 3. For Suggested Questions
function generateSuggestionsPrompt(dialogue, newsContent, newsTitle) {
  return `Based on the news content and generated conversation, suggest 3-5 insightful follow-up questions.

**Question Quality Requirements:**
1. Relevant to news content and conversation context
2. Encourage deeper exploration of the topic
3. Avoid yes/no questions, focus on open-ended inquiries
4. Cover different aspects: impact, background, future developments, related events
5. **Keep questions SHORT and DIRECT (10-20 words maximum)**
6. **Use simple, conversational language - avoid complex sentence structures**
7. **Ask ONE thing per question - don't combine multiple questions with "and"**

**Good Examples:**
- "Why did Ontario use Reagan's speech in the ad?"
- "How will this affect public opinion on trade?"
- "What's the historical context behind this decision?"
- "What are the economic implications of this policy?"

**Bad Examples:**
- "Given Reagan's historical stance on trade, what do you think motivated the Ontario government to use this particular speech in the ad, and what impact do you expect it will have on public perception of trade policy?" (too long, combines multiple questions)
- "Is this a good idea?" (yes/no question)
- "What are your thoughts?" (too vague)

**Output Format:**
Return in JSON format:
{
  "questions": [
    "Short, direct question 1?",
    "Short, direct question 2?",
    "Short, direct question 3?"
  ]
}

News Title: ${newsTitle}
News Content:
${newsContent.substring(0, 1500)}...

Generated Conversation:
${dialogue.substring(0, 1000)}...`;
}


// --- Core API Call Logic ---
// NOTE: These functions now use promptAPIService for session reuse
// Session is NOT destroyed after each call - it's reused for better performance

// Non-streaming version with session reuse
async function callPromptApi(prompt, schema, signal) {
  logger.log('📝 Calling Prompt API (non-streaming, with session reuse)...');
  const rawResponse = await promptAPIService.prompt(prompt, { schema, signal });
  return rawResponse;
}

// Streaming version with session reuse and callback for progressive updates
async function callPromptApiStreaming(prompt, schema, signal, onChunk) {
  logger.log('📡 Calling Prompt API (streaming, with session reuse)...');
  const rawResponse = await promptAPIService.promptStreaming(prompt, {
    schema,
    signal,
    onChunk
  });
  return rawResponse;
}

// JSON Lines streaming: Parse line-by-line and call callback for each complete message
// Uses one-time session to avoid context contamination between different news articles
async function callPromptApiStreamingJSONLines(prompt, signal, onMessage) {
  logger.log('📡 Calling Prompt API (JSON Lines streaming with one-time session)...');

  // Create a fresh session for each dialogue generation
  // This ensures AI doesn't remember previous news articles
  const params = await LanguageModel.params();
  const session = await LanguageModel.create({
    ...params,
    signal
  });

  try {
    const stream = await session.promptStreaming(prompt, { signal });

    let buffer = '';
    let messageCount = 0;
    let parseFailCount = 0;
    let summary = null;

    for await (const chunk of stream) {
      buffer += chunk;

      // Split by newlines to find complete JSON objects
      const lines = buffer.split('\n');

      // Keep the last incomplete line in buffer
      buffer = lines.pop() || '';

      // Process each complete line
      for (const line of lines) {
        let trimmed = line.trim();
        if (!trimmed) continue; // Skip empty lines

        // Clean up markdown code blocks
        trimmed = trimmed.replace(/^```json\s*/i, '');
        trimmed = trimmed.replace(/^```\s*/i, '');
        trimmed = trimmed.replace(/\s*```$/i, '');

        if (!trimmed) continue; // Skip if only markdown markers

        // Extract all JSON objects from the line (handles multiple JSONs per line)
        const jsonMatches = trimmed.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g);

        if (jsonMatches) {
          for (const jsonStr of jsonMatches) {
            try {
              const parsed = JSON.parse(jsonStr);

              // Check if it's a summary or a message
              if (parsed.summary) {
                summary = parsed.summary;
                logger.log(`📋 Summary received: ${summary.substring(0, 50)}...`);
              } else if (parsed.speaker && parsed.content) {
                messageCount++;
                logger.log(`💬 Message ${messageCount}: ${parsed.speaker}`);
                if (onMessage) {
                  onMessage(parsed); // Call callback immediately
                }
              }
            } catch (e) {
              parseFailCount++;
              // Only log first few errors to avoid spam
              if (parseFailCount <= 3) {
                logger.log(`⚠️ Parse failed (#${parseFailCount}): ${jsonStr.substring(0, 50)}...`);
              }
            }
          }
        } else {
          parseFailCount++;
          if (parseFailCount <= 3) {
            logger.log(`⚠️ No JSON found in line: ${trimmed.substring(0, 50)}...`);
          }
        }
      }
    }

    // Process any remaining buffer content
    if (buffer.trim()) {
      let finalTrimmed = buffer.trim();

      // Clean markdown
      finalTrimmed = finalTrimmed.replace(/^```json\s*/i, '');
      finalTrimmed = finalTrimmed.replace(/^```\s*/i, '');
      finalTrimmed = finalTrimmed.replace(/\s*```$/i, '');

      if (finalTrimmed) {
        const jsonMatches = finalTrimmed.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g);

        if (jsonMatches) {
          for (const jsonStr of jsonMatches) {
            try {
              const parsed = JSON.parse(jsonStr);
              if (parsed.summary) {
                summary = parsed.summary;
              } else if (parsed.speaker && parsed.content) {
                messageCount++;
                logger.log(`💬 Message ${messageCount} (final): ${parsed.speaker}`);
                if (onMessage) {
                  onMessage(parsed);
                }
              }
            } catch (e) {
              parseFailCount++;
            }
          }
        }
      }
    }

    const successRate = messageCount > 0 ? ((messageCount / (messageCount + parseFailCount)) * 100).toFixed(1) : 0;
    logger.log(`✅ JSON Lines streaming complete. ${messageCount} messages received, ${parseFailCount} parse failures (${successRate}% success rate)`);

    return { messageCount, summary };
  } finally {
    // Ensure session is destroyed after use
    try {
      session.destroy();
      logger.log('🗑️ One-time session destroyed');
    } catch (e) {
      logger.warn('⚠️ Session destruction warning:', e);
    }
  }
}

// --- Exported Functions ---

// JSON Lines streaming for dialogue generation (progressive message display)
export async function callGeminiAPIWithApiKeyStreamingJSONLines(newsUrl, newsTitle, newsContent, userName, userLanguage, signal, onMessage) {
  const prompt = generateDialoguePromptJSONLines(newsTitle, newsContent, userName);
  const result = await callPromptApiStreamingJSONLines(prompt, signal, onMessage);

  return {
    success: true,
    messageCount: result.messageCount,
    summary: result.summary
  };
}

// Streaming version for dialogue generation (full JSON, for compatibility)
export async function callGeminiAPIWithApiKeyStreaming(newsUrl, newsTitle, newsContent, userName, userLanguage, signal, onChunk) {
  const prompt = generateDialoguePrompt(newsTitle, newsContent, userName);
  const rawResponse = await callPromptApiStreaming(prompt, DIALOGUE_SCHEMA, signal, onChunk);
  return { success: true, data: JSON.parse(rawResponse) };
}

// Non-streaming version (kept for compatibility/fallback)
export async function callGeminiAPIWithApiKey(newsUrl, newsTitle, newsContent, userName, userLanguage, signal) {
  const prompt = generateDialoguePrompt(newsTitle, newsContent, userName);
  const rawResponse = await callPromptApi(prompt, DIALOGUE_SCHEMA, signal);
  return { success: true, data: JSON.parse(rawResponse) };
}

export async function askWithSearch(question, newsContent, newsTitle, qaContext, userLanguage, signal) {
  try {
    logger.log('🔍 askWithSearch called with:', {
      questionLength: question?.length,
      newsContentLength: newsContent?.length,
      newsTitle: newsTitle,
      qaContextLength: qaContext?.length,
      userLanguage: userLanguage
    });

    const prompt = generateQAPrompt(question, newsContent, newsTitle, qaContext);
    const rawResponse = await callPromptApi(prompt, QA_SCHEMA, signal);
    const parsed = JSON.parse(rawResponse);

    if (parsed.relevanceScore < 50) {
      parsed.response = getMessage('qaOffTopic');
      parsed.isRelevant = false;
      parsed.responseType = 'rejected';
    }

    logger.log('✅ askWithSearch successful:', {
      relevanceScore: parsed.relevanceScore,
      responseType: parsed.responseType
    });

    return { speaker: "HotTea", ...parsed, timestamp: new Date().toISOString() };
  } catch (error) {
    logger.error('❌ askWithSearch failed:', {
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack
    });
    throw error;
  }
}

export async function getSuggestedQuestions(dialogue, newsContent, newsTitle, userLanguage, signal) {
  const prompt = generateSuggestionsPrompt(JSON.stringify(dialogue), newsContent, newsTitle);

  // Use one-time session for suggestion generation (no need to remember previous suggestions)
  const params = await LanguageModel.params();
  const session = await LanguageModel.create({ ...params, signal });

  try {
    const rawResponse = await session.prompt(prompt, {
      responseConstraint: SUGGESTIONS_SCHEMA,
      signal
    });
    const parsed = JSON.parse(rawResponse);
    return { questions: parsed.questions || [], count: (parsed.questions || []).length };
  } finally {
    session.destroy();
    logger.log('🗑️ Suggestions session destroyed');
  }
}

export async function registerUser(email, name) {
  const { url, anonKey } = await getSupabaseConfig();
  const response = await fetch(`${url}/rest/v1/rpc/register_or_get_user`, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: anonKey, Authorization: `Bearer ${anonKey}` }, body: JSON.stringify({ user_email: email, user_name: name }) });
  if (!response.ok) throw new Error((await response.json()).message || 'Failed to register user');
  return (await response.json())[0];
}

export async function setUninstallToken(apiKey, token) {
  const { url, anonKey } = await getSupabaseConfig();
  const response = await fetch(`${url}/rest/v1/rpc/set_uninstall_token`, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: anonKey, Authorization: `Bearer ${anonKey}` }, body: JSON.stringify({ p_api_key: apiKey, p_token: token }) });
  return response.ok;
}