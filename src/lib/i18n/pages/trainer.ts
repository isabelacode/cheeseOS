import type { Locale } from "../locale";
import type { ExerciseId, ExerciseKind } from "@/lib/exercise/exercises";

export interface TrainerMessages {
  title: string;
  intro: string;
  week: (reps: number, sets: number) => string;
  weekEmpty: string;
  /** Days with the exercise countermeasure done, against the ISS schedule. */
  days: (n: number) => string;
  daysGoal: string;
  listTitle: string;
  orderHint: string;
  least: string;
  never: string;
  last: (when: string) => string;
  reps7: (n: number) => string;
  target: (n: number) => string;
  kind: Record<ExerciseKind, string>;
  start: (name: string) => string;
  exercises: Record<ExerciseId, { name: string; muscles: string; setup: string; fuller: string; steps: [string, string, string] }>;
  manual: { label: string; done: string; hint: string };
  critical: string;
  privacy: string;
  why: string;
  tutorial: { title: string; demo: (name: string) => string; begin: string };
  session: {
    close: string;
    finish: string;
    counter: (n: number, target: number) => string;
    of: (target: number) => string;
    requesting: string;
    loading: string;
    denied: string;
    nocamera: string;
    error: string;
    frame: string;
    ready: string;
    good: string;
    slower: string;
    targetHit: string;
    addRep: string;
    byHand: string;
  };
  summary: {
    title: string;
    reps: string;
    form: string;
    formValue: (good: number, total: number) => string;
    tempo: string;
    tempoValue: (seconds: string) => string;
    saved: string;
    none: string;
    again: string;
    list: string;
    next: (name: string) => string;
  };
}

