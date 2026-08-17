# Brainstorm — Piles: Workspace Intelligence Layer

> Session: 2026-08-16
> Mode: /sc:brainstorm — systematic, incremental scope
> Status: Discovery complete. Brief ready for review.

---

## 1. The three pillars

You named three threads. Here's how they relate after pressure-testing:

| Pillar | Job | Status | Role in the product |
|--------|-----|--------|---------------------|
| **Arrange** | Give users spatial control over a folder's contents | Shipped | The visual substrate. Everything else builds on this canvas. |
| **Janitor** | Understand the workspace at the project-architecture level, detect entropy, propose safe reversible improvements | Next | The comprehension layer. This is what makes Piles defensible — not "organize files" but "map your workspace." |
| **Bundle** | Make piles actionable, shareable, cross-folder, and eventually extensible | Later | The platform play. Depends on the first two being stable. |

**Order:** Arrange (done) → Janitor (next) → Bundle (last).

Bundle is last because it depends on the Janitor's classification (to know what actions to offer), the tag manifest (to know what things are), and the canvas layout (to know where things go). Starting with Bundle before the Janitor exists would mean building actions on top of nothing.

---

## 2. The Janitor — reframed

Your own framing was the strongest one. Not a file organizer. A **workspace cartographer**.

### The thesis

> A local-first macOS workspace intelligence app for people whose computers contain projects, agents, research, creative work, codebases, and half-formed ideas — not just "files."

### The wedge

Not file movement. **Workspace comprehension.**

Most organizers operate at the file level (PDF → Documents, Screenshot → Screenshots). That market is crowded (Hazel, AutoShelf, Finder Stacks, Raycast file workflows) and solved-ish.

The Janitor operates at the **project architecture level**:

```
This folder is an active AI project.
This folder contains generated artifacts.
This file is probably an exported transcript.
This config folder is path-sensitive.
These five items belong to the same research thread.
This project lacks AGENTS.md.
This Desktop has crossed the entropy threshold.
Here is a safe proposal.
```

### The trust model

> No changes have been made. Approve selected operations.

Every proposal has: source, destination, reason, risk, confidence, reversal. The app never auto-executes. This is the anti-Hazel — Hazel runs rules, the Janitor proposes context-aware actions you approve.

### The ICP

> A technical creative with too many projects, too many AI tools, and a filesystem that has become an accidental brain scan.

Strong segments: AI-heavy developers, indie hackers, researchers/writers, designers/creative technologists, consultants/freelancers, power users with Raycast/Obsidian/Notion workflows.

### What makes it defensible

1. Project-aware classification (repo roots, generated outputs, config, agent folders)
2. Approval-gated operations (every move has reason + risk + reversal)
3. AI-agent navigability (generates AGENTS.md, PROJECT_MAP.md, workspace indexes)
4. Entropy thresholds (not constant nagging — waits until drift is meaningful)
5. Local-first privacy (no cloud indexing)
6. Aesthetic layer (cares how the workspace feels, not just where bytes live)

### Anti-traps (from your own notes)

- **Not** "AI automatically organizes your files" → "AI-generated workspace proposals you approve"
- **Not** competing with Hazel on rules → "Hazel executes rules. The Janitor understands context and proposes the rules."
- **Not** a giant Electron app first → but since Piles already exists as an Electron app, the incremental path is to add the Janitor as a feature of Piles, not a new app

---

## 3. Incremental path from the current codebase

You scoped this as incremental — stay within the current architecture, split model, single-folder, preload boundary. Here's the path that gets from shipped Piles to the full Janitor vision in the smallest safe steps.

### Step 1 — Workspace Health (read-only comprehension) ← BUILD THIS FIRST

**The wedge. The mapmaker moment.** The user opens a folder and instead of just seeing cards, they see: "This is an active AI project. 14 files, 3 stale, missing AGENTS.md."

**New domain types** (in `src/shared/types.ts`):

