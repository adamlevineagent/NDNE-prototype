Below is a **lean, issue-driven onboarding flow** that collects only actionable data, with zero abstract chatter.  
Everything hangs on the **live Grants Pass issue list**, so users speak in concrete terms from the first question.

---

## 1 · Chat-Flow Overview (≤ 4 minutes)

| Step | Agent Prompt (*example wording*) | Stored Fields |
|------|----------------------------------|---------------|
| **0 – Greet & Nickname** | “Welcome! I’m your Praxis Agent. Pick a short **name** for me when we chat.” | `agentNickname` |
| **1 – Issue Menu** | “Here are the issues residents are discussing right now. Reply with the numbers you care about (e.g., 1,3,5).”<br>``1-Water rates  2-Homeless sites  3-Wildfire fee  4-Bike v Road  5-Cannabis rules  6-Lodging-tax`` | `selectedIssues[]` |
| **2 – Stance Loop** | *For each chosen issue, sequentially:*<br>“**Issue 1 – Water-rates**: SUPPORT, OPPOSE, or DEPENDS? One line why.”<br>(*Agent records stance & reason, then moves to next chosen issue.*) | `issueStances[]` (issue, stance, reason) |
| **3 – Top Priority Flag** | “Of those issues, which ONE matters most to you right now?” | `topPriorityIssue` |
| **4 – Deal-Breakers** | “Is there any outcome you absolutely could NOT accept in group decisions? One sentence or type ‘none’.” | `dealBreakers[]` |
| **5 – Display Color** | “Pick a highlight color for charts (word or hex).” | `uiColor` |
| **6 – Notify Pref (optional)** | “How often should I brief you?  A-major items only  B-weekly digest  C-every decision.” | `notifyPref` |
| **7 – Proposal Seed (optional)** | “Any idea or proposal you’d like me to log for later? If none, just say ‘done’.” | `initialIdeas[]` |
| **8 – Summary & Finish** | Agent echoes JSON summary, offers help, ends onboarding. | — |

**Skip / no-answer handling**  
If the user types “skip” or leaves blank, Agent stores `null` and continues.

---

## 2 · System Prompt (drop-in)

```text
You are a Praxis Agent performing FAST onboarding.

Rules:
• Follow steps 0-8 strictly; ONE prompt per step. No meta-discussion.
• Use the live Grants Pass issue list (see SCENARIOS below).
• At Step 1, present the numbered list exactly as provided; accept comma-separated replies.
• At Step 2, iterate ONLY over issues the user selected, in the order they listed.
  Ask: “Issue X – <title>: SUPPORT, OPPOSE, or DEPENDS? One-line reason.”
• Do not ask how to negotiate or how governance works.
• Store answers in memory under keys:
  agentNickname, selectedIssues[], issueStances[], topPriorityIssue,
  dealBreakers[], uiColor, notifyPref, initialIdeas[].
• After Step 8, send JSON summary then say:
  “All set! Ask me anything or explore proposals whenever you’re ready.”

Tone:
  Friendly, concise (≤2 sentences each turn).
Progress tags:
  Prefix each step with “(step / total)”.

SCENARIOS:
1-Water treatment plant funding (12 % rate hike)  
2-Downtown homeless resting sites expansion  
3-Wildfire-risk utility surcharge ($2/month)  
4-Transportation: bike/sidewalk vs. road widening  
5-Cannabis fee cut + water-use reporting  
6-Lodging-tax reallocation to public safety
```

---

## 3 · Preference-Extraction Prompt (update)

```text
Extract a JSON object with these keys from the conversation:

agentNickname: string|null
selectedIssues: string[]          // issue numbers as strings
issueStances: {issue:string, stance:string, reason:string}[]
topPriorityIssue: string|null
dealBreakers: string[]            // may be empty
uiColor: string|null
notifyPref: string|null           // "major","weekly","all" or null
initialIdeas: string[]            // may be empty
```

Return ONLY valid JSON.

---

## 4 · Minimal FSM Pseudocode

```ts
switch(step) {
  case 0: promptNickname(); break;
  case 1: promptIssueMenu(); break;
  case 2: if(issueQueue.length) promptIssueStance(issueQueue.shift()); else step++; break;
  case 3: promptTopPriority(); break;
  case 4: promptDealBreaker(); break;
  case 5: promptColor(); break;
  case 6: promptNotifyPref(); break;
  case 7: promptProposalSeed(); break;
  case 8: sendSummary(); onboardingComplete=true;
}
```

---

## 5 · Sample Run (compact)

```
Agent: Name for me?  
User: Spark  
Agent: (1/6) Issues list → choose numbers.  
User: 1,3  
Agent: (2/6) Issue 1 – Water-rates: SUPPORT, OPPOSE, or DEPENDS? why?  
User: Oppose, 12 % too high for retirees.  
Agent: Issue 3 – Wildfire fee: SUPPORT/OPPOSE/DEPENDS? why?  
User: Support, prevents bigger losses.  
Agent: (3/6) Which one is top priority?  
User: Wildfire fee.  
Agent: (4/6) Any absolute deal-breaker?  
User: Hidden costs.  
Agent: (5/6) Pick a color.  
User: Cerulean  
Agent: (6/6) Briefing frequency: A, B, or C?  
User: B  
Agent: Any proposal idea to log or “done”?  
User: done  
Agent: ✔ Summary + JSON … Onboarding complete!
```

---

## 6 · What Changed vs. Previous Draft

* **Question 2 abstraction removed**—everything is issue-anchored.  
* **Menu selection** lets users skip irrelevant topics, but still prompt multiple stances.  
* **Deal-breaker** kept but single sentence, no abstract philosophy chat.  
* **Priority & notification** retained (one key-press answers).  
* **Color & ideas** remain for personalization.

---

Plug these snippets into your prompt templates and FSM, and onboarding will be concrete, fast, and data-rich with zero “formalized fapping around.”