---
name: proven-refactor
description: "Proven refactoring for anything that contains code: HTML pages, apps, static sites, Node or Python scripts, n8n Code nodes. Makes the code simpler to read and change WITHOUT changing anything for the user, and proves it by measurement: a before/after fingerprint (DOM, computed styles of every element, accessibility tree, focus, pixels) at 375 and 1440 px, in light and dark themes, state by state; or byte-identical outputs for a script. Opens menus and tabs on its own, writes a visual before/after report, measures page weight and load speed. Dead code and duplicate inventory, cleanup in batches checked one by one. Two short modes: light (files from a recent change, no fingerprint) and instructions (skills, CLAUDE.md, settings: duplicates, contradictions, dead paths). Bugs and questionable choices found along the way go to the user and are never fixed silently. Trigger: /proven-refactor [file, folder or project], or \"refactor this\", \"clean up the code\", \"simplify this page's code\", \"tidy up this script\"."
---

# Proven refactoring

## How to use (show at launch)

When this skill is invoked, first show this short guide, then carry on directly if the target is already given:

> **/proven-refactor: simpler code, nothing changed on screen**
> - `/proven-refactor [file or folder]`: I tidy up the code of a page, an app or a script
> - First I record a fingerprint of what the user sees (phone and desktop, light and dark theme, every menu open). Then I clean up the code in small batches and, after each batch, check that everything is identical down to the pixel
> - I tidy up on my own whatever changes nothing for the user. A bug found along the way, or a choice that looks like a decision, is submitted to you: I leave it alone
> - At the end, a visual report shows the screenshots before and after with the differences circled, and the page weight
> - Nothing is committed, pushed or deployed without your approval
> - There are two short modes: `/proven-refactor light [files]` after a change, `/proven-refactor instructions [file]` for a skill, a CLAUDE.md or a settings file

## Three intensities

| Intensity | When | What it costs |
|---|---|---|
| **Full** (default) | A page, an app or a script to clean up, a page that is published or delivered to a client, more than 300 lines or 3 code files touched | The whole procedure below, fingerprint included |
| **Light** (`/proven-refactor light`) | Right after a smaller change: check that it leaves nothing behind | A few tool calls, no fingerprint |
| **Instructions** (`/proven-refactor instructions`) | Skill, CLAUDE.md, handover notes, `settings.json`, hook | A few searches and a validation |

A few-line touch-up (typo, link) needs none of the three.

### Light

The scope is limited to the files the change created or modified. Debt found elsewhere is not cleaned up in passing: it gets one line in the summary, with a suggestion to run a full `/proven-refactor` if it is worth it.
1. `verifier-syntaxe.mjs --lang en` on the folder of the touched files.
2. `code-mort.mjs --lang en` on the same folder. Keep only the suspects that concern the touched files, and confirm each one with a search across the project (see the pitfalls below: images loaded by concatenation, generated class names, `--` modifiers) before deleting.
3. Read the diff of the change: code made dead by the change itself, properties that no longer do anything (font size on an element with no text, animation whose keyframes are gone), duplicates created, scaffolding (throwaway scripts, `console.log`, temporary files), comments and documentation that describe the previous state.
4. Clean up only what changes nothing on screen. A fix or a decision is reported, as in step 2 of the full procedure.
5. Check the syntax again, run the project's tests if it has any and, for a page, check it at 375 px.

### Instructions

What is loaded with every message (CLAUDE.md, memory index, skill description) is paid for with every message: each line has to earn its place.
1. **One rule, one copy.** Search for the rule's keywords in the other instruction files (global and project CLAUDE.md, neighbouring skills, handover notes). If you find a duplicate, keep the copy in the right place and replace the others with a one-line pointer.
2. **No contradiction.** An older rule that says the opposite is updated or removed, and the date of the decision is written down.
3. **No dead path.** Every file, folder, skill or script mentioned exists, under the name written.
4. **Detail moves down.** What is not needed with every message goes into the SKILL.md or a reference file; the loaded file keeps only the title and the pointer.
5. **Validation.** Skill: the frontmatter parses and the description fits in 1,024 characters (`quick_validate.py` from Anthropic's `skill-creator` skill if installed; `claude plugin validate` for a plugin). `settings.json`: `node -e "JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'))" <file>`. Hook: the script it calls exists and runs without error on a test input.
6. **Summary with numbers.** Give the line count of the loaded file before and after.

