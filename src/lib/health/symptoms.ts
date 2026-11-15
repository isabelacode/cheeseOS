import type { Finding, RedFlag, Region, Severity, SymptomId } from "./types";
import type { Locale } from "@/lib/i18n/locale";

/**
 * Deterministic symptom extractor for Brazilian Portuguese and English speech.
 * Runs instantly and offline; the LLM only writes the narrative feedback.
 * Patterns run on normalized text: lowercase, no accents, apostrophes become
 * spaces ("can't" -> "can t", "I'm" -> "i m").
 *
 * Detection runs in two passes:
 * 1. Rules match a phrase to a symptom (e.g. "dor de cabeça" -> headache).
 * 2. Generic findings are refined by the words around them into a more
 *    specific variant (headache + "latejando de um lado" -> migraine,
 *    abdominal pain + "lado direito embaixo" -> right lower quadrant), so the
 *    advice can point at the likely organ or cause.
 */

type Side = "left" | "right" | "both";

interface SymptomRule {
  id: SymptomId;
  patterns: Record<Locale, RegExp[]>;
  /**
   * Fixed regions, a limb pair resolved by the side mentioned in the phrase,
   * "joint": the limb is picked from the joint named (knee -> leg), or
   * "extremity": hands -> arms, feet -> legs, neither named -> all four, or
   * "located": the body part named in the phrase (skin), torso if none.
   */
  regions: Region[] | { limb: "arm" | "leg" } | "joint" | "extremity" | "located";
  severity: Severity;
  /** Generic ids this rule replaces when both match the same clause. */
  supersedes?: SymptomId[];
  redFlag?: RedFlag;
}

const HEAD_PAIN_FAMILY: SymptomId[] = [
  "headache",
  "migraine",
  "tension_headache",
  "cluster_headache",
  "sinus_headache",
  "thunderclap_headache",
  "retro_orbital_pain",
];

