# MixLabs V2 — Pre-Production "One Roof" Spec
**Status:** Draft v0.1 — for refinement, not for building yet.
**Principle:** The script is the spine. Enter information once; it flows everywhere it's needed. Everything quietly bends toward MixLabs post.

---

## 1. Goal
Give an indie filmmaker a single, film-shaped home for pre-production that replaces the Notion + Google Sheets + WhatsApp chaos — and carries the project straight into MixLabs post (score / sound / mix / delivery).

**Primary user (assumption to confirm):** the director-producer who wears every hat on a small indie shoot. Design for *one person managing everything simply*, not a multi-department studio office.

---

## 2. Data Model (the actual "roof")

Everything references a small set of connected entities. Enter data on one, it surfaces on the others.

### Project (Film)  *(extends today's `projects`)*
`id · title · logline · synopsis · format (feature/short/doc/ad/music-video) · status · owner`

### Script
`id · project_id · source_format (fdx/fountain/pdf) · file · version · uploaded_at`
- Imported, not written (light Fountain editor optional later).

### Scene  ← **the spine**
`id · project_id · number · int_ext (INT/EXT) · location_name · time_of_day · summary · page_length · est_duration · order`
- Auto-created by parsing the script.

### Person  *(cast + crew unified)*
`id · project_id · name · email · phone · kind (cast|crew) · role (character name OR job title) · status (idea→contacted→confirmed→declined) · notes`

### SceneCast  *(which characters are in which scene)*
`scene_id · person_id`

### SceneElement  *(the breakdown tags)*
`id · scene_id · category (prop · wardrobe · vehicle · sfx · stunt · animal · MUSIC · SOUND · VFX) · name · notes`
- **MUSIC / SOUND / VFX categories are the funnel** — they carry into post.

### Location
`id · project_id · name · address · contact · permit_status · photos/docs · notes`

### ShootDay  *(the schedule)*
`id · project_id · date · call_time · wrap_time · location_id · notes`
### ShootDayScene
`shoot_day_id · scene_id · order`  *(which scenes shoot that day)*

### CallSheet  *(derived, not entered)*
Auto-generated from a ShootDay: date · location · scenes · cast needed · crew · times · weather · contacts.

### BudgetLine
`id · project_id · category (cast · crew · location · equipment · POST · misc) · description · amount · linked_entity?`
- **POST line pre-filled with the MixLabs quote.** 💰

### Document  *(extends today's `project_documents`)*
`id · project_id · attach_to (any entity) · title · file · category`

### Task
`id · project_id · title · assignee (person_id) · due_date · status · department`

### Campaign  *(crowdfunding — later/optional)*
`id · project_id · platform · goal · story · rewards[] · external_link`
- Plan only; **export/link out to Seed&Spark/Kickstarter — never build payments.**

---

## 3. "Enter once → flows everywhere" rules (the magic)

| You do this… | …and this happens automatically |
|---|---|
| Tag Scene 12: cast = Sara | Sara appears in Casting + Scene 12's call sheet + a cast budget hint |
| Tag Scene 12: location = Warehouse | Warehouse added to Locations; schedule knows Warehouse scenes group together |
| Tag Scene 12: prop = gun | Added to breakdown + a budget line hint |
| Tag Scene 12: **needs original score / gunshot SFX** | Flagged for **post**; becomes a cue/task in the MixLabs post department |
| Drag scenes into a Shoot Day | Schedule updates → **call sheet auto-generates** |
| Fill the budget's POST line | Surfaces the **MixLabs quote** to the filmmaker |

---

## 4. MVP Boundary (v1 — the smallest thing that still feels magic)

**Build this chain, nothing more:**
> **Script import → Scene breakdown (cast · location · elements · post-tags) → Simple schedule (drag scenes into shoot days) → Auto call sheet.**

Plus the shared basics that chain needs:
- Unified **People** directory (cast + crew)
- **Documents** attachable to entities
- Light **Tasks**

**Explicitly OUT of v1** (later phases): deep budgeting, crowdfunding, casting workflow depth, storyboards/shot lists, AI auto-breakdown (fast-follow), prompt-to-schedule.

**Why this chain:** it replaces 4+ spreadsheets, proves the "enter once, flows everywhere" magic, and sets up the post handoff — with the least surface area.

---

## 5. What flows into POST (the funnel)
- Scene **MUSIC/SOUND/VFX tags** → become cues/tasks in the existing post **departments** (Score, Sound, Color…).
- Budget **POST line** → the MixLabs quote, planted during pre-pro.
- The whole project is *already in MixLabs* when post begins → you're not pitching, you're continuing.

---

## 6. Relationship to the current app
- Today's `project` **extends** into this — pre-pro becomes a *phase* of the same project, not a separate thing.
- Today's **Pre-Pro tab** (brief + reference docs) folds into this bigger structure.
- Today's **Handoff** tab is the production→post bridge; it stays.
- Post **departments / review room / delivery** are the downstream that pre-pro feeds.

---

## 7. Open questions to resolve before building
1. **Confirm the primary user** — solo director-producer? (Changes how simple the UI must be.)
2. **Import formats** — FDX + Fountain first, PDF later? (FDX/Fountain are reliable; PDF is messy.)
3. **MVP: manual-first or AI breakdown from day one?** (Recommend manual-first; AI as fast-follow.)
4. **Schedule depth** — manual drag-scenes-into-days for v1, prompt-scheduler later?
5. **Crowdfunding — in or out of the near-term roadmap?**
6. **Does a project start in pre-pro, or can it start at any phase?** (Some clients come to you only at post.)
