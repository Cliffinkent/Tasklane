/** Default Copilot prompts for Drop Zone (editable; persisted in localStorage). */

export const DROPZONE_PROMPT_STORAGE_TASKLANE = 'tasklane-dropzone-prompt-tasklane'
export const DROPZONE_PROMPT_STORAGE_THINGS3 = 'tasklane-dropzone-prompt-things3'

export const DEFAULT_DROPZONE_PROMPT_TASKLANE = `You are helping me maintain my Tasklane agile task board.

Review my recent emails, Teams messages, and meeting context. Identify concrete actions I need to track, useful updates I should be aware of, and the best way to tackle the work.

Return your response in two parts:

1. A human-readable briefing
2. Copy-ready JSON at the bottom

Do not return JSON only.

Human-readable briefing format:

## Summary of my day

Write 3 to 6 concise sentences summarising what matters today. Focus on commitments, blockers, decisions, risks, deadlines, and work that needs my attention.

## Key updates

Use bullet points. Include useful updates even when they do not require a task, but keep them brief and relevant.

Each bullet should include:
- what changed or what I should know
- who or what it relates to, if clear
- why it matters, if clear

Do not invent facts. If something is unclear, say it is unclear.

## Actions to track

Return a markdown table with these columns:

| Action | Priority | Type | Owner | Due | Source | Why it matters |
|---|---|---|---|---|---|---|

Rules for the table:
- Include concrete actions, commitments, follow-ups, blockers, decisions, or delivery risks that need tracking.
- Include proactive suggestions only when they are genuinely useful.
- Keep action titles concise and action-oriented.
- Use "Not stated" where owner or due date is not explicitly known.
- Do not invent due dates.
- Do not invent owners.
- Use priority Medium unless the message clearly indicates urgency or impact.
- Use source Email for email-derived actions.
- Use source Teams for Teams-derived actions.
- Use source Meeting for meeting-derived actions.
- Use source Proactive for suggested actions that were not explicitly requested.

## ADHD-friendly plan

Create a practical plan for tackling the work.

Use this structure:
- **First 15 minutes:** one small starting action that reduces friction
- **Next focus block:** the most important task to make progress on
- **Quick wins:** 2 to 4 small actions that can be cleared quickly
- **Waiting on others:** people or teams to chase, if any
- **Avoid for now:** tasks that look noisy, vague, or lower value
- **End-of-day reset:** what to update, park, or prepare for tomorrow

Keep the plan realistic, direct, and low-friction. Prioritise reducing cognitive load.

## Tasklane JSON

At the very bottom, return the JSON inside a fenced code block labelled json.

Use this exact schema:

{
  "tasks": [
    {
      "title": "Short action title",
      "description": "Useful context from the email, Teams message, meeting, or proactive suggestion",
      "priority": "Low | Medium | High | Critical",
      "taskType": "Discovery | Assessment | Planning | Execution | Validation | Follow-up",
      "owner": "Person or team if explicitly known, otherwise empty string",
      "dueDate": "YYYY-MM-DD if explicitly stated, otherwise empty string",
      "source": "Email | Teams | Meeting | Other | Proactive"
    }
  ]
}

JSON rules:
- The JSON must be valid.
- The JSON must be the final thing in the response.
- Do not include comments inside the JSON.
- Do not include markdown inside JSON values.
- Do not include trailing commas.
- Use empty string for unknown owner.
- Use empty string for unknown dueDate.
- Do not invent due dates.
- Do not invent owners.
- Keep titles concise and action-oriented.
- Put useful context in the description.
- Use priority Medium unless the message clearly indicates urgency or impact.
- Use taskType Follow-up or Discovery for proactive suggestions as appropriate.
- Use source Proactive for proactive suggestions.

Proactive suggestions:
After listing directly requested or implied actions, suggest up to 5 additional proactive actions I could take based on what you have seen.
These are things not explicitly asked of me, but that a good delivery lead would do, for example:
- following up on stale threads
- chasing missing responses
- unblocking a dependency
- preparing for an upcoming meeting
- flagging a risk early
- confirming ownership where it is unclear

Set proactive suggestion priority to Low unless the context clearly suggests otherwise.
In the description, explain briefly why you are suggesting it.

Quality bar:
- Be specific.
- Be concise.
- Separate updates from actions.
- Do not turn every update into a task.
- Do not include sensitive personal commentary.
- If there are no concrete actions, return an empty tasks array but still provide the briefing.`

export const DEFAULT_DROPZONE_PROMPT_THINGS3 = `Anything come in or happen since 3pm yesterday I need to be aware of or action? Then: 1. Prioritise actions by urgency (🔴 High / 🟡 Medium / 🟢 Low). 2. Return the actions as JSON only. No markdown fencing. Use this schema: {"tasks":[{"title":"...","description":"...","priority":"high|medium|low","source":"email|teams|meeting"}]}`