const RULES: SymptomRule[] = [
  {
    id: "chest_pain",
    patterns: {
      pt: [/dor( \w+)? (no|de) peito/, /(aperto|pressao)( \w+)? no peito/, /peito (doendo|apertado|doi)/, /pontada( \w+)? no peito/],
      en: [/chest pain/, /pain in (my |the )?chest/, /chest (hurts|is hurting|is tight|feels tight|tightness)/, /tight(ness)?( \w+)? (in|on) (my |the )?chest/, /pressure (in|on) (my |the )?chest/],
    },
    regions: ["torso"],
    severity: 3,
  },
  {
    id: "dyspnea",
    patterns: {
      pt: [/falta de ar/, /sem ar/, /dificuldade (para|pra|de) respirar/, /nao consigo respirar/, /respira(r|ndo) mal/, /ofegante/],
      en: [/short(ness)? of breath/, /can t breathe/, /cannot breathe/, /(hard|difficult) to breathe/, /(trouble|difficulty) breathing/, /out of breath/, /breathless/, /can t catch my breath/],
    },
    regions: ["torso"],
    severity: 3,
  },
  {
    id: "fainting",
    patterns: {
      pt: [/desmai/, /vou apagar/, /quase apaguei/, /escureceu a vista/],
      en: [/faint/, /pass(ing|ed)? out/, /black(ing|ed)? out/, /going to collapse/],
    },
    regions: ["head"],
    severity: 3,
  },
  {
    id: "bleeding",
    patterns: {
      // Not a lab test or a blood-pressure reading.
      pt: [/sangr/, /(?<!(exame|exames|coleta|amostra|teste|doacao|doar) de )sangue(?! (para|pra) (exame|coleta|teste))/],
      en: [/bleed/, /(?<!(draw|drew|drawn|draws|drawing|give|gave|giving|donate|donated) )blood(?! (pressure|tests?|work|sugar|draws?|samples?|type|oxygen|counts?|panel|glucose|levels?))/],
    },
    regions: ["head"],
    severity: 3,
  },
  {
    id: "thunderclap_headache",
    patterns: {
      pt: [
        /pior dor de cabeca da (minha )?vida/,
        /(dor de cabeca|cefaleia)( \w+){0,2} (subita|repentina|explosiva|fulminante)/,
        /(de repente|do nada|subitamente|derrepente)( \w+){0,4} (dor de cabeca|cefaleia|cabeca (explodindo|estourando))/,
        /(dor de cabeca|cefaleia)( \w+){0,4} (de repente|do nada|subitamente)/,
        /cabeca (explodindo|estourando)/,
      ],
      en: [
        /worst head ?ache (of|in) my life/,
        /(sudden|thunderclap|explosive)( \w+){0,2} head ?ache/,
        /head ?ache( \w+){0,3} (came on|started|hit|began)( \w+)? (suddenly|out of nowhere|all of a sudden)/,
        /(suddenly|out of nowhere|all of a sudden)( \w+){0,4} head ?ache/,
        /head (is )?exploding/,
      ],
    },
    regions: ["head"],
    severity: 3,
    supersedes: ["headache"],
    redFlag: "thunderclap",
  },
  {
    id: "palpitations",
    patterns: {
      pt: [/palpita/, /coracao (acelerado|disparado|batendo forte)/, /taquicardia/],
      en: [/palpitation/, /heart (is )?(racing|pounding|fluttering)/, /racing heart/, /tachycardia/],
    },
    regions: ["torso"],
    severity: 2,
  },
  {
    id: "dizziness",
    patterns: {
      pt: [/tont/, /zonz/, /vertigem/, /tudo girando/],
      en: [/dizz/, /light ?headed/, /vertigo/, /(room|everything) (is )?spinning/],
    },
    regions: ["head"],
    severity: 2,
  },
  {
    id: "vision",
    patterns: {
      pt: [
        /visao (embacada|turva|borrada|dupla)/,
        /vista (embacada|turva)/,
        /enxergando mal/,
        /vendo (dobrado|duplo)/,
        /nao (enxergo|consigo ler|consigo enxergar)( \w+)? de perto/,
        /visao de perto/,
        /(manchas?|pontos?( pretos?| escuros?)?) na (visao|vista)/,
        /moscas volantes/,
        /(flashes?|clarões?|claroes) (de luz|na (visao|vista))/,
      ],
      en: [
        /blurr(y|ed) vision/,
        /vision (is )?(blurry|blurred|fuzzy)/,
        /can t see (well|clearly|properly)/,
        /seeing double/,
        /double vision/,
        /can t (see|read)( \w+)? (up close|close up)/,
        /near vision/,
        /(spots|floaters|dark spots) in (my )?(vision|eyes?)/,
        /flashes of light/,
      ],
    },
    regions: ["head"],
    severity: 2,
  },
  {
    id: "retro_orbital_pain",
    patterns: {
      pt: [
        /dor( \w+){0,3} (atras|por tras|no fundo) d[oe]s? olhos?/,
        /(atras|por tras|no fundo) d[oe]s? olhos?( \w+){0,2} (doendo|doi|doem|dolorid)/,
        /dor (ao|quando|pra|para) (mexer|mover|movimentar|virar) (os|o) olhos?/,
        /olhos? (doendo|doi|doem)( \w+){0,2} (quando|ao) (mexo|mexer|movo|mover)/,
        /dor retro ?orbit/,
      ],
      en: [
        /\b(pain|ache|aching|pressure)( \w+){0,3} behind (my |the )?eyes?/,
        /behind (my |the )?eyes?( \w+){0,2} (hurts?|aches?|is hurting|are hurting)/,
        /eyes? (hurts?|aches?)( \w+){0,2} when (i )?(move|moving|look)/,
        /pain (when|on) moving (my )?eyes/,
        /retro ?orbital/,
      ],
    },
    regions: ["head"],
    severity: 2,
    supersedes: ["headache"],
  },
  {
    id: "stiff_neck",
    patterns: {
      pt: [
        /(pescoco|nuca)( \w+)? (dur[oa]|rigid[oa]|travad[oa]|endurecid[oa])/,
        /rigidez (de|na) nuca/,
        /nao consigo (abaixar|dobrar|encostar|mexer)( \w+){0,2} (cabeca|queixo|pescoco)/,
      ],
      en: [/stiff neck/, /neck (is |feels )?(stiff|rigid)/, /can t (touch|bend|put) my chin/, /can t (bend|move) my neck/],
    },
    regions: ["head"],
    severity: 2,
  },
  {
    id: "fever",
    patterns: { pt: [/febre/, /febril/, /calafrio/], en: [/fever/, /chills/] },
    regions: ["head", "torso"],
    severity: 2,
  },
  {
    id: "numbness",
    patterns: { pt: [/dormen/, /formiga/, /adormecid/], en: [/numb/, /tingl/, /pins and needles/] },
    regions: { limb: "arm" },
    severity: 2,
  },
  {
    id: "nausea",
    patterns: {
      pt: [/nausea/, /enjo/, /vontade de vomitar/, /vomit/, /estomago embrulhado/, /mal do espaco/],
      en: [/nause/, /sick to my stomach/, /throw(ing)? up/, /vomit/, /queasy/, /space (motion |adaptation )?sickness/],
    },
    regions: ["abdomen"],
    severity: 1,
  },
  {
    id: "flank_pain",
    patterns: {
      pt: [/dor( \w+){0,3} (no|nos|do|dos) rins?\b/, /dor( \w+){0,3} (no|do) flanco/, /colica renal/, /calculo renal/, /pedra no rim/],
      en: [/kidney (pain|stone)/, /pain( \w+){0,3} (in|of) (my |the )?(kidneys?|flank)/, /flank pain/, /renal colic/, /(kidneys?|flank)( \w+)? (hurts?|aches?|is hurting)/],
    },
    regions: ["abdomen", "torso"],
    severity: 2,
    supersedes: ["abdominal_pain", "back_pain"],
  },
  {
    id: "abdominal_pain",
    patterns: {
      pt: [
        /dor (de|na) barriga/,
        /dor no estomago/,
        /dor abdominal/,
        /colica/,
        /(barriga|estomago|abdomen|ventre)( \w+){0,4} (esta |ta )?(doendo|doi|dolorid)/,
        /dor( \w+){0,4} (da|na|do|no) (barriga|abdomen|ventre)/,
        /dor( \w+){0,2} (no|em volta do|ao redor do|perto do|em torno do|acima do|abaixo do) umbigo/,
        /pe da barriga/,
        /baixo ventre/,
        /boca do estomago/,
        /queimacao( \w+){0,2} (no|na) (estomago|boca do estomago)/,
        /azia/,
        /dor( \w+){0,3} (embaixo|abaixo|debaixo) (das|da) costelas?/,
        /dor( \w+){0,3} (na|no|da) (virilha|bexiga)/,
        /pontada( \w+){0,2} (na barriga|no abdomen|no lado|do lado)/,
      ],
      en: [
        /stomach ?ache/,
        /belly ?ache/,
        /tummy ?ache/,
        /abdominal pain/,
        /(stomach|belly|tummy|abdomen)( \w+)? (hurts|is hurting|pain)/,
        /pain( \w+){0,4} (of|in) (my |the )?(stomach|belly|abdomen|tummy)/,
        /cramps/,
        /pain( \w+){0,2} (around|near|above|below) (my |the )?(belly button|navel)/,
        /(upper|lower) (right|left) (side|quadrant|abdomen|belly)/,
        /(right|left) (upper|lower) (side|quadrant|abdomen|belly)/,
        /pit of (my )?stomach/,
        /heartburn/,
        /pain( \w+){0,3} (under|below) (my |the )?((right|left) )?ribs?/,
        /(groin|pelvic|bladder) pain/,
        /pain( \w+){0,3} in (my |the )?(groin|pelvis|bladder)/,
      ],
    },
    regions: ["abdomen"],
    severity: 2,
  },
  {
    id: "headache",
    patterns: {
      pt: [/dor de cabeca/, /cabeca( \w+)? (esta |ta )?(doendo|doi|latejando)/, /cefaleia/, /enxaqueca/],
      en: [/head ?ache/, /head( \w+)? (hurts|is hurting|is pounding|is throbbing)/, /migraine/],
    },
    regions: ["head"],
    severity: 1,
  },
  {
    id: "ear_pain",
    patterns: {
      pt: [/dor (de|no|nos) ouvidos?/, /ouvidos? (doendo|doi|doem|latejando)/, /otite/],
      en: [/ear ?ache/, /ears? (hurts?|is hurting|aches?)/, /pain in (my |the )?ears?/, /ear pain/],
    },
    regions: ["head"],
    severity: 1,
  },
  {
    id: "sore_throat",
    patterns: {
      pt: [
        /dor (de|na) garganta/,
        /garganta( \w+)? (inflamada|irritada|arranhando|doendo|doi|ardendo|raspando|fechando)/,
        /dor (para|pra|ao|quando) engolir/,
        /doi (para|pra|ao) engolir/,
        /amigdal/,
        /rouquid/,
        /\brouc[oa]\b/,
      ],
      en: [/sore throat/, /throat (hurts|is sore|is scratchy|burns|is burning|is raw)/, /(pain|hurts) (when |to )?swallow/, /tonsil/, /hoarse/, /scratchy throat/],
    },
    regions: ["head"],
    severity: 1,
  },
  {
    id: "congestion",
    patterns: {
      pt: [/nariz entupido/, /rosto inchado/, /cara inchada/, /congest/, /pressao na cabeca/],
      en: [/stuffy nose/, /blocked nose/, /(puffy|swollen) face/, /congest/, /pressure in my head/, /head pressure/],
    },
    regions: ["head"],
    severity: 1,
  },
  {
    id: "cough",
    patterns: { pt: [/tosse/, /tossindo/], en: [/cough/] },
    regions: ["torso"],
    severity: 1,
  },
  {
    id: "back_pain",
    patterns: {
      pt: [/dor nas costas/, /costas( \w+)? (esta |ta )?(doendo|doi)/, /lombar/, /coluna/],
      en: [/back pain/, /back( \w+)? (hurts|is hurting|is killing me|aches)/, /lower back/, /spine/, /pain in (my |the )?back/],
    },
    regions: ["torso"],
    severity: 1,
  },
  {
    id: "hand_numbness",
    patterns: {
      pt: [
        /(mao|maos|palma|polegar|ponta dos dedos|dedos?\b(?! do pe))( \w+){0,2} (esta |ta |estao )?(dorment|formigand|adormecid)/,
        /(dormencia|formigamento)( \w+){0,2} (na|nas|no|nos|na ponta dos) (mao|maos|polegar|dedos?\b(?! do pe))/,
        /tunel do carpo/,
      ],
      en: [
        /(hands?|fingers?|thumb|fingertips?)( \w+){0,2} (is |are |feel |feels )?(numb|tingl|asleep)/,
        /(numb|numbness|tingling|pins and needles)( \w+){0,2} in (my |the )?((left|right) )?(hands?|fingers?|thumb|fingertips?)/,
        /carpal tunnel/,
      ],
    },
    regions: { limb: "arm" },
    severity: 2,
    supersedes: ["numbness", "hand_pain", "finger_pain", "arm_pain"],
  },
  {
    id: "foot_numbness",
    patterns: {
      pt: [
        /(\bpes?\b(?! da barriga)|sola do pe|dedos? do pe)( \w+){0,2} (esta |ta |estao )?(dorment|formigand|adormecid)/,
        /(dormencia|formigamento)( \w+){0,2} (no|nos|na sola do|nos dedos do) (pes?)\b/,
      ],
      en: [
        /(foot|feet|toes?|soles?)( \w+){0,2} (is |are |feel |feels )?(numb|tingl|asleep)/,
        /(numb|numbness|tingling|pins and needles)( \w+){0,2} in (my |the )?((left|right) )?(foot|feet|toes?|soles?)/,
      ],
    },
    regions: { limb: "leg" },
    severity: 2,
    supersedes: ["numbness", "foot_pain", "toe_pain", "leg_pain"],
  },
  {
    id: "cold_extremities",
    patterns: {
      pt: [
        /(maos?|\bpes\b|\bpe\b(?! da barriga)|dedos?|extremidades|unhas?)( \w+){0,3} (gelad|frios?\b|frias?\b|roxos?\b|roxas?\b|brancos?\b|brancas?\b|azulad|arroxead|palid)/,
      ],
      en: [
        /(hands?|feet|foot|fingers?|toes?|fingertips?|nails?)( \w+){0,2} (are |is |feel |feels |turn(ing|ed)? |look )?(cold|icy|freezing|blue|purple|white|pale)/,
        /(cold|icy|blue|purple|white) (hands|feet|fingers|toes|fingertips)/,
      ],
    },
    regions: "extremity",
    severity: 2,
    supersedes: ["hand_pain", "finger_pain", "foot_pain", "toe_pain"],
  },
  {
    id: "foot_swelling",
    patterns: {
      pt: [/(\bpes?\b(?! da barriga)|tornozelos?)( \w+){0,2} (esta |ta |estao )?(inchad|inchou|incharam)/, /inchaco( \w+){0,2} (no|nos) (pes?|tornozelos?)\b/],
      en: [/(swollen|puffy) ((left|right) )?(foot|feet|ankles?)/, /(foot|feet|ankles?)( \w+){0,2} (is |are )?(swollen|swelling|puffy)/, /swelling in (my |the )?((left|right) )?(foot|feet|ankles?)/],
    },
    regions: { limb: "leg" },
    severity: 2,
    supersedes: ["joint_pain", "foot_pain", "leg_pain"],
  },
  {
    id: "heel_pain",
    patterns: {
      pt: [/calcanhar/, /calcanhares/, /fascite/, /esporao/],
      en: [/heels?\b/, /plantar fasci/, /heel spur/],
    },
    regions: { limb: "leg" },
    severity: 1,
    supersedes: ["foot_pain", "leg_pain"],
  },
  {
    id: "toe_pain",
    patterns: {
      pt: [/(dedos?|dedao|unhas?) do pe/, /\bdedao\b(?! da mao)/, /unha encravada/, /joanete/],
      en: [/\btoes?\b/, /toenail/, /bunion/, /ingrown nail/],
    },
    regions: { limb: "leg" },
    severity: 1,
    supersedes: ["foot_pain", "leg_pain", "joint_pain", "foot_swelling"],
  },
  {
    id: "finger_pain",
    patterns: {
      pt: [
        /(dedos?|dedao) da mao/,
        /polegar/,
        /\bdedos?\b(?! do pe)( \w+){0,2} (esta |ta |estao )?(doendo|doi|doem|dolorid|inchad|machucad|travad)/,
        /dor( \w+){0,2} (no|nos|na ponta do|nas pontas dos) dedos?\b(?!( \w+)? do pe)/,
        /ponta dos dedos/,
        /unhas?( \w+){0,3} (soltando|descolando|caindo|doendo|roxas?|pretas?)/,
      ],
      en: [
        /fingers?( \w+){0,2} (hurts?|aches?|is sore|are sore|swollen|is swollen|are swollen)/,
        /pain( \w+){0,2} in (my |the )?((left|right) )?(fingers?|thumb|fingertips?|knuckles?)/,
        /fingertips?/,
        /thumb( \w+)? (hurts|pain|is sore)/,
        /\b(finger)?nails?( \w+){0,3} (lifting|coming off|falling off|hurts?|bruised|black)/,
      ],
    },
    regions: { limb: "arm" },
    severity: 1,
    supersedes: ["hand_pain", "arm_pain", "joint_pain"],
  },
  {
    id: "hand_pain",
    patterns: {
      pt: [
        /dor(es)?( \w+){0,2} (na|nas|no dorso da|nas costas da) (mao|maos|palma)\b/,
        /(mao|maos|palma da mao)( \w+){0,2} (esta |ta |estao )?(doendo|doi|doem|dolorid)/,
      ],
      en: [
        /(hands?|palms?)( \w+){0,2} (hurts?|is hurting|are hurting|aches?|is sore|are sore)/,
        /pain( \w+){0,2} in (my |the )?((left|right) )?(hands?|palms?)/,
        /hand pain/,
      ],
    },
    regions: { limb: "arm" },
    severity: 1,
    supersedes: ["arm_pain"],
  },
  {
    id: "foot_pain",
    patterns: {
      pt: [
        /dor(es)?( \w+){0,2} (no|nos|na sola do|na planta do|no peito do) pes?\b(?! da barriga)/,
        /\bpes?\b(?! da barriga)( \w+){0,2} (esta |ta |estao )?(doendo|doi|doem|dolorid)/,
        /(sola|planta) do pe/,
      ],
      en: [
        /(foot|feet)( \w+){0,2} (hurts?|is hurting|are hurting|aches?|is sore|are sore)/,
        /pain( \w+){0,2} in (my |the )?((left|right) )?(foot|feet|soles?)/,
        /foot pain/,
        /soles? of (my )?feet|sole of (my )?foot/,
      ],
    },
    regions: { limb: "leg" },
    severity: 1,
    supersedes: ["leg_pain"],
  },
  {
    id: "joint_pain",
    patterns: {
      pt: [
        /articula/,
        /artralg/,
        /artrite/,
        /dor(es)?( \w+){0,2} (nas|das) juntas/,
        /juntas( \w+)? (doendo|doem|doloridas|inchadas)/,
        /(ombro|cotovelo|punho|joelho|tornozelo|quadril)s?( \w+){0,2} (esta |ta |estao )?(doendo|doi|doem|dolorid|inchad|travad)/,
        /dor(es)?( \w+){0,2} (no|na|nos|nas) (ombro|cotovelo|punho|joelho|tornozelo|quadril)/,
      ],
      en: [
        /joints?( \w+)? (pain|ache|aches|hurt|hurts|are sore|swollen)/,
        /(pain|ache|aching)( \w+){0,3} (in )?(my |the )?joints/,
        /arthralg/,
        /arthritis/,
        /(shoulder|elbow|wrist|knee|ankle|hip|knuckle)s?( \w+){0,2} (hurts?|is hurting|aches?|is aching|is sore|are sore|is swollen|are swollen)/,
        /pain in (my |the )?((left|right) )?(shoulder|elbow|wrist|knee|ankle|hip)/,
        /(shoulder|elbow|wrist|knee|ankle|hip) pain/,
      ],
    },
    regions: "joint",
    severity: 1,
  },
  {
    id: "arm_pain",
    patterns: {
      pt: [/dor( \w+)? no braco/, /(braco|antebraco|mao)( \w+){0,2} (esta |ta )?(doendo|doi|dolorid)/, /(vai|indo|irradia\w*|desce\w*|corre\w*)( \w+){0,2} (pro|para o|ate o|no) (braco|ombro)/, /dor na mao/],
      en: [/(arm|forearm|hand)( \w+){0,2} (hurts|is hurting|aches|is aching|is sore)/, /pain in (my |the )?((left|right) )?(arm|forearm|hand)/, /(arm|forearm) pain/, /(radiat|spread|going|goes|moving|shoot)\w*( \w+){0,3} (arm|shoulder)/],
    },
    regions: { limb: "arm" },
    severity: 1,
    supersedes: ["joint_pain"],
  },
  {
    id: "leg_pain",
    patterns: {
      pt: [/dor na perna/, /(perna|panturrilha|\bpe(?! da barriga)|coxa)( \w+){0,2} (esta |ta )?(doendo|doi|dolorid)/, /panturrilha/, /dor no pe\b(?! da barriga)/],
      en: [/(leg|calf|foot|thigh)( \w+){0,2} (hurts|is hurting|aches|is aching|is sore)/, /pain in (my |the )?((left|right) )?(leg|calf|foot|thigh)/, /(leg|calf|foot) pain/],
    },
    regions: { limb: "leg" },
    severity: 1,
  },
  {
    id: "muscle_pain",
    patterns: {
      pt: [/dor muscular/, /musculos? (doloridos?|doendo)/, /corpo dolorido/, /dor no corpo/],
      en: [/muscle (pain|ache|aches|soreness)/, /muscles? (are |is )?(sore|aching)/, /sore muscles/, /body aches?/, /aching all over/],
    },
    regions: ["leftArm", "rightArm", "leftLeg", "rightLeg"],
    severity: 1,
  },
  {
    id: "fatigue",
    patterns: {
      pt: [/cansad/, /cansaco/, /fadiga/, /exaust/, /sem energia/, /muito sono/],
      en: [/tired/, /fatigue/, /exhaust/, /no energy/, /sleepy/, /worn out/, /drained/],
    },
    regions: ["head", "torso", "abdomen", "leftArm", "rightArm", "leftLeg", "rightLeg"],
    severity: 1,
  },
  {
    id: "anxiety",
    patterns: {
      pt: [/ansios/, /ansiedade/, /estressad/, /nervos/, /panico/, /angusti/],
      en: [/anxi/, /stress/, /nervous/, /panic/, /worried/, /overwhelmed/],
    },
    regions: ["head"],
    severity: 1,
  },
  {
    id: "disorientation",
    patterns: {
      pt: [
        /desorient/,
        /nao sei (mais )?(onde e|o que e|qual e o lado de) (cima|baixo)/,
        /perdi (a nocao|o senso|a referencia) (de )?(cima|baixo|direcao|orientacao|espaco)/,
        /sem (nocao|referencia) de (cima|baixo|espaco|direcao)/,
        /tudo de cabeca pra baixo/,
      ],
      en: [/disorient/, /(can t tell|don t know|lost track of) which way is up/, /lost (my )?sense of (direction|up|orientation)/, /everything (is |feels )?upside down/],
    },
    regions: ["head"],
    severity: 2,
  },
  {
    id: "confusion",
    patterns: {
      pt: [
        /confus/,
        /esquecendo (as coisas|tudo|muito|coisas)/,
        /esquecid[oa]/,
        /memoria (ruim|fraca|falhando)/,
        /dificuldade (de|para|pra|em) (concentrar|pensar|raciocinar|lembrar|focar)/,
        /nao (consigo|to conseguindo|estou conseguindo) (me )?(concentrar|pensar direito|raciocinar|focar)/,
        /raciocinio lento/,
        /(mente|cabeca) (lenta|nublada|enevoada|aerea)/,
        /lerd[oa]/,
      ],
      en: [
        /confus/,
        /forgetting (things|stuff|everything)/,
        /forgetful/,
        /memory (is )?(bad|poor|failing)/,
        /(can t|hard to|trouble|difficulty) (focus|concentrat|think( straight| clearly)?|remember)/,
        /brain fog/,
        /foggy/,
        /slow thinking/,
        /(mind|thinking) (is |feels )?(slow|cloudy)/,
      ],
    },
    regions: ["head"],
    severity: 2,
  },
  {
    id: "insomnia",
    patterns: {
      pt: [
        /insonia/,
        /nao (consigo|consegui|to conseguindo|estou conseguindo) dormir/,
        /dormi (mal|pouco|quase nada)/,
        /durmo mal/,
        /acordando (toda hora|muito|varias vezes|de madrugada)/,
        /sono (ruim|picado|agitado|desregulado|bagunc)/,
        /sem dormir/,
        /perdi o sono/,
      ],
      en: [
        /insomnia/,
        /can t sleep/,
        /couldn t sleep/,
        /(slept|sleeping|sleep) (badly|poorly|very little|so little)/,
        /(trouble|difficulty) (sleeping|falling asleep)/,
        /keep waking up/,
        /no sleep/,
        /sleep (is )?(messed up|off|irregular)/,
      ],
    },
    regions: ["head"],
    severity: 1,
  },
  {
    id: "low_mood",
    patterns: {
      pt: [
        /triste/,
        /deprimid/,
        /depressao/,
        /desanimad/,
        /desmotivad/,
        /sem vontade (de|pra) (nada|fazer)/,
        /sozinh/,
        /isolad/,
        /saudade/,
        /(vontade de )?chorar/,
        /chorando/,
        /sem esperanca/,
        /nao aguento mais/,
        /quero morrer/,
        /(me matar|tirar (a )?minha (propria )?vida|acabar com (a minha vida|tudo))/,
        /nao quero mais viver/,
      ],
      en: [
        /\bsad\b/,
        /depress/,
        /unmotivated/,
        /no motivation/,
        /lonely/,
        /isolated/,
        /homesick/,
        /(want to |wanna )?cry(ing)?\b/,
        /hopeless/,
        /can t take (it|this) anymore/,
        /want to die/,
        /kill myself/,
        /end (it all|my life)/,
        /suicid/,
        /don t want to (live|be alive)/,
      ],
    },
    regions: ["head"],
    severity: 1,
  },
  {
    id: "skin_rash",
    patterns: {
      pt: [
        /erupc/,
        /brotoej/,
        /manchas?( \w+)? vermelh/,
        /vermelhid(ao)? na pele/,
        /pele( \w+)? (vermelha|irritada|descascando|ressecada|empolada)/,
        /coceira/,
        /cocando/,
        /\bcoca (muito|demais|bastante)/,
        /bolhas?\b/,
        /herpes/,
        /cobreiro/,
        /zoster/,
        /urticaria/,
        /alergia na pele/,
        /feridas? (na boca|no labio|nos labios)/,
      ],
      en: [/rash/, /hives/, /itch/, /blisters?/, /cold sores?/, /herpes/, /shingles/, /skin (is )?(red|irritated|peeling|dry|flaking)/, /red (spots|patches|bumps)/],
    },
    regions: "located",
    severity: 1,
  },
];

