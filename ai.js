const GEMINI_KEY = "AQ.Ab8RN6JyaVAnpJISrRDXuI6c97oA4mMI_5rDQGm8i_5JjHjtRg";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`;

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
- For the plan, use this structure:
  SITUATION: (one honest sentence about where they stand)
  START HERE: (the single first action to take right now)
  YOUR PLAN: (numbered steps with time estimates)
  LET GO OF: (what to deprioritise or drop entirely)
  REMEMBER: (one short, genuine motivational line, not generic, tailored to them)
`;

function getAIContext() {
  const profile = getUserProfile();
  const session = getSession();
  const tasks = getTasks().filter(task => !task.completed);
  const now = new Date();

  return `
FULL USER CONTEXT:
- Current date and time: ${now.toLocaleString()}
- Procrastination type: ${profile.procrastinationType || "unknown"}
- Deadline behaviour: ${profile.deadlineBehaviour || "unknown"}
- Energy cliff: ${profile.energyCliff || "unknown"}
- Motivation trigger: ${profile.motivationTrigger || "unknown"}
- Current mood: ${session.moodLabel || "not checked in"} ${session.moodEmoji || ""}
- Active tasks:
${tasks.length ? tasks.map(task => `  - ${task.name}; deadline ${formatDeadline(task.deadline)}; importance ${task.importance}; estimate ${task.estimatedMinutes ? task.estimatedMinutes + " minutes" : "unknown"}`).join("\n") : "  - No active tasks yet"}
`;
}

async function callGemini(systemPrompt, userMessage) {
  const response = await fetch(GEMINI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: userMessage }] }]
    })
  });

  if (!response.ok) {
    throw new Error("The AI request did not complete.");
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error("The AI returned an empty response.");
  }

  return text.trim();
}

async function callGeminiSafe(systemPrompt, userMessage) {
  try {
    const contextPrompt = `${MASTER_SYSTEM_PROMPT}\n${getAIContext()}\n${systemPrompt}`;
    const result = await callGemini(contextPrompt, userMessage);
    return { success: true, data: result };
  } catch (error) {
    console.error("Gemini error:", error);
    return { success: false, error: error.message };
  }
}

async function generateMoodQuestion() {
  const profile = getUserProfile();
  const now = new Date();
  const prompt = `
Generate one natural check-in question for the user.
It should be based on the time of day, current date, and their profile.
Make it sound like a calm friend, not an app survey.
Return ONLY the question text.
`;
  const result = await callGeminiSafe(prompt, `Time now: ${now.toLocaleString()}. Profile: ${JSON.stringify(profile)}`);
  return result.success ? result.data : fallbackMoodQuestion();
}

async function generateTaskSubtitle(task) {
  const prompt = `
Write one short subtitle for this task card.
It must be one line, specific, and under 90 characters.
No quotation marks. No preamble.
`;
  const result = await callGeminiSafe(prompt, `Task: ${JSON.stringify(task)}`);
  return result.success ? result.data : fallbackTaskSubtitle(task);
}

async function generateDailyQuote(forceRefresh = false) {
  const session = getSession();
  const today = getTodayKey();
  if (!forceRefresh && session.dailyQuote && session.quoteGeneratedDate === today) {
    return session.dailyQuote;
  }

  const profile = getUserProfile();
  const prompt = `
Generate one short motivational quote for this person.
DO NOT use famous quotes. DO NOT be generic.
Write it as if you know them personally.

Their profile:
- Procrastination type: ${profile.procrastinationType}
- Deadline behaviour: ${profile.deadlineBehaviour}
- Energy cliff: ${profile.energyCliff}
- Motivation trigger: ${profile.motivationTrigger}
- Current mood: ${session.moodLabel}
- Time of day: ${getTimeOfDay()}

The quote should:
- Be 1-2 sentences maximum
- Feel like something a smart friend would say, not a poster
- Reference something real about how they work
- Not be preachy or pushy

Return ONLY the quote text. No quotation marks. No attribution. No preamble.
`;

  const result = await callGeminiSafe(prompt, "Create today's quote.");
  const quote = result.success ? result.data : fallbackQuote();
  saveSession({ ...session, dailyQuote: quote, quoteGeneratedDate: today });
  return quote;
}

function buildPlanPrompt() {
  const tasks = getTasks().filter(task => !task.completed).sort(sortByDeadline);
  const profile = getUserProfile();
  const session = getSession();
  const now = new Date();

  return `
You are generating a personalised productivity plan.

USER PROFILE:
- When they procrastinate: ${profile.procrastinationType}
- Deadline behaviour: ${profile.deadlineBehaviour}
- Energy crash time: ${profile.energyCliff}
- What motivates them: ${profile.motivationTrigger}

CURRENT STATE:
- Mood right now: ${session.moodLabel} (${session.moodEmoji})
- Current time: ${now.toLocaleTimeString()}
- Current date: ${now.toLocaleDateString()}

THEIR TASKS (sorted by deadline):
${tasks.map(task => `
TASK: ${task.name}
Deadline: ${formatDeadline(task.deadline)}
Importance: ${task.importance}
Estimated time: ${task.estimatedMinutes ? task.estimatedMinutes + " minutes" : "unknown"}
`).join("\n")}

GENERATE A PLAN that:
1. Considers their current mood. If drained, be gentle and minimal. If energised, be ambitious.
2. Prioritises by deadline AND importance together. A low-importance task due tomorrow beats a critical task due next week.
3. Gives honest time allocations. Don't cram 8 hours of work into 3 hours.
4. Breaks each task into 3-5 simple steps a person can actually follow.
5. Tells them what to completely drop or reschedule if there's too much.
6. Ends with one short honest line about the evening/day ahead.

FORMAT YOUR RESPONSE AS VALID JSON like this:
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
  "letGoOf": "What to drop or defer and why",
  "closingLine": "One genuine, non-generic closing motivational line"
}

Return ONLY valid JSON. No preamble. No explanation. No markdown code fences.
`;
}

async function generatePlan() {
  const result = await callGeminiSafe("", buildPlanPrompt());
  if (!result.success) {
    return { success: false, error: "Something went wrong generating your plan. Try again." };
  }

  try {
    return { success: true, data: parsePlanJSON(result.data) };
  } catch (error) {
    console.error("Plan parse error:", error, result.data);
    return { success: false, error: "Something went wrong generating your plan. Try again." };
  }
}

function parsePlanJSON(text) {
  const cleaned = text
    .replace(/^```json/i, "")
    .replace(/^```/i, "")
    .replace(/```$/i, "")
    .trim();
  return JSON.parse(cleaned);
}

function fallbackMoodQuestion() {
  const hour = new Date().getHours();
  if (hour < 12) return "Morning check: are we easing in or ready to move?";
  if (hour < 18) return "Midday honesty: how much fuel is actually in the tank?";
  return "End-of-day check: what kind of energy are we working with?";
}

function fallbackTaskSubtitle(task) {
  if (task.estimatedMinutes) return `Give this a focused ${Math.min(task.estimatedMinutes, 30)} minute opening round.`;
  return "Start by making the next step smaller than your resistance.";
}

function fallbackQuote() {
  const session = getSession();
  if (session.mood === "drained") return "Keep it tiny today. One clear start still counts.";
  if (session.mood === "onfire") return "Use the momentum, but spend it on the task that actually changes the day.";
  return "You do not need the perfect mood. You need a first move small enough to begin.";
}
