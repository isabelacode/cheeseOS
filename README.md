<div align="center">

<img src="public/brand/mascot.webp" alt="Mascote do cheeseOS" width="140" />

# cheeseOS

**O gêmeo digital de saúde que continua funcionando quando a Terra fica em silêncio.**

Next.js 16 · React 19 · Three.js · transformers.js · Tailwind CSS 4

</div>

Em Marte, uma mensagem até a Terra pode levar 22 minutos. Se um tripulante passa mal, não há médico para chamar.

O cheeseOS é um app de saúde para tripulações em missões de longa duração. O astronauta conta, por voz ou texto, como está se sentindo. O app reconhece os sintomas no próprio aparelho, acende a região afetada em um gêmeo 3D, mostra o protocolo de bordo, explica a relação de cada sintoma com os riscos do Programa de Pesquisa Humana da NASA e mantém um diário pronto para o médico de voo.

> [!IMPORTANT]
> Ferramenta de apoio e demonstração. Não substitui avaliação médica nem o médico de voo. Os sinais vitais exibidos são **simulados**.

## Sumário

- [Como funciona](#como-funciona)
- [Funcionalidades](#funcionalidades)
- [Começando](#começando)
- [Inteligência artificial](#inteligência-artificial)
- [Privacidade](#privacidade)
- [Arquitetura](#arquitetura)
- [Testes](#testes)
- [Vídeo de apresentação](#vídeo-de-apresentação)
- [Fontes](#fontes)

## Como funciona

| Passo | O que acontece |
| --- | --- |
| **1. Falar** | O tripulante descreve o que sente, por voz (microfone sempre ativo, com detecção de fala) ou por texto. |
| **2. Ver** | Os sintomas reconhecidos acendem a região correspondente no gêmeo 3D. |
| **3. Comparar** | Os sinais vitais são comparados com as faixas de referência e com o próprio padrão do tripulante. |
| **4. Agir** | O app mostra os próximos passos do protocolo de bordo, sem depender de conexão. |

O princípio central é **regras locais primeiro**. O reconhecimento de sintomas, os sinais de alerta (cardíaco, descompressão, hipóxia, radiação e outros), o cruzamento com as alergias do perfil e o banner crítico rodam no aparelho, na hora e sem IA. A IA só complementa a resposta e nunca é necessária para a segurança.

## Funcionalidades

- **Relato por voz ou texto.** A transcrição é feita no aparelho com o Whisper, em português e em inglês.
- **Gêmeo 3D.** Um modelo do corpo dividido em sete regiões (cabeça, tronco, abdômen, braços e pernas), com mapa de calor conforme a gravidade dos sintomas.
- **Alertas de segurança.** Sinais de alerta e combinações perigosas de sintomas geram um banner crítico. Medicamentos que conflitam com as alergias do perfil são barrados.
- **Riscos da NASA (RIDGE).** Radiação, isolamento, distância da Terra, gravidade e ambiente hostil ou fechado. Cada sintoma tem um "Por que no espaço?", e a página Ciência reúne explicações, contramedidas e fontes.
- **Sinais vitais.** Gráficos com faixas de alerta. Os valores são simulados e reagem aos sintomas: a febre aparece na hora, e os sinais se recuperam aos poucos quando o sintoma passa.
- **Rotina.** Missões diárias (check-in, revisão dos sinais, exercício e hidratação), sequência de check-ins e lembretes locais configuráveis.
- **Relatório.** Exportação em texto ou em HTML imprimível, com alertas de segurança, sintomas ativos e protocolo, evolução dos sintomas, sinais vitais da última hora e o diário completo.
- **Dois idiomas.** Interface em português e em inglês, com troca a qualquer momento.
- **Modo demonstração.** Acelera a simulação para que os sinais piorem e se recuperem em segundos, o que ajuda em apresentações curtas. Fica em Ajustes.

### Real e simulado

| Item | Origem |
| --- | --- |
| Sinais vitais do tripulante | Simulados pelo gêmeo digital |
| Faixas de alerta dos sinais vitais | Valores publicados, com link para a fonte |
| Limites citados (por exemplo, 600 mSv de dose de carreira e perda óssea de 1% a 1,5% ao mês) | Valores publicados, com link para a fonte |
| Reconhecimento de sintomas e protocolos | Regras locais escritas para o projeto |

## Começando

É preciso ter o Node.js 20.9 ou mais recente.

```bash
git clone git@github.com:isabelacode/cheeseOS.git
cd cheeseOS
npm install
npm run dev
```

Abra <http://localhost:3000>. Na primeira visita, o app pede o perfil do tripulante.

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Sobe o servidor de desenvolvimento |
| `npm run build` | Gera a versão de produção |
| `npm start` | Serve a versão de produção |
| `npm test` | Roda os testes com o Vitest |
| `npm run lint` | Roda o ESLint |

O projeto não usa variáveis de ambiente. A chave do OpenRouter, quando usada, é informada pelo próprio usuário na tela de Ajustes.

> [!NOTE]
> O microfone exige um contexto seguro: `localhost` ou HTTPS. Para a IA no navegador, um navegador com WebGPU é mais rápido. Sem WebGPU, os modelos rodam em WebAssembly, na CPU.

## Inteligência artificial

A transcrição de voz sempre roda no aparelho, com o `whisper-small`. Para o texto de apoio, há três opções em Ajustes:

| Motor | Onde roda | Observações |
| --- | --- | --- |
| **Navegador** (padrão) | No aparelho, em um Web Worker | Funciona offline depois do primeiro download |
| **OpenRouter** | Na nuvem | Usa a chave do próprio usuário. O modelo padrão é o `google/gemma-3-27b-it` |
| **Desligado** | — | Só as regras locais |

Modelos disponíveis no navegador:

| Modelo | Download com WebGPU | Download na CPU |
| --- | --- | --- |
| Gemma 3 1B (padrão) | 730 MB | 820 MB |
| Qwen 2.5 0.5B | 460 MB | 750 MB |
| Qwen 2.5 1.5B | 1,17 GB | 1,7 GB |

Se um modelo não carregar no aparelho, o app tenta os menores em seguida. Se a resposta local demorar mais de 30 segundos, ela é descartada e as regras locais valem sozinhas.

Toda resposta de IA passa por um filtro antes de aparecer. Respostas que só repetem o relato ou que citam um medicamento presente nas alergias do tripulante são descartadas.

## Privacidade

Perfil, diário, rotina e preferências ficam no `localStorage` do navegador. Não há backend nem banco de dados.

Nada sai do aparelho, com uma exceção: se o OpenRouter for escolhido como motor de IA, o relato é enviado do navegador direto para o OpenRouter. A chave fica guardada só no navegador do usuário. A barra superior mostra o tempo todo se a IA está local, na nuvem ou desligada.

## Arquitetura

```
src/
├── app/            Rotas (App Router)
├── components/     Interface, organizada por área (views, twin, vitals, log…)
├── hooks/          useLocalAi (motores de IA) e useVoiceListener (microfone e VAD)
├── lib/
│   ├── health/     Sintomas, alertas de segurança, medicamentos, sinais vitais e prompt
│   ├── science/    Riscos da NASA, contramedidas e fontes
│   ├── routine/    Missões diárias, sequência e lembretes
│   ├── session/    Estado da sessão e persistência
│   ├── crew/       Perfil do tripulante
│   ├── llm/        Modelos do navegador e cliente do OpenRouter
│   └── i18n/       Textos em português e em inglês
└── workers/        Web Worker que roda o Whisper e o LLM
assets/             Fonte do modelo 3D (Blender)
public/twin/        Modelo 3D exportado (GLB)
video/              Vídeo de apresentação (HyperFrames)
```

| Rota | Tela |
| --- | --- |
| `/` | Agora: relato, alertas, protocolo e missões do dia |
| `/sinais` | Sinais vitais |
| `/relatos` | Diário e linha do tempo dos sintomas |
| `/corpo` | Gêmeo 3D e detalhes por região |
| `/ciencia` | Riscos da NASA, contramedidas e fontes |
| `/perfil` | Perfil do tripulante |
| `/ajustes` | Motor de IA, idioma, lembretes, modo demonstração e dados |

A lógica de saúde em `src/lib/health/` é feita de funções puras, sem dependência do React. É por isso que ela roda igual no app, no Web Worker e nos testes.

> [!NOTE]
> O projeto usa o Next.js 16, que tem mudanças incompatíveis com versões anteriores. Antes de mexer em código do framework, consulte os guias em `node_modules/next/dist/docs/`, como pede o [AGENTS.md](AGENTS.md).

## Testes

```bash
npm test
```

São 133 testes em 12 arquivos, que cobrem o reconhecimento de sintomas, os alertas de segurança, as alergias, o filtro de respostas da IA, os sinais vitais, a rotina (inclusive horário de verão), a persistência da sessão, a detecção de fala, o cliente do OpenRouter e as traduções.

## Vídeo de apresentação

A pasta [video/](video/) contém o vídeo de 30 segundos do projeto, feito com o HyperFrames. O roteiro está em [video/ROTEIRO.md](video/ROTEIRO.md).

```bash
cd video
npm run dev      # pré-visualização
npm run render   # renderização
```

## Fontes

- NASA HRP: [5 Hazards of Human Spaceflight](https://www.nasa.gov/hrp/hazards/)
- NASA: [The Human Body in Space](https://www.nasa.gov/humans-in-space/the-human-body-in-space/)
- NASA HRP: [Human Research Roadmap](https://humanresearchroadmap.nasa.gov/) e [Evidence Report: SANS](https://humanresearchroadmap.nasa.gov/evidence/reports/SANS%20EB%202022%20FINAL_8-15-22.pdf)
- NASA OCHMO: [NASA-STD-3001 Vol. 1 Rev. C](https://standards.nasa.gov/sites/default/files/standards/NASA/C/nasa-std-3001-vol-1-rev-c-signature.pdf) e [Technical Brief: Radiation Protection](https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-020-radiation-protection.pdf)
- NIH MedlinePlus: [Vital signs](https://medlineplus.gov/ency/article/002341.htm) e [Pulse Oximetry](https://medlineplus.gov/lab-tests/pulse-oximetry/)

---

<div align="center">

Feito pelo time **Code and Cheese**.

</div>
