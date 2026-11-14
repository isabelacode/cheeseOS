/**
 * Local drug dictionary: brand names and active ingredients (generic names,
 * pt + en) grouped per active ingredient. Used by the allergy cross-check so an
 * allergy written as a brand ("Buscopan") also matches the ingredient
 * ("hioscina", "hyoscine", "escopolamina") and vice versa.
 *
 * Names are written in normalized form (lowercase, no accents, punctuation as
 * spaces), the same form `normalize()` produces.
 */

export const DRUG_CLASSES = ["nsaid", "analgesic", "penicillin", "sulfa", "opioid", "antiemetic", "antispasmodic", "antihistamine", "latex", "iodine"] as const;
export type DrugClass = (typeof DRUG_CLASSES)[number];

/**
 * Groups with known cross-reactivity: an allergy to one member is flagged for
 * the others too (e.g. ibuprofen allergy -> aspirin). Other groups match by
 * active ingredient only.
 */
export const CROSS_REACTIVE: DrugClass[] = ["nsaid", "penicillin", "sulfa", "opioid"];

export interface Drug {
  id: string;
  /** Display name of the active ingredient per language. */
  ingredient: { pt: string; en: string };
  generics: string[];
  brands: string[];
  classes: DrugClass[];
}

export const DRUGS: Drug[] = [
  { id: "dipyrone", ingredient: { pt: "dipirona", en: "metamizole (dipyrone)" }, generics: ["dipirona", "dipyrone", "metamizol", "metamizole", "metamizol sodico"], brands: ["novalgina", "anador", "magnopyrol", "dorflex", "neosaldina", "lisador"], classes: ["analgesic"] },
  { id: "paracetamol", ingredient: { pt: "paracetamol", en: "acetaminophen (paracetamol)" }, generics: ["paracetamol", "acetaminofeno", "acetaminofen", "acetaminophen"], brands: ["tylenol", "panadol", "tylex", "dorico", "excedrin"], classes: ["analgesic"] },
  { id: "ibuprofen", ingredient: { pt: "ibuprofeno", en: "ibuprofen" }, generics: ["ibuprofeno", "ibuprofen"], brands: ["advil", "motrin", "alivium", "buscofem", "nurofen"], classes: ["nsaid", "analgesic"] },
  { id: "aspirin", ingredient: { pt: "ácido acetilsalicílico", en: "acetylsalicylic acid (aspirin)" }, generics: ["acido acetilsalicilico", "acetylsalicylic acid", "aas"], brands: ["aspirina", "aspirin", "melhoral", "ecotrin", "bufferin"], classes: ["nsaid", "analgesic"] },
  { id: "diclofenac", ingredient: { pt: "diclofenaco", en: "diclofenac" }, generics: ["diclofenaco", "diclofenac"], brands: ["voltaren", "cataflam", "biofenac"], classes: ["nsaid", "analgesic"] },
  { id: "naproxen", ingredient: { pt: "naproxeno", en: "naproxen" }, generics: ["naproxeno", "naproxen"], brands: ["aleve", "flanax", "naprosyn"], classes: ["nsaid", "analgesic"] },
  { id: "ketoprofen", ingredient: { pt: "cetoprofeno", en: "ketoprofen" }, generics: ["cetoprofeno", "ketoprofen"], brands: ["profenid"], classes: ["nsaid", "analgesic"] },
  { id: "nimesulide", ingredient: { pt: "nimesulida", en: "nimesulide" }, generics: ["nimesulida", "nimesulide"], brands: ["nisulid"], classes: ["nsaid", "analgesic"] },
  { id: "hyoscine", ingredient: { pt: "escopolamina (hioscina)", en: "hyoscine (scopolamine)" }, generics: ["hioscina", "hyoscine", "escopolamina", "scopolamine", "butilescopolamina", "butylscopolamine", "butilbrometo de escopolamina", "hyoscine butylbromide"], brands: ["buscopan", "buscoduo", "transderm scop", "scopoderm"], classes: ["antispasmodic", "antiemetic"] },
  { id: "dimenhydrinate", ingredient: { pt: "dimenidrinato", en: "dimenhydrinate" }, generics: ["dimenidrinato", "dimenhydrinate"], brands: ["dramin", "dramamine"], classes: ["antiemetic"] },
  { id: "metoclopramide", ingredient: { pt: "metoclopramida", en: "metoclopramide" }, generics: ["metoclopramida", "metoclopramide"], brands: ["plasil", "reglan"], classes: ["antiemetic"] },
  { id: "ondansetron", ingredient: { pt: "ondansetrona", en: "ondansetron" }, generics: ["ondansetrona", "ondansetron"], brands: ["zofran", "vonau"], classes: ["antiemetic"] },
  { id: "promethazine", ingredient: { pt: "prometazina", en: "promethazine" }, generics: ["prometazina", "promethazine"], brands: ["fenergan", "phenergan"], classes: ["antiemetic", "antihistamine"] },
  { id: "meclizine", ingredient: { pt: "meclizina", en: "meclizine" }, generics: ["meclizina", "meclizine"], brands: ["meclin", "antivert", "bonine"], classes: ["antiemetic"] },
  { id: "amoxicillin", ingredient: { pt: "amoxicilina", en: "amoxicillin" }, generics: ["amoxicilina", "amoxicillin"], brands: ["amoxil", "novocilin", "clavulin", "augmentin"], classes: ["penicillin"] },
  { id: "penicillin", ingredient: { pt: "penicilina", en: "penicillin" }, generics: ["penicilina", "penicillin", "benzilpenicilina", "benzathine penicillin"], brands: ["benzetacil", "bicillin"], classes: ["penicillin"] },
  { id: "ampicillin", ingredient: { pt: "ampicilina", en: "ampicillin" }, generics: ["ampicilina", "ampicillin"], brands: ["binotal"], classes: ["penicillin"] },
  { id: "sulfamethoxazole", ingredient: { pt: "sulfametoxazol", en: "sulfamethoxazole" }, generics: ["sulfametoxazol", "sulfamethoxazole", "sulfametoxazol trimetoprima"], brands: ["bactrim", "septra"], classes: ["sulfa"] },
  { id: "codeine", ingredient: { pt: "codeína", en: "codeine" }, generics: ["codeina", "codeine"], brands: ["tylex"], classes: ["opioid", "analgesic"] },
  { id: "tramadol", ingredient: { pt: "tramadol", en: "tramadol" }, generics: ["tramadol"], brands: ["tramal", "ultram"], classes: ["opioid", "analgesic"] },
  { id: "morphine", ingredient: { pt: "morfina", en: "morphine" }, generics: ["morfina", "morphine"], brands: ["dimorf", "ms contin"], classes: ["opioid", "analgesic"] },
  { id: "oxycodone", ingredient: { pt: "oxicodona", en: "oxycodone" }, generics: ["oxicodona", "oxycodone"], brands: ["oxycontin", "percocet"], classes: ["opioid", "analgesic"] },
  { id: "loratadine", ingredient: { pt: "loratadina", en: "loratadine" }, generics: ["loratadina", "loratadine"], brands: ["claritin", "claritin d"], classes: ["antihistamine"] },
  { id: "cetirizine", ingredient: { pt: "cetirizina", en: "cetirizine" }, generics: ["cetirizina", "cetirizine"], brands: ["zyrtec", "zetalerg"], classes: ["antihistamine"] },
  { id: "diphenhydramine", ingredient: { pt: "difenidramina", en: "diphenhydramine" }, generics: ["difenidramina", "diphenhydramine"], brands: ["benadryl"], classes: ["antihistamine"] },
  { id: "dexchlorpheniramine", ingredient: { pt: "dexclorfeniramina", en: "dexchlorpheniramine" }, generics: ["dexclorfeniramina", "dexchlorpheniramine"], brands: ["polaramine"], classes: ["antihistamine"] },
  { id: "latex", ingredient: { pt: "látex", en: "latex" }, generics: ["latex"], brands: [], classes: ["latex"] },
  { id: "iodine", ingredient: { pt: "iodo", en: "iodine" }, generics: ["iodo", "iodine", "povidona iodo", "povidone iodine", "contraste iodado", "iodinated contrast"], brands: ["betadine", "povidine"], classes: ["iodine"] },
];