The rest of this document describes the full intensity.

## The golden rule

Refactoring means changing how the code is written without changing what it does. Here, that is **proven by measurement**, never by reading. A refactoring is finished only when the fingerprint after is identical to the one before; "I re-read it, it should be the same" does not count.

Three consequences:
- Measure BEFORE touching the code. No reference fingerprint, no refactoring.
- Anything that would change something for the user (bug, accessibility, mobile layout, text) is NOT refactoring. It is a fix: it gets listed, submitted to the user and done in a separate batch, never mixed in with the cleanup.
- A choice that looks odd may be a decision. Look for its reason (README, handover notes, git history, comments) before touching it, and when in doubt, ask.

## The skill's tools

The skill has five scripts in its `scripts/` folder. They need Node 18 or later, and Puppeteer for `empreinte.mjs` (`npm install -g puppeteer`, once). The files they produce (fingerprints, screenshots) go into a temporary folder, never into the project.

The scripts were written in French and speak both languages. **Always pass `--lang en`** (or set `REFACTO_LANG=en`): messages, summaries and the HTML report are then in English. Every option has an English name, used below; the French names still work.

| Script | Purpose | Command |
|---|---|---|
| `verifier-syntaxe.mjs` (check syntax) | Does all the code parse? .js/.mjs/.cjs files, scripts inside HTML pages (modules included), JSON-LD, .json, .py | `node verifier-syntaxe.mjs <folder> --lang en` |
| `code-mort.mjs` (dead code) | List of suspects: classes and ids never used, unused CSS variables and @keyframes, duplicate CSS declarations, functions never called, orphan files | `node code-mort.mjs <folder> --exclude <generated file> --lang en` |
| `empreinte.mjs` (fingerprint) | Proof for a page or an app: DOM, computed style of every element and its pseudo-elements, accessibility tree, focus, horizontal overflow, pixels, in every state, at 375 and 1440 px, light and dark. Also records weight and load speed, and writes a visual report | `node empreinte.mjs <page> <ref.json> --states states.mjs --explore --lang en` |
| `sorties.mjs` (outputs) | Proof for a script: exit code, printed text (dates and durations masked), files produced, byte for byte | `node sorties.mjs <ref.json> --command "node build.mjs" --output dist --lang en` |
| `auto-test.mjs` (self-test) | Checks that the four tools see what they should, and nothing when there is nothing to see, on a test site | `node auto-test.mjs --lang en` |

`empreinte.mjs` and `sorties.mjs` work the same way: if the reference does not exist, it is created; if it exists, it is used for comparison. The exit code is 0 if everything is identical and 1 otherwise, and every difference is shown plainly (element, property, before, after, number of pixels and area affected). A reference recorded in French compares with a run in English, and the other way round.

For a whole site, `empreinte.mjs <folder> <ref.json> --all-pages --exclude build` finds every page by itself. A page added later enters the measurement without declaring anything: a tool whose list of pages is written by hand always ends up missing some.

`example-states.mjs` is the template for the states scenario (`exemple-etats.mjs` is the French version). Every state the user can see must be captured in it: open menu, tab, sheet, error message, filled form, direct link to an anchor. **A state that is not captured is a state that is not protected.** In English the scenario exports `prepare(page)` and a default function that receives `capture, click, type, press, scrollTo, wait, reload, width, theme` (`light` or `dark`) and `page`.

Before each screenshot, `empreinte.mjs` freezes animations, transitions and the text cursor, then moves the mouse back to the top-left corner: a click in the scenario (`page.click`) therefore leaves no hover on the next screen. To capture an intended hover (menu that opens on hover, tooltip), call `await page.hover(sel)` then `await capture(name, { keepMouse: true })`.

**Page protected by a strict security policy** (`Content-Security-Policy` without `'unsafe-inline'` for styles, as a header or a `<meta>` tag): the policy blocks the stylesheet that freezes animations. `empreinte.mjs` notices it at the first state, stops without writing a reference and asks for `--bypass-csp`, which lifts the policy in the test browser, and only there. The measurement then has a blind spot: a change the policy would block in production (a `<style>` tag or script written into the page, an `onclick` attribute, a resource from another domain) escapes the measurement and breaks the live page. With this option, also check in the diff that no code was written into the page and no resource from another domain was added, then run the project's tests that open the page with its policy, if it has any. That is also why the option is never on by default.