```typescript
export type ProjectType =
  | "nextjs" | "react" | "node" | "python" | "rust" | "go"
  | "electron" | "ai-agent" | "research" | "creative" | "unknown";

export type DetectedProject = {
  rootPath: string;
  type: ProjectType;
  markers: string[];        // ["package.json", ".git", "AGENTS.md"]
  hasAgentsMd: boolean;
  hasReadme: boolean;
  hasGitignore: boolean;
};

export type EntropySignal = {
  kind: "stale-file" | "duplicate" | "empty-folder" | "orphaned-config";
  path: string;
  detail: string;           // "not modified in 94 days"
  severity: "low" | "medium" | "high";
};

export type ConventionGap = {
  kind: "missing-agents-md" | "missing-readme" | "missing-gitignore" | "missing-project-map";
  path: string;
  impact: string;           // "AI agents can't navigate this project"
};

export type WorkspaceAnalysis = {
  folderPath: string;
  computedAt: string;
  detectedProjects: DetectedProject[];
  entropySignals: EntropySignal[];
  conventionGaps: ConventionGap[];
  itemClassification: Record<string, ItemClassification>;
  entropyScore: number;     // 0-100, derived from signals
};
```

**New IPC** (in `src/shared/ipc.ts`):

```typescript
analyzeWorkspace: (folderPath: string) => Promise<WorkspaceAnalysis>;
```

**Architecture rules:**
- `analyzeWorkspace` is read-only. It reads structure and marker-file existence, NEVER file contents.
- `WorkspaceAnalysis` is NOT persisted in `WorkspaceData`. It's computed on demand, like `getFolderItems`.
- All analysis logic lives in main process. Renderer only displays.
- Fits the preload boundary: one new IPC method, one new return type.

**UI:**
- A health badge in the toolbar (e.g., "⚠ 3 gaps" or "✓ Healthy")
- Clicking opens a health panel (alongside or instead of the inspector)
- Panel shows: detected project type, entropy score, convention gaps, stale file count
- No actions yet. Pure comprehension.

**Proves:** Piles understands your workspace, not just lists it.

---

### Step 2 — Convention proposals (approval-gated creates)

The first trust-loop. The Janitor proposes creating files (AGENTS.md, README, .gitignore), the user approves, the app creates them.

**New types:**

```typescript
export type ProposalKind =
  | "create-file" | "create-folder" | "move" | "archive" | "tag" | "trash";

export type Proposal = {
  id: string;
  kind: ProposalKind;
  targetPath: string;
  destinationPath?: string;
  content?: string;          // for create-file proposals
  reason: string;
  risk: "low" | "medium" | "high";
  confidence: "low" | "medium" | "high";
  status: "pending" | "approved" | "rejected" | "executed";
  reversible: boolean;
};
```

**New IPC:**

```typescript
generateProposals: (analysis: WorkspaceAnalysis) => Promise<Proposal[]>;
createFile: (path: string, content: string) => Promise<void>;
createFolder: (path: string) => Promise<void>;
executeProposal: (proposal: Proposal) => Promise<{ success: boolean; error?: string }>;
```

**Architecture rules:**
- Only `create-file` and `create-folder` proposals in Step 2. Lowest risk.
- Proposals are derived from analysis, displayed, and either approved or rejected. Not persisted.
- `executeProposal` routes to the appropriate IPC method (createFile, createFolder, existing renameFile/trashFile).
- The app NEVER writes into the watched folder except via explicit proposal execution.

**UI:**
- Proposals appear as cards in the health panel
- Each shows: action, target, reason, risk badge (reuses tone colors: green=low, yellow=medium, red=high)
- Approve button executes; Reject button dismisses
- "No changes have been made" line above the list — the trust signal

**Proves:** Piles proposes safe improvements, you approve.

---

### Step 3 — Entropy proposals (approval-gated moves)

Extends proposals to MOVE and TRASH operations.

**New IPC:**

```typescript
moveFile: (src: string, dest: string) => Promise<{ newPath: string }>;
```

**Scope:**
- "These 12 files haven't been modified in 90 days — archive to /archive?"
- "These 3 files are duplicates — keep newest, trash rest?"
- Reuses existing `trashFile` for delete proposals
- Move proposals are medium-risk; trash proposals are high-risk; both require approval

**Proves:** Piles can clean up, but only when you say so.

---

### Step 4 — Tag manifest (local ontology)

The tag system from your vision. Two namespaces: `ops/` (operational) and `sem/` (semantic).

**New types:**