/**
 * Specific forms of a generic symptom, found by refinement. The parent is
 * replaced by the variant, and resolving the parent ("a dor de cabeça
 * passou") also resolves its variants.
 */
const VARIANTS: Partial<Record<SymptomId, { parent: SymptomId; regions: Region[]; severity: Severity }>> = {
  migraine: { parent: "headache", regions: ["head"], severity: 2 },
  tension_headache: { parent: "headache", regions: ["head"], severity: 1 },
  cluster_headache: { parent: "headache", regions: ["head"], severity: 2 },
  sinus_headache: { parent: "headache", regions: ["head"], severity: 1 },
  thunderclap_headache: { parent: "headache", regions: ["head"], severity: 3 },
  space_motion_sickness: { parent: "nausea", regions: ["head", "abdomen"], severity: 1 },
  retro_orbital_pain: { parent: "headache", regions: ["head"], severity: 2 },
  epigastric_pain: { parent: "abdominal_pain", regions: ["abdomen"], severity: 2 },
  ruq_pain: { parent: "abdominal_pain", regions: ["abdomen"], severity: 2 },
  luq_pain: { parent: "abdominal_pain", regions: ["abdomen"], severity: 2 },
  periumbilical_pain: { parent: "abdominal_pain", regions: ["abdomen"], severity: 2 },
  rlq_pain: { parent: "abdominal_pain", regions: ["abdomen"], severity: 2 },
  llq_pain: { parent: "abdominal_pain", regions: ["abdomen"], severity: 2 },
  suprapubic_pain: { parent: "abdominal_pain", regions: ["abdomen"], severity: 1 },
  flank_pain: { parent: "abdominal_pain", regions: ["abdomen", "torso"], severity: 2 },
};