**What the summary guarantees, and its caveats.** The comparison summary only lists what was actually compared: "identical (DOM, styles, accessibility, focus, pixels)". A reference recorded without screenshots, or by an earlier version of the tool, triggers a caveat written in plain words ("Pixels NOT compared", style properties not covered): record it again before relying on it. The page's JavaScript errors are stored with the reference: an error already present before the refactoring is reported without blocking, an error that appears or disappears is a difference. During `--explore`, storage is cleared between two elements (IndexedDB and caches included, cookies kept), and any request that sends data (POST to a counter, a form, a webhook) is blocked then listed: the captured state is then that of a failed submission.

**App built by a tool (React, Vue, Vite, TypeScript, Tailwind).** Measure the built site, served by its preview server, by giving its address to `empreinte.mjs`; never the sources. `verifier-syntaxe.mjs` does not parse .ts, .tsx, .jsx, .vue or .svelte files: it counts them and reports them as NOT CHECKED, and the project's build (`tsc`, `npm run build`) is what counts. `code-mort.mjs` reads these files as code that uses classes, but does not know classes generated by a tool (Tailwind): on such projects its inventory only covers hand-written CSS. Fingerprint limit: the content of a Shadow DOM or an iframe is only compared through pixels.

What `empreinte.mjs` adds on top of the comparison:
- **`--explore`**: the tool opens, one by one, every button, tab, dropdown, `<summary>` element and internal link of the page, starting each time from a reloaded page and empty storage, then captures the resulting state. A state forgotten in the scenario stays protected. It never clicks a destructive button (delete, clear, reset, log out) or a form submit button, and does not follow a link to another page: it lists them. The scenario is still needed for multi-step states (filled form, full journey). On a whole site, limit the cost with `--max-states` and `--widths 375`, or explore only the pages that have interactive elements.
- **Accessibility**: the tree a screen reader reads (roles, names, expanded or checked states) is recorded in every state. A button whose accessible name changes, a heading that loses its level or a menu that no longer says whether it is open are differences, even if the screen is identical.
- **Weight and speed**: when each page loads, the number of requests, the raw and compressed weight (gzip recomputed) and the display times. In comparison mode the change is given as a percentage. These figures are for information and never count as a difference: they put a number on the gain of a refactoring or the cost of an extraction (see step 2). Times measured locally are indicative.
- **Visual report**: in comparison mode, `<reference>.rapport.html` is written next to the reference. For each state with a difference, it shows the screenshot before, the one after and a diff image (changed pixels in red, area circled), then weight and speed, rendering noise and the list of identical states. It works offline, in light and dark, on phone and desktop. It is the proof to show someone who does not read code.

Run `auto-test.mjs --lang en` on first use and after any change to a script. A proof tool that lies is worse than no tool at all.

## Procedure

### Step 0: locate the code

Before anything else:
- Read the project's documentation (README, handover notes, conventions) before the first change.
- What is source and what is generated? A page assembled by a script (`dist`, `build`, a "compiled" page) is not refactored by hand: refactor the source, then rebuild. Generated files are excluded from the inventory (`--exclude`).
- How does the page start? Splash screen to skip, storage key to set, cookie banner: all of that goes into the scenario's `prepare()` function.
- Backup: in a git repository, the starting state is enough (nothing is committed without being asked). Outside git, copy the files concerned into a temporary folder before the first change.
- Uncommitted changes already lying around? Record the reference on an export of the last commit (`git worktree add` or `git archive HEAD`), not on the working copy. Otherwise you compare against a state that was never live.
- Line endings: if the repository mixes CRLF and LF, the noise drowns the real differences. On a real site, 17 of 25 "modified" pages only differed by their line endings, and they hid 8 real drifts. Normalise first, ideally with a `.gitattributes` set to `eol=lf`.

### Step 1: set up the safety net

In this order, before changing a single line:
1. `verifier-syntaxe.mjs` on the project. An error already exists? Report it, and do not refactor on top of it.
2. The project's tests, if it has any. They must pass. If they fail before you start, say so and stop there.
3. The reference fingerprint:
   - page or app: write the states scenario (a copy of `example-states.mjs`), then run `empreinte.mjs` with `--explore`. Read the list of elements it did not open: an important state among them goes into the scenario. Then immediately run it again in comparison mode WITHOUT changing anything: if it finds differences, the page is not stable (random visual, date, animation). Neutralise the source of instability in the scenario instead of ignoring the differences;
   - script, site build: `sorties.mjs` with the same inputs as in real use;
   - n8n Code node: take the input items of a real execution and replay them in a small local harness where `$input.all()` returns those items, then hand that harness to `sorties.mjs`. A secret found in plain text along the way is reported; it is not "tidied up".

