# Reading checklist by language

Each row reads: what to look for, what to do about it, and the trap. The "Family" column says whether it is **cleanup** (no visible effect, done without asking) or a **fix** (changes something for the user: listed and submitted to the user). Load only the section for the language concerned.

## HTML

| What to look for | What to do | Family | Trap |
|---|---|---|---|
| Same block repeated (card, table row, list item) with only the content changing | A template (`<template>` or a function that builds the block) fed by the data | Cleanup | Attribute order and whitespace change the DOM recorded by the fingerprint: reproduce the original markup exactly |
| Same header, footer or script on several pages | Shared fragments and a small build script (see SKILL.md) | Cleanup | Two copies of every page, which drift apart if someone edits the served page |
| Styles written in elements' `style` attribute, repeated | A class | Cleanup | An inline `style` beats the stylesheet: check the cascade with the fingerprint |
| Text written in the JavaScript code | A single data file (text, labels, messages) | Cleanup | Apostrophes and quotes no longer need escaping in a data file: a gain in itself |
| Clickable `div`, button without a label, image without `alt`, headings that skip a level | List it | Fix | The accessibility tree changes: this is not cleanup, even if the screen stays identical |
| Duplicate ids on a page | List it | Fix | `getElementById` only returns the first one: fixing it changes behaviour |
| Script order, script at the very top of `<head>` | Leave it alone unless there is a reason | Decision | A theme script at the top of the page prevents a flash on load: it is not redundant |

## CSS

| What to look for | What to do | Family | Trap |
|---|---|---|---|
| Class, id, variable or `@keyframes` flagged by `code-mort.mjs` | Confirm by searching for the name AND its prefix across the whole project, then delete | Cleanup | Names built in JavaScript (`'state-' + x`); other pages of the site sharing the stylesheet; `--` modifier classes read as variables |
| Same value (colour, size, spacing, duration) repeated | A variable, and a scale: a few text sizes, a few spacings, three animation durations | Cleanup | A colour turned into a variable needs its dark value; a hard-coded colour that breaks the dark theme is a fix |
| Same declarations under several selectors | Group the selectors, or use a shared class | Cleanup | False twins: same name, different values. Only group what is strictly identical |
| Selector declared twice in the same file | Merge into the second declaration | Cleanup | Order matters: merge at the position of the LAST occurrence, otherwise a rule in between may win |
| A string of `!important` | Trace the cause (specificity, stylesheet order) | Cleanup | `[hidden]{display:none!important}` is a legitimate `!important`: keep it |
| `display` rule on an element that sometimes carries `hidden` | Keep or add `[hidden]{display:none!important}` | Fix if the defect is visible today | On a real app, a "Hired" stamp stayed visible at all times for this reason |
| Media queries scattered for the same width | Group them by breakpoint | Cleanup | Their position in the cascade changes: check at 375 and 1440 px |
| Shared stylesheet considered for several pages | Put a number on it first: compressed KB, one more blocking request | Decision | On a real site, CSS written into each page was a deliberate choice, except for three pages close enough to share a base |
| Obsolete vendor prefixes (`-webkit-box-shadow`...) | Delete | Cleanup | Some are still useful (`-webkit-backdrop-filter` on Safari, `-webkit-text-size-adjust`): check caniuse first |

## JavaScript

| What to look for | What to do | Family | Trap |
|---|---|---|---|
| Function never called | Confirm (call from an HTML `onclick`, another file, a string) then delete | Cleanup | Calls by name through a string (`window[name]()`) do not show up in a search |
| Repeated `document.querySelectorAll(...).forEach` | A small helper (`all(sel)`) | Cleanup | Keep the project's style: no library added for this |
| Same number written in several places (number of steps, delay) | A single constant | Cleanup | A changed delay changes how the page feels: same value, no "while we're at it" |
| Display updates scattered after each action | A `render()` function that starts from the state | Cleanup | Focus: re-rendering can lose the element that had focus. The fingerprint records it |
| State scattered across global variables and attributes | A single state object, saved in one place | Cleanup | The storage key (`localStorage`) never changes name: visitors would lose their progress |
| Listeners attached to every item of a list | Delegation on the parent (`data-action`) | Cleanup | Items added later: delegation covers them, the old code may not have. Check that it already did |
| `innerHTML` with user-entered data | List it | Fix | Injection flaw: never "tidied up" silently |
| Swallowed error (`catch (e) {}`) | List it if it hides a real defect | Fix | Some are intentional (storage unavailable in private browsing): keep those |
| Old syntax (`var`, `function` everywhere) | Modernise only if the whole file follows | Cleanup | Mixing two styles in one file is worse than the old style alone |

## Node and Python scripts (build, export, conversion)

| What to look for | What to do | Family | Trap |
|---|---|---|---|
| Hard-coded paths | Constants at the top of the file, computed from the script's location | Cleanup | The script must keep working when run from another folder: `sorties.mjs --cwd` checks it |
| Same processing copied for several files | One function and a loop | Cleanup | Processing order can change the order files are written in: byte-for-byte output comparison shows it |
| Script that writes even when a step failed | List it | Fix | Refusing to write a page whose script is broken changes behaviour: get the fix approved first |
| PowerPoint scripts (python-pptx) | Keep the source in ASCII, rewrite in blocks | Cleanup | Unicode typography makes partial replacements fail; and never regenerate a .pptx edited by hand, the edits would be lost |
| File written by PowerShell | Rewrite it with the editing tools | Cleanup | PowerShell 5.1 writes UTF-16: accented characters break |
| File rewritten by Python in text mode on Windows | Read and write in binary, or `newline=''` | Cleanup | LF silently becomes CRLF and the whole file shows as modified |

## n8n Code nodes

| What to look for | What to do | Family | Trap |
|---|---|---|---|
| Long code in a single node | Named functions inside the same node | Cleanup | A Code node shares nothing with the others: no common module possible |
| Static data written in the code | An n8n data table | Decision | Static data in Code nodes is not persisted; but changing the data source changes the workflow: user approval needed |
| Secret in plain text (key, token) | List it immediately | Fix | A Code node cannot read credentials: the right fix goes through the credentials of the native nodes |
| Published workflow | Nothing gets published without a go-ahead | Decision | In n8n v2 you publish instead of activating: an unpublished change does not run |

Proof for a Code node: a local harness that simulates `$input.all()` with the items of a real execution, run by `sorties.mjs` before and after.
