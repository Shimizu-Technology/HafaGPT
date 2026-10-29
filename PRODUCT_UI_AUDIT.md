# HåfaGPT product UI audit

Last reviewed: October 29, 2026

## Product goal

HåfaGPT should work equally well as a quick Chamorro reference and as a place to
build a learning habit. A parent should be able to translate a school notice in
seconds; a child who is not yet reading should have large, understandable
actions and audio support; an independent learner should be able to move from a
short daily plan into lessons, practice, stories, and games without relearning
the interface on every page.

The refreshed Home page is the visual and interaction reference: warm rather
than childish, clear rather than sparse, useful on the first screen, and able to
grow from a narrow phone to a wide desktop without changing its hierarchy.

## Audit method

The review covered every learner-facing route registered in `web/src/App.tsx`,
its primary components, shared navigation, loading and signed-out states, and
the mobile layouts represented in the current end-to-end suite. Admin routes
were inventoried but are intentionally outside this learner-experience pass.

## Findings

### Cross-product findings

1. Home has a coherent design system, but most older routes duplicate their own
   header, page background, back button, card treatment, and spacing rules.
2. Many older pages rely on decorative gradients, large shadows, scaling hover
   effects, and emoji as interface icons. This makes the product feel like
   several generations of UI stitched together and weakens accessibility.
3. Primary actions and page titles move between routes. Bottom navigation helps
   on mobile, but there is no shared learner page shell or page-header contract.
4. Signed-out, loading, empty, error, and completed states do not yet share a
   common tone or recovery pattern.
5. Several activities expose every option at once. The learner needs one clear
   next action, with secondary choices revealed only when useful.
6. Audio exists in important learning flows, but the non-reader experience is
   not yet consistently audio-first or image-supported.

### Chat

Previous state:

- The header, response-mode switcher, quick-start strip, welcome illustration,
  word-of-the-day card, help disclosure, composer, disclaimer, and bottom nav
  all competed within one phone screen.
- Quick prompts used tiny horizontally scrolling emoji chips.
- Long intent-specific placeholder copy wrapped inside a 42px textarea and was
  visibly clipped on narrow phones.
- Voice and upload were separate elevated controls, making the composer read as
  four unrelated buttons rather than one input.
- The word of the day duplicated a learning/home responsibility inside Chat.

Direction:

- Keep all capabilities but collapse them into three layers: compact response
  style, conversation, and one unified composer.
- Show three clear starter actions only while the conversation is empty.
- Keep intent guidance as a short label plus a phone-safe placeholder.
- Preserve the message/header gutter as an explicit layout boundary.

### Learn, vocabulary, and stories

Routes: `/learning`, `/learn/:topicId`, `/vocabulary`,
`/vocabulary/:categoryId`, `/stories`, `/stories/:storyId`, and
`/stories/lengguahita/:storyId`.

- These flows contain the strongest educational content, but their navigation,
  title hierarchy, cards, progress indicators, and audio controls differ.
- Vocabulary search is a valuable quick utility and should remain public and
  immediately searchable.
- Lesson and story screens need a shared reading width, persistent progress,
  predictable audio placement, and a single clear continue action.
- Content should progressively disclose examples and grammar detail rather
  than presenting the same density to early readers and adults.

### Flashcards, quizzes, and conversation practice

Routes: `/flashcards` and its viewer/review/deck routes, `/quiz` and its
viewer/review/history routes, and `/practice` plus its scenario routes.

- Lists and sessions use different setup, progress, answer, and completion
  patterns even though they represent the same learn-practice-review loop.
- Sessions need large answer targets, clear question counts, immediate but calm
  feedback, and a consistent exit/retry/continue model.
- Text, audio, and picture cues should be selectable by learner need rather than
  embedded as unrelated page-specific controls.

### Games

Routes: `/games` plus Memory Match, Sound Match, Picture Pairs, Word Scramble,
Falling Words, Word Catch, Chamorro Wordle, Hangman, Cultural Trivia, Color
Touch, Number Tap, and Simon Says.

- Game mechanics are varied and worth preserving, but presentation and controls
  are highly page-specific and emoji-heavy.
- The hub should group games by skill and reading level, explain the learning
  benefit, and recommend one next game instead of presenting a wall of choices.
- Individual games need one shared shell for instructions, sound, pause, score,
  progress, quit confirmation, result, and replay.

### Progress, settings, and information pages

Routes: `/dashboard`, `/dashboard/quiz-history`, `/settings`, `/pricing`,
`/about`, `/support`, `/privacy`, and shared conversations.

- Progress should answer “what did I learn?” and “what should I do next?” before
  showing secondary charts.
- Settings should group learner preferences, accessibility, account, and data
  controls with plain-language consequences.
- Public information pages should adopt the same header, width, typography, and
  footer conventions as Home.

## Design contract

All modernization work should follow these rules:

- Mobile-first, with no horizontal overflow at supported widths.
- One dominant action per state; secondary actions remain available but quiet.
- Minimum 44px touch targets and visible keyboard focus.
- Lucide icons for interface actions; emoji only as pictures on vocabulary,
  topic, and game choices (they help pre-readers) and for seasonal themes. The
  brand mark is the drawn hibiscus (`BrandMark`), not an emoji.
- White or subtly tinted surfaces, restrained borders and shadows, and no
  decorative gradient as the default container treatment.
- Page title and primary action remain easy to locate across routes.
- Plain labels for parents and new learners; optional depth for advanced users.
- Loading, empty, error, signed-out, and completion states always offer a clear
  next step.
- Audio controls have a text alternative and never become the only way to
  understand an action.