### Step 2: take the inventory

1. `code-mort.mjs` on the sources, without generated files. Each line is a suspect. Before deleting, confirm it with a search across the whole project, the other pages of the site and third-party tools.
2. Read the code with the checklist in `references/catalog.md` (HTML, CSS, JavaScript, scripts, n8n). Load only the section for the language concerned.
3. Put each finding into one of three families:
   - **Cleanup**, with no visible effect: duplicate, confirmed dead code, repeated value to turn into a variable, hard-coded text to move into a data file, function too long. It is done without asking, since the user asked for a refactoring;
   - **Fix**, which changes something for the user: bug, accessibility defect, overflow at 375 px, hard-coded colour that breaks the dark theme. It is listed, not done;
   - **Decision**, a choice that may have a reason (text, order, unusual behaviour): look for its justification, and list it if none is found.

Measure before extracting. Sharing what repeats has a cost: a shared stylesheet is one more blocking request for every visitor. Put a number on that cost in compressed KB (the "Weight and speed" line of `empreinte.mjs` gives it, page by page) and weigh it against the gain. And only share what is **strictly identical**: two rules with the same name but different values are false twins and must stay separate. On a real site, 29 selectors were false twins, `:root` carried 10 different palettes and only 11 rules were identical on every page. What is ruled out after measuring is written in the report with its numbers, so that the next session does not redo the analysis.

Stop point: if there are fixes or decisions, submit them to the user as multiple-choice questions, with a recommendation. Phrase them in concrete terms ("the menu does not close with Escape on a phone"), never in jargon. The cleanup carries on meanwhile.

### Step 3: clean up in checked batches

Order of batches, from least to most risky:
1. Confirmed dead code.
2. Duplicates: CSS rules, functions, repeated HTML templates.
3. Repeated values turned into variables: colours as theme variables (with their dark value), type scale, spacing, animation durations.
4. Text and data moved out of the code into a single file. As a bonus, apostrophes no longer need escaping.
5. Long functions split, clear names, centralised state. A misleading name gets renamed: on a real site, `--au` meant "aubergine" everywhere except on one page where it was green. Rename without touching any value, which a balanced diff proves (as many lines added as removed).
6. The same block copied across several pages (header, footer, theme script): shared fragments, assembled by a small build script. This batch has its own pitfalls, described in the dedicated section below.
7. File reorganisation last, and only if it brings something.

After EACH batch: `verifier-syntaxe.mjs`, the project's tests, then the fingerprint or outputs comparison. And if a difference shows up?
- It was not intended: undo the batch, understand, redo it smaller.
- It is intended, explained and has no visible effect (real example: the colour of a hidden label): note it for the report. NEVER regenerate the reference to make a difference you cannot explain go away.

Keep the existing code style: same naming conventions, same comment density, same language as the project for names.

### Step 4: approved fixes, separately

Fixes approved by the user are made AFTER the cleanup, in a separate batch, and their effect is checked on screen, at 375 px and on desktop. The fingerprint then shows expected differences: check that they only touch what was meant to change.

### Step 5: clean up after yourself

The cleanup pass is part of the job:
- no CSS rule, variable, function or image left dead by the cleanup (run `code-mort.mjs` again and compare with the first inventory);
- no scaffolding left in the project: throwaway scripts, debug `console.log`, reference files, screenshots;
- no comment or documentation still describing the previous state;
- if the page is built by a script, rebuild it and check that the generated page matches.

Then one last full comparison, with the same standard as during the cleanup.

### Step 6: report back

- The detail goes into the project's documentation: what was cleaned up, batch by batch; the numbers (lines before and after, page weight, number of states and checks compared); the explained differences; the fixes and decisions pending.
- To the user, the result in one sentence ("cleaned up, 86 states identical down to the pixel"), then what is waiting for them: a question, or the go-ahead to deploy. Offer the visual report of the last comparison, with its path: it is the proof they can show.
- No commit, no push, no deployment without an explicit request. After an approved deployment, run the comparison again on the live site (`empreinte.mjs` accepts a public address).

## Code copied across several pages: shared fragments

