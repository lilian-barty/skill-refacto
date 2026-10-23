// Empreinte des sorties d'un script (construction de site, export, conversion, script Python...), pour prouver qu'une
// refactorisation ne change pas ce qu'il produit. Avant : on enregistre. Après : on compare.
// Relevé : code de sortie, sortie écran (normalisée : dates, durées et chemins temporaires masqués), et empreinte de
// chaque fichier produit dans les dossiers ou fichiers surveillés.
//
// Usage : node sorties.mjs <reference.json> --commande "node assembler.mjs" [--produit dossier-ou-fichier]... [--dans dossier]
//   --commande   la commande à lancer, entre guillemets (lancée dans --dans, défaut : dossier courant)
//   --produit    ce que la commande écrit ; répétable. Chaque fichier est comparé à l'octet près.
//   --ecran-libre  ne compare pas la sortie écran (quand elle affiche des durées ou des nombres aléatoires)
//   --lang en    l'outil parle anglais (défaut : français, ou la variable REFACTO_LANG). Noms anglais des options :
//                --command, --output, --cwd, --ignore-stdout. Une référence se compare dans l'une ou l'autre langue.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const iLang = args.indexOf("--lang");
const EN = /^en/i.test((iLang >= 0 ? args[iLang + 1] : process.env.REFACTO_LANG) || "");
const t = (fr, en) => (EN ? en : fr);
const ALIAS = { commande: "command", produit: "output", dans: "cwd", "ecran-libre": "ignore-stdout" };
const est = (a, nom) => a === "--" + nom || (ALIAS[nom] && a === "--" + ALIAS[nom]);
const valeurs = (nom) => args.flatMap((a, i) => (est(a, nom) ? [args[i + 1]] : []));
// La référence est le seul argument qui ne suit pas une option à valeur, quel que soit le nom de l'option
const reference = args.find((a, i) => !a.startsWith("--") && !["commande", "produit", "dans", "lang"].some((n) => est(args[i - 1], n)));
const commande = valeurs("commande")[0];
const dans = path.resolve(valeurs("dans")[0] || ".");
const produits = valeurs("produit").map((p) => path.resolve(dans, p));
const ecranLibre = args.some((a) => est(a, "ecran-libre"));
if (!reference || !commande) { console.log(t('Usage : node sorties.mjs <reference.json> --commande "..." [--produit chemin]... [--dans dossier]', 'Usage: node sorties.mjs <reference.json> --command "..." [--output path]... [--cwd folder] [--ignore-stdout] [--lang en]')); process.exit(2); }

// Date de chaque fichier déjà là avant de lancer la commande : un fichier resté d'une exécution précédente, que la
// commande n'écrit plus, garderait sinon la même empreinte et passerait pour produit
const dateAvant = new Map();
produits.forEach(function dater(p) {
  if (!fs.existsSync(p)) return;
  if (fs.statSync(p).isDirectory()) { for (const n of fs.readdirSync(p)) dater(path.join(p, n)); return; }
  dateAvant.set(p, fs.statSync(p).mtimeMs);
});

const r = spawnSync(commande, { cwd: dans, shell: true, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
// Les marques <date>, <durée>, <temp> et [erreurs] sont enregistrées dans la référence : elles restent les mêmes
// dans les deux langues, et ne sont traduites qu'à l'affichage
const normaliser = (x) => (x || "").replace(/\r\n/g, "\n")
  .replace(/\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?Z?/g, "<date>")
  .replace(/\b\d+([.,]\d+)?\s?(ms|s|secondes?|seconds?)\b/g, "<durée>")
  .replace(/[A-Z]:\\[^\s]*\\(Temp|tmp)\\[^\s]*/gi, "<temp>");
const aff = (x) => (EN ? x.replace(/<durée>/g, "<duration>").replace(/^\[erreurs\]$/gm, "[errors]") : x);

const fichiers = {}, ecrits = {};
function relever(p) {
  if (!fs.existsSync(p)) { fichiers[path.relative(dans, p)] = "(absent)"; return; }
  if (fs.statSync(p).isDirectory()) { for (const n of fs.readdirSync(p)) relever(path.join(p, n)); return; }
  fichiers[path.relative(dans, p)] = crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
  ecrits[path.relative(dans, p)] = dateAvant.get(p) !== fs.statSync(p).mtimeMs;
}
produits.forEach(relever);
const releve = { commande, code: r.status, ecran: normaliser(r.stdout) + (r.stderr ? "\n[erreurs]\n" + normaliser(r.stderr) : ""), fichiers, ecrits };

if (!fs.existsSync(reference)) {
  fs.writeFileSync(reference, JSON.stringify(releve, null, 1));
  console.log(t(`Sorties enregistrées : code ${r.status}, ${Object.keys(fichiers).length} fichier(s) produit(s), dans ${reference}`, `Outputs recorded: exit code ${r.status}, ${Object.keys(fichiers).length} output file(s), in ${reference}`));
  if (r.status !== 0) console.log(t("Attention : la commande échoue déjà AVANT la refactorisation. Le signaler avant d'aller plus loin.", "Warning: the command already fails BEFORE the refactoring. Report it before going further."));
} else {
  const ref = JSON.parse(fs.readFileSync(reference, "utf8"));
  const ecarts = [];
  if (ref.code !== releve.code) ecarts.push(t(`code de sortie : ${ref.code} -> ${releve.code}`, `exit code: ${ref.code} -> ${releve.code}`));
  if (!ecranLibre && ref.ecran !== releve.ecran) {
    const a = ref.ecran.split("\n"), b = releve.ecran.split("\n");
    const i = a.findIndex((l, k) => l !== b[k]);
    const rien = t("(rien)", "(nothing)");
    ecarts.push(t(`sortie écran, ligne ${i + 1} :\n      avant : ${a[i] ?? rien}\n      après : ${b[i] ?? rien}`, `screen output, line ${i + 1}:\n      before: ${aff(a[i] ?? rien)}\n      after: ${aff(b[i] ?? rien)}`));
  }
  for (const f of new Set([...Object.keys(ref.fichiers), ...Object.keys(fichiers)])) {
    const etat = !ref.fichiers[f] ? t("nouveau", "new") : !fichiers[f] || fichiers[f] === "(absent)" ? t("disparu", "gone") : t("contenu différent", "content changed");
    if (ref.fichiers[f] !== fichiers[f]) ecarts.push(t(`fichier ${f} : ${etat}`, `file ${f}: ${etat}`));
    else if (ref.ecrits?.[f] && ecrits[f] === false) ecarts.push(t(`fichier ${f} : présent, mais pas réécrit par cette exécution alors que la commande l'écrivait à l'enregistrement (resté d'une exécution précédente ? vider le dossier produit et relancer pour trancher)`,
      `file ${f}: present, but not rewritten by this run although the command wrote it at recording (left over from an earlier run? empty the output folder and run again to decide)`));
  }
  // La sortie écran n'est annoncée comparée que si elle l'a été
  const n = Object.keys(fichiers).length;
  console.log(ecarts.length ? t("ÉCARTS", "DIFFERENCES") + "\n   - " + ecarts.join("\n   - ") : t(`Sorties identiques : code ${releve.code}, ${ecranLibre ? "" : "écran, "}${n} fichier(s).`, `Outputs identical: exit code ${releve.code}, ${ecranLibre ? "" : "screen output, "}${n} file(s).`));
  process.exitCode = ecarts.length ? 1 : 0;
}