- Existing learning content and capabilities are preserved unless a separate,
  evidence-backed product decision explicitly replaces them.

### Visual system (October 2026 design audit)

The impeccable, taste, and Emil Kowalski audit added these rules:

- **Colour roles.** Coral (`bg-action`) is the one action and selection colour
  (teal in dark mode). Teal is secondary: audio, information, source-backed
  content. Cream and brown are surfaces and text. Emerald, amber, and red mean
  success, caution, and error only. Indigo, purple, violet, pink, sky, and blue
  are not interface colours; keep real hues only where colour is the lesson
  (Color Touch, Simon Says, the Colors vocabulary, Wordle tiles).
- **Surfaces.** Flat colour, no gradients. Shadows only on things that float
  (dialogs, menus, toasts, fixed bars). One tile treatment and one selected
  state across pickers and grids.
- **Type.** English interface text uses the platform sans-serif. Chamorro words,
  phrases, and passages use `font-chamorro` (Literata), so the language being
  learned always reads apart from English. Numbers on progress screens are type,
  not icon tiles. Sentence case; no tracked uppercase labels or decorative
  eyebrow labels above headings. Learner text is at least 12px.
- **Contrast.** Every learner text and placeholder meets WCAG AA in light and
  dark mode.
- **Motion.** Use the easing tokens (`ease-out` for entering/responding,
  `ease-in-out` for movement on screen; mirrored as `--ease-*` CSS variables).
  Interface transitions stay at or under 300ms and name the properties they
  animate (never `transition-all`). Everything pressable scales to 0.97 on
  press through the `scale` property; button-styled links add `pressable`.
  Hover styles only apply on devices that can hover. Nothing enters from
  `scale(0)` or bounces. Route changes do not animate. With reduced motion,
  nothing moves or scales; colour and opacity still ease for 150ms and
  entrances only fade.

## Implementation sequence

Each group is a focused, reversible pull request with unit/type/build checks,
mobile and desktop browser testing, the full repository check, Greptile review
on the final commit, and production verification after merge.

1. **Startup resilience — complete.** Returning browser profiles recover from
   stale deploy assets and unavailable browser storage without blanking the app.
2. **Chat clarity — complete.** The empty state, response controls, source
   presentation, and unified composer now preserve translation, voice, and upload
   while remaining readable on narrow phones.
3. **Shared learner shell + core learning — complete.** Lessons, vocabulary,
   and stories now share navigation, title hierarchy, content width, progress,
   and accessible detail interactions.
4. **Practice system — primary flows complete.** Flashcard, quiz, and
   conversation entry and session pages now share navigation, progress, large
   interaction targets, calm feedback, and consistent exits. Saved-deck,
   review, and history utilities remain grouped with the progress/account pass.
5. **Game system — complete.** The
   game library now recommends one audio-first starting point, groups all 12
   existing games by learning style, and labels reading demands without
   age-gating learners. Sound Match, Picture Pairs, Color Touch, Number Tap,
   and Simon Says now share navigation, setup,
   progress, audio disclosure, and completion patterns. Memory Match, Word
   Scramble, and Hangman now use the same shell, compact swipeable topic choice,
   selected-state semantics, and guarded exits. Falling Words and Word Catch now
   use the same compact setup, in-game pause/settings controls, and deterministic
   exits. Chamorro Wordle and Cultural Trivia now complete the system with the
   shared shell, compact setup and results, accessible selected states, guarded
   exits, and a single global theme control while preserving their mechanics,
   scoring, saved results, and daily play behavior.
6. **Progress and account — complete.** The dashboard now leads
   with a compact learning overview, readable activity summary, direct quiz
   history access, and clear next actions without speculative “coming soon”
   content. Quiz history and detailed review now share the learner shell,
   responsive result rows, explicit answer labels, and recoverable loading,
   empty, and error states. Saved decks now show useful review progress and due
   cards at a glance, while saved-deck study has consistent progress, rating,
   completion, and recovery states. Settings now groups learning style, pace,
   appearance, progress, support, and privacy with one clear save surface. About,
   pricing, support, privacy, and shared conversations now use one public shell,
   readable content widths, consistent actions and footers, and recoverable
   loading/error behavior. Shared conversations also preserve source links and
   attachments while adding retry and an accessible image preview.
7. **Accessibility and age-range pass — complete.** The mobile navigation now
   reports the current route, exposes its More panel as a labeled dialog, traps
   keyboard focus, closes with Escape, and restores the learner's prior focus.
   The same dialog contract now covers chat sharing/export, conversation
   deletion, image previews, and upgrade prompts. Audio-quality disclosures are
   keyboard dismissible, and the global reduced-motion preference disables
   decorative movement without hiding status text. Plan limits and prices now
   come from one frontend configuration shared by pricing, offline usage
   fallbacks, and upgrade prompts, eliminating the old child-facing mismatch.
   Unit coverage and the desktop/mobile route matrix verify navigation labels,
   focus recovery, motion preferences, responsive containment, audio/text
   disclosure, and the primary signed-out recovery states.

## Release checklist for every UI pull request

- Relevant unit/component tests pass.
- TypeScript, lint, production build, PWA checks, and bundle budgets pass.
- Public and authenticated routes are checked at phone and desktop sizes.
- No horizontal overflow, clipped labels, obscured actions, or unsafe-area
  collisions.
- Keyboard focus, disabled controls, loading, empty, and error states are tested.
- Existing content, learner progress, conversations, and database records remain
  untouched.
- Greptile reports a clean 5/5 on the current head commit.
- Production is checked after merge before the next UI group starts.
