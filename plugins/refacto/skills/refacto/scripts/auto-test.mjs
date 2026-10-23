// Auto-test des outils du skill : un outil de preuve qui ment est pire que pas d'outil (un contrôle de prix aveugle a
// déjà annoncé « aucun écart » pendant des semaines). À lancer après toute modification d'un script, et au premier
// usage sur un nouveau poste : node auto-test.mjs (node auto-test.mjs --lang en pour lire ses messages en anglais)
// Fabrique un petit site de test dans un dossier temporaire, puis vérifie que chaque outil voit ce qu'il doit voir,
// et ne voit rien quand il n'y a rien à voir. Les outils sont lancés en français, sauf dans la partie 7, qui vérifie
// leur version anglaise.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const iLang = args.indexOf("--lang");
const EN = /^en/i.test((iLang >= 0 ? args[iLang + 1] : process.env.REFACTO_LANG) || "");
const t = (fr, en) => (EN ? en : fr);
const ICI = path.dirname(fileURLToPath(import.meta.url));
const T = fs.mkdtempSync(path.join(os.tmpdir(), "refacto-auto-test-"));
let echecs = 0, controles = 0;
let r = { texte: "" };
const verifier = (vrai, message) => {
  controles++;
  if (vrai) { console.log("ok     " + message); return; }
  echecs++;
  console.log(t("ÉCHEC  ", "FAIL   ") + message + t("\n       sortie de l'outil : ", "\n       tool output: ") + r.texte.trim().split("\n").slice(0, 12).join("\n       "));
};
// Les outils testés partent en français, quelle que soit la langue de l'auto-test : REFACTO_LANG n'est transmis que
// quand un contrôle le pose lui-même
const ENV = { ...process.env };
delete ENV.REFACTO_LANG;
const lancer = (script, args, env = {}) => {
  const r = spawnSync(process.execPath, [path.join(ICI, script), ...args], { cwd: T, env: { ...ENV, ...env }, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  return { code: r.status, texte: (r.stdout || "") + (r.stderr || "") };
};
const ecrire = (f, x) => { fs.mkdirSync(path.dirname(path.join(T, f)), { recursive: true }); fs.writeFileSync(path.join(T, f), x); };

const PAGE = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Test</title>
<style>
:root{--fond:#fff;--texte:#222;--accent:#c33;--inutile:3px}
@media (prefers-color-scheme:dark){:root{--fond:#111;--texte:#eee}}
body{background:var(--fond);color:var(--texte);font-family:sans-serif;margin:0;padding:16px}
.bouton{background:#c33;color:#fff;padding:8px 12px;border-radius:6px}
.lien-fort{background:#c33;color:#fff;padding:8px 12px;border-radius:6px}
.jamais-posee{color:red}
.etat-ouvert{outline:1px solid}
.menu{display:none}
.menu.ouvert{display:block;animation:glisse .3s}
@keyframes glisse{from{opacity:0}to{opacity:1}}
@keyframes oubliee{from{opacity:0}to{opacity:1}}
h1{font-size:28px}
h1{margin-top:0}
</style></head><body>
<h1>Bonjour</h1>
<button id="menu-bouton" class="bouton">Menu</button>
<nav class="menu" id="menu"><a class="lien-fort" href="#">Un lien</a></nav>
<img src="img/logo.png" alt="">
<script>
function basculer(){ document.getElementById('menu').classList.toggle('ouvert'); }
function jamaisAppelee(){ return 1; }
const suffixe = "ouvert"; const etat = "etat-" + suffixe;
document.getElementById('menu-bouton').addEventListener('click', basculer);
</script>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"Person","name":"Test"}</script>
<button id="effacer" type="button">Tout effacer</button>
</body></html>
`;
ecrire("site/index.html", PAGE);
ecrire("site/contact/index.html", PAGE.replace("Bonjour", "Contact"));
ecrire("site/img/logo.png", "x");
ecrire("site/img/orpheline.png", "x");
ecrire("etats.mjs", `export default async function (page, { capturer, clic }) { await capturer("chargement"); await clic("#menu-bouton"); await capturer("menu-ouvert"); }\n`);

// 1. Syntaxe
r = lancer("verifier-syntaxe.mjs", ["site"]);
verifier(r.code === 0 && /aucune erreur/.test(r.texte), t("syntaxe : un site sain passe", "syntax: a healthy site passes"));
ecrire("casse/index.html", PAGE.replace("return 1;", "return 'l'apostrophe';"));
r = lancer("verifier-syntaxe.mjs", ["casse"]);
verifier(r.code === 1 && /ligne 23 de la page/.test(r.texte), t("syntaxe : l'apostrophe non protégée est trouvée, à la bonne ligne", "syntax: the unescaped apostrophe is found, on the right line"));
ecrire("casse2/donnees.json", "{ \"a\": 1, }");
r = lancer("verifier-syntaxe.mjs", ["casse2"]);
verifier(r.code === 1 && /JSON invalide/.test(r.texte), t("syntaxe : un JSON invalide est trouvé", "syntax: an invalid JSON file is found"));

// 2. Code mort
r = lancer("code-mort.mjs", ["site"]);
const tm = r.texte;
verifier(/\.jamais-posee/.test(tm), t("code mort : classe jamais posée", "dead code: class never used"));
verifier(/etat-ouvert \(le code fabrique/.test(tm), t("code mort : classe fabriquée par concaténation classée à part, pas déclarée morte", "dead code: class built by concatenation listed apart, not declared dead"));
verifier(/--inutile/.test(tm) && /--accent/.test(tm) && !/^- --fond/m.test(tm), t("code mort : variables CSS inutilisées, et seulement elles", "dead code: unused CSS variables, and only them"));
verifier(/oubliee/.test(tm) && !/^- glisse/m.test(tm), t("code mort : @keyframes inutilisée, et seulement elle", "dead code: unused @keyframes, and only that one"));
verifier(/\.bouton {2}\| {2}\.lien-fort/.test(tm), t("code mort : déclarations identiques sous deux sélecteurs", "dead code: identical declarations under two selectors"));
verifier(/h1 {2}\(2 fois/.test(tm), t("code mort : sélecteur déclaré deux fois", "dead code: selector declared twice"));
verifier(/jamaisAppelee/.test(tm) && !/^- basculer/m.test(tm), t("code mort : fonction jamais appelée, et seulement elle", "dead code: function never called, and only that one"));
verifier(/orpheline\.png/.test(tm) && !/logo\.png/.test(tm), t("code mort : image orpheline, et seulement elle", "dead code: orphan image, and only that one"));
r = lancer("code-mort.mjs", ["site", "--exclure", "contact"]);
verifier(/Inventaire de 3 fichier/.test(r.texte), t("code mort : --exclure écarte les fichiers générés", "dead code: --exclure leaves out generated files"));

// 3. Empreinte d'une page : stable, insensible à un rangement neutre, sensible à 2 px de marge
r = lancer("empreinte.mjs", ["site/index.html", "ref.json", "--etats", "etats.mjs"]);
verifier(r.code === 0 && /8 états \(375, 1440 px ; clair, sombre\)/.test(r.texte), t("empreinte : 2 états x 2 largeurs x 2 thèmes enregistrés (thème sombre détecté seul)", "snapshot: 2 states x 2 widths x 2 themes recorded (dark theme detected on its own)"));
verifier(/page : [1-9]\d* requête\(s\), [\d,]+ Ko compressés, [\d,]+ Ko bruts/.test(r.texte), t("poids : requêtes, poids compressé et poids brut relevés au chargement", "weight: requests, compressed and raw weight measured at load"));
r = lancer("empreinte.mjs", ["site/index.html", "ref.json", "--etats", "etats.mjs"]);
verifier(r.code === 0 && /identiques/.test(r.texte), t("empreinte : deux mesures à vide sont identiques (mesure stable)", "snapshot: two runs with no change are identical (stable measurement)"));
const range = PAGE
  .replace(".bouton{background:#c33;color:#fff;padding:8px 12px;border-radius:6px}\n.lien-fort{background:#c33;color:#fff;padding:8px 12px;border-radius:6px}", ".bouton,.lien-fort{background:var(--accent);color:#fff;padding:8px 12px;border-radius:6px}")
  .replace("h1{font-size:28px}\nh1{margin-top:0}", "h1{font-size:28px;margin-top:0}")
  .replace(".jamais-posee{color:red}\n", "").replace("@keyframes oubliee{from{opacity:0}to{opacity:1}}\n", "")
  .replace("function jamaisAppelee(){ return 1; }\n", "");
ecrire("site/index.html", range);
r = lancer("empreinte.mjs", ["site/index.html", "ref.json", "--etats", "etats.mjs"]);
verifier(r.code === 0 && /identiques \(DOM, styles, accessibilité, focus, pixels\)/.test(r.texte), t("empreinte : un rangement sans effet visible est reconnu identique", "snapshot: a clean-up with no visible effect is recognised as identical"));
verifier(/avant : \d+ requête\(s\), [\d,]+ Ko compressés \((identique|[+-]?[\d,]+ %)\)/.test(r.texte), t("poids : la comparaison donne le poids d'avant et la variation", "weight: the comparison gives the weight before and the change"));
ecrire("site/index.html", range.replace("padding:8px 12px", "padding:8px 14px"));
r = lancer("empreinte.mjs", ["site/index.html", "ref.json", "--etats", "etats.mjs"]);
verifier(r.code === 1 && /padding : 8px 12px -> 8px 14px/.test(r.texte) && /pixel\(s\) différent\(s\)/.test(r.texte), t("empreinte : 2 px de marge en plus sont vus, dans les styles et dans les pixels", "snapshot: 2 px of extra padding are seen, in the styles and in the pixels"));
const rapport = fs.existsSync(path.join(T, "ref.rapport.html")) ? fs.readFileSync(path.join(T, "ref.rapport.html"), "utf8") : "";
const imagesEcarts = fs.existsSync(path.join(T, "ref.ecarts")) ? fs.readdirSync(path.join(T, "ref.ecarts")).length : 0;
verifier(/États avec écart/.test(rapport) && /alt="Différences"/.test(rapport) && imagesEcarts > 0, t("rapport : page écrite, avec les captures avant, après et l'image des différences", "report: page written, with the before and after screenshots and the difference image"));
ecrire("site/index.html", range.replace('class="bouton">Menu', 'class="bouton">Menu ').replace("</nav>", "</nav><p hidden>x</p>"));
r = lancer("empreinte.mjs", ["site/index.html", "ref.json", "--etats", "etats.mjs", "--sans-captures"]);
verifier(r.code === 1 && /DOM, premier écart/.test(r.texte), t("empreinte : un changement du DOM invisible à l'oeil est vu", "snapshot: a DOM change invisible to the eye is seen"));
ecrire("site/index.html", range.replace('class="bouton">Menu', 'class="bouton" aria-label="Ouvrir le menu">Menu'));
r = lancer("empreinte.mjs", ["site/index.html", "ref.json", "--etats", "etats.mjs", "--sans-captures"]);
verifier(r.code === 1 && /accessibilité, disparu : button "Menu"/.test(r.texte) && /accessibilité, apparu : button "Ouvrir le menu"/.test(r.texte), t("accessibilité : un nom de bouton changé pour les lecteurs d'écran est vu", "accessibility: a button name changed for screen readers is seen"));

// 3 bis. Exploration : un défaut qui n'existe que menu ouvert échappe à une mesure sans scénario, pas à --explorer
ecrire("site/index.html", PAGE);
r = lancer("empreinte.mjs", ["site/index.html", "explo-sans.json", "--sans-captures", "--largeurs", "375"]);
r = lancer("empreinte.mjs", ["site/index.html", "explo.json", "--explorer", "--sans-captures", "--largeurs", "375"]);
verifier(r.code === 0 && /button#effacer « Tout effacer » \(action destructive\)/.test(r.texte), t("exploration : un bouton destructif n'est jamais cliqué, et il est signalé", "exploration: a destructive button is never clicked, and it is reported"));
ecrire("site/index.html", PAGE.replace("classList.toggle('ouvert')", "classList.toggle('ouverte')"));
r = lancer("empreinte.mjs", ["site/index.html", "explo-sans.json", "--sans-captures", "--largeurs", "375"]);
verifier(r.code === 0, t("exploration : sans elle, le menu cassé passe inaperçu (limite connue d'un scénario incomplet)", "exploration: without it, the broken menu goes unnoticed (known limit of an incomplete scenario)"));
r = lancer("empreinte.mjs", ["site/index.html", "explo.json", "--explorer", "--sans-captures", "--largeurs", "375"]);
verifier(r.code === 1 && /ÉCART ouvert : button#menu-bouton « Menu »/.test(r.texte), t("exploration : avec elle, le menu cassé est vu dans l'état « menu ouvert »", "exploration: with it, the broken menu is seen in the \"menu open\" state"));

// 3 ter. Neutralisation : animations figées malgré une couche CSS ou une règle de sécurité, souris sans survol.
// Le scénario affiche le style calculé relevé par le navigateur de mesure.
const ANIMS = ".anim{animation:tourne 3s infinite}.trans{transition:opacity 2s}.apparait{opacity:0;animation:apparait 2s forwards}@keyframes tourne{to{transform:rotate(1turn)}}@keyframes apparait{to{opacity:1}}";
const NEUTRE = (tete) => `<!doctype html><html lang="fr"><head><meta charset="utf-8">${tete}<title>Neutre</title></head><body>
<div class="anim">Tourne</div><div class="trans">Glisse</div><div class="apparait">Apparaît</div><input id="champ" aria-label="Champ">
</body></html>
`;
ecrire("neutre/couche.html", NEUTRE(`<style>@layer base{@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:1ms!important;transition-duration:1ms!important}}}${ANIMS}</style>`));
ecrire("neutre/sans-couche.html", NEUTRE(`<style>${ANIMS}.anim{animation-duration:5s!important}</style>`));
ecrire("neutre/csp.html", NEUTRE(`<meta http-equiv="Content-Security-Policy" content="style-src 'self'"><link rel="stylesheet" href="csp.css">`));
ecrire("neutre/csp.css", ANIMS);
ecrire("etats-neutre.mjs", `export default async function (page, { capturer }) {
  await capturer("chargement");
  console.log(await page.evaluate(() => { const s = (q) => getComputedStyle(document.querySelector(q)); return "relevé : animation " + s(".anim").animationDuration + ", transition " + s(".trans").transitionDuration + ", fin d'animation " + s(".apparait").opacity + ", curseur " + s("#champ").caretColor; }));
}
`);
const FIGEE = /relevé : animation 0s, transition 0s, fin d'animation 1, curseur rgba\(0, 0, 0, 0\)/;
const neutre = (nom, ...options) => lancer("empreinte.mjs", [`neutre/${nom}.html`, `neutre-${nom}.json`, "--etats", "etats-neutre.mjs", "--sans-captures", "--largeurs", "375", "--themes", "clair", ...options]);
r = neutre("couche");
verifier(r.code === 0 && /relevé : animation 0s, transition 0s/.test(r.texte), t("neutralisation : une règle !important rangée dans une couche CSS (mouvement réduit de Tailwind v4) est battue", "freezing: an !important rule inside a CSS layer (Tailwind v4 reduced motion) is beaten"));
verifier(/fin d'animation 1,/.test(r.texte), t("neutralisation : une animation « forwards » finit sur son image de fin (animation-name:none la laisserait invisible)", "freezing: a \"forwards\" animation ends on its last frame (animation-name:none would leave it invisible)"));
r = neutre("sans-couche");
verifier(r.code === 0 && FIGEE.test(r.texte), t("neutralisation : une page sans couche reste figée, même contre une règle !important plus précise que « * »", "freezing: a page without layers stays frozen, even against an !important rule more specific than \"*\""));
r = neutre("csp");
verifier(r.code === 2 && /--contourner-csp/.test(r.texte) && !fs.existsSync(path.join(T, "neutre-csp.json")), t("sécurité : une règle qui interdit les styles ajoutés (CSP) arrête la mesure sans écrire de référence, et dit quelle option prendre", "security: a rule that forbids added styles (CSP) stops the measurement without writing a reference, and says which option to use"));
r = neutre("csp", "--contourner-csp");
verifier(r.code === 0 && FIGEE.test(r.texte) && /levée pendant la mesure/.test(r.texte), t("sécurité : avec --contourner-csp, la même page est figée, et la mesure dit ce qu'elle ne voit plus", "security: with --contourner-csp, the same page is frozen, and the measurement says what it no longer sees"));
ecrire("souris/index.html", `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Souris</title><style>
body{margin:0;padding:40px;font-family:sans-serif}
#a,#b{position:absolute;left:40px;top:40px;width:200px;height:60px;border:0;background:rgb(0,0,255);color:#fff}
#b:hover{background:rgb(255,0,0)}
</style></head><body><div id="a">Commencer</div><button id="b" hidden>Suite</button>
<script>document.getElementById("a").addEventListener("click", () => { document.getElementById("a").hidden = true; document.getElementById("b").hidden = false; });</script>
</body></html>
`);
ecrire("etats-souris-clic.mjs", `export default async function (page, { capturer }) { await page.click("#a"); await capturer("suite"); }\n`);
ecrire("etats-souris-programme.mjs", `export default async function (page, { capturer, clic }) { await clic("#a"); await capturer("suite"); }\n`);
ecrire("etats-souris-survol.mjs", `export default async function (page, { capturer, clic }) { await clic("#a"); await page.hover("#b"); await capturer("suite", { garderSouris: true }); }\n`);
const souris = (etats, ...options) => lancer("empreinte.mjs", ["souris/index.html", "souris.json", "--etats", etats, "--largeurs", "1440", ...options]);
r = souris("etats-souris-clic.mjs");
r = souris("etats-souris-programme.mjs");
verifier(r.code === 0 && /identiques \(DOM, styles, accessibilité, focus, pixels\)/.test(r.texte), t("souris : celle laissée par un clic ne survole pas l'écran suivant (clic à la souris et clic par programme, même empreinte)", "mouse: the one left by a click does not hover the next screen (mouse click and scripted click, same snapshot)"));
r = souris("etats-souris-survol.mjs");
verifier(r.code === 1 && /background-color : rgb\(0, 0, 255\) -> rgb\(255, 0, 0\)/.test(r.texte), t("souris : un survol voulu se capture avec { garderSouris: true }", "mouse: an intended hover is captured with { garderSouris: true }"));

// 4. Empreinte du site entier
ecrire("site/index.html", PAGE);
r = lancer("empreinte.mjs", ["site", "site.json", "--toutes-pages", "--sans-captures", "--largeurs", "375"]);
verifier(r.code === 0 && /2 page\(s\) trouvée\(s\)/.test(r.texte) && /4 états/.test(r.texte), t("empreinte : --toutes-pages trouve seul les 2 pages", "snapshot: --toutes-pages finds the 2 pages on its own"));
ecrire("site/contact/index.html", PAGE.replace("Bonjour", "Contact").replace("font-size:28px", "font-size:30px"));
r = lancer("empreinte.mjs", ["site", "site.json", "--toutes-pages", "--sans-captures", "--largeurs", "375"]);
verifier(r.code === 1 && /ÉCART contact\/index\.html \| chargement/.test(r.texte) && !/ÉCART index\.html/.test(r.texte), t("empreinte : l'écart est attribué à la bonne page, et à elle seule", "snapshot: the difference is assigned to the right page, and to it alone"));

// 5. Sorties d'un script
ecrire("build.mjs", `import fs from "node:fs"; fs.mkdirSync("dist",{recursive:true}); for (const n of ["a","b"]) fs.writeFileSync("dist/"+n+".txt", n.toUpperCase()); console.log("Construit le " + new Date().toISOString() + " en " + (Math.random()*50|0) + " ms");\n`);
r = lancer("sorties.mjs", ["sorties.json", "--commande", "node build.mjs", "--produit", "dist"]);
verifier(r.code === 0 && /2 fichier/.test(r.texte), t("sorties : enregistrement", "outputs: recording"));
r = lancer("sorties.mjs", ["sorties.json", "--commande", "node build.mjs", "--produit", "dist"]);
verifier(r.code === 0 && /identiques/.test(r.texte), t("sorties : dates et durées masquées, deux exécutions identiques", "outputs: dates and durations masked, two runs identical"));
ecrire("build.mjs", fs.readFileSync(path.join(T, "build.mjs"), "utf8").replace("toUpperCase()", "toUpperCase()+'!'"));
r = lancer("sorties.mjs", ["sorties.json", "--commande", "node build.mjs", "--produit", "dist"]);
verifier(r.code === 1 && /dist.a\.txt : contenu différent/.test(r.texte), t("sorties : un fichier produit différent est vu", "outputs: a changed output file is seen"));

// 6. Angles morts trouvés à l'audit du 30/09/2026 : chacun laissait passer un changement, ou annonçait une preuve
// qui n'avait pas eu lieu
const page = (titre, tete, corps) => `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${titre}</title>${tete}</head><body>\n${corps}\n</body></html>\n`;
const mesurer = (cible, ref, ...options) => lancer("empreinte.mjs", [cible, ref, "--largeurs", "375", "--themes", "clair", ...options]);

const PROPS = (plus) => page("Props", `<style>.carte{border:1px solid #c33;border-bottom:3px solid #222;padding:8px}.bouton{padding:8px}${plus}</style>`, `<div class="carte">Carte</div><button class="bouton">Agir</button>`);
ecrire("props/index.html", PROPS(""));
r = mesurer("props/index.html", "props.json", "--sans-captures");
ecrire("props/index.html", PROPS(".carte{border-bottom-color:#225}.bouton{pointer-events:none}"));
r = mesurer("props/index.html", "props.json", "--sans-captures");
verifier(r.code === 1 && /border-bottom : 3px solid rgb\(34, 34, 34\) -> 3px solid rgb\(34, 34, 85\)/.test(r.texte) && /pointer-events : auto -> none/.test(r.texte), t("styles : une bordure changée d'un seul côté et un bouton devenu incliquable sont vus sans captures", "styles: a border changed on one side and a button that can no longer be clicked are seen without screenshots"));
ecrire("props/index.html", PROPS(""));
r = mesurer("props/index.html", "props.json");
verifier(r.code === 0 && /Pixels NON comparés/.test(r.texte) && /identiques \(DOM, styles, accessibilité, focus\)/.test(r.texte), t("bilan : une référence sans captures n'est jamais annoncée identique « aux pixels »", "summary: a reference without screenshots is never announced identical \"to the pixel\""));
const ancienne = JSON.parse(fs.readFileSync(path.join(T, "props.json"), "utf8"));
for (const e of Object.values(ancienne.etats)) for (const s of Object.values(e.styles)) delete s["pointer-events"];
fs.writeFileSync(path.join(T, "props.json"), JSON.stringify(ancienne));
r = mesurer("props/index.html", "props.json", "--sans-captures");
verifier(r.code === 0 && /1 propriété\(s\) de style ne sont pas comparées \(pointer-events\)/.test(r.texte), t("styles : une référence d'une version antérieure se compare sans faux écart, et l'outil dit ce qu'elle ne couvre pas", "styles: a reference from an earlier version compares with no false difference, and the tool says what it does not cover"));

const DESSIN = (couleur) => `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="${couleur}"/></svg>`;
ecrire("jumeaux/index.html", page("Jumeaux", `<style>.p{display:none}.p.o{display:block}</style>`, `<button>+</button><button>−</button>
<div class="p"><img src="dessin.svg" width="100" height="100" alt=""></div><div class="p">Moins</div>
<script>document.querySelectorAll("button").forEach((b, i) => b.addEventListener("click", () => document.querySelectorAll(".p")[i].classList.add("o")));</script>`));
ecrire("jumeaux/dessin.svg", DESSIN("#c33"));
r = mesurer("jumeaux/index.html", "jumeaux.json", "--explorer");
ecrire("jumeaux/dessin.svg", DESSIN("#33c"));
r = mesurer("jumeaux/index.html", "jumeaux.json", "--explorer");
verifier(r.code === 1 && /ÉCART ouvert : button « \+ »/.test(r.texte) && /pixel\(s\) différent\(s\)/.test(r.texte), t("captures : deux états dont le nom ne diffère que par un symbole (« + » et « − ») gardent chacun leur capture", "screenshots: two states whose names differ only by a symbol (\"+\" and \"−\") each keep their own screenshot"));

ecrire("explo2/index.html", page("Explo", "", `<button id="noter">Noter</button><button id="autre">Autre</button><button id="compter">Compter</button><p id="trace"></p>
<script>
const ouvrir = new Promise((ok) => { const q = indexedDB.open("essai", 1); q.onupgradeneeded = () => q.result.createObjectStore("notes"); q.onsuccess = () => ok(q.result); });
ouvrir.then((b) => { const l = b.transaction("notes").objectStore("notes").get("n"); l.onsuccess = () => { if (l.result) document.getElementById("trace").textContent = "note d'un clic précédent"; }; });
document.getElementById("noter").addEventListener("click", () => ouvrir.then((b) => b.transaction("notes", "readwrite").objectStore("notes").put(1, "n")));
document.getElementById("autre").addEventListener("click", (e) => { e.target.textContent = "Autre, ouvert"; });
document.getElementById("compter").addEventListener("click", () => fetch("compte", { method: "POST" }).catch(() => {}));
</script>`));
r = mesurer("explo2/index.html", "explo2.json", "--explorer", "--sans-captures");
const explo2 = fs.existsSync(path.join(T, "explo2.json")) ? JSON.parse(fs.readFileSync(path.join(T, "explo2.json"), "utf8")).etats : {};
const autre = explo2["ouvert : button#autre « Autre » @ 375-clair"];
verifier(r.code === 0 && autre && !/note d'un clic précédent/.test(autre.dom), t("exploration : la base IndexedDB est vidée entre deux éléments, un clic ne déteint pas sur l'état suivant", "exploration: the IndexedDB database is emptied between two elements, a click does not leak into the next state"));
verifier(/1 envoi\(s\) de données bloqué\(s\), rien n'est parti \(POST \/compte\)/.test(r.texte), t("exploration : un clic qui envoie des données (POST) est bloqué, et dit", "exploration: a click that sends data (POST) is blocked, and reported"));

const PANNE = (plus) => page("Panne", "", `<p>Page</p><script>throw new Error("panne d'origine");</script>${plus}`);
ecrire("panne/index.html", PANNE(""));
r = mesurer("panne/index.html", "panne.json", "--sans-captures");
const enregistrement = r;
r = mesurer("panne/index.html", "panne.json", "--sans-captures");
verifier(enregistrement.code === 0 && /déjà présentes AVANT/.test(enregistrement.texte) && r.code === 0 && /inchangées/.test(r.texte), t("erreurs : une erreur JavaScript déjà là avant refactorisation est signalée, sans faire échouer la comparaison", "errors: a JavaScript error already there before the refactoring is reported, without failing the comparison"));
ecrire("panne/index.html", PANNE(`<script>throw new Error("panne nouvelle");</script>`));
r = mesurer("panne/index.html", "panne.json", "--sans-captures");
verifier(r.code === 1 && /erreur JavaScript apparue : .*panne nouvelle/.test(r.texte), t("erreurs : une erreur JavaScript apparue après coup est un écart", "errors: a JavaScript error that appears afterwards is a difference"));

const BUILD2 = (noms) => `import fs from "node:fs"; fs.mkdirSync("dist2",{recursive:true}); for (const n of ${JSON.stringify(noms)}) fs.writeFileSync("dist2/"+n+".txt", n);\n`;
ecrire("build2.mjs", BUILD2(["a", "b"]));
r = lancer("sorties.mjs", ["sorties2.json", "--commande", "node build2.mjs", "--produit", "dist2"]);
ecrire("build2.mjs", BUILD2(["a"]));
r = lancer("sorties.mjs", ["sorties2.json", "--commande", "node build2.mjs", "--produit", "dist2"]);
verifier(r.code === 1 && /dist2.b\.txt : présent, mais pas réécrit/.test(r.texte), t("sorties : un fichier que la commande n'écrit plus, resté sur le disque, est vu", "outputs: a file the command no longer writes, left on disk, is seen"));

ecrire("mort2/index.html", page("Mort", `<style>@import url("police.css");
.apres-import{color:red}
@layer base, composants;
.apres-layer{color:blue}
.parent{color:red;.enfant-morte{color:blue}}
.vue-en-tsx{color:green}</style>`, `<div class="parent">x</div>`));
ecrire("mort2/appli.tsx", `export const Appli = () => <div className="vue-en-tsx">x</div>;\n`);
r = lancer("code-mort.mjs", ["mort2", "--pas-de-fichiers"]);
verifier(/\.apres-import/.test(r.texte) && /\.apres-layer/.test(r.texte) && /\.enfant-morte/.test(r.texte) && !/^- \.parent/m.test(r.texte), t("code mort : la règle qui suit un @import ou un « @layer a, b; » et une règle imbriquée sont lues", "dead code: the rule after an @import or an \"@layer a, b;\" and a nested rule are read"));
verifier(!/vue-en-tsx/.test(r.texte), t("code mort : une classe posée dans un fichier .tsx n'est pas déclarée morte", "dead code: a class used in a .tsx file is not declared dead"));

ecrire("ts/ok.js", "const a = 1;\n");
ecrire("ts/a.ts", "const a: number = 1;\n");
ecrire("ts/b.tsx", "export const B = () => <p>b</p>;\n");
r = lancer("verifier-syntaxe.mjs", ["ts"]);
verifier(r.code === 0 && /1 bloc\(s\) de code vérifié\(s\) dans 1 fichier\(s\)/.test(r.texte) && /NON VÉRIFIÉS : 2 fichier\(s\) \.ts, \.tsx/.test(r.texte), t("syntaxe : les fichiers que l'outil ne sait pas lire (.ts, .tsx) sont comptés et dits, jamais couverts par « aucune erreur »", "syntax: files the tool cannot read (.ts, .tsx) are counted and reported, never covered by \"no errors\""));
ecrire("carte/index.html", page("Carte", `<script type="importmap">{ "imports": { "a": "./a.js" }, }</script>`, "<p>x</p>"));
r = lancer("verifier-syntaxe.mjs", ["carte"]);
verifier(r.code === 1 && /JSON invalide/.test(r.texte), t("syntaxe : une carte d'import (importmap) invalide est trouvée", "syntax: an invalid import map is found"));

// 7. Anglais : chaque outil parle anglais avec --lang en ou REFACTO_LANG=en, accepte les options anglaises, et une
// référence se compare d'une langue à l'autre sans écart. Pour chercher un reste de français, les lignes de détail
// (« - ... », qui citent le contenu français de la page de test) et les chemins de fichiers sont écartés
const FRANCAIS = /[àâçéèêëîïôûùüœ«»]|\b(le|la|les|des|du|une?|et|est|sont|dans|pour|avec|sans|aucune?|fichiers?|ecarts?|etats?|identiques?|requetes?|compresses|bruts|enregistree?s?|introuvable|ko|rien|ligne|bloc|avant|apres|rapport|captures?|poids)\b/i;
const francais = (x) => !!x.split("\n").filter((l) => !/^\s*- /.test(l)).join("\n").replace(/\S*[\\/]\S*|\S+\.\S+/g, " ").match(FRANCAIS);
const enAnglais = (message) => t(`anglais : ${message}`, `English: ${message}`);
ecrire("site/index.html", PAGE);
ecrire("site/contact/index.html", PAGE.replace("Bonjour", "Contact"));

for (const outil of ["empreinte.mjs", "sorties.mjs", "code-mort.mjs", "verifier-syntaxe.mjs"]) {
  r = lancer(outil, ["--lang", "en"]);
  verifier(r.code === 2 && /^Usage: node /.test(r.texte) && !francais(r.texte), enAnglais(t(`l'usage de ${outil} est en anglais`, `${outil} usage is in English`)));
}

r = lancer("verifier-syntaxe.mjs", ["--lang", "en", "site"]);
verifier(r.code === 0 && /code block\(s\) checked in 2 file\(s\): no syntax errors/.test(r.texte) && !francais(r.texte), enAnglais(t("syntaxe, bilan d'un site sain", "syntax, summary for a healthy site")));
r = lancer("verifier-syntaxe.mjs", ["casse", "--lang", "en"]);
verifier(r.code === 1 && /^PROBLEM .*script #1 \(line \d+\)/m.test(r.texte) && /line 23 of the page/.test(r.texte) && /: 1 problem\(s\)/.test(r.texte), enAnglais(t("syntaxe, l'erreur est située à la bonne ligne", "syntax, the error is located on the right line")));
r = lancer("verifier-syntaxe.mjs", ["ts"], { REFACTO_LANG: "en" });
verifier(r.code === 0 && /NOT CHECKED: 2 file\(s\) \.ts, \.tsx/.test(r.texte) && !francais(r.texte), enAnglais(t("REFACTO_LANG=en suffit, sans --lang", "REFACTO_LANG=en is enough, without --lang")));
r = lancer("verifier-syntaxe.mjs", ["ts", "--lang", "fr"], { REFACTO_LANG: "en" });
verifier(/NON VÉRIFIÉS : 2 fichier\(s\)/.test(r.texte), enAnglais(t("--lang fr l'emporte sur REFACTO_LANG=en", "--lang fr wins over REFACTO_LANG=en")));

r = lancer("code-mort.mjs", ["--lang", "en", "site", "--exclude", "contact"]);
verifier(/^Inventory of 3 file\(s\): \d+ CSS rules/m.test(r.texte) && /^## Classes and IDs styled but never used/m.test(r.texte) && /\.etat-ouvert \(the code builds names starting with "etat-": to check\)/.test(r.texte) && /h1 {2}\(2 times, index\.html <style> #1\)/.test(r.texte) && /^Reminder: /m.test(r.texte) && !francais(r.texte), enAnglais(t("code mort, inventaire, sections et rappel, avec --exclude", "dead code, inventory, sections and reminder, with --exclude")));
r = lancer("code-mort.mjs", ["site", "--no-files", "--lang", "en"]);
verifier(/jamaisAppelee/.test(r.texte) && !/orpheline\.png/.test(r.texte) && !/Files nothing references/.test(r.texte), enAnglais(t("code mort, --no-files saute les fichiers orphelins", "dead code, --no-files skips orphan files")));

r = lancer("sorties.mjs", ["--lang", "en", "--ignore-stdout", "sorties-en.json", "--command", "node build.mjs", "--output", "dist", "--cwd", "."]);
verifier(r.code === 0 && /^Outputs recorded: exit code 0, 2 output file\(s\), in sorties-en\.json/m.test(r.texte) && !francais(r.texte), enAnglais(t("sorties, enregistrement avec les options anglaises (la référence placée après --ignore-stdout est reconnue)", "outputs, recording with the English options (the reference placed after --ignore-stdout is recognised)")));
r = lancer("sorties.mjs", ["--lang", "en", "--ignore-stdout", "sorties-en.json", "--command", "node build.mjs", "--output", "dist", "--cwd", "."]);
verifier(r.code === 0 && /^Outputs identical: exit code 0, 2 file\(s\)\.$/m.test(r.texte), enAnglais(t("sorties identiques, sans annoncer la sortie écran ignorée", "outputs identical, without announcing the ignored screen output")));
ecrire("build.mjs", fs.readFileSync(path.join(T, "build.mjs"), "utf8").replace("toUpperCase()+'!'", "toUpperCase()+'?'"));
r = lancer("sorties.mjs", ["sorties-en.json", "--command", "node build.mjs", "--output", "dist", "--ignore-stdout"], { REFACTO_LANG: "en" });
verifier(r.code === 1 && /^DIFFERENCES$/m.test(r.texte) && /file dist.a\.txt: content changed/.test(r.texte) && !francais(r.texte.replace(/^\s+- /gm, "")), enAnglais(t("sorties, un fichier changé est vu", "outputs, a changed file is seen")));

r = lancer("empreinte.mjs", ["site/index.html", "bilingue.json", "--etats", "etats.mjs"]);
r = lancer("empreinte.mjs", ["--lang", "en", "--states", "etats.mjs", "site/index.html", "bilingue.json"]);
verifier(r.code === 0 && /^8 state\(s\) compared to bilingue\.json: identical \(DOM, styles, accessibility, focus, pixels\)/m.test(r.texte) && !francais(r.texte), enAnglais(t("une référence enregistrée en français se compare en anglais sans écart, pixels compris", "a reference recorded in French compares in English with no difference, pixels included")));
verifier(/page: [1-9]\d* request\(s\), [\d.]+ KB compressed, [\d.]+ KB raw, first contentful paint \d+ ms, load \d+ ms; before: \d+ request\(s\), [\d.]+ KB compressed \((identical|[+-]?[\d.]+%)\)/.test(r.texte), enAnglais(t("poids et vitesse", "page weight and speed")));
ecrire("site/index.html", PAGE.replace("padding:8px 12px", "padding:8px 14px"));
r = lancer("empreinte.mjs", ["site/index.html", "bilingue.json", "--states", "etats.mjs", "--lang", "en"]);
verifier(r.code === 1 && /^DIFFERENCE load @ 375-light$/m.test(r.texte) && /padding: 8px 12px -> 8px 14px/.test(r.texte) && /pixel\(s\) clearly different \(more than 40 out of 255\)/.test(r.texte) && /: 8 state\(s\) with differences/.test(r.texte) && !francais(r.texte), enAnglais(t("écarts de style et de pixels, états et thèmes nommés en anglais", "style and pixel differences, states and themes named in English")));
const rapportEn = fs.existsSync(path.join(T, "bilingue.rapport.html")) ? fs.readFileSync(path.join(T, "bilingue.rapport.html"), "utf8") : "";
verifier(/<html lang="en">/.test(rapportEn) && /<title>Refactoring report<\/title>/.test(rapportEn) && /States with differences/.test(rapportEn) && /alt="Differences"/.test(rapportEn) && !francais(rapportEn.replace(/<style>[\s\S]*?<\/style>/, "").replace(/<[^>]*>/g, "\n")), enAnglais(t("rapport HTML", "HTML report")));

ecrire("site/index.html", PAGE);
ecrire("states-en.mjs", `export async function prepare(page) { await page.evaluateOnNewDocument(() => { window.__prepared = 1; }); }
export default async function (page, { capture, click, type, press, scrollTo, wait, reload, width, theme }) {
  const tools = [capture, click, type, press, scrollTo, wait, reload].every((f) => typeof f === "function") && typeof width === "number";
  console.log("tools=" + (tools ? "ok" : "missing") + " theme=" + theme + " prepared=" + (await page.evaluate(() => window.__prepared)));
  await capture("load"); await click("#menu-bouton"); await wait(50); await capture("menu-open");
}
`);
r = lancer("empreinte.mjs", ["site/index.html", "states-en.json", "--lang", "en", "--states", "states-en.mjs", "--widths", "375", "--no-screenshots"]);
verifier(r.code === 0 && /tools=ok theme=light prepared=1/.test(r.texte) && /tools=ok theme=dark prepared=1/.test(r.texte) && /^Snapshot recorded: 4 state\(s\) \(375 px; light, dark\)/m.test(r.texte) && !francais(r.texte), enAnglais(t("scénario écrit avec les noms anglais (prepare, capture, click, type, press, scrollTo, wait, reload, width), theme vaut light et dark", "scenario written with the English names (prepare, capture, click, type, press, scrollTo, wait, reload, width), theme is light and dark")));
r = lancer("empreinte.mjs", ["site/index.html", "states-en.json", "--etats", "states-en.mjs", "--largeurs", "375", "--sans-captures"]);
verifier(r.code === 0 && /theme=clair prepared=1/.test(r.texte) && /theme=sombre prepared=1/.test(r.texte) && /4 états comparés .* identiques/.test(r.texte), enAnglais(t("le même scénario en français : theme vaut clair et sombre, et la référence anglaise se compare sans écart", "the same scenario in French: theme is clair and sombre, and the English reference compares with no difference")));

r = lancer("empreinte.mjs", ["site/index.html", "env.json", "--widths", "375", "--themes", "light,dark", "--no-screenshots"], { REFACTO_LANG: "en" });
const envJson = fs.existsSync(path.join(T, "env.json")) ? JSON.parse(fs.readFileSync(path.join(T, "env.json"), "utf8")) : { themes: [], etats: {} };
verifier(r.code === 0 && /^Snapshot recorded: 2 state\(s\) \(375 px; light, dark\)/m.test(r.texte) && !francais(r.texte), enAnglais(t("REFACTO_LANG=en et --themes light,dark à l'enregistrement", "REFACTO_LANG=en and --themes light,dark at recording")));
verifier(envJson.themes.join() === "clair,sombre" && Object.keys(envJson.etats).join() === "chargement @ 375-clair,chargement @ 375-sombre", enAnglais(t("la référence garde ses clés internes, indépendantes de la langue", "the reference keeps its internal keys, independent of the language")));
r = lancer("empreinte.mjs", ["site/index.html", "env.json", "--largeurs", "375", "--themes", "clair,sombre", "--sans-captures"]);
verifier(r.code === 0 && /2 états comparés à env\.json : identiques/.test(r.texte), enAnglais(t("une référence enregistrée en anglais se compare en français sans écart", "a reference recorded in English compares in French with no difference")));

r = lancer("empreinte.mjs", ["--lang", "en", "--explore", "--no-screenshots", "--widths", "375", "--themes", "light", "site/index.html", "explo-en.json"]);
verifier(r.code === 0 && /^Exploration, not opened:$/m.test(r.texte) && /button#effacer "Tout effacer" \(destructive action\)/.test(r.texte) && /^Snapshot recorded: 2 state\(s\)/m.test(r.texte) && !francais(r.texte), enAnglais(t("--explore ouvre le menu et écarte le bouton destructif", "--explore opens the menu and skips the destructive button")));
r = lancer("empreinte.mjs", ["--lang", "en", "--explore", "--max-states", "0", "--no-screenshots", "--widths", "375", "--themes", "light", "site/index.html", "explo-en0.json"]);
verifier(r.code === 0 && /1 element\(s\) beyond --max-states 0/.test(r.texte) && /^Snapshot recorded: 1 state\(s\)/m.test(r.texte), enAnglais(t("--max-states, cité sous son nom anglais", "--max-states, quoted under its English name")));
r = lancer("empreinte.mjs", ["--lang", "en", "--all-pages", "--exclude", "contact", "--root", "site", "--pixel-threshold", "40", "--no-screenshots", "--widths", "375", "--themes", "dark", "site", "pages-en.json"]);
verifier(r.code === 0 && /^1 page\(s\) found in /m.test(r.texte) && /^Snapshot recorded: 1 state\(s\) \(375 px; dark\)/m.test(r.texte) && !francais(r.texte), enAnglais(t("--all-pages, --exclude, --root et --pixel-threshold placés avant la cible", "--all-pages, --exclude, --root and --pixel-threshold placed before the target")));

const csp = (ref, ...options) => lancer("empreinte.mjs", ["--lang", "en", "neutre/csp.html", ref, "--states", "etats-neutre.mjs", "--no-screenshots", "--widths", "375", "--themes", "light", ...options]);
r = csp("csp-en.json");
verifier(r.code === 2 && /Run again with --bypass-csp/.test(r.texte) && !/--contourner-csp/.test(r.texte) && /Measurement stopped, reference not changed\./.test(r.texte) && !fs.existsSync(path.join(T, "csp-en.json")), enAnglais(t("la règle de sécurité (CSP) arrête la mesure et cite --bypass-csp", "the security rule (CSP) stops the measurement and quotes --bypass-csp")));
r = csp("csp-en.json", "--bypass-csp");
verifier(r.code === 0 && FIGEE.test(r.texte) && /was lifted during the measurement \(--bypass-csp\)/.test(r.texte), enAnglais(t("--bypass-csp fige la page et dit ce que la mesure ne voit plus", "--bypass-csp freezes the page and says what the measurement no longer sees")));
r = csp("csp-en-anim.json", "--keep-animations");
verifier(r.code === 0 && /relevé : animation 3s/.test(r.texte) && !FIGEE.test(r.texte), enAnglais(t("--keep-animations laisse les animations tourner (et n'injecte donc rien que la CSP bloquerait)", "--keep-animations leaves animations running (so it injects nothing the CSP would block)")));

ecrire("states-hover.mjs", `export default async function (page, { capture, click }) { await click("#a"); await page.hover("#b"); await capture("suite", { keepMouse: true }); }\n`);
r = souris("states-hover.mjs", "--lang", "en");
verifier(r.code === 1 && /^DIFFERENCE suite @ 1440-light$/m.test(r.texte) && /background-color: rgb\(0, 0, 255\) -> rgb\(255, 0, 0\)/.test(r.texte), enAnglais(t("un survol voulu se capture avec { keepMouse: true }, comparé à une référence française", "an intended hover is captured with { keepMouse: true }, compared with a French reference")));

fs.rmSync(T, { recursive: true, force: true });
console.log(t(`\n${controles} contrôles, ${echecs} échec(s)`, `\n${controles} checks, ${echecs} failure(s)`));
process.exitCode = echecs ? 1 : 0;
