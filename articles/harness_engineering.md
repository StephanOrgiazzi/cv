---
title: "Understanding Harness Engineering"
date: "2026-03-29"
excerpt: "A Simple Yet Deep Dive into Context-Layer Architecture for Agentic Development"
badges:
  - "Long Read"
  - "Agentic Coding"
---

# Understanding Harness Engineering: A Simple Yet Deep Dive into Context-Layer Architecture for Agentic Development

*For developers navigating between `AGENT.md/CLAUDE.md`, skills, hooks, MCP, and everything in between.*

---

## Why this matters

You've set up Claude Code, added a few MCP servers, launched an `/init` command to generate a `CLAUDE.md`, and maybe dropped in some skills. And with the latest generation of state of the art LLMs, now able to produce high-quality production code, it mostly works. But sometimes things can still get a bit messy: the agent ignores skills, context fills up fast, and output quality degrades across long sessions.

The usual reaction is to add more: more rules, more docs, more explicit prompts. That usually decreases code quality: most agent failures are **context-management failures**, and stuffing more content into the window usually makes things worst.


<blockquote class="article-pullquote">
  <p>Every rule added to <code>CLAUDE.md</code>, every skill, every hook, is a <strong>patch</strong>.</p>
</blockquote>

It compensates for something the codebase fails to communicate on its own. A well-structured module with consistent conventions and enforced boundaries does not need a paragraph of unwritten conventions explaining it, the agent can read it.
That reframe matters because it changes what harness engineering is actually for. The goal is not to accumulate layers, but to make each one unnecessary, one decision at a time, by moving that decision into the codebase itself, where it becomes permanent, visible, and impossible to ignore.
This article will come back to that idea at the end, but for now the layers are worth understanding precisely because they reveal where the gaps are.

## The core problem

### Context is a signal-quality problem, not a capacity problem

The core execution model of an agent is an iterative loop:

<div class="execution-loop" aria-label="Execution loop">
  <span>Gather context</span>
  <span class="arrow">-&gt;</span>
  <span>Take action</span>
  <span class="arrow">-&gt;</span>
  <span>Verify result</span>
  <span class="arrow">-&gt;</span>
  <span>Done or loop back</span>
</div>

At every step, the agent draws from its *context window*: a fixed-size buffer holding everything it currently "knows" about the session, including instructions, conversation history, file contents, and tool call results. When that buffer gets noisy or overloaded, the agent doesn't degrade cleanly, it starts making subtle mistakes.

**Wrong information in context is worse than missing information.** Useful signal gets buried under irrelevant content, and the agent stops separating the two reliably.

### The layered answer

The answer is not more context, but a harness designed around how each tool interacts with the context window.

<blockquote class="article-pullquote">
  <p>Your harness is the set of tools, constraints, and feedback loops that make those layers work together.</p>
</blockquote>

## A simple mental model

<div class="context-layer-architecture" aria-label="Context-Layer Architecture">
  <div class="cla-shell">
    <div class="cla-panel">
      <h4>Context-Layer Architecture</h4>
      <div class="cla-grid">
        <div class="cla-flow">
          <div class="cla-node">Prompt</div>
          <div class="cla-connector" aria-hidden="true"></div>
          <div class="cla-node">
            <span class="cla-node-title">Permanent Layer</span>
            <span class="cla-node-meta">CLAUDE.md · AGENTS.md</span>
          </div>
          <div class="cla-connector" aria-hidden="true"></div>
          <div class="cla-node">
            <span class="cla-node-title">On-Demand Layer</span>
            <span class="cla-node-meta">Skills · MCP · WebSearch · CLI · Subagents</span>
          </div>
          <div class="cla-connector" aria-hidden="true"></div>
          <div class="cla-node">
            <span class="cla-node-title">System Layer</span>
            <span class="cla-node-meta">Hooks · Permissions</span>
          </div>
          <div class="cla-connector" aria-hidden="true"></div>
          <div class="cla-node">
            <span class="cla-node-title">Feedback Layer</span>
            <span class="cla-node-meta">Tests · Linter · Type Checker · Build</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