const pt: TrainerMessages = {
  title: "Treino",
  intro: "A câmera acompanha o movimento e conta as repetições. Tudo roda neste aparelho.",
  week: (r, s) => `${r} ${r === 1 ? "repetição" : "repetições"} em ${s} ${s === 1 ? "série" : "séries"} nos últimos 7 dias`,
  weekEmpty: "Nenhum treino registrado nos últimos 7 dias.",
  days: (n) => `Exercício em ${n} dos últimos 7 dias`,
  daysGoal: "Na ISS, a tripulação treina de 6 a 7 dias por semana.",
  listTitle: "Exercícios",
  orderHint: "Em ordem: primeiro os que você fez menos nos últimos 7 dias.",
  least: "Fez menos",
  never: "Ainda não feito",
  last: (w) => `último: ${w}`,
  reps7: (n) => `${n} ${n === 1 ? "repetição" : "repetições"} em 7 dias`,
  target: (n) => `Série de ${n}`,
  kind: { resistive: "Resistido", aerobic: "Aeróbico" },
  start: (n) => `Começar ${n} com a câmera`,
  exercises: {
    squat: { name: "Agachamento", muscles: "Pernas e glúteos", setup: "Fique de frente, com o corpo inteiro no quadro.", fuller: "Desça mais", steps: ["Pés na largura dos ombros, braços à frente.", "Desça como quem senta numa cadeira, joelhos na direção dos pés.", "Suba devagar até ficar em pé."] },
    deadlift: { name: "Levantamento terra", muscles: "Costas, glúteos e posteriores", setup: "Fique de lado para a câmera e incline o tronco com a coluna reta.", fuller: "Incline mais o tronco", steps: ["Pés na largura do quadril, joelhos levemente soltos.", "Leve o quadril para trás e incline o tronco, com a coluna reta.", "Volte a ficar em pé apertando os glúteos."] },
    lunge: { name: "Afundo", muscles: "Pernas e glúteos, um lado por vez", setup: "Fique de lado para a câmera e alterne as pernas.", fuller: "Desça mais o joelho", steps: ["Em pé, leve uma perna para trás.", "Desça até o joelho de trás quase tocar o chão.", "Volte e troque de perna."] },
    press: { name: "Desenvolvimento", muscles: "Ombros e braços", setup: "Fique de frente; quadris e braços precisam aparecer.", fuller: "Estenda os braços até o alto", steps: ["Cotovelos na altura dos ombros, mãos para cima.", "Empurre até estender os braços acima da cabeça.", "Desça com controle até a posição inicial."] },
    curl: { name: "Rosca de bíceps", muscles: "Braços", setup: "Fique de frente, com os braços ao lado do corpo.", fuller: "Suba mais as mãos", steps: ["Braços ao lado do corpo, cotovelos parados.", "Dobre os cotovelos e leve as mãos até os ombros.", "Desça devagar até estender os braços."] },
    highKnees: { name: "Corrida no lugar", muscles: "Coração, pulmões e pernas", setup: "Fique de frente e suba um joelho de cada vez.", fuller: "Suba mais o joelho", steps: ["Em pé, tronco reto.", "Suba um joelho até a altura do quadril.", "Troque de perna em ritmo de corrida, balançando os braços."] },
  },
  manual: {
    label: "Treinei sem a câmera",
    done: "Contramedida de exercício feita hoje",
    hint: "Usou o equipamento da nave? Marque a missão do dia por aqui.",
  },
  critical: "Estado crítico: treino suspenso. Interrompa a atividade e siga a orientação da tela Agora.",
  privacy: "O vídeo é analisado neste aparelho. Nada é gravado nem enviado.",
  why: "Por que no espaço? Sem gravidade, os ossos perdem de 1% a 1,5% de densidade por mês e os músculos atrofiam. A contramedida na ISS é 1,5 h por dia de exercício resistido e aeróbico, 6 a 7 dias por semana. A câmera mede movimento e amplitude, não carga nem densidade óssea.",
  tutorial: { title: "Como fazer", demo: (n) => `Animação do gêmeo fazendo ${n}`, begin: "Começar" },
  session: {
    close: "Fechar treino",
    finish: "Terminar",
    counter: (n, t) => `${n} de ${t} repetições`,
    of: (t) => `de ${t}`,
    requesting: "Permita o acesso à câmera para começar.",
    loading: "Preparando o detector de movimento…",
    denied: "Câmera bloqueada. Libere o acesso nas permissões do navegador ou conte à mão.",
    nocamera: "Nenhuma câmera encontrada. Você ainda pode contar à mão.",
    error: "O detector de movimento não carregou. Você ainda pode contar à mão.",
    frame: "Afaste-se até a câmera ver o movimento inteiro",
    ready: "Pode começar",
    good: "Boa repetição",
    slower: "Mais devagar: controle a volta",
    targetHit: "Série completa",
    addRep: "Somar uma repetição",
    byHand: "Contagem à mão",
  },
  summary: {
    title: "Série registrada",
    reps: "Repetições",
    form: "Amplitude completa",
    formValue: (g, t) => `${g} de ${t}`,
    tempo: "Ritmo médio",
    tempoValue: (s) => `${s} s por repetição`,
    saved: "A missão de exercício de hoje foi marcada.",
    none: "Nenhuma repetição contada, então nada foi registrado.",
    again: "Mais uma série",
    list: "Voltar aos exercícios",
    next: (n) => `Próximo: ${n}`,
  },
};

