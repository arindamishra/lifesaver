/* ═══════════════════════════════════════════════════════════════
   MOMENTUM — AI Module
   All Gemini API calls, prompt builders, and fallbacks
═══════════════════════════════════════════════════════════════ */

// ⚠️ Replace this with your Google AI Studio key or Auth token:
const GEMINI_KEY = "YOUR_API_KEY_HERE";
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

/* ── Master System Prompt ── */
const MASTER_SYSTEM_PROMPT = `
You are a personal AI productivity coach. You are not generic. You are not corporate.
You speak like a smart, calm, honest friend who understands how people actually work,
not how they wish they worked.

YOUR PERSONALITY RULES:
- Always be specific. Never say "work on your task." Say "open your notes and write the first paragraph."
- Match your tone to the user's mood. If they're drained, be gentle and minimal. If they're energised, be direct and ambitious.
- Be honest. If something cannot be done in the time available, say so clearly.
- Never lecture. Never be preachy. Just help.
- Never output more than 3 tasks to focus on at once. Focus is everything.
- Always give time estimates. People need to know how long things actually take.
- Acknowledge how the person is feeling before diving into the plan.

YOUR FORMATTING RULES:
- Use simple plain language. No jargon.
- Break everything into small, completable steps.
- Always tell the user what to do FIRST, not a list of options, one clear starting point.
`;

/* ── Context Builder ── */
function getAIContext() {
  const profile = getUserProfile();
  const session = getSession();
  const tasks   = getTasks().filter(t => !t.completed);
  const now     = new Date();

  return `
FULL USER CONTEXT:
- Current date and time: ${now.toLocaleString()}
- Time of day: ${getTimeOfDay()}
- Procrastination type: ${profile.procrastinationType || "unknown"}
- Deadline behaviour: ${profile.deadlineBehaviour || "unknown"}
- Energy cliff: ${profile.energyCliff || "unknown"}
- Motivation trigger: ${profile.motivationTrigger || "unknown"}
- Current mood: ${session.moodLabel || "not checked in"} ${session.moodEmoji || ""}
- Active tasks (${tasks.length}):
${tasks.length
  ? tasks.map(t =>
      `  • "${t.name}" | deadline: ${formatDeadline(t.deadline)} | importance: ${t.importance} | estimate: ${t.estimatedMinutes ? t.estimatedMinutes + " minutes" : "unknown"}`
    ).join("\n")
  : "  No active tasks yet"
}
`;
}

/* ── Core API Call ── */
async function callGemini(systemPrompt, userMessage) {
  // Automatically support both API keys (AIza...) and Bearer auth tokens
  const isApiKey = GEMINI_KEY.startsWith("AIza");
  const url = isApiKey ? `${GEMINI_BASE_URL}?key=${GEMINI_KEY}` : GEMINI_BASE_URL;
  
  const headers = { "Content-Type": "application/json" };
  if (!isApiKey && GEMINI_KEY !== "YOUR_API_KEY_HERE") {
    headers["Authorization"] = `Bearer ${GEMINI_KEY}`;
  }

  const response = await fetch(url, {
    method: "POST",
    headers: headers,
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: userMessage }] }]
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || "The AI request did not complete.");
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) throw new Error("The AI returned an empty response.");
  return text.trim();
}

/* ── Safe Wrapper ── */
async function callGeminiSafe(systemPrompt, userMessage) {
  try {
    const fullSystem = `${MASTER_SYSTEM_PROMPT}\n${getAIContext()}\n${systemPrompt}`;
    const result     = await callGemini(fullSystem, userMessage);
    return { success: true, data: result };
  } catch (error) {
    console.error("Gemini error:", error);
    return { success: false, error: error.message };
  }
}

/* ── Mood Check-In Question ── */
async function generateMoodQuestion() {
  const now = new Date();
  const prompt = `
Generate ONE very short, casual check-in question for the user.
Keep it under 80 characters. Sound like a calm friend, not a survey.
Base it on the current time of day and day of the week.
Return ONLY the question text. No quotation marks. No preamble.
`;
  const result = await callGeminiSafe(prompt, `Time: ${now.toLocaleString()}`);
  return result.success ? result.data : fallbackMoodQuestion();
}

/* ── Task AI Subtitle ── */
async function generateTaskSubtitle(task) {
  const prompt = `
Write ONE short insight for this task card.
Max 85 characters. One line. Specific. Actionable.
Sound like a coach who knows how this person avoids tasks.
No quotation marks. No preamble.
`;
  const result = await callGeminiSafe(prompt, `Task: ${task.name} | Importance: ${task.importance} | Deadline: ${formatDeadline(task.deadline)}`);
  return result.success ? result.data : fallbackTaskSubtitle(task);
}