In one sentence: **keep essential guidance resident, load specialized knowledge only when needed, enforce non-negotiables outside the model, and verify after every action.** In practice, that means four design targets:

1. **Permanent:** what belongs in every turn.
2. **On-demand:** what should load only when needed.
3. **System:** what must be enforced without trusting the model.
4. **Feedback:** what checks the result after execution.

---

## Layer 1: Permanent context (`AGENT.md/CLAUDE.md`)

This is the Markdown file at the root of your project that loads into the agent's context on every turn, without being explicitly invoked.

The first instinct when setting one up is to write everything: architecture overview, folder structure, team conventions, library choices, onboarding notes. That instinct is worth resisting. **A permanent context file should be small, strict, and operational.** If a rule is not worth enforcing on every single task, it probably does not belong here.

### Keep it short

[Context files tend to *reduce* task-success rates compared to providing no repository context at all, while simultaneously increasing inference cost by over 20%](https://arxiv.org/abs/2602.11988). Auto-generated files (via `/init` or similar) are primary culprits: they force the agent to spend reasoning tokens on information it could infer directly from reading the code. Bloated, contradictory, or over-specified files turn useful signal into noise. Anthropic recommends staying under 200 lines.

### What belongs here

The agent can already read your codebase. What helps is the stuff it *cannot* infer from code: tribal knowledge, non-obvious constraints, reasoning directives, and traps that have already caused real issues. Think of it as **the short list of things you would tell a senior engineer on day one**.

Three kinds of content are worth keeping:

#### Hard technical obligations

Constraints that apply unconditionally and that the agent might not pick up from context alone.

<div class="instruction-block">

- “Always use pnpm, not npm.”

</div>

#### Gotchas

Non-obvious traps specific to this codebase.

<div class="instruction-block">

- “We need to keep folder `/pointOfSaleOld` for backward compatibility. We will remove it once we'll turn the feature flag on.”
- “The auth token lifecycle is per-session, not per-request. Storing it in a closure or `WeakMap` will cause stale-token bugs on long connections.”

</div>

#### Retrieval nudges

Help the agent get relevant context when API docs are not in training data by routing to relevant skills, using web search, or looking into sibling repos.

<div class="instruction-block">

- “Prefer retrieval-led reasoning over pre-training-led reasoning when using the Expo SDK: always use WebSearch to get docs matching the specific version.”
- “`business-logic` is a sibling repo you may need to navigate and edit when necessary (`cd ../business-logic`).”

</div>

<p class="article-note"><em>Note: in upcoming sections, you will see that some of these can be moved to the on-demand or system layer to improve context engineering further.</em></p>

---

## Layer 2: On-Demand tools (Skills, MCP, WebSearch, CLI, Subagents)

This layer covers everything the agent can reach for when needed, but that does not load automatically. These tools do different jobs, and treating them as interchangeable is a good way to get a messy setup.

| Tool                   | What it does                                                | When to use it                                                      |
| ---------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------- |
| **Skills**             | Portable packages of instructions, scripts, and resources               | When the agent needs domain knowledge, best practices,  or procedural steps    |
| **MCP**                | External service integrations with persistent state          | Structured tool access to authenticated or stateful external systems            |
| **WebFetch / WebSearch** | Real-time web access                                      | When the agent needs up-to-date and precise info not in training data              |
| **CLI**                | Direct execution through shell commands and installed command-line tools  | When the task is best handled through local commands, scripts, or developer tooling                   |
| **Subagents**          | Spawned helper agents for scoped exploration or execution       | When the task can be decomposed into bounded subtasks or parallelized |

### Skills architecture

Done well, skills are one of the most effective levers in a harness. They move specialized knowledge out of permanent context and into a retrieval model: the agent reaches for what it needs, when it needs it, rather than carrying everything at once. That keeps the main context window clean and focused. It also means that skill quality compounds: a well-written skill for a specific library or workflow delivers expert-level guidance precisely when it matters, without paying for it on every unrelated task. This is the fundamental argument for skills over a bloated `CLAUDE.md`: permanent context is a fixed overhead while skills are a dynamic, variable cost. You should, as much as you can and if it still makes sense, move your `AGENTS.md` / `CLAUDE.md` rules to dedicated skills.

A skill is not just a `.md` file. It is a **retrieval unit**: a self-contained directory that implements this lazy-loading model in three parts:

- **`SKILL.md` (required):** Contains YAML frontmatter (metadata) and Markdown instructions. The agent initially reads only the name and description. If it matches the user request, it opens the file for instructions.
- **`scripts/` (optional):** Executable code (Bash, JS/TS, Python) that lets the agent perform actions the LLM cannot do natively.
- **`references/` (optional):** Deep-dive documentation loaded only if the agent needs to look something up mid-task.

#### The three core skill types

To keep a harness usable, categorize skills by **intent**.

##### 1. Documentation and knowledge skills

Even the most advanced models have a knowledge cutoff or lack project-specific context.

- **Purpose:** Provide information the agent doesn't know or might misremember.
- **Example:** If you use **Expo SDK 55**, the agent might not know the API details because this specific API version may not be in training data.
- **Solution:** [Expo Skills](https://expo.dev/expo-skills)

##### 2. Behaviors and best practices

LLMs tend to generate "average" code.

- **Purpose:** Drive project-specific, expert-level implementation quality.
- **Example:** A skill based on the React team's [You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect) best-practices article.
- **Solution:** [React useEffect Skill](https://github.com/softaworks/agent-toolkit/tree/main/skills/react-useeffect)

##### 3. Functionality and tooling

This is the most underused skill type. It turns the agent from a conversational assistant into a system operator.

- **Purpose:** Give the agent capabilities it doesn't have natively, by bundling scripts that produce output the model alone cannot.
- **Example:** A [codebase-visualizer](https://code.claude.com/docs/en/skills) skill that runs a bundled script to generate an interactive HTML tree of your project
- **Why it matters:** Without the script, this is a prompt. With the script, it is a tool. That distinction is the entire point of this skill type.

#### Skill registry risks: bloat and security

It is tempting to install every best-practice skill you can find, but it is usually a mistake.

1. **Context bloat:** even with lazy loading, the agent still scans every installed skill description on every turn. If you have 50 skills, you have added 2,000+ tokens of routing noise to each prompt.
2. **Prompt-injection risk:** a skill is an executable prompt. A malicious third-party skill can embed hidden instructions that alter agent behavior. **Always audit `SKILL.md` and any associated scripts before adding a skill to your harness.**

### MCP for stateful integrations

MCP (Model Context Protocol) is an open standard for structured communication between an agent and external systems. In practice, an MCP server is a small Node.js or Python service that exposes typed tools the agent can call. The agent discovers tools, invokes one, and gets a structured response back.

That matters in two main cases:

#### 1. Authenticated integrations

Some systems need a persistent, credentialed connection that a one-off shell command does not handle cleanly: [Atlassian](https://github.com/atlassian/atlassian-mcp-server), [GitHub](https://github.com/github/github-mcp-server), [Context7](https://github.com/upstash/context7), and others.

Manually managing tokens in shell environment variables or passing credentials as CLI flags is **fragile and error-prone**. MCP solves authentication once and exposes structured actions on top.

#### 2. External state manipulation

MCP is also the right tool when the agent needs to operate *inside* another system, not just query it.

A good example is [Chrome DevTools MCP](https://developer.chrome.com/blog/chrome-devtools-mcp?hl=fr): the agent can open Chrome, inspect the live DOM and CSS, read console and network activity, simulate user flows, and record a performance trace through DevTools. It is not just fetching documentation about the page. It is operating inside a running browser session and reading the resulting state back. The state lives in Chrome, not in the context window, and MCP is the bridge.


MCP tools are usually not very token efficient, and they can get expensive fast. **If you do not need authentication or persistent external state, you probably do not need MCP.** A skill usually solves the same problem with less overhead and less complexity.

### WebSearch and WebFetch for retrieval

These tools are native to most modern agents. They solve two problems:

- **Knowledge cutoff:** a language model trains on a snapshot of the world at a specific date. For anything that changes, such as a new Next.js release, a revised Expo SDK, or a breaking change, the model does not know.
- **Precision errors:** even for stable APIs in training data, the model may generate plausible but incorrect details, such as wrong method signatures or invented edge-case behavior.

`WebSearch` and `WebFetch` are the answer to both. Architecturally, they provide *retrieval on demand*: instead of trusting pre-training weights, the agent fetches **ground truth** from primary sources and reasons from there.

Use them for anything that falls into these two buckets: knowledge cutoff (novel APIs, recent releases, breaking changes, migration guides) and precision (exact method signatures, configuration flags, behavioral guarantees for APIs the model nominally knows but might misremember).

<div class="instruction-block">

- “Upgrade Storybook from v8 to v10.33 (latest). Don't just upgrade version, make necessary corresponding API changes in the codebase. Use WebSearch to get up to date docs”

</div>

This habit should be explicit in your prompts, your `AGENTS.md`, `CLAUDE.md`, or skills: **prefer retrieval-led reasoning over pre-training-led reasoning whenever precision matters**. That shifts the default from *"the model probably knows"* to **"check first."**

These tools do not solve everything. For integrations that require persistent authentication or stateful manipulation in an external system, `MCP` is still the right answer. The same applies to **skills** when the agent needs a reusable workflow, local conventions, or a reliable way to combine tools in a repeatable sequence. Prefer a `skill` when the value is in *how* the work should be done. Prefer `WebSearch` or `WebFetch` when the value is in retrieving *current external facts*, such as documentation, changelogs, API specifications, and precise reference details. In practice: skills encode procedure, retrieval tools supply ground truth.

### CLI as the execution surface

CLI is the natural execution surface for agents, and it falls into two categories:

#### Native tools

Unix fundamentals (`find`, `grep`, `sed`, `awk`, `jq`, `curl`) and core git workflows are deeply embedded in most agents' training. They need no introduction and carry almost no context cost. The agent can chain them, pipe them, and adapt them to novel situations without explicit instructions. If a task can be done with standard shell tools, that is usually the right call.

#### Augmented CLIs

The second category is probably underused: CLIs you can install to extend your agent's capabilities, tools that are not part of the base toolchain but become available as soon as they are installed on the machine.

A good example is `gh`, the official [GitHub CLI](https://cli.github.com/). It unlocks direct access to GitHub operations from the shell. No setup beyond installation.

The same logic applies across a broader tool set:

- [`agent-browser`](https://github.com/vercel-labs/agent-browser) gives the agent the ability to control a headless browser from the command line, which is useful for scraping, end-to-end tests, or navigating a web UI during execution.
- Cloud-provider CLIs such as [`AWS CLI`](https://github.com/aws/aws-cli) and [`Azure CLI`](https://github.com/Azure/azure-cli?wt.mc_id=developermscom) expose hundreds of operations the agent can chain directly, using syntax it already knows from training.
- Custom CLIs built specifically for your infrastructure can expose internal operations behind an interface the agent can discover on demand via `--help`.

When should you use CLI? If a tool has a mature CLI and the agent can use it from its own training as a starting point, **prefer the CLI**. MCP wins when the tool has no CLI, when authentication is too awkward to manage cleanly in shell, or when the workflow requires persistent state in an external system.

### Subagents as isolated workers

A subagent is an agent spawned by the main agent to handle a bounded subtask. It gets:

- its own context window
- its own tool access
- its own scope
- then returns a result to the parent

From a context-architecture point of view, this matters because it moves work out of the main context entirely.

Instead of loading a large codebase analysis or a long diagnostic sequence into the primary window, you delegate it. The parent agent sees a clean result, not all intermediate reasoning and file reads that produced it.

The practical gains are:

- **Isolation:** A subagent that goes wrong does not corrupt the main session's context.
- **Parallelism:** Subagents can run concurrently on independent tasks, such as writing tests for module A while refactoring module B.

In practice, most agents handle this automatically. Claude Code, Codex, Kiro, and similar tools spawn subagents when tasks warrant it. You usually do not configure this, but you can explicitly spawn custom subagents for well-defined subtasks.

---

## Layer 3: the System layer (hooks and permissions)

This is the **enforcement layer**. Unlike the permanent and on-demand layers, it does not rely on the model's judgment at all. It intercepts execution at lifecycle events and allows, blocks, or transforms actions before they reach the filesystem or external systems. Permissions and hooks run **deterministically**. They do not forget rules when the context gets crowded, which is why they are the most reliable enforcement surface in the stack.

### Permissions

Permissions define what the agent is allowed to attempt: file-system access, network access, and whitelisted CLI commands. There is usually little to tweak here, but avoid whitelisting destructive commands you would never want executed without approval.

### Hooks: deterministic enforcement

Where an `AGENT.md/CLAUDE.md` rule can be ignored, a hook is a **hard gate**.

Unlike `AGENT.md/CLAUDE.md`, hooks do not live in the prompt. They only inject content into context when they fail. That makes hooks ideal for rules you **never want violated**, without paying an ongoing context cost.

#### Handler types

Claude Code supports three handler types:

| Type | What it does | When to use it |
| --- | --- | --- |
| `command` | Runs a shell script | Structural checks, enforcement, formatting |
| `prompt` | Sends context to a model for judgment calls | When the decision requires interpretation, not a hard rule |
| `agent` | Spawns a subagent with tool access | Deep verification that needs codebase exploration |

Focus on `command` first. It is **deterministic**, fast, has no inference cost, and covers most enforcement needs.

#### Lifecycle events

Hooks attach to specific points in the agent's execution cycle. Claude Code exposes many; two matter most:

`PreToolUse` fires before any tool executes. It is the only event that can block actions. Every tool call, Bash, Edit, Write, Read, WebFetch, Task, or any MCP tool, passes through here first. Your hook receives a JSON payload on stdin with the tool name, its full input, and session context.

Exit `0` and execution proceeds. Exit `2` with a message on `stderr` and the action is blocked, with that message fed directly back to the agent.

```bash
INPUT=$(cat)
command=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

if echo "$command" | grep -qE "(^|[\\s&|;])npm "; then
  echo "Blocked: use pnpm, not npm." >&2
  exit 2
fi
```

That makes `PreToolUse` the right place for policy enforcement and  human-in-the-loop gates on irreversible operations like production deploys, database migrations, and git writes.

`PostToolUse` fires after a tool completes successfully. It cannot block, but it can inject structured feedback via `additionalContext`. The pattern is straightforward: run a quality check, capture output, return it to the agent. A linter catches an error; the error description flows back into context; the agent resolves it in its next action. This closes the loop without any human intervention.

```bash
FILE=$(echo "$(cat)" | jq -r '.tool_input.file_path // empty')
[[ "$FILE" =~ \.(ts|tsx)$ ]] || exit 0

npx prettier --write "$FILE" 2>/dev/null
if ! npx tsc --noEmit 2>&1 | head -20; then
  echo "Type errors introduced - resolve before proceeding." >&2
fi
```

Use `PreToolUse` for **policy guards** and `PostToolUse` for **cleanup and feedback**.

#### Move hard rules out of AGENTS.md context

Many rules that clutter `AGENT.md/CLAUDE.md` are actually enforcement candidates, not context candidates:

<div class="instruction-block">

- “Always use pnpm, not npm or yarn.”
- “Never manually edit files in the `__generated__` directory.”
- “All commits must follow conventional commit format.”

</div>

These are hard constraints, not tribal knowledge. The use-pnpm rule becomes a `PreToolUse` hook inspecting every Bash command. The `__generated__` protection becomes a file-path check on `Write` operations. Commit-format enforcement runs on Bash tools invoking `git commit`.

Moving enforcement rules out of permanent context and into hooks is **one of the highest-leverage cleanups you can make**. It keeps `AGENT.md/CLAUDE.md` focused on what genuinely needs reasoning context and reserves the system layer for what requires **absolute guarantees**.

---

## Layer 4: the Feedback layer (tests, build, lint, type checker)

This verification loop closes the agent action cycle. It is one of the most underbuilt layers in agentic setups, and one of the most important to get right.

The agent can produce something, report success, and still be wrong. The feature might work, but the code quality can be low. The feedback layer exists to catch that. Tests validate functional correctness, type checking catches structural breakage early and linting enforces consistency without needing a human to step in every time. Together, these checks keep the codebase maintainable and high quality and allow the agent to evolve more **autonomously**.

### Type checking

`tsc --noEmit` is usually the fastest deterministic signal in a TypeScript stack. It knows your interfaces, exports, and function signatures. When the agent refactors a shared utility or changes the shape of a DTO, `tsc` reports the downstream breakage before tests or builds even start.

#### Stricter rules are free signal

With a human developer, a strict type config can feel like friction. It slows you down, forces explicit decisions, and surfaces errors you meant to clean up later. In agentic development, that logic flips. The agent has no real concept of "later." It produces code, gets a signal, and reacts immediately.

The stricter the compiler, the richer the signal. A strict `tsconfig` is **not a constraint on the agent**. It is a **free quality multiplier** applied to everything it produces.

The rules worth enabling:

- `strict: true` in `tsconfig.json` is non-negotiable in an agentic context.
- `noUnusedLocals` and `noUnusedParameters` catch the debris of refactoring. The agent reorganizes logic and leaves behind variables and parameters that no longer serve a purpose.
- `allowUnreachableCode: false` and `allowUnusedLabels: false` surface dead code the moment it is introduced.
- `noUncheckedSideEffectImports: true` blocks side-effect-only imports where the module cannot be verified to exist.
- `noFallthroughCasesInSwitch: true` forces explicit intent on every switch case.
- `paths: { "@/*": ["./src/*"] }` is not a validation rule, but a structural contract. It forces imports through resolved aliases rather than relative paths.

A stricter compiler does not slow the agent down. It gives it better signal on every turn.

### Linting

#### The linter is an architectural contract

The same logic that applies to a strict `tsconfig` applies here too. Every lint rule you add is a zero-token sensor that fires on every change the agent makes without hoping the model remembered the right paragraph in `CLAUDE.md`, without waiting for review, without a human spotting the issue later. The difference is that a type checker enforces structural correctness. A linter enforces intent: architectural decisions, team conventions, deprecated patterns, and domain-specific rules the type system cannot express.

An agent that writes *"average" code* is often an agent operating without enough constraints. The linter is one way to **raise the floor**.

#### The philosophy of strict baselines

Before writing custom rules, start with a strict baseline that treats lint errors as failures, not warnings. A strict baseline catches a whole class of LLM-shaped mistakes like unnecessary assertions, overly broad error handling, sloppy generics, barrel imports, missing exhaustive checks, etc... right when they appear. Quality then becomes a property of the environment, not something you have to ask for in a new prompt.

[Ultracite](https://www.ultracite.ai/) is a good example of this philosophy. It is a highly opinionated lint preset that bundles hundreds of rules across TypeScript, React, accessibility, imports, and code quality, pre-tuned to be strict without being noisy. Whether you adopt Ultracite itself or [assemble your own equivalent](https://github.com/StephanOrgiazzi/ironoxlint), the principle is the same: a strict baseline replaces tedious back-and-forth with the agent and gives you high signal-to-noise enforcement out of the box.

#### Project-specific rules are the real leverage

A shared baseline is a good starting point, but the highest-leverage linting work is the rules you write yourself, specific to your codebase, your domain, and your team's accumulated knowledge.

Every architectural decision that currently lives as team folklore is a lint rule waiting to exist:

<div class="instruction-block">
  <ul>
    <li>“Do not import the database layer from UI components.”</li>
    <li>“Use the internal `httpClient` wrapper, not raw `fetch`.”</li>
    <li>“The payments module cannot import from analytics.”</li>
    <li>“We deprecated `moment`, use `date-fns`.”</li>
  </ul>
</div>

Each of these exists as a comment in a PR, a section in a wiki, or tribal knowledge in someone's head, all of which the agent will never reliably reach, and none of which survive team turnover. Turn them into rules, and they become part of the environment the agent operates inside.

`no-restricted-imports` is the simplest governance primitive:

```json
"no-restricted-imports": ["error", {
  "paths": [
    { "name": "axios", "message": "Use the internal httpClient wrapper instead." },
    { "name": "moment", "message": "Use date-fns. moment is deprecated." }
  ]
}]
```

For architectural boundaries, `eslint-plugin-boundaries` goes further. It lets you declare which layers can import from which: UI, domain, infrastructure, shared, and turns every violation into an immediate, local error before it reaches review, before it reaches CI, before it propagates across the codebase.

Every time a pattern appears more than twice in code review, ask whether it can become a lint rule. If yes, it probably should. **A recurring review comment is a lint rule waiting to exist**, and in an agentic workflow, a lint rule is considerably more reliable than a comment.

The more project-specific rules you encode, the more the agent's output reflects your actual codebase instead of statistical averages from training data. Each rule is another sensor. More sensors means better signal. Better signal usually means better output.

### Tests

#### Tests as behavioral signal

Tests are the most direct feedback signal in your harness. A type checker tells the agent the code is structurally valid, a linter tells it the code follows the rules, and tests tell it whether the code *does what it's supposed to do*.

Writing tests used to be expensive and tedious, so teams settled for thin coverage and happy-path-only suites. The feedback loop was limited by how much pain people were willing to take on.

That cost structure has changed. Describe the behavior, point the agent at the module, and it can draft a test suite quickly. The practical implication is that **coverage gaps are now feedback-loop gaps**, and weak tests are bad signals. The agent will keep moving either way. If the suite does not clearly define correct behavior, nothing reliably catches drift when it happens.

---

## Final principle: your codebase is the highest signal

There is one idea running through the whole article.

A tight `CLAUDE.md` is just good documentation. Strict TypeScript configuration is what a solid engineer enforces on day one. Lint rules that encode architectural decisions are written institutional knowledge. Hooks that block destructive commands are guardrails a careful team should want anyway. Tests as a feedback loop are not some new insight. They are one of the oldest ideas in software quality.

### Harness engineering is just good engineering

What is new is the cost of not doing it. When a human engineer skips documentation or writes a weak test, the gap often gets papered over by judgment and institutional memory. The system is lossy, but it usually holds together.

An agent has none of that. Every gap in your harness is a gap the agent will fall through, quietly, on every task.

The paradox is that:

<blockquote class="article-pullquote">
  <p>A well-engineered codebase barely needs a <code>CLAUDE.md</code> at all.</p>
</blockquote>

Agents are strong pattern matchers. If architectural decisions show up consistently, import boundaries are enforced in lint rules, and modules follow the same conventions, the agent does not need the rules spelled out every time. It can read them from the environment.

Manual context layer exists to compensate for gaps. Eliminate the gaps and you eliminate most of what the file needed to say.

The discipline harness engineering asks for is the same discipline good engineering has always asked for: **encode decisions so they outlive the people who made them, prefer deterministic enforcement over tribal knowledge, and close feedback loops early.**

What has changed is where your attention goes: the agent handles the typing, and your job is to improve the environment it types into. The underrated promise of agentic development is that a well-engineered codebase, under constant automated pressure, converges toward quality faster than any team ever could manually.

---

## Sources

- [AGENTS.md outperforms skills in our agent evals](https://vercel.com/blog/agents-md-outperforms-skills-in-our-agent-evals)
- [Lessons from Building Claude Code: How We Use Skills ](https://x.com/trq212/status/2033949937936085378)
- [Evaluating AGENTS.md: Are Repository-Level Context Files Helpful for Coding Agents?](https://arxiv.org/abs/2602.11988)
- [Your AGENTS.md Is Just Band-Aid](https://x.com/elmd_/status/2025976479276806294)
- [You Don’t Know Claude Code: Architecture, Governance, and Engineering Practices](https://x.com/HiTw93/status/2033181380432339045)
- [You Don't Know AI Agents: Principles, Architecture, and Engineering Practices](https://x.com/HiTw93/status/2035527178419683540)
- [Claude Code Documentation](https://code.claude.com/docs/en/)
