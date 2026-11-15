<div align="center">

<img src="public/brand/mascot.webp" alt="cheeseOS mascot" width="140" />

# CheeseOS

**The health twin that keeps working when Earth goes quiet.**

Next.js 16 · React 19 · Three.js · transformers.js · Tailwind CSS 4

</div>

On Mars, a message to Earth can take 22 minutes. If a crew member gets sick, there is no doctor to call.

cheeseOS is a health app for crews on long-duration missions. The astronaut says or types how they feel. The app recognizes the symptoms on the device itself, lights up the affected region on a 3D twin, shows the onboard protocol, explains how each symptom relates to the hazards of NASA's Human Research Program, and keeps a log ready for the flight surgeon.

> [!IMPORTANT]
> Support and demonstration tool. It does not replace medical evaluation or the flight surgeon. The vital signs shown are **simulated**.

## Contents

- [How it works](#how-it-works)
- [Features](#features)
- [Getting started](#getting-started)
- [Artificial intelligence](#artificial-intelligence)
- [Privacy](#privacy)
- [Architecture](#architecture)
- [Tests](#tests)
- [Pitch video](#pitch-video)
- [Sources](#sources)

## How it works

| Step | What happens |
| --- | --- |
| **1. Speak** | The crew member describes how they feel, by voice (always-on microphone with speech detection) or by text. |
| **2. See** | The recognized symptoms light up the matching region on the 3D twin. |
| **3. Compare** | Vital signs are compared with the reference ranges and with the crew member's own baseline. |
| **4. Act** | The app shows the next steps of the onboard protocol, with no connection needed. |

The core principle is **local rules first**. Symptom recognition, red flags (cardiac, decompression, hypoxia, radiation and others), the cross-check against the allergies in the profile, and the critical banner all run on the device, instantly and without AI. The AI only complements the answer and is never required for safety.

## Features

- **Voice or text reports.** Transcription runs on the device with Whisper, in Portuguese and in English.
- **3D twin.** A body model split into seven regions (head, torso, abdomen, arms and legs), with a heat map that follows symptom severity.
- **Safety alerts.** Red flags and dangerous symptom combinations raise a critical banner. Medications that conflict with the allergies in the profile are blocked.
- **NASA hazards (RIDGE).** Radiation, isolation, distance from Earth, gravity, and hostile or closed environments. Each symptom has a "Why in space?" note, and the Science page gathers explanations, countermeasures and sources.
- **Vital signs.** Charts with alert ranges. The values are simulated and react to symptoms: a fever shows up right away, and the signs recover gradually once the symptom is gone.
- **Routine.** Daily missions (check-in, vitals review, exercise and hydration), a check-in streak, and configurable local reminders.
- **Report.** Export as text or as printable HTML, with safety alerts, active symptoms and protocol, symptom history, vital signs from the last hour, and the full log.
- **Two languages.** Interface in Portuguese and in English, switchable at any time.
- **Demo mode.** Speeds up the simulation so the signs worsen and recover in seconds, which helps in short presentations. It lives in Settings.

### Real and simulated

| Item | Origin |
| --- | --- |
| The crew member's vital signs | Simulated by the digital twin |
| Alert ranges for vital signs | Published values, with a link to the source |
| Limits cited (for example, a 600 mSv career dose and bone loss of 1% to 1.5% per month) | Published values, with a link to the source |
| Symptom recognition and protocols | Local rules written for this project |

## Getting started

You need Node.js 20.9 or newer.

```bash
git clone git@github.com:isabelacode/cheeseOS.git
cd cheeseOS
npm install
npm run dev
```

Open <http://localhost:3000>. On the first visit, the app asks for the crew member's profile.

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts the development server |
| `npm run build` | Builds the production version |
| `npm start` | Serves the production version |
| `npm test` | Runs the tests with Vitest |
| `npm run lint` | Runs ESLint |

The project uses no environment variables. The OpenRouter key, when used, is entered by the user on the Settings screen.

> [!NOTE]
> The microphone requires a secure context: `localhost` or HTTPS. For in-browser AI, a browser with WebGPU is faster. Without WebGPU, the models run in WebAssembly, on the CPU.

## Artificial intelligence

Speech transcription always runs on the device, with `whisper-small`. For the supporting text, Settings offers three options:

| Engine | Where it runs | Notes |
| --- | --- | --- |
| **Browser** (default) | On the device, in a Web Worker | Works offline after the first download |
| **OpenRouter** | In the cloud | Uses the user's own key. The default model is `google/gemma-3-27b-it` |
| **Off** | — | Local rules only |

Models available in the browser:

| Model | Download with WebGPU | Download on CPU |
| --- | --- | --- |
| Gemma 3 1B (default) | 730 MB | 820 MB |
| Qwen 2.5 0.5B | 460 MB | 750 MB |
| Qwen 2.5 1.5B | 1.17 GB | 1.7 GB |

If a model fails to load on the device, the app tries the smaller ones next. If the local answer takes longer than 30 seconds, it is dropped and the local rules stand alone.

Every AI answer goes through a filter before it is shown. Answers that only repeat the report, or that mention a medication listed in the crew member's allergies, are discarded.

## Privacy

Profile, log, routine and preferences are kept in the browser's `localStorage`. There is no backend and no database.

Nothing leaves the device, with one exception: if OpenRouter is chosen as the AI engine, the report is sent from the browser straight to OpenRouter. The key is stored only in the user's browser. The top bar always shows whether the AI is local, in the cloud, or off.

## Architecture

```
src/
├── app/            Routes (App Router)
├── components/     Interface, organized by area (views, twin, vitals, log…)
├── hooks/          useLocalAi (AI engines) and useVoiceListener (microphone and VAD)
├── lib/
│   ├── health/     Symptoms, safety alerts, medications, vital signs and prompt
│   ├── science/    NASA hazards, countermeasures and sources
│   ├── routine/    Daily missions, streak and reminders
│   ├── session/    Session state and persistence
│   ├── crew/       Crew member profile
│   ├── llm/        Browser models and OpenRouter client
│   └── i18n/       Portuguese and English copy
└── workers/        Web Worker that runs Whisper and the LLM
assets/             3D model source (Blender)
public/twin/        Exported 3D model (GLB)
video/              Pitch video (HyperFrames)
```

| Route | Screen |
| --- | --- |
| `/` | Now: report, alerts, protocol and the day's missions |
| `/sinais` | Vital signs |
| `/relatos` | Log and symptom timeline |
| `/corpo` | 3D twin and per-region details |
| `/ciencia` | NASA hazards, countermeasures and sources |
| `/perfil` | Crew member profile |
| `/ajustes` | AI engine, language, reminders, demo mode and data |

The health logic in `src/lib/health/` is made of pure functions with no React dependency. That is why it runs the same way in the app, in the Web Worker and in the tests.

> [!NOTE]
> The project uses Next.js 16, which has breaking changes from earlier versions. Before touching framework code, read the guides in `node_modules/next/dist/docs/`, as [AGENTS.md](AGENTS.md) asks.

## Tests

```bash
npm test
```

There are 133 tests in 12 files, covering symptom recognition, safety alerts, allergies, the AI answer filter, vital signs, the routine (including daylight saving time), session persistence, speech detection, the OpenRouter client and the translations.

## Pitch video

The [video/](video/) folder holds the project's 30-second video, made with HyperFrames. The script is in [video/ROTEIRO.md](video/ROTEIRO.md).

```bash
cd video
npm run dev      # preview
npm run render   # render
```

## Sources

- NASA HRP: [5 Hazards of Human Spaceflight](https://www.nasa.gov/hrp/hazards/)
- NASA: [The Human Body in Space](https://www.nasa.gov/humans-in-space/the-human-body-in-space/)
- NASA HRP: [Human Research Roadmap](https://humanresearchroadmap.nasa.gov/) and [Evidence Report: SANS](https://humanresearchroadmap.nasa.gov/evidence/reports/SANS%20EB%202022%20FINAL_8-15-22.pdf)
- NASA OCHMO: [NASA-STD-3001 Vol. 1 Rev. C](https://standards.nasa.gov/sites/default/files/standards/NASA/C/nasa-std-3001-vol-1-rev-c-signature.pdf) and [Technical Brief: Radiation Protection](https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-020-radiation-protection.pdf)
- NIH MedlinePlus: [Vital signs](https://medlineplus.gov/ency/article/002341.htm) and [Pulse Oximetry](https://medlineplus.gov/lab-tests/pulse-oximetry/)

---

<div align="center">

Made by team **Code and Cheese**.

</div>