const ABDOMEN_FAMILY: SymptomId[] = [
  "abdominal_pain",
  ...(Object.keys(VARIANTS) as SymptomId[]).filter((id) => VARIANTS[id]?.parent === "abdominal_pain"),
];

/** Every id whose parent is `id`, plus `id` itself. */
function familyOf(id: SymptomId): SymptomId[] {
  return [id, ...(Object.keys(VARIANTS) as SymptomId[]).filter((v) => VARIANTS[v]?.parent === id)];
}

/**
 * Regions of symptoms whose location never depends on the phrase. Limb
 * symptoms (arm/leg/joint pain, numbness) are left out: their side is only
 * known while the finding is active.
 */
export const FIXED_REGIONS: Partial<Record<SymptomId, Region[]>> = {
  ...Object.fromEntries(Object.entries(VARIANTS).map(([id, v]) => [id, v!.regions])),
  ...Object.fromEntries(RULES.filter((r) => Array.isArray(r.regions)).map((r) => [r.id, r.regions as Region[]])),
};

/** Word lists that place a headache or an abdominal pain more precisely. */
interface Refiners {
  headache: { id: SymptomId; re: RegExp }[];
  abdomen: {
    epigastric: RegExp;
    /** Loose "stomach" word: epigastric only when no side or level is given. */
    stomach: RegExp;
    periumbilical: RegExp;
    suprapubic: RegExp;
    upper: RegExp;
    lower: RegExp;
  };
  rigidAbdomen: RegExp;
  armJoint: RegExp;
  legJoint: RegExp;
  handWords: RegExp;
  /** Warm, red: an inflamed limb. */
  inflamed: RegExp;
  /** Words that place a skin complaint on the body. */
  located: [Region | "arm" | "leg", RegExp][];
  /** Head movement or disorientation that turns nausea into space motion sickness. */
  motion: RegExp;
  /** A spacewalk, the suit or a pressure change: context for decompression sickness. */
  eva: RegExp;
  radiation: RegExp;
  trauma: RegExp;
  /** Self-harm language: always escalate. */
  crisis: RegExp;
  /** The left arm or shoulder named anywhere (chest pain radiating there). */
  leftArm: RegExp;
  footWords: RegExp;
}