const en: TrainerMessages = {
  title: "Training",
  intro: "The camera follows the movement and counts the repetitions. Everything runs on this device.",
  week: (r, s) => `${r} ${r === 1 ? "repetition" : "repetitions"} in ${s} ${s === 1 ? "set" : "sets"} over the last 7 days`,
  weekEmpty: "No training recorded in the last 7 days.",
  days: (n) => `Exercise on ${n} of the last 7 days`,
  daysGoal: "On the ISS, the crew trains 6 to 7 days a week.",
  listTitle: "Exercises",
  orderHint: "In order: the ones you did least in the last 7 days come first.",
  least: "Done least",
  never: "Not done yet",
  last: (w) => `last: ${w}`,
  reps7: (n) => `${n} ${n === 1 ? "repetition" : "repetitions"} in 7 days`,
  target: (n) => `Set of ${n}`,
  kind: { resistive: "Resistive", aerobic: "Aerobic" },
  start: (n) => `Start ${n} with the camera`,
  exercises: {
    squat: { name: "Squat", muscles: "Legs and glutes", setup: "Face the camera with your whole body in frame.", fuller: "Go lower", steps: ["Feet shoulder-width apart, arms in front.", "Lower as if sitting on a chair, knees in line with the feet.", "Rise slowly until you stand tall."] },
    deadlift: { name: "Deadlift", muscles: "Back, glutes and hamstrings", setup: "Stand side-on to the camera and hinge forward with a straight back.", fuller: "Hinge further forward", steps: ["Feet hip-width apart, knees slightly soft.", "Push the hips back and hinge forward with a straight back.", "Stand back up, squeezing the glutes."] },
    lunge: { name: "Lunge", muscles: "Legs and glutes, one side at a time", setup: "Stand side-on to the camera and alternate legs.", fuller: "Lower the knee further", steps: ["Standing, take one leg back.", "Lower until the back knee almost touches the floor.", "Come back up and switch legs."] },
    press: { name: "Shoulder press", muscles: "Shoulders and arms", setup: "Face the camera; hips and arms need to be in frame.", fuller: "Reach all the way up", steps: ["Elbows at shoulder height, hands up.", "Push until the arms are straight overhead.", "Lower with control to the start."] },
    curl: { name: "Biceps curl", muscles: "Arms", setup: "Face the camera with your arms by your sides.", fuller: "Bring the hands higher", steps: ["Arms by your sides, elbows still.", "Bend the elbows and bring the hands to the shoulders.", "Lower slowly until the arms are straight."] },
    highKnees: { name: "Running in place", muscles: "Heart, lungs and legs", setup: "Face the camera and lift one knee at a time.", fuller: "Lift the knee higher", steps: ["Stand tall.", "Lift one knee to hip height.", "Switch legs at a running pace, swinging the arms."] },
  },
  manual: {
    label: "I trained without the camera",
    done: "Exercise countermeasure done today",
    hint: "Used the onboard equipment? Mark today's mission here.",
  },
  critical: "Critical state: training suspended. Stop the activity and follow the guidance on the Now screen.",
  privacy: "The video is analysed on this device. Nothing is recorded or sent.",
  why: "Why in space? Without gravity, bones lose 1% to 1.5% of density per month and muscles atrophy. The countermeasure on the ISS is 1.5 h a day of resistive and aerobic exercise, 6 to 7 days a week. The camera measures movement and range, not load or bone density.",
  tutorial: { title: "How to do it", demo: (n) => `Animation of the twin doing ${n}`, begin: "Begin" },
  session: {
    close: "Close training",
    finish: "Finish",
    counter: (n, t) => `${n} of ${t} repetitions`,
    of: (t) => `of ${t}`,
    requesting: "Allow camera access to begin.",
    loading: "Preparing the motion detector…",
    denied: "Camera blocked. Allow access in the browser permissions or count by hand.",
    nocamera: "No camera found. You can still count by hand.",
    error: "The motion detector did not load. You can still count by hand.",
    frame: "Step back until the camera sees the whole movement",
    ready: "Ready when you are",
    good: "Good repetition",
    slower: "Slower: control the way back",
    targetHit: "Set complete",
    addRep: "Add one repetition",
    byHand: "Counting by hand",
  },
  summary: {
    title: "Set recorded",
    reps: "Repetitions",
    form: "Full range",
    formValue: (g, t) => `${g} of ${t}`,
    tempo: "Average pace",
    tempoValue: (s) => `${s} s per repetition`,
    saved: "Today's exercise mission is marked.",
    none: "No repetitions counted, so nothing was recorded.",
    again: "One more set",
    list: "Back to the exercises",
    next: (n) => `Next: ${n}`,
  },
};

export const trainerMessages: Record<Locale, TrainerMessages> = { pt, en };
