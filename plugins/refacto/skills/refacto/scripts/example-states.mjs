// Scenario template for empreinte.mjs: copy this file into the session's working folder, adapt it to the page, then
// run: node empreinte.mjs page.html reference.json --states states.mjs --lang en
// The scenario is replayed identically before and after the refactoring, for each width and each theme.
// Rule: capture every state the user can see (open menu, tab, sheet, error message, filled form), not only the page
// on arrival. A state that is not captured is a state that is not protected.
// The --explore option already opens each button, tab and dropdown menu on its own, one at a time: this scenario is
// mostly for multi-step states (form filled then sent, full journey, setup before the page loads).
// Before each capture, the mouse is moved back to the top left corner: a click from the scenario (page.click) leaves
// no hover on the next screen. To capture an intended hover: capture(name, { keepMouse: true }).
// theme is "light" or "dark" when the tool runs in English ("clair" or "sombre" in French). State names and the
// reference file do not depend on the language: a reference recorded in one language compares in the other.
// French version of this template, with the French tool names: exemple-etats.mjs.

// Optional: runs before the page loads (storage keys, splash screen to skip...)
export async function prepare(page) {
  await page.evaluateOnNewDocument(() => {
    try { sessionStorage.setItem("example:splash-seen", "1"); } catch (e) {}
  });
}

export default async function (page, { capture, click, type, press, scrollTo, wait, reload, width, theme, page: pageName }) {
  await capture("load");

  // A menu that opens, then closes with the keyboard
  if (await page.$("#menu-button")) {
    await click("#menu-button"); await capture("menu-open");
    await press("Escape"); await capture("menu-closed");
  }

  // A form: sent empty (error message), then filled
  if (await page.$("form")) {
    await click("form [type=submit]"); await capture("form-error");
    await type("form input[type=email]", "test@example.com"); await capture("form-filled");
  }

  // A menu that opens on hover, on desktop: the mouse stays on it during the capture
  if (width >= 1024 && await page.$("#hover-menu")) { await page.hover("#hover-menu"); await capture("menu-hovered", { keepMouse: true }); }

  // A section further down the page
  if (await page.$("#pricing")) { await scrollTo("#pricing"); await capture("pricing"); }
}
