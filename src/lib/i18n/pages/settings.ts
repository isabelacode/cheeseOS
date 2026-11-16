import type { Locale } from "../locale";

type OrErrorCode = "auth" | "credits" | "model" | "rate" | "network" | "other";

export interface SettingsMessages {
  title: string;
  intro: string;
  profileLink: string;
  profileLinkHint: string;
  ai: {
    title: string;
    intro: string;
    inUse: string;
    noKeyFallback: (model: string) => string;
    noKeyLoading: string;
    noKeyRules: string;
    rulesOnly: string;
    activeFallback: string;
    allFailed: (models: string) => string;
    allFailedHint: string;
    fellBack: (failed: string, active: string) => string;
    browserFailedHint: string;
    browserLoadingHint: string;
    errorHints: Record<OrErrorCode, string>;
    modelsTitle: string;
    keyTitle: string;
    keySaved: string;
    keyMissing: string;
    saveKey: string;
    savedKey: string;
    removedKey: string;
    keyRequired: string;
    modelHint: string;
    useOpenRouter: string;
  };
  privacy: {
    title: string;
    voice: string;
    local: string;
    cloud: string;
    key: string;
  };
  language: { title: string; hint: string };
  voice: {
    title: string;
    howTo: [before: string, key: string, after: string];
    onDemand: string;
    status: string;
    stt: { idle: string; loading: (pct: number) => string; ready: string; error: string };
    failedHint: string;
    preload: string;
    mic: { denied: string; error: string };
    deviceGpu: string;
    deviceCpu: string;
  };
  demo: { title: string; label: string; hint: string; badge: string; badgeTitle: string };
  data: {
    title: string;
    intro: string;
    clearTitle: string;
    clearBody: string;
    clearConfirm: string;
    clearYes: string;
    cleared: string;
    deleteTitle: string;
    deleteBody: string;
    deleteConfirm: string;
    deleteYes: string;
  };
}