const REFINERS: Record<Locale, Refiners> = {
  pt: {
    // Checked in order; the first match wins.
    headache: [
      {
        id: "cluster_headache",
        re: /(em volta|ao redor|em torno) d[eo] (um )?olho|cefaleia em salvas|em salvas|olho( \w+)? (lacrimejando|vermelho)|lacrimej|nariz escorrendo de um lado/,
      },
      {
        id: "migraine",
        re: /enxaqueca|latej|pulsa|(de )?um lado( so)? da cabeca|metade da cabeca|so de um lado|aura|pontos (brilhantes|luminosos|de luz)|(luz|claridade|barulho)( \w+)? (me )?incomod|fotofobia|sensivel (a|ao) (luz|barulho)/,
      },
      {
        id: "sinus_headache",
        re: /sinusite|seios da face|macas do rosto|rosto (doendo|pesado)|piora (quando|ao)( \w+)? (abaix|inclin)|nariz entupido|congest|catarro/,
      },
      {
        id: "tension_headache",
        re: /(aperto|apertando|aperta|aperta(da|do)|pressao|peso)( \w+){0,2} (na |da |nas )?(cabeca|testa|tempora|fronte)|cabeca (apertada|pesada)|faixa|capacete|nuca|tensional|tensao|dos dois lados|ambos os lados|a cabeca toda/,
      },
    ],
    abdomen: {
      epigastric: /boca do estomago|epigastr|(em cima|acima) do umbigo|queimacao|azia/,
      stomach: /estomago/,
      periumbilical: /umbigo/,
      suprapubic: /pe da barriga|baixo ventre|(embaixo|abaixo) do umbigo|bexiga|pelve|pelvic|suprapub|pubis|pubica/,
      upper: /em cima|superior|parte de cima|parte alta|\balto\b|costela/,
      lower: /embaixo|em baixo|inferior|parte de baixo|\bbaixo\b|virilha|pe da barriga/,
    },
    rigidAbdomen: /barriga( \w+)? (dura|rigida|travada)|abdomen( \w+)? (duro|rigido)|(dura|rigida) como (uma )?tabua|piora( \w+)? (quando|ao) solt|dor ao soltar|descompressao/,
    armJoint: /ombro|cotovelo|punho|dedos? da mao/,
    legJoint: /joelho|tornozelo|quadril|dedos? do pe/,
    inflamed: /quente|vermelh|inchad|panturrilha/,
    located: [
      ["head", /rosto|\bcara\b|boca|labios?|testa|olhos?|pescoco|couro cabeludo|orelha|nariz/],
      ["arm", /braco|antebraco|\bmaos?\b|dedos? da mao|cotovelo|axila/],
      ["leg", /perna|coxa|\bpes?\b|joelho|virilha|canela/],
      ["abdomen", /barriga|abdomen|umbigo|cintura/],
      ["torso", /peito|costas|tronco|ombros?/],
    ],
    motion: /tont|girand|desorient|mexer a cabeca|mexo a cabeca|virar a cabeca|viro a cabeca|movimento|mal do espaco/,
    eva: /caminhada espacial|\beva\b|traje|saida (extraveicular|espacial)|eclusa|airlock|despressuriz|pre ?respira|mudanca de pressao/,
    radiation: /radiacao|radioativ|tempestade solar|evento solar|erupcao solar|particulas solares|dosimetro/,
    trauma: /\bcai\b|\bcaiu\b|queda|bati\b|batida|pancada|impacto|torci|torceu|esmag|trombei|colidi/,
    leftArm: /(braco|antebraco|ombro|mao) esquerd/,
    crisis: /quero morrer|me matar|tirar (a )?minha (propria )?vida|acabar com (a minha vida|tudo)|nao quero mais viver/,
    handWords: /\bmaos?\b|palma|polegar|dedos? da mao/,
    footWords: /\bpes?\b|dedos? do pe|dedao|calcanhar|tornozelo/,
  },
  en: {
    headache: [
      {
        id: "cluster_headache",
        re: /(around|behind) one eye|cluster|eye( \w+)? (is )?(watering|tearing|red)|watery eye|one nostril/,
      },
      {
        id: "migraine",
        re: /migraine|throbb|puls|pounding|one side of my head|half of my head|aura|zig ?zag|flashing lights|light( \w+)? (hurts|bothers)|sensitiv\w* to (light|sound|noise)|photophobia/,
      },
      {
        id: "sinus_headache",
        re: /sinus|cheekbones|cheeks|worse when (i )?(bend|lean)|stuffy|blocked nose|congest/,
      },
      {
        id: "tension_headache",
        re: /(tight|pressure|squeez|band|vise|vice)\w*( \w+){0,3} (head|forehead|temples)|band around|tension|both sides|back of my (head|neck)|temples|whole head/,
      },
    ],
    abdomen: {
      epigastric: /pit of (my )?stomach|epigastr|above (my |the )?(belly button|navel)|heartburn|burning/,
      stomach: /(?!)/,
      periumbilical: /belly button|navel|umbilic/,
      suprapubic: /below (my |the )?(belly button|navel)|pelvi|bladder|suprapubic|pubic|lower (belly|abdomen|stomach|tummy)/,
      upper: /upper|\btop\b|ribs?\b/,
      lower: /lower|bottom|groin|\blow\b/,
    },
    rigidAbdomen: /(belly|abdomen|stomach)( \w+)? (is )?(rigid|hard as a board|board like)|rigid (belly|abdomen)|hurts( \w+)? when (i )?(let go|release)|rebound/,
    armJoint: /shoulder|elbow|wrist|knuckle|finger/,
    legJoint: /knee|ankle|hip|toe/,
    inflamed: /\b(warm|hot|red|swollen)\b|calf/,
    located: [
      ["head", /face|mouth|lips?|forehead|eyes?|neck|scalp|ears?|nose/],
      ["arm", /\barms?\b|forearm|hands?|fingers?|elbow|armpit/],
      ["leg", /\blegs?\b|thigh|foot|feet|knee|groin|shin/],
      ["abdomen", /belly|stomach|abdomen|waist|navel/],
      ["torso", /chest|back|shoulders?|trunk/],
    ],
    motion: /dizz|spinning|disorient|mov(e|ing) my head|turn(ing)? my head|head movement|space (motion |adaptation )?sickness/,
    eva: /spacewalk|\beva\b|suit|airlock|depressuri|pre ?breath|pressure change/,
    radiation: /radiation|radioactive|solar (storm|event|flare|particle)|dosimeter/,
    trauma: /\bfell\b|\bfall\b|\bhit\b|bumped|banged|struck|twisted|crushed|impact|collided/,
    leftArm: /left (arm|forearm|shoulder|hand)/,
    crisis: /want to die|kill myself|end (it all|my life)|suicid|don t want to (live|be alive)/,
    handWords: /hands?|fingers?|thumbs?|palms?/,
    footWords: /foot|feet|toes?|heels?|soles?/,
  },
};

