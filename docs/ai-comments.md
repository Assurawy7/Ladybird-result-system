# AI report comments (free)

**Class Review -> "Generate AI Comments for Entire Class"** writes a Form
Teacher's comment (and, for the Principal/Admin, a Principal's comment) for every
student in the class from their real results, then lets you preview, edit,
regenerate, approve and save them before you print report cards.

It works **with or without AI**. With no AI key, a built-in smart writer produces
the comments from the same records, so nothing breaks.

## How it works (and what is never sent)
```
browser  ->  /.netlify/functions/ai-comments  ->  free AI service
 (no key)        (key lives only here)
```
* The browser sends **anonymous facts only**: gender, performance band, average,
  class average, position, best/weakest subjects, attendance % and behaviour/skill
  ratings *if recorded*. **No name, admission number or photo** ever leaves the
  school system; the AI writes `{{NAME}}` and the first name is added back in the
  browser.
* The server **rejects** any AI sentence that mentions attendance/behaviour when
  none was recorded, invents prizes/clubs/subjects, quotes numbers, uses the wrong
  pronoun, is unkind, or is too long. Those students get a built-in comment
  instead, and you are told.
* Comments are saved in the existing `studentComments` records (a few extra
  optional fields: `ftSource`, `ftApproved`, `prSource`, `prApproved`). **No
  database change.** Report-card templates and printing are untouched.

## Rules the feature follows
* **Approved comments are never overwritten** (bulk or single).
* Hand-written comments are protected unless you tick "also replace hand-written".
* Nothing is saved until you press **Save comments**.
* Form Teachers can only do their own class and only the Form Teacher comment;
  Principal comments need Principal / Admin / Super Admin (enforced on the
  server too).
* Students with no results yet are skipped (nothing true to say).
* Printing shows a heads-up if any selected report has AI comments not yet approved.

## Connect a free AI service (5 minutes)
Pick **one** (or both - the second quietly covers the first one's daily limit).

**Groq (recommended)**
1. Create a free account at <https://console.groq.com> and make a key at
   <https://console.groq.com/keys>.
2. Netlify -> Site settings -> Environment variables -> add `GROQ_API_KEY`.

**Google Gemini**
1. Get a free key at <https://aistudio.google.com/apikey>.
2. Add `GEMINI_API_KEY` in Netlify.
   *Note:* on Gemini's free tier Google may use prompts to improve its products.
   That is why no student identity is ever sent - but Groq is still the first choice.

**Any other OpenAI-compatible service:** set `AI_API_KEY`, `AI_BASE_URL`,
`AI_MODEL`. Switch AI off completely with `AI_ENABLED=false`.

3. **Redeploy** (Deploys -> Trigger deploy). Open Class Review -> Generate AI
   Comments; the dialog should say **"AI is ready (Groq)"**.

Free tiers have daily/per-minute limits and providers retire model names (Groq
retired `llama-3.3-70b-versatile` on 16 Aug 2026; the default is now
`openai/gpt-oss-120b`). If you see "the AI model name is no longer available",
set `GROQ_MODEL` / `GEMINI_MODEL` to a current one from the provider's model list.
If the limit is hit mid-class, the rest of the class is completed by the built-in
writer and you can press **Regenerate** later.

## Limits worth knowing
* Netlify stops normal functions after **10 seconds**, so comments are generated
  **5 students per request**, one after another (100 students ~ 20 requests,
  roughly 1-2 minutes). Keep the window open while it runs; **Stop** keeps
  everything done so far.
* Comments are capped at 300 characters (Form Teacher) and 220 (Principal) so
  they fit neatly on the report card; the review screen shows a live counter.

## Troubleshooting
| Dialog says | Meaning / fix |
|---|---|
| AI is not connected yet | no key set (or `AI_ENABLED=false`); built-in writer is used |
| the AI key was rejected | wrong/expired key - create a new one and update it |
| model name is no longer available | update `GROQ_MODEL` / `GEMINI_MODEL` |
| the free AI limit was reached | wait, or add the second provider key |
| service too slow / could not be reached | transient; built-in writer covers it |

## Tests
`npm test` (guard rails + writer) and `npm run test:ai` (full browser test with
classes of 5, 35, 50 and 100 students and all 10 report-card templates).
