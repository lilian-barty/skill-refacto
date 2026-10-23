// Les deux plugins (refacto en français, proven-refactor en anglais) embarquent les mêmes scripts : chaque plugin est
// copié seul à l'installation et ne peut pas lire le dossier de l'autre. La source est celle du plugin français.
//
// Usage :
//   node outils/synchroniser-scripts.mjs              recopie les scripts du plugin français dans le plugin anglais
//   node outils/synchroniser-scripts.mjs --verifier   n'écrit rien ; code 1 si les deux copies diffèrent (avant un commit)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(racine, "plugins/refacto/skills/refacto/scripts");
const cible = path.join(racine, "plugins/proven-refactor/skills/proven-refactor/scripts");
const verifier = process.argv.includes("--verifier");

const noms = (d) => (fs.existsSync(d) ? fs.readdirSync(d).filter((n) => fs.statSync(path.join(d, n)).isFile()).sort() : []);
const ecarts = [];
for (const n of noms(source)) {
  const a = fs.readFileSync(path.join(source, n));
  const b = fs.existsSync(path.join(cible, n)) ? fs.readFileSync(path.join(cible, n)) : null;
  if (!b || !a.equals(b)) ecarts.push(n);
}
const enTrop = noms(cible).filter((n) => !fs.existsSync(path.join(source, n)));

if (verifier) {
  if (!ecarts.length && !enTrop.length) { console.log(`Scripts identiques dans les deux plugins (${noms(source).length} fichiers).`); process.exit(0); }
  if (ecarts.length) console.log("Différent ou absent dans le plugin anglais : " + ecarts.join(", "));
  if (enTrop.length) console.log("Présent seulement dans le plugin anglais : " + enTrop.join(", "));
  console.log("Lancer : node outils/synchroniser-scripts.mjs");
  process.exit(1);
}

fs.mkdirSync(cible, { recursive: true });
for (const n of ecarts) fs.copyFileSync(path.join(source, n), path.join(cible, n));
for (const n of enTrop) fs.rmSync(path.join(cible, n));
console.log(`${ecarts.length} fichier(s) recopié(s), ${enTrop.length} retiré(s) du plugin anglais.`);