interface Grammar {
  intensifiers: RegExp;
  softeners: RegExp;
  negation: RegExp;
  /** Phrases with a negation word that do not deny the symptom ("não aguento mais essa dor"). */
  notNegation: RegExp;
  resolved: RegExp;
  allGood: RegExp;
  clauseBreak: RegExp;
  left: RegExp;
  right: RegExp;
}

const GRAMMAR: Record<Locale, Grammar> = {
  pt: {
    intensifiers: /\b(muito|muita|forte|intens|insuportavel|demais|pior|horrivel|terrivel)/,
    softeners: /\b(leve|levinho|pouco|pouquinho|fraco|fraquinha)/,
    negation: /\b(nao|nem|sem|nenhum|nenhuma|nunca|jamais)\b/,
    notNegation: /\bnao (aguento|suporto|para|paro|passa|melhora)\b/g,
    resolved: /\b(passou|melhorou|sumiu|parou|acabou|ja (nao|foi))\b/,
    allGood: /\b(estou|to|tou|me sinto|sinto|tudo) (bem|otim|normal|tranquil|beleza)/,
    clauseBreak: /\b(?:mas|porem|tambem|alem disso|e)\b|[.;!?]/,
    left: /esquerd/,
    right: /direit/,
  },
  en: {
    intensifiers: /\b(very|really|severe|intense|unbearable|worse|worst|terrible|awful|strong|so bad|a lot)\b/,
    softeners: /\b(mild|slight|slightly|a bit|a little|minor)\b/,
    negation: /\b(no|not|don t|dont|never|without|isn t|aren t|didn t|doesn t|haven t|hasn t|wasn t|weren t)\b/,
    notNegation: /\b(can t|cannot|won t|doesn t|don t) (stop|take|bear|stand)\b/g,
    resolved: /\b(gone|went away|better|stopped|passed|no longer|is over|eased)\b/,
    allGood: /\b(i m|im|i am|i feel|feeling|all) (fine|good|great|ok|okay|well|normal)\b/,
    clauseBreak: /\b(?:but|however|also|plus|and)\b|[.;!?]/,
    left: /\bleft\b/,
    right: /\bright\b/,
  },
};

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\w\s₂]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Speech recognition often mangles the short word "dor" ("door no braço",
 * "dorno pé", "condor no pé", "do ornum braço"). Repair those before matching
 * so a voice report still yields its symptom, and fold "num/em um" into the
 * "no/na" the rules are written with. Expects normalized text.
 */