export const settingsMessages: Record<Locale, SettingsMessages> = {
  pt: {
    title: "Ajustes",
    intro: "Motor de IA, idioma, voz e os dados guardados neste aparelho.",
    profileLink: "Dados do tripulante",
    profileLinkHint: "Nome, corpo, alergias e medicações",
    ai: {
      title: "Motor de IA",
      intro: "Escolha quem escreve a orientação depois de cada relato. As regras locais funcionam sempre, mesmo com a IA desligada.",
      inUse: "Em uso agora",
      noKeyFallback: (m) => `Sem chave do OpenRouter salva: enquanto isso, a orientação usa o modelo no navegador (${m}).`,
      noKeyLoading: "Sem chave do OpenRouter salva: a orientação usa só as regras locais até o modelo no navegador terminar de carregar.",
      noKeyRules: "Sem chave do OpenRouter salva: a orientação está usando só as regras locais até um modelo carregar.",
      rulesOnly: "A orientação está usando só as regras locais até um modelo carregar.",
      activeFallback: "Em uso agora (alternativa automática)",
      allFailed: (m) => `Nenhum modelo no navegador carregou neste aparelho (${m})`,
      allFailedHint: "Use o OpenRouter ou recarregue a página para tentar de novo.",
      fellBack: (f, a) => `${f} não carregou neste aparelho. Trocado automaticamente para ${a}.`,
      browserFailedHint: "Tente um modelo menor abaixo ou use o OpenRouter. Recarregar a página tenta de novo.",
      browserLoadingHint: "O download acontece uma vez; depois o modelo fica em cache e funciona sem internet.",
      errorHints: {
        auth: "Confira a chave abaixo ou crie uma nova no OpenRouter.",
        credits: "Adicione créditos na sua conta do OpenRouter ou troque para o modelo no navegador.",
        model: "Escolha outro modelo abaixo.",
        rate: "Aguarde um minuto e faça um novo relato.",
        network: "Verifique a conexão. Sem internet, use o modelo no navegador.",
        other: "Tente outro modelo ou troque de motor.",
      },
      modelsTitle: "Modelo no navegador",
      keyTitle: "OpenRouter",
      keySaved: "Chave salva neste navegador.",
      keyMissing: "Nenhuma chave salva.",
      saveKey: "Salvar e usar o OpenRouter",
      savedKey: "Chave salva. O OpenRouter está em uso.",
      removedKey: "Chave removida deste navegador.",
      keyRequired: "Cole a sua chave do OpenRouter.",
      modelHint: "Só modelos de código aberto (Apache 2.0), em servidores dos EUA ou da Europa.",
      useOpenRouter: "Usar o OpenRouter",
    },
    privacy: {
      title: "O que sai do aparelho",
      voice: "O áudio da voz é transcrito neste aparelho e nunca sai dele.",
      local: "Com “Neste aparelho” ou “Desligada”, nada sai do aparelho.",
      cloud: "Com OpenRouter, o texto do relato, os sinais vitais e o seu perfil (nome, idade, alergias, medicações e condições) vão para o OpenRouter e para o provedor do modelo escolhido.",
      key: "A chave fica salva só neste navegador e vai direto para o OpenRouter, sem passar por nenhum servidor nosso.",
    },
    language: { title: "Idioma", hint: "Muda a interface, as orientações e a transcrição da voz." },
    voice: {
      title: "Voz",
      howTo: ["Toque no botão do microfone no topo da tela ou aperte ", "Espaço", " (fora de campos de texto) para ligar e desligar a escuta. Fale normalmente: cada frase vira um relato."],
      onDemand: "A transcrição roda neste aparelho com o Whisper, que só é baixado na primeira vez que você liga a escuta.",
      status: "Whisper",
      stt: { idle: "ainda não baixado", loading: (p) => `baixando · ${p}%`, ready: "pronto", error: "não carregou" },
      failedHint: "Recarregue a página e tente de novo. Enquanto isso, digite os relatos.",
      preload: "Baixar agora",
      mic: {
        denied: "O navegador bloqueou o microfone. Libere o acesso nas permissões do site e tente de novo.",
        error: "Não foi possível abrir o microfone. Confira se outro app está usando e tente de novo.",
      },
      deviceGpu: "na GPU",
      deviceCpu: "na CPU",
    },
    demo: {
      title: "Demonstração",
      label: "Modo demo (sinais mais rápidos)",
      hint: "Os sinais simulados pioram e voltam à faixa normal em cerca de 5 segundos, em vez de minutos. Útil para apresentações curtas; deixe desligado no uso normal.",
      badge: "Demo",
      badgeTitle: "Modo demo ligado: sinais simulados acelerados. Desligue em Ajustes.",
    },
    data: {
      title: "Dados e privacidade",
      intro: "Tudo fica guardado só neste navegador.",
      clearTitle: "Limpar sessão",
      clearBody: "Apaga os sintomas ativos e o diário de relatos. O perfil e os ajustes continuam.",
      clearConfirm: "Apagar sintomas e diário?",
      clearYes: "Sim, limpar",
      cleared: "Sessão limpa.",
      deleteTitle: "Apagar perfil e dados deste aparelho",
      deleteBody: "Remove o perfil, a sessão, a chave do OpenRouter e as escolhas de IA. O app volta para o cadastro inicial.",
      deleteConfirm: "Isso apaga tudo deste aparelho e não pode ser desfeito.",
      deleteYes: "Apagar tudo",
    },
  },
  en: {
    title: "Settings",
    intro: "AI engine, language, voice and the data kept on this device.",
    profileLink: "Crew member data",
    profileLinkHint: "Name, body, allergies and medications",
    ai: {
      title: "AI engine",
      intro: "Choose who writes the advice after each report. The local rules always work, even with AI off.",
      inUse: "In use now",
      noKeyFallback: (m) => `No OpenRouter key saved: meanwhile, advice uses the in-browser model (${m}).`,
      noKeyLoading: "No OpenRouter key saved: advice uses local rules only until the in-browser model finishes loading.",
      noKeyRules: "No OpenRouter key saved: advice is using local rules only until a model loads.",
      rulesOnly: "Advice is using local rules only until a model loads.",
      activeFallback: "In use now (automatic fallback)",
      allFailed: (m) => `No in-browser model could load on this device (${m})`,
      allFailedHint: "Use OpenRouter or reload the page to try again.",
      fellBack: (f, a) => `${f} couldn't load on this device. Switched automatically to ${a}.`,
      browserFailedHint: "Try a smaller model below or use OpenRouter. Reloading the page tries again.",
      browserLoadingHint: "It downloads once; after that the model is cached and works offline.",
      errorHints: {
        auth: "Check the key below or create a new one on OpenRouter.",
        credits: "Add credits to your OpenRouter account or switch to the in-browser model.",
        model: "Choose another model below.",
        rate: "Wait a minute and send a new report.",
        network: "Check the connection. Offline, use the in-browser model.",
        other: "Try another model or switch engines.",
      },
      modelsTitle: "In-browser model",
      keyTitle: "OpenRouter",
      keySaved: "Key saved in this browser.",
      keyMissing: "No key saved.",
      saveKey: "Save and use OpenRouter",
      savedKey: "Key saved. OpenRouter is in use.",
      removedKey: "Key removed from this browser.",
      keyRequired: "Paste your OpenRouter key.",
      modelHint: "Open-source models only (Apache 2.0), on US or EU servers.",
      useOpenRouter: "Use OpenRouter",
    },
    privacy: {
      title: "What leaves the device",
      voice: "Voice audio is transcribed on this device and never leaves it.",
      local: "With “On this device” or “Off”, nothing leaves the device.",
      cloud: "With OpenRouter, the report text, the vitals and your profile (name, age, allergies, medications and conditions) go to OpenRouter and to the chosen model's provider.",
      key: "The key is stored only in this browser and goes straight to OpenRouter, never through a server of ours.",
    },
    language: { title: "Language", hint: "Changes the interface, the advice and voice transcription." },
    voice: {
      title: "Voice",
      howTo: ["Tap the microphone button at the top of the screen or press ", "Space", " (outside text fields) to turn listening on and off. Speak normally: each sentence becomes a report."],
      onDemand: "Transcription runs on this device with Whisper, which is only downloaded the first time you turn listening on.",
      status: "Whisper",
      stt: { idle: "not downloaded yet", loading: (p) => `downloading · ${p}%`, ready: "ready", error: "failed to load" },
      failedHint: "Reload the page and try again. Meanwhile, type your reports.",
      preload: "Download now",
      mic: {
        denied: "The browser blocked the microphone. Allow access in the site permissions and try again.",
        error: "Couldn't open the microphone. Check whether another app is using it and try again.",
      },
      deviceGpu: "on GPU",
      deviceCpu: "on CPU",
    },
    demo: {
      title: "Demonstration",
      label: "Demo mode (faster vitals)",
      hint: "Simulated vitals worsen and return to the normal range in about 5 seconds instead of minutes. Useful for short presentations; keep it off in normal use.",
      badge: "Demo",
      badgeTitle: "Demo mode on: simulated vitals are sped up. Turn it off in Settings.",
    },
    data: {
      title: "Data and privacy",
      intro: "Everything is stored only in this browser.",
      clearTitle: "Clear session",
      clearBody: "Deletes active symptoms and the report log. Profile and settings stay.",
      clearConfirm: "Delete symptoms and log?",
      clearYes: "Yes, clear",
      cleared: "Session cleared.",
      deleteTitle: "Delete profile and data from this device",
      deleteBody: "Removes the profile, the session, the OpenRouter key and the AI choices. The app returns to first-run setup.",
      deleteConfirm: "This deletes everything from this device and can't be undone.",
      deleteYes: "Delete everything",
    },
  },
};