/** Group names (pt + en). Cross-reactive groups also match in reports; the others only in kit advice. */
export const CLASS_WORDS: Partial<Record<DrugClass, string[]>> = {
  nsaid: ["anti inflamatorio", "anti inflamatorios", "antiinflamatorio", "antiinflamatorios", "aine", "aines", "anti inflammatory", "anti inflammatories", "antiinflammatory", "nsaid", "nsaids"],
  penicillin: ["penicilinas", "penicillins", "betalactamico", "betalactamicos", "beta lactam", "beta lactams"],
  sulfa: ["sulfa", "sulfas", "sulfonamida", "sulfonamidas", "sulfonamide", "sulfonamides", "sulfa drugs"],
  opioid: ["opioide", "opioides", "opiaceo", "opiaceos", "opioid", "opioids", "opiate", "opiates"],
  antihistamine: ["anti histaminico", "anti histaminicos", "antihistaminico", "antihistaminicos", "antialergico", "antialergicos", "antihistamine", "antihistamines"],
  antiemetic: ["antiemetico", "antiemeticos", "antiemetic", "antiemetics"],
  analgesic: ["analgesico", "analgesicos", "analgesic", "analgesics", "painkiller", "painkillers", "pain reliever"],
};

/** Words in the onboard advice that stand for a kit drug of some group. */
export const KIT_CLASSES: DrugClass[] = ["analgesic", "antiemetic"];
/** Kit procedures that use latex gloves or dressings. */
export const LATEX_PROCEDURE = /\b(primeiros socorros|first aid|compressao|compression|curativo|dressing)\b/;

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** Whole-word (or whole-phrase) matcher; spaces in a phrase match any run of spaces. */
export function wordsRegex(words: string[]) {
  const alts = [...words].sort((a, b) => b.length - a.length).map((w) => escape(w).replace(/ /g, "\\s+"));
  return new RegExp(`\\b(?:${alts.join("|")})\\b`, "g");
}
