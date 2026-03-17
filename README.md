Yeah—this is exactly the kind of thing that gets way clearer when you can see the system as a whole instead of reading fragments.

I’m going to give you a clean visual mental model of:
	1.	The system architecture
	2.	Data flow
	3.	Agent system
	4.	Execution timeline
	5.	Where things broke (your confusion)
	6.	What “canonical” actually means in practice

⸻

🧠 1. The System (Big Picture)

This is the core shape of Piles:

                ┌──────────────────────────┐
                │        FILESYSTEM        │
                │  (Desktop / Downloads)  │
                └────────────┬────────────┘
                             │
                             ▼
                ┌──────────────────────────┐
                │      MAIN PROCESS        │
                │  (Electron / Node)       │
                │                          │
                │  - read files            │
                │  - watch folder          │
                │  - file actions          │
                │  - persistence I/O       │
                └────────────┬────────────┘
                             │ IPC (preload)
                             ▼
                ┌──────────────────────────┐
                │        RENDERER          │
                │   (React + Canvas UI)   │
                │                          │
                │  - draw items            │
                │  - piles/groups          │
                │  - drag + select         │
                │  - state (Zustand)       │
                └────────────┬────────────┘
                             │
                             ▼
                ┌──────────────────────────┐
                │     PERSISTENCE LAYER    │
                │   (JSON workspace file)  │
                │                          │
                │  - layout                │
                │  - groups               │
                │  - positions            │
                └──────────────────────────┘


⸻

🔑 Key Insight

There are two separate worlds:

1. Real World (Filesystem)

Files on disk
- paths
- names
- existence

2. Visual World (Your App)

Positions
Groups
Layout
UI state

👉 These must NEVER be confused.

That’s the #1 design principle.

⸻

🧱 2. Data Model (Clean Version)

Here’s the correct mental split:

        FILESYSTEM                        APP STATE
    (comes from disk)                (comes from your app)

   ┌───────────────┐               ┌────────────────────┐
   │   FileMeta    │               │   ItemLayout       │
   │───────────────│               │────────────────────│
   │ path          │◄──────────────│ id (same as path)  │
   │ name          │               │ position           │
   │ type          │               │ groupId            │
   │ dates         │               │ zIndex             │
   └───────────────┘               └────────────────────┘

                                        │
                                        ▼

                               ┌────────────────────┐
                               │    GroupModel      │
                               │────────────────────│
                               │ id                 │
                               │ name               │
                               │ position/size      │
                               │ itemIds[]          │
                               └────────────────────┘


⸻

🔥 Why this matters

This is where your earlier docs broke:
	•	One version merged these → ❌ confusing
	•	One version split them → ✅ correct

👉 This split is now canonical.

⸻

🔌 3. IPC Contract (The “Bridge”)

This is how the UI talks to the system.

Renderer (React)
       │
       ▼
window.pilesAPI.*
       │
       ▼
Preload Bridge
       │
       ▼
Main Process
       │
       ▼
Filesystem / OS

Canonical API

getFolderItems()
loadWorkspace()
saveWorkspace()
openFile()
renameFile()
trashFile()
watchFolder()
onFolderChanged()


⸻

🧨 Where things broke before

You had two competing APIs:

OLD ❌              NEW ✅
getFiles            getFolderItems
deleteFile          trashFile
watchFolder:void    watchFolder + events

That = guaranteed agent failure.

⸻

🤖 4. Agent System (How Work Gets Done)

Think of agents like a specialized assembly line:

        ┌──────────────┐
        │   MANAGER    │
        └──────┬───────┘
               │
 ┌─────────────┼─────────────┐
 ▼             ▼             ▼

Scaffold   Filesystem   Persistence
   │             │             │
   └──────┬──────┴──────┬──────┘
          ▼             ▼

        Canvas       Groups
           │             │
           └──────┬──────┘
                  ▼
                Sync
                  │
                  ▼
                  QA


⸻

🧠 Mental model

Each agent owns a layer of reality:

Agent	Owns Reality
Filesystem	disk
Persistence	saved layout
Canvas	pixels + interaction
Groups	structure
Sync	truth reconciliation
QA	correctness


⸻

⏱️ 5. Execution Timeline (Corrected)

This is the safe build order:

Phase 1: Foundation
-------------------
Scaffold
+ Shared types

Phase 2: System Backbone
------------------------
Filesystem
Persistence

Phase 3: UI Core
----------------
Canvas (render + drag)

Phase 4: Structure
------------------
Groups (piles)

Phase 5: Reality Sync
---------------------
Sync (watch + reconcile)

Phase 6: Validation
-------------------
QA


⸻

🧨 What went wrong before

You had this implied:

Filesystem + Persistence + Scaffold all at once

That’s like:

“Let’s build the engine before defining what a bolt is.”

⸻

🔄 6. Data Flow (End-to-End)

This is the full loop of the system:

1. Load folder
   ▼
Main → getFolderItems()
   ▼
Renderer receives FileMeta[]

2. Load saved layout
   ▼
Main → loadWorkspace()
   ▼
Renderer merges:
   FileMeta + ItemLayout

3. User interacts
   ▼
Drag item / create group
   ▼
Update Zustand store

4. Persist
   ▼
saveWorkspace()

5. External change
   ▼
Filesystem changes
   ▼
watchFolder → event
   ▼
Renderer resyncs


⸻

🔁 7. Rename Behavior (Critical Fix)

This was a major contradiction.

❌ Incorrect mental model

File renamed → same identity

✅ Correct MVP model

File renamed:

old/path.txt  →  removed
new/path.txt  →  added

So:

Before:
  ItemLayout[id="old/path.txt"]

After:
  ItemLayout may no longer match anything


⸻

🧠 What “survivable” means

NOT:
  perfect continuity

YES:
  app doesn’t break
  layout mostly intact
  no crashes


⸻

🧩 8. Why You Got Confused

You were handed three overlapping abstractions:

PRD (product logic)
PLAN (architecture)
MANIFEST (execution)

But they were:

NOT normalized
NOT contract-aligned
NOT hierarchically enforced

So your brain tried to reconcile:

Different APIs
Different data models
Different assumptions

That’s not confusion—that’s bad system hygiene upstream.

⸻

🧠 9. What “Canonical” Actually Means

This is the part most people miss.

Canonical ≠ “well written”

Canonical =

There is exactly one source of truth per concept.

⸻

Your canonical hierarchy

1. shared/types.ts        ← truth of data
2. preload API types      ← truth of communication
3. PRD.md                 ← truth of behavior
4. AGENTS.md              ← truth of execution roles
5. task-manifest.yaml     ← truth of sequencing


⸻

If anything conflicts:

Types > Docs

Always.

⸻

🎯 Final Mental Model

If you remember nothing else, remember this:

The entire system is just this loop:

FILES (real)
   ↓
READ
   ↓
RENDER (visual)
   ↓
INTERACT
   ↓
SAVE (layout only)
   ↓
SYNC (when reality changes)

That’s it.

⸻

🧭 Where you are right now

You are at:

"Pre-build normalization phase"

Which is actually the most important phase if you’re using agents.

Because:

Bad contracts → exponential chaos
Good contracts → linear progress

⸻

If you want next

The next high-leverage move is:

👉 I generate a fully normalized, production-ready repo skeleton with:
	•	shared/types.ts
	•	preload/api.ts
	•	main/filesystem.ts
	•	renderer/store.ts
	•	minimal working canvas

That turns all this from theory into something you can run.

Just say:
“generate repo skeleton”