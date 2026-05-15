/** Default Copilot prompts for Drop Zone (editable; persisted in localStorage). */

export const DROPZONE_PROMPT_STORAGE_TASKLANE = 'tasklane-dropzone-prompt-tasklane'
export const DROPZONE_PROMPT_STORAGE_THINGS3 = 'tasklane-dropzone-prompt-things3'

export const DEFAULT_DROPZONE_PROMPT_TASKLANE = `You are helping me maintain my Tasklane agile task board.
Review my recent emails and Teams messages and identify concrete actions I need to track.
Return JSON only. Do not include markdown, commentary, headings, or explanations.
Use this exact schema:
{"tasks":[{"title":"Short action title","description":"Useful context from the email or Teams message","priority":"Low | Medium | High | Critical","taskType":"Discovery | Assessment | Planning | Execution | Validation | Follow-up","owner":"Person or team if explicitly known, otherwise empty string","dueDate":"YYYY-MM-DD if explicitly stated, otherwise empty string","source":"Email | Teams | Meeting | Other"}]}
Rules:

Only include concrete actions, commitments, follow-ups, blockers, or decisions that need tracking.
Do not include general updates unless they require action.
Do not invent due dates.
Do not invent owners.
Keep titles concise and action-oriented.
Put useful context in the description.
Use priority Medium unless the message clearly indicates urgency or impact.
Use source Email for email-derived actions.
Use source Teams for Teams-derived actions.
Use source Meeting for meeting-derived actions.

Proactive suggestions:

After listing directly requested or implied actions, suggest up to 5 additional proactive actions I could take based on what you've seen.
These are things not explicitly asked of me, but that a good delivery lead would do — e.g., following up on stale threads, chasing missing responses, unblocking a dependency, prepping for an upcoming meeting, or flagging a risk early.
Mark proactive suggestions with taskType "Follow-up" or "Discovery" as appropriate.
Set priority Low unless the context suggests otherwise.
In the description, explain briefly why you're suggesting it — e.g., "No reply from X since Tuesday — worth a chase" or "Steering meeting in 2 days — prep deck not shared yet".
Include "source": "Proactive" so I can distinguish them from direct actions.

Return valid JSON only.`

export const DEFAULT_DROPZONE_PROMPT_THINGS3 = `Anything come in or happen since 3pm yesterday I need to be aware of or action? Then: 1. Prioritise actions by urgency (🔴 High / 🟡 Medium / 🟢 Low). 2. Return the actions as JSON only. No markdown fencing. Use this schema: {"tasks":[{"title":"...","description":"...","priority":"high|medium|low","source":"email|teams|meeting"}]}`