```typescript
export type Tag = {
  namespace: "ops" | "sem";
  path: string;              // "ops/lifecycle/active", "sem/project/piles"
};

export type TagManifest = {
  folderPath: string;
  tags: Record<string, Tag[]>;  // path → tags
  inheritedTags: Record<string, Tag[]>;
  pinnedPaths: string[];        // do_not_auto_move
};
```

**New IPC:**

```typescript
getTagManifest: (folderPath: string) => Promise<TagManifest | null>;
saveTagManifest: (manifest: TagManifest) => Promise<void>;
```

**Architecture rules:**
- Tag manifest lives at `{userData}/Piles/tags/{sha256(folderPath)}.json` — same pattern as workspace persistence, NOT in the user's folder.
- Finder tags are optional, not the source of truth. The manifest is canonical.
- Tag inference is rules-first (extension, path pattern, project membership), AI-second.

**UI:**
- Filter pills extend to show tags (current tone filters become a subset of tag filters)
- Inspector shows tags for the selected item
- "Add tag" affordance in the inspector

**Proves:** Piles remembers what things are, not just where they are.

---

### Step 5+ — Bundle (the platform play)

Depends on Steps 1-4 being stable. This is where Piles becomes a platform:

- **Actionable piles:** A pile exposes batch actions on its members (batch rename, open all, export list). Uses the Janitor's classification to know what actions to offer.
- **Shareable bundles:** Export a pile/workspace as a portable bundle (layout + file references + tags). Someone else opens the same arrangement.
- **Cross-folder bundles:** Break the single-folder constraint. A bundle pulls files from anywhere into one virtual pile. The bundle IS the workspace.
- **Extension ecosystem:** Third-party bundles add new auto-group rules, file actions, or canvas views. Piles becomes a platform.

This is the last pillar because it needs: stable classification (Janitor), stable tags (manifest), stable canvas (arrange), and a stable IPC surface to extend.

---

## 4. Feasibility assessment

| Component | Feasibility | Notes |
|-----------|------------|-------|
| Folder scanner | Easy | Already exists (`getFolderItems`) |
| Project detector | Easy-Medium | Check for `.git`, `package.json`, `pyproject.toml`, etc. — existence only, no content reads |
| Entropy detector | Medium | Stale = modifiedAt threshold. Duplicates = name+size hash. Empty folders = directory scan. |
| Convention gap detector | Easy | Check for AGENTS.md, README, .gitignore existence |
| Health panel UI | Easy | Extends existing inspector/toolbar patterns |
| Proposal engine | Medium-Hard | This is the real product brain. Rules-first, deterministic, auditable. |
| Approval-gated execution | Medium | New IPC (createFile, createFolder, moveFile) + proposal routing |
| Tag manifest | Medium | New persistence path, new UI for tag display/filter |
| Tag inference | Medium | Rules first (extension, path, project), AI second |
| Trustworthy autonomous cleanup | Hard | Avoid autonomy entirely in MVP. Approval-gated only. |

---

## 5. What to build first

**Step 1: Workspace Health panel.** It is:

- The thinnest slice that proves the thesis ("Piles understands your workspace")
- Read-only (zero risk to user's files)
- One new IPC method, one new return type, one new UI panel
- Fits entirely within the current architecture (split model, preload boundary, single-folder)
- The "mapmaker moment" — the user opens a folder and sees comprehension, not just a file list

Everything else (proposals, tags, bundles) builds on this foundation. But Step 1 alone is enough to validate whether the "workspace cartographer" thesis resonates with users.

---

## 6. Open questions for next session

1. **Project detection depth:** One level deep (just the opened folder) or recursive (scan subfolders for nested projects)? Recursive is more useful but slower and nosier.
2. **Entropy threshold defaults:** 90 days for stale? What counts as a duplicate — name match, size match, content hash?
3. **AGENTS.md generation:** Template-based or context-aware? If context-aware, what signals feed the template?
4. **Tag taxonomy:** Ship a default taxonomy or let users build their own? Your vision has a specific `ops/` + `sem/` structure — is that the default or the only option?
5. **Bundle format:** If bundles become shareable, what's the portable format? JSON with file references? A zip with embedded files? A URL scheme?
6. **Raycast extension:** You mentioned a Raycast extension as a distribution layer. Is that a parallel track or a later phase? It could be the fastest way to get the Janitor in front of users without building a full app UI.