/* ── Daily Quote ── */
async function generateDailyQuote(forceRefresh = false) {
  const session = getSession();
  const today   = getTodayKey();

  if (!forceRefresh && session.dailyQuote && session.quoteGeneratedDate === today) {
    return session.dailyQuote;
  }

  const profile = getUserProfile();
  const prompt = `
Generate ONE short motivational quote for this person.
DO NOT use famous quotes. DO NOT be generic.
Write it as if you know them personally — reference their actual work patterns.

Their profile:
- Procrastination type: ${profile.procrastinationType || "unknown"}
- Deadline behaviour: ${profile.deadlineBehaviour || "unknown"}
- Energy cliff: ${profile.energyCliff || "unknown"}
- Motivation trigger: ${profile.motivationTrigger || "unknown"}
- Current mood: ${session.moodLabel || "unknown"}
- Time of day: ${getTimeOfDay()}

The quote should:
- Be 1-2 sentences maximum
- Feel like something a smart friend would text, not a poster
- Reference something real about how they work
- Not be preachy or pushy

Return ONLY the quote. No quotation marks. No attribution. No preamble.
`;

  const result = await callGeminiSafe(prompt, "Create today's personalised quote.");
  const quote  = result.success ? result.data : fallbackQuote();
  saveSession({ ...session, dailyQuote: quote, quoteGeneratedDate: today });
  return quote;
}

/* ── Build Plan Prompt ── */
function buildPlanPrompt() {
  const tasks   = getTasks().filter(t => !t.completed).sort(sortByDeadline);
  const profile = getUserProfile();
  const session = getSession();
  const now     = new Date();

  return `
You are generating a personalised productivity plan.

USER PROFILE:
- When they procrastinate: ${profile.procrastinationType || "unknown"}
- Deadline behaviour: ${profile.deadlineBehaviour || "unknown"}
- Energy crash time: ${profile.energyCliff || "unknown"}
- What motivates them: ${profile.motivationTrigger || "unknown"}

CURRENT STATE:
- Mood right now: ${session.moodLabel || "unknown"} (${session.moodEmoji || ""})
- Current time: ${now.toLocaleTimeString()}
- Current date: ${now.toLocaleDateString()}

THEIR TASKS (sorted by deadline):
${tasks.map(t => `
TASK: ${t.name}
Deadline: ${formatDeadline(t.deadline)}
Importance: ${t.importance}
Estimated time: ${t.estimatedMinutes ? t.estimatedMinutes + " minutes" : "unknown"}
`).join("\n")}

GENERATE A PLAN that:
1. Considers their current mood — if drained, be gentle and minimal; if energised, be ambitious.
2. Prioritises by deadline AND importance — a low-importance task due tomorrow beats a critical task due next week.
3. Gives honest time allocations — don't cram 8 hours of work into 3 hours.
4. Breaks each task into 3–5 simple steps a person can actually follow.
5. Tells them what to completely drop or reschedule if there's too much.
6. Ends with one short honest line about the day ahead.

FORMAT YOUR RESPONSE AS VALID JSON:
{
  "situation": "One honest sentence about where they stand right now",
  "startHere": "The single most important first action to take this second",
  "tasks": [
    {
      "name": "Task name",
      "timeAllocation": "90 minutes",
      "startTime": "9:00 PM",
      "endTime": "10:30 PM",
      "steps": [
        "Step 1 description",
        "Step 2 description",
        "Step 3 description"
      ],
      "moodNote": "A short note adjusted to their current mood"
    }
  ],
  "letGoOf": "What to drop or defer and why — be specific",
  "closingLine": "One genuine, non-generic closing motivational line"
}

Return ONLY valid JSON. No preamble. No explanation. No markdown code fences.
`;
}

/* ── Generate Plan ── */
async function generatePlan() {
  const result = await callGeminiSafe("", buildPlanPrompt());

  if (!result.success) {
    // Surface the actual error message (e.g. from the API or fetch failure)
    return { success: false, error: result.error || "Something went wrong generating your plan. Try again." };
  }

  try {
    return { success: true, data: parsePlanJSON(result.data) };
  } catch (error) {
    console.error("Plan parse error:", error, result.data);
    return { success: false, error: "Received an unexpected response. Please try again." };
  }
}

/* ── JSON Parser (strips markdown fences if present) ── */
function parsePlanJSON(text) {
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  return JSON.parse(cleaned);
}

/* ── Fallbacks ── */
function fallbackMoodQuestion() {
  const h = new Date().getHours();
  if (h < 12) return "Morning check: easing in or ready to move?";
  if (h < 18) return "Midday check: how much fuel is actually in the tank?";
  return "End of day: what kind of energy are we working with tonight?";
}

function fallbackTaskSubtitle(task) {
  if (task.importance === "critical") return "This one needs to start before anything else.";
  if (task.estimatedMinutes) return `Give this a focused ${Math.min(task.estimatedMinutes, 30)}-minute opening.`;
  return "Start by making the next step smaller than your resistance.";
}

function fallbackQuote() {
  const session = getSession();
  if (session.mood === "drained")   return "Keep it tiny today. One clear start still counts.";
  if (session.mood === "onfire")    return "Use the momentum — spend it on the task that actually changes the day.";
  if (session.mood === "energised") return "You have the fuel. Now pick the one thing that actually matters.";
  return "You don't need the perfect mood. You need a first move small enough to begin.";
}