export function repairTranscriptPt(text: string): string {
  return text
    .replace(/\bcondor\b/g, "com dor")
    .replace(/\b(?:door|douro|dour|dorr)\b/g, "dor")
    .replace(/\bdo or ?(no|na|nos|nas|num|numa)\b/g, "dor $1")
    .replace(/\bdor(no|na|nos|nas|num|numa)\b/g, "dor $1")
    // Rules are written with "no/na"; "dor num braço", "dor em uma perna" mean the same.
    .replace(/\b(?:num|em um)\b/g, "no")
    .replace(/\b(?:numa|em uma)\b/g, "na")
    .replace(/\b(?:nuns|em uns)\b/g, "nos")
    .replace(/\b(?:numas|em umas)\b/g, "nas");
}

function sideOf(clause: string, g: Grammar): Side {
  const left = g.left.test(clause);
  const right = g.right.test(clause);
  if (left && !right) return "left";
  if (right && !left) return "right";
  return "both";
}

function limbRegions(limb: "arm" | "leg", side: Side): Region[] {
  const l: Region = limb === "arm" ? "leftArm" : "leftLeg";
  const r: Region = limb === "arm" ? "rightArm" : "rightLeg";
  if (side === "left") return [l];
  if (side === "right") return [r];
  return [l, r];
}

/** Limbs touched by a joint complaint: the joint named picks arm or leg; "joints" means all four. */
function jointRegions(clause: string, side: Side, armWords: RegExp, legWords: RegExp): Region[] {
  const arm = armWords.test(clause);
  const leg = legWords.test(clause);
  if (!arm && !leg) return ["leftArm", "rightArm", "leftLeg", "rightLeg"];
  return [...(arm ? limbRegions("arm", side) : []), ...(leg ? limbRegions("leg", side) : [])];
}

/** Body parts named in the clause (for skin complaints); the torso when none is. */
function locatedRegions(clause: string, side: Side, r: Refiners): Region[] {
  const out = r.located.flatMap(([where, re]) =>
    !re.test(clause) ? [] : where === "arm" || where === "leg" ? limbRegions(where, side) : [where],
  );
  return out.length ? [...new Set(out)] : ["torso"];
}

/** Where in the belly the clause places the pain, or undefined if it doesn't say. */
function abdomenZone(clause: string, side: Side, r: Refiners): SymptomId | undefined {
  const z = r.abdomen;
  const upper = z.upper.test(clause);
  const lower = z.lower.test(clause);
  if (side !== "both" && (upper || lower)) {
    // "embaixo das costelas" mentions both; the ribs mean the upper half.
    if (side === "right") return upper ? "ruq_pain" : "rlq_pain";
    return upper ? "luq_pain" : "llq_pain";
  }
  if (z.epigastric.test(clause)) return "epigastric_pain";
  if (z.suprapubic.test(clause)) return "suprapubic_pain";
  if (z.periumbilical.test(clause)) return "periumbilical_pain";
  if (side === "both" && !upper && !lower && z.stomach.test(clause)) return "epigastric_pain";
  return undefined;
}

function headacheType(text: string, r: Refiners): SymptomId | undefined {
  return r.headache.find((h) => h.re.test(text))?.id;
}

export interface Extraction {
  findings: Finding[];
  /** Symptom ids the astronaut says are gone. */
  resolved: SymptomId[];
  /** True when the phrase is a general "I'm fine". */
  allGood: boolean;
}

/** Split into clauses so negation and side words only apply locally. */
function clauses(text: string, g: Grammar): string[] {
  return text
    .split(g.clauseBreak)
    .flatMap((c) => c.split(/,/))
    .map((c) => c.trim())
    .filter(Boolean);
}

function clampSeverity(n: number): Severity {
  return Math.min(3, Math.max(1, n)) as Severity;
}

export function extractSymptoms(raw: string, locale: Locale, now = Date.now()): Extraction {
  const g = GRAMMAR[locale];
  const r = REFINERS[locale];
  const text = locale === "pt" ? repairTranscriptPt(normalize(raw)) : normalize(raw);
  const found = new Map<SymptomId, Finding>();
  const resolved = new Set<SymptomId>();

  const record = (f: Finding) => {
    const prev = found.get(f.id);
    if (!prev || prev.severity < f.severity) found.set(f.id, f);
  };

  for (const clause of clauses(text, g)) {
    const matched = RULES.flatMap((rule) => {
      const match = rule.patterns[locale].map((p) => clause.match(p)).find(Boolean);
      return match && match.index !== undefined ? [{ rule, index: match.index }] : [];
    });
    const resolvedHere = isResolved(clause, g);
    // A negated specific symptom ("headache without pain behind the eyes") must not hide the generic one.
    const superseded = new Set(matched.filter((m) => resolvedHere || !negatedBefore(clause, m.index, g)).flatMap((m) => m.rule.supersedes ?? []));

    for (const { rule, index } of matched) {
      if (superseded.has(rule.id)) continue;
      const side = sideOf(clause, g);

      // Refine generic findings into a more specific variant.
      let id = rule.id;
      if (id === "headache") id = headacheType(text, r) ?? id;
      else if (id === "abdominal_pain") id = abdomenZone(clause, side, r) ?? id;
      else if (id === "nausea" && r.motion.test(text)) id = "space_motion_sickness";
      const variant = VARIANTS[id];

      if (resolvedHere) {
        familyOf(id).forEach((x) => resolved.add(x));
        continue;
      }
      if (negatedBefore(clause, index, g)) continue;

      let severity = (variant && id !== rule.id ? variant.severity : rule.severity) as number;
      if (g.intensifiers.test(clause)) severity += 1;
      else if (g.softeners.test(clause)) severity -= 1;

      const regions =
        variant && id !== rule.id
          ? variant.regions
          : rule.regions === "joint"
            ? jointRegions(clause, side, r.armJoint, r.legJoint)
            : rule.regions === "extremity"
              ? jointRegions(clause, side, r.handWords, r.footWords)
            : rule.regions === "located"
              ? locatedRegions(clause, side, r)
            : Array.isArray(rule.regions)
              ? rule.regions
              : limbRegions(rule.regions.limb, side);

      record({
        id,
        regions,
        severity: clampSeverity(rule.redFlag ? 3 : severity),
        reportedAt: now,
        evidence: clause,
        ...(rule.redFlag ? { redFlag: rule.redFlag } : {}),
      });
    }
  }

  // A headache refined from another clause also covers the generic one.
  for (const id of found.keys()) {
    const parent = VARIANTS[id]?.parent;
    if (parent && parent !== id) found.delete(parent);
  }

  applyRedFlags(found, text, r);

  return {
    findings: [...found.values()],
    resolved: [...resolved],
    allGood: found.size === 0 && saysAllGood(text, g),
  };
}