Method tested on a real site where 32 pages carried the same theme script and the same light/dark toggle:
- the editable sources live separately (`build/pages/`), with markers such as `<!--#include nav.html-->`. A local build script produces the served pages, which remain the ones committed. Nothing changes on the hosting side;
- when a fragment legitimately varies from page to page (the list of menu links), the page declares its value (`<!--#def links-->...<!--#enddef-->`) and the fragment uses it (`<!--#use links-->`). A `use` without a `def` is a build error, never a silent gap;
- includes are resolved in a loop, with a limit of 10 passes. In a single pass, a fragment that contained another one left an unresolved marker, and the theme toggle had vanished from 21 pages;
- do not force uniformity. Footers ranging from 75 bytes to 2.7 KB belong to different families: one fragment per family, and the families get approved before writing the code.

The costliest trap is that **each page then exists twice**, the source and the served page, and sooner or later someone edits the one they see. On that site, 8 pages drifted for three weeks, and a build run at that point would have put an outdated version back online without warning. That is why there are two safeguards: a `--check` mode that compares sources and served pages before any build, and an escape hatch that replays the build in reverse and writes nothing if a single page does not come back byte for byte.

## Pitfalls already met

- **The `hidden` attribute beaten by a `display` rule**: a "hidden" element stays visible if a CSS rule gives it `display:flex` or `block`. Keep or add `[hidden]{display:none!important}` when tidying `display` rules.
- **An unescaped apostrophe in a text string** breaks the page's entire script, with no visible message. Hence `verifier-syntaxe.mjs` before every test, and text moved into a data file.
- **Splash screen, guided tour, cookie banner**: they cover the page and skew the fingerprint. Skip them in `prepare()`, by setting the storage key they check.
- **Elements placed on scroll or at random** (background visuals, rotating quotes): they change from one run to the next. Neutralise them in the scenario, after confirming the instability with a double run with no changes.
- **Generated files in the inventoried folder**: everything shows up twice, so always `--exclude`. Same for a local test server, which ignores the host's exclusion files (`.vercelignore`): the sources of a build get served as pages.
- **Images loaded by concatenation** (`'illustration-' + key + '.webp'`): they appear nowhere in plain text. On a real site, 9 of 14 "orphan" images were in use. Never delete a file on the strength of one search; also search for the prefix of its name.
- **Page that builds its class names** (`'m-' + model`): any dead-CSS detection gives false positives there. Exclude it from cleanup passes, and note it in the project's documentation.
- **Measuring inside an iframe**: an iframe that is not displayed returns stale styles (a false diagnosis of 33 failing contrasts came from that). `empreinte.mjs` opens a real page, one at a time.
- **Continuously animated elements** (scrolling banner, counter): even neutralised, they sometimes leave differences under 3 px, in either direction. Report them as such instead of hiding them.
- **Fonts not loaded yet**: the text is then measured in the fallback font, and every width is wrong (2,693 false differences once). `empreinte.mjs` waits for `document.fonts.ready`.
- **Full-page screenshot of an app that scrolls internally** (card feed at 100% height): the "beyond the screen" capture makes every card visible at once and fires their IntersectionObservers. On a real app, the displayed card jumped to the last one in the feed, a guided tour skipped a bubble, and the scenario stopped. `empreinte.mjs` therefore captures the viewport when the document is no taller than the screen. A scenario that stops halfway often signals a tool that changes what it measures: replay the step alone, without capture, then with it, before blaming the page.
- **Background images in the computed style**: an image written as a relative path is read as a full URL, test server port included, and that port changes with each run. On a real app, the double run with no changes showed every state as different. `empreinte.mjs` therefore strips the server address from the recorded values.
- **Resized photos**: they do not always decode to the same values from one run to the next (up to 22 out of 255 observed). `empreinte.mjs` only counts as different a pixel that changes by more than 40 out of 255 (`--pixel-threshold`); the rest is reported as "rendering noise", never hidden. In the scenario, wait for displayed images to be decoded and for the screen to be still before each capture.
- **An `!important` rule inside a CSS layer beats a stylesheet that is in no layer**: for `!important`, layer order is reversed. The first declared layer wins over all the others, and unlayered CSS comes last. On a real app built with Tailwind v4, the "reduced motion" rule, written in `@layer base` (1 ms `!important`), won: animations kept running despite `empreinte.mjs`, and a section briefly promoted to its own compositing layer shifted a line of text by one pixel from one run to the next. `empreinte.mjs` therefore puts its stylesheet in a layer declared first, at the top of `<head>`. Do not replace the zero duration with `animation-name:none`: an element that only appears through a "forwards" animation, from an invisible base style, would stay invisible (the self-test checks this).
- **Security policy `style-src 'self'`**: on the same app, it blocked the stylesheet that freezes animations and the cursor. The text cursor stayed visible and the screenshots varied. `empreinte.mjs` detects it and stops: run again with `--bypass-csp`, knowing what the measurement no longer sees (section "The skill's tools").
- **The mouse left by a scenario click** (`page.click`, before typing for example) hovers the element that appears under it on the next screen, and that hover depends on when the browser recomputes it. On the same app, a button's hover border appeared or not from one run to the next. `empreinte.mjs` therefore moves the mouse to (0, 0) before each capture; an intended hover is captured with `{ keepMouse: true }`.
- **Two states with almost the same name** ("+" and "−" buttons, carousel arrows with no accessible name): their screenshots had the same file name and overwrote each other, so a pixel change could go unnoticed. The file name now carries a hash of the full state name.
- **Empty `border` shorthand**: the browser returns it empty as soon as the four sides differ, and a border change escaped `--no-screenshots`. Borders are recorded one side at a time, along with `pointer-events` (a button that no longer receives clicks shows neither on screen nor in the DOM) and about twenty other properties.
- **File left over from a previous run**: `sorties.mjs` took for an output a file the command no longer wrote. It now records each file's date before running the command. A build script that skips unchanged files triggers this difference wrongly: empty the output folder before recording and before comparing.
- **First rule after an `@import`** (or a `@charset`, a `@layer a, b;`): `code-mort.mjs` used to swallow it with the statement. Fixed, and nested CSS rules are read.
- **Python on Windows silently rewrites line endings**: `open(f).read()` then `open(f, 'w').write()` in text mode turns an LF file into CRLF. On a real project, a single touch-up by script made two whole files appear modified in the next diff. To edit by script, read and write in binary mode, or pass `newline=''`. To count carriage returns, read the bytes (`python -c`): depending on the shell, `grep -c $'\r'` counts every line.
- **Class with a `--` modifier** (`button--outline`): `code-mort.mjs` reads it as a CSS variable and reports a variable `--outline` "declared, never read" that does not exist. Search for `--outline:` before trying to delete it.
- **The fingerprint does not see animations**: it measures with animations frozen. A page whose animations are driven by scrolling (`animation-timeline`) needs separate proof, made with animations running: for each animated element, record the cascade (name, timeline, range, duration) and the computed values (`translate`, `filter`, opacity...) at several scroll positions, before and after.
- **Reference recorded in an unstable state**: on a real site, a page had once been measured with text widths shifted by a fraction of a pixel, hence 10 false differences. To settle it, measure the untouched backup copy against the same reference: if it shows the same differences, record the reference again from that copy. Never run the no-change double measurement in the background while already editing the files.
- **Settled decisions disguised as debt**: CSS written into each page rather than a shared stylesheet, a small script at the top of the page that looks like a duplicate. Look for the reason in the project's documentation before "fixing" what looks like duplication.
- **PowerShell on Windows** writes UTF-16 by default and breaks accented characters: write files with the editing tools, not with the shell.

## Model and effort

A refactoring counts as non-trivial code: high effort at least, very high for a whole app or a job longer than half an hour.

## Completeness

- Every suspect in the inventory is confirmed or ruled out, every visible state is in the scenario, every batch is checked. Count inputs and outputs before handing over.
- No "and so on", no sample presented as complete, no TODO left in the delivered code.
- Cleanup with no visible effect goes all the way without interruption. The skill's stop points (fixes and decisions submitted to the user, failing tests at the start) take precedence over this rule.

## No AI slop (mandatory)

Everything this skill produces (code, comments, report, messages) must pass for the careful work of a competent human. Not allowed: filler and empty phrases, emphasis that measures nothing (crucial, robust, seamless...), em dashes, decorative contrasts ("it's not X, it's Y"), mechanical lists and triplets, made-up facts, numbers or measurement results, code comments that paraphrase the code. Give a measured number or none. If an anti-AI writing skill is installed (for example `avoid-ai-writing`), apply it to the report. Before handing over, re-read your own output against these rules and fix it.
