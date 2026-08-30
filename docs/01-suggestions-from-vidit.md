---
tags:
  - career
  - product-sense
date: 2026-08-27
source: Vidit 1:1 feedback
---

# Suggestions — Turning Vidit's Advice Into Actions

This is a working response to Vidit's feedback. Each section takes one thing he said,
says what I think it actually means, and ends with something I can do this week.

---

## 1. The ownership gap is not a backend gap

Vidit was careful to separate two things, and it's worth keeping them separate.
The AI audit ran long. He called that an ownership problem. Then he explicitly said
ownership has nothing to do with how much backend I know — the gap was in
**understanding scope**.

That distinction matters, because "I need to learn backend" is a comfortable answer.
It's a year-long project with no deadline, and it lets me avoid the real thing.
The real thing is smaller and more uncomfortable: I started work before I could
describe where it ended.

**What scope actually means here.** Before writing code, I should be able to answer,
in writing, in under ten minutes:

- What is true when this is done? (Not "the feature works" — a list of specific
  checkable statements.)
- What is deliberately *not* in this? (The list of things someone might reasonably
  assume are included, that aren't.)
- What do I not know yet, and who knows it?
- What is the thing most likely to make this take twice as long?

That last question is the one I skipped on the audit. Nobody skips it twice.

**The habit to build: a scope note.** For every ticket bigger than a day, write those
four answers in the ticket itself before starting, and tag the person who filed it.
Ten minutes. Two things happen. Either they correct me — which is the whole point and
costs nothing — or they don't, and now the scope is written down and I can point at it
when it changes. This is what "ownership" looks like in practice. It isn't working
harder. It's making the boundary visible before anyone can move it quietly.

**The habit to build: a surprise log.** Once a week, one line in Obsidian: what
surprised me this week? Scope gaps are surprises with a delay. If I collect fifty of
them, I'll start seeing the fifty-first coming. This is how estimation actually gets
better — not from experience in the abstract, but from written, reviewed experience.

---

## 2. On staying relevant — I think Vidit is 80% right, and the missing 20% is mine to claim

His argument: if requirements are clear enough for Claude or GPT to execute them, then
pure front-end execution becomes redundant. So expand upstream, own the "why", become
the person who writes and validates requirements.

The part I fully agree with: **typing the code is no longer the scarce skill.** That's
just true, and pretending otherwise is how people get left behind. Anyone can now
produce a working React component from a clear description.

The part I'd add: what got commoditised is the *middle* of the job. Two ends did not.

- **The upstream end** — deciding what should exist and why. This is Vidit's point, and
  it's the bigger of the two.
- **The downstream end** — the last mile of craft. AI is genuinely bad at knowing when
  an interface is *wrong*. It produces competent, generic, immediately recognisable
  output. Everything built by Lovable or v0 looks like everything else built by Lovable
  or v0. Taste — knowing that this spacing is off, this animation is 100ms too slow,
  this empty state makes a new user feel stupid — is still a real differentiator.

So the strategy isn't "become a PM." It's **own both ends and let AI have the middle.**
That is a much more defensible position than either end alone, and it's the honest
reading of why Vidit told me to make the project's UI top 0.1% *and* to understand the
why. He asked for both. I should treat that as one instruction, not two.

**What this means concretely.** Two things, running in parallel:

- Write requirements before anyone asks me to. Pick one Rifa feature a month, write the
  PRD myself as an exercise, and show it to Vidit. It doesn't have to be used. The point
  is to be seen forming opinions about what to build, and to get corrected early and
  often while the stakes are low.
- Get visibly, unarguably good at the last 10% of interface work. Not "I know Tailwind" —
  that's the middle. I mean: the thing I build feels better to use than the thing a
  competent engineer with the same brief would produce. That's a claim I can only make
  by having built something that proves it, which is exactly what the project is for.

**Generalist, with one sharp edge.** Vidit's "know something about everything, go deep
where needed" is right, but a pure generalist has nothing to be hired for. Frontend
craft should stay my sharp edge — the thing I'm the best person in the room at — while
the breadth grows around it. Breadth is what makes me useful in a scoping conversation.
Depth is what makes me hard to replace.

---

## 3. Product sense needs a structure, or it's just having opinions

Vidit said to start questioning the "why" behind product decisions, and to look at
everyday products like Instagram through a design and psychology lens. Good advice that
is very easy to nod at and never do, because "think about why" has no starting point and
no finishing point.

So it needs a form. Fifteen minutes, one product a week, written down.

**The five-question teardown:**

1. **Who is this screen for, and what were they doing thirty seconds before they got
   here?** (Most bad design comes from ignoring the second half.)
2. **What is the one action this screen wants? What did they do to make that action
   obvious, and what did they do to make everything else quieter?**
3. **What did they deliberately leave out?** (The removals are where the real decisions
   are. Anyone can add.)
4. **Where does this reward me, and is the reward honest?** (Does it reward me for
   getting value, or for staying? Instagram rewards staying. That's a choice with
   consequences.)
5. **What would I change, and what would break if I did?** (The second half stops this
   from being a critique and makes it a design decision.)

That last clause is the whole exercise. Anyone can say "this button should be blue."
Product sense is knowing what you're trading away.

**Where to write it.** In Obsidian. I already have a `2 - Random Thoughts` folder and a
teardown is exactly that. Twelve of these by mid-October is a genuinely different way of
seeing software, and it's also a thing I can show someone.

**The book.** Vidit is sending the link, so I should wait for the actual title rather
than guess. Based on the description — user psychology, B2C, gamification, dopamine
loops, about how modern products are built rather than a product management textbook —
the most likely candidate is *Hooked: How to Build Habit-Forming Products* by Nir Eyal.
It's short and it's structural: trigger, action, variable reward, investment. If it turns
out to be something else, read that instead. If I want a second one after it,
*Actionable Gamification* by Yu-kai Chou goes deeper on reward mechanics and is the
standard reference.

One caution I want to hold onto while reading anything in this genre: these books teach
you how to make products people can't put down, which is not the same as making products
people are glad they used. Worth reading with that tension in mind rather than as a
manual.

**Lenny's.** "Watch Lenny's podcast" is not a task, it's a subscription. The task is
specific episodes. I should ask Vidit which two or three he had in mind — that's a good,
cheap follow-up message and it shows I actually acted on the conversation. In the
meantime, the free written archive is searchable, and reading one piece on how to write a
good PRD is more directly useful to me right now than any episode.

---

## 4. The PRD problem is the easiest win available, and I should take it this week

This is the part of the conversation with the highest return for the least effort, and
I nearly missed it because it was framed as feedback rather than opportunity.

Vidit named two different problems and they need different responses:

**Problem A — AI-generated PRD prose.** The language is personal to whoever prompted it
and doesn't land with the tech team. This is *the author's* problem, and me flagging it
is a favour, not a complaint. He said it directly: no feedback means no improvement is
possible. Most PRDs are currently being abandoned because they don't land. That is a
serious, expensive failure and I have first-hand evidence of it.

**Problem B — domain jargon.** "Promise to pay", "intent to pay", and the rest are real
industry terms in debt collection. These are not PRD flaws. This one is *my* gap, and
the fix is learning them, not flagging them.

Telling A and B apart before I comment is the whole skill. Flagging a legitimate industry
term as "unclear jargon" would make me look like I haven't done the reading.

**Action 1 — start flagging, this week.** When a term genuinely doesn't parse, comment in
Notion and tag the author. A template so I don't have to re-invent the tone each time:

> Flagging this for clarity, not disagreement — I want to make sure I build the right
> thing. In this section, "X" could mean either (a) ... or (b) ... . I've assumed (a).
> If that's wrong, worth correcting here so the next reader doesn't make the same guess.

Two things make this work. Offering my interpretation instead of just saying "unclear"
turns it from a demand into a contribution. And naming that it's about clarity rather
than disagreement keeps it from reading as a challenge.

**Action 2 — build the glossary.** This is the real opportunity. I have already done
this work by hand: `PRD Phase A+B - Plain English.md`, `PRD Phase C`, `PRD Phase D`,
`PRD D-1`, `PRD D-2`, and `Control Plane Auth Design - Plain English.md` are sitting in
my vault right now. That's roughly 160 KB of translation I did privately and nobody
else can see.

If I lift the recurring domain terms out of those files into one shared Notion page —
term, plain-English meaning, one real example from a call — then:

- New engineers stop making the guesses I made.
- The PRD authors can link to it instead of re-explaining, which makes their documents
  shorter and more likely to be read.
- I become the person who made the PRDs land. That is a scope-and-communication
  contribution, which is exactly the register Vidit is asking me to operate in.

The cost is one evening, because the work is already done. It's just in the wrong place.

**Action 3 — ask for the loop back.** Once I've flagged a few terms, ask Vidit whether
the flags were useful and whether they were the right ones. Feedback on my feedback.
That's how I find out if I'm calibrated, and it closes the loop he explicitly said
was missing.

---

## 5. On the project — three things I want to hold myself to

Vidit's advice was: just build something, personal utility is enough, make the front end
top 0.1%, find the idea in a personal frustration rather than a market opportunity.
Agreed on all four. Three commitments to keep it from going wrong:

**Actually use it.** "Personal utility is enough" is permission, but it's also a test.
If I finish this and never open it again, it was a portfolio piece pretending to be a
product, and I'll have learned nothing about product sense. The measure of success is
that I open it after a trip because I want to, not because I'm demoing it.

**Ship at week 3, not week 6.** A rough version I'm using is worth more than a beautiful
version I'm still building, because only the first one generates real opinions about
what to change. Polish is the second half of the project, not the whole of it.

**Show the work in public.** Vidit's phrasing was about showing the ability to extract
the best possible output from AI tools. That doesn't happen if the thing lives on
localhost. Post the process — a screen recording of one interaction, the before-and-after
of a polish pass, the design decision I changed my mind on. The Project Ideas note
already says "try replicating great design and share those designs on Twitter, seek
feedback." That instinct was right; I just never did it.

---

## The short version

| Vidit said | The real work | This week |
| --- | --- | --- |
| Ownership gap on the AI audit | Scope, written down before starting | Scope note on the next ticket over a day |
| Front-end execution risks going redundant | Own the why *and* the last mile; give AI the middle | Start the project; draft one unasked-for PRD this month |
| Develop product sense | A weekly structured teardown, not general curiosity | One teardown, five questions, in Obsidian |
| PRD language doesn't land | Tell domain jargon apart from bad writing; fix both differently | Flag two terms in Notion; start the glossary page |
| Just build something | Personal utility, shipped early, shown in public | Data spike this weekend |