/** A negation word in the few words before `index` ("sem dor", "no fever"), ignoring idioms like "não aguento mais". */
function negatedBefore(clause: string, index: number, g: Grammar): boolean {
  const before = clause.slice(Math.max(0, index - 24), index).replace(g.notNegation, " ");
  return g.negation.test(before);
}

/** "passou", "is gone": but not "não passou", "isn't better", "hasn't gone away". */
function isResolved(clause: string, g: Grammar): boolean {
  const m = clause.match(g.resolved);
  if (!m || m.index === undefined) return false;
  const lastWords = clause.slice(0, m.index).trim().split(" ").slice(-2).join(" ");
  return !g.negation.test(lastWords);
}

/** "estou bem", "I'm fine": but not "não estou bem", "I'm not feeling well". */
function saysAllGood(text: string, g: Grammar): boolean {
  const m = text.match(g.allGood);
  if (!m || m.index === undefined) return false;
  // Only a negation right before counts: "sem febre, estou bem" is still all good.
  return !new RegExp(`(?:${g.negation.source})\\s*$`).test(text.slice(0, m.index));
}

/** Combinations of findings that call for a specific protocol. */
function applyRedFlags(found: Map<SymptomId, Finding>, text: string, r: Refiners) {
  const flag = (f: Finding | undefined, redFlag: RedFlag, severity: Severity = 3) => {
    if (!f || f.redFlag) return;
    f.redFlag = redFlag;
    f.severity = Math.max(f.severity, severity) as Severity;
  };
  const first = (ids: SymptomId[]) => ids.map((id) => found.get(id)).find(Boolean);
  const fever = found.has("fever");

  // Self-harm language: always the top priority.
  if (r.crisis.test(text)) flag(found.get("low_mood"), "crisis");

  // Joint pain, itching, numbness, breathlessness or confusion around a
  // spacewalk or a pressure change: decompression sickness (nitrogen bubbles).
  if (r.eva.test(text)) {
    flag(
      first(["joint_pain", "skin_rash", "dyspnea", "confusion", "numbness", "hand_numbness", "foot_numbness", "vision"]),
      "decompression",
    );
  }

  // Confusion with headache, breathlessness, vision change or dizziness: low O₂ or high CO₂.
  const confused = found.get("confusion");
  if (confused && (first(HEAD_PAIN_FAMILY) || first(["dyspnea", "vision", "dizziness"]))) flag(confused, "hypoxia");

  // Nausea or vomiting after a solar event or radiation alarm.
  if (r.radiation.test(text)) flag(first(["nausea", "space_motion_sickness", "fatigue", "skin_rash"]), "radiation");

  // Pain after a fall or impact: bones lose 1–1.5% of density a month in microgravity.
  if (r.trauma.test(text)) {
    flag(
      first(["leg_pain", "arm_pain", "joint_pain", "hand_pain", "finger_pain", "foot_pain", "heel_pain", "toe_pain", "back_pain"]),
      "fracture",
      2,
    );
  }

  // Chest pain radiating to the left arm or shoulder.
  const chest = found.get("chest_pain");
  const arm = first(["arm_pain", "numbness", "hand_numbness", "hand_pain", "joint_pain"]);
  if (chest && arm?.regions.includes("leftArm")) flag(arm, "cardiac");
  // "dor no peito e no braço esquerdo": the arm clause has no pain word of its own.
  else if (chest && r.leftArm.test(text)) flag(chest, "cardiac");

  // Headache or a stiff neck with fever: rule out meningitis.
  const stiff = found.get("stiff_neck");
  const head = first(HEAD_PAIN_FAMILY);
  if (stiff && fever && head) {
    flag(stiff, "meningitis");
    flag(head, "meningitis");
  }

  // A board-hard belly or pain on release: peritoneal irritation.
  const belly = first(ABDOMEN_FAMILY);
  if (belly && r.rigidAbdomen.test(text)) flag(belly, "peritonitis");

  // Right lower quadrant (or pain around the navel) with fever or nausea: appendicitis.
  const appendix = first(["rlq_pain", "periumbilical_pain"]);
  if (appendix && (fever || found.has("nausea"))) flag(appendix, "appendicitis");

  // One swollen foot or ankle that is warm, red or with calf pain: deep vein thrombosis.
  const swollen = found.get("foot_swelling");
  if (swollen?.regions.length === 1 && (found.has("leg_pain") || r.inflamed.test(text))) flag(swollen, "dvt");

  // A swollen, red or hot toe: likely gout, more than a sore toe.
  const toe = found.get("toe_pain");
  if (toe && r.inflamed.test(text)) toe.severity = Math.max(toe.severity, 2) as Severity;

  // Fever with pain behind the eyes or in the joints: arbovirus (dengue, chikungunya).
  const arbo = first(["retro_orbital_pain", "joint_pain"]);
  if (fever && arbo) flag(arbo, "arbovirus", 2);
}

/** Merge a new extraction into the active findings list. */
export function mergeFindings(active: Finding[], ex: Extraction): Finding[] {
  const gone = new Set(ex.resolved.flatMap(familyOf));
  let next = active.filter((f) => !gone.has(f.id));
  if (ex.allGood) next = next.filter((f) => f.severity >= 3);
  for (const f of ex.findings) {
    // A specific variant replaces the generic finding ("dor de cabeça" -> "enxaqueca").
    const parent = VARIANTS[f.id]?.parent;
    next = next.filter((a) => a.id !== f.id && a.id !== parent);
    next.push(f);
  }
  return next.sort((a, b) => b.severity - a.severity || b.reportedAt - a.reportedAt);
}
