# Momentum

### Your AI-powered productivity companion, built to actually understand you.

Momentum doesn't just remind you about deadlines. It learns how you work, notices how you're feeling, and rebuilds your plan around both, so the tasks that matter actually get done.

---

## The Problem

Most productivity tools are passive. They store your to-dos and nag you when time's up, but they don't know you, don't adapt to you, and definitely don't care that you're running on three hours of sleep and a looming deadline.

The result: missed deadlines, decision fatigue, and tools people abandon within a week.

## The Idea

**Momentum is a PWA that plans with you, not just for you.**

It combines two things most productivity apps ignore:

1. **Your behavioral patterns**: when you actually work, how long tasks really take you, what you tend to procrastinate on, and how you respond to deadlines.
2. **Your current state**: your energy level and mental/mood check-in, used to actively reshape your plan for the day.

Instead of a static checklist, Momentum gives you a living plan that adjusts itself to the person actually doing the work.

---

## What Makes Momentum Different

### 1. Mood and Energy-Aware Planning
Most planners assume you're a robot with infinite, constant output. Momentum doesn't.

- Quick daily/session check-in for energy level and mental state
- The AI re-prioritizes and re-sequences your task list based on that input: low-energy days surface lighter, lower-friction tasks first, while high-energy windows get matched with your hardest or most important work
- Reduces the guilt spiral of a to-do list that doesn't know you're not okay today

### 2. Personalized Behavioral Intelligence
Momentum learns from how you actually work, not how you say you'll work.

- Tracks completion patterns, time-of-day productivity, and task duration accuracy over time
- Builds a personal model of your habits, including procrastination triggers, realistic effort estimates, and peak focus windows
- Recommendations get sharper the longer you use it

### 3. Intelligent, Proactive Task Planning
Momentum doesn't wait for you to ask "what should I do now?"

- Auto-prioritizes tasks using urgency, importance, energy fit, and your behavioral history
- Proactively flags at-risk deadlines before they become emergencies
- Suggests realistic schedules instead of letting you over-commit

### 4. Accountability
Momentum keeps gentle pressure on, even when willpower runs out.

- Progress tracking that reflects reality, not aspiration
- Nudges that are context-aware instead of generic, informed by your mood, your history, and what's actually at stake

---

## Other Features

- **Calendar Integration**: syncs with your calendar so planning accounts for existing commitments, scheduling tasks into actual open time instead of a vacuum
- **Voice Support**: speech-to-text input for adding tasks, logging check-ins, and navigating hands-free
- **Habit Tracking**: tracks recurring habits alongside one-off tasks, surfacing streaks and patterns to reinforce the behaviors you're trying to build

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML, CSS, JavaScript (Progressive Web App) |
| Backend | Serverless functions via Vercel |
| Voice | Native Speech-to-Text |
| Platform | Installable PWA, works across desktop and mobile |

Built lean on purpose: no heavyweight framework overhead, fast to load, fast to install, fast to iterate on during a hackathon timeline.

---

## Why It Matters

Deadlines aren't missed because people don't know they exist. They're missed because plans don't account for the human behind them: their habits, their energy, their bad days. Momentum treats those as first-class inputs instead of ignoring them, which is what makes the difference between a to-do list and an actual productivity companion.

---

## What's Next

- Deeper habit-streak analytics and visualizations
- Smarter mood detection (passive signals, not just manual check-ins)
- Multi-calendar support and richer conflict resolution
- Expanded voice command coverage for full hands-free planning

---

*Built for [Hackathon Name], by [Your Name / Team Name].*
