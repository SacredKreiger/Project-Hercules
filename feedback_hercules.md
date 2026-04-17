---
name: Hercules project feedback
description: How the user wants Claude to work on Project Hercules — approach, scope, and communication style
type: feedback
---

Don't build API routes when seed scripts or Server Actions will do.

**Why:** User explicitly called this out when API routes were built for plan generation — "wait i thought that we where going for seed vault build so why are we going for api?"
**How to apply:** For server-side data mutations in Hercules, use Next.js Server Actions. For one-off data population, use tsx seed scripts. No standalone API route files unless specifically asked.

---

Don't add features beyond what was asked. Ask first, then build.

**Why:** User said "delete the other stuff that i didn't ask you to set up yet. ask questions" after extra buttons and wiring were added unprompted.
**How to apply:** If the ask is ambiguous or could expand scope, ask clarifying questions before writing code. Build exactly what was asked, nothing more.

---

Ask clarifying questions before building UI flows.

**Why:** User corrected the meal plan generation approach twice because assumptions were wrong about the desired UX.
**How to apply:** For any new page or flow, ask: what does it collect, what happens after submit, what's in scope right now.

---

Update memory files whenever something new is learned about the project.

**Why:** User explicitly requested this — "make sure everytime you find something new etc your writing it into the md file for the project."
**How to apply:** After any meaningful discovery (new page, architectural decision, user preference, constraint), write it to project_hercules.md immediately.
