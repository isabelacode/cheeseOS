# cheeseOS

Gêmeo digital de saúde para tripulantes em missões de longa duração. O astronauta conta por voz ou texto como está se sentindo; o cheeseOS reconhece os sintomas no próprio aparelho, mostra o protocolo de bordo, liga cada sintoma aos riscos do Programa de Pesquisa Humana da NASA e mantém um diário pronto para o médico de voo.

## Como funciona

- **Regras locais primeiro.** O reconhecimento de sintomas, os sinais de alerta (cardíaco, descompressão, hipóxia, radiação…), o cruzamento de alergias e o banner crítico rodam no aparelho, na hora e sem IA. A IA só complementa.
- **IA opcional.** Gemma 3 1B no navegador (padrão, offline depois do primeiro download) ou um modelo do OpenRouter com a chave do usuário. Respostas que só repetem o relato ou citam um medicamento das alergias são descartadas automaticamente.
- **Riscos NASA (RIDGE).** Radiação, isolamento, distância da Terra, gravidade e ambiente hostil/fechado. Cada sintoma tem um "Por que no espaço?" e a página **Ciência** reúne explicações, contramedidas e fontes.
- **Real × simulado.** Os sinais vitais são **simulados** pelo gêmeo digital (reagem aos sintomas: a febre aparece na hora e os sinais se recuperam aos poucos quando o sintoma passa). As faixas de alerta e os limites (ex.: 600 mSv de dose de carreira, 1–1,5% de perda óssea por mês) são valores publicados, com link para a fonte.
- **Rotina.** Missões diárias (check-in, revisar sinais, exercício, hidratação), sequência de check-ins e lembretes locais configuráveis.
- **Relatório.** Exportação em texto ou HTML imprimível com alertas de segurança, sintomas ativos e protocolo, evolução dos sintomas, sinais vitais da última hora e o diário completo.
- **Privacidade.** Perfil, diário e rotina ficam no `localStorage` do navegador. Nada sai do aparelho, a menos que o OpenRouter seja escolhido como motor de IA.

## Fontes

- NASA HRP — [5 Hazards of Human Spaceflight](https://www.nasa.gov/hrp/hazards/)
- NASA — [The Human Body in Space](https://www.nasa.gov/humans-in-space/the-human-body-in-space/)
- NASA HRP — [Human Research Roadmap](https://humanresearchroadmap.nasa.gov/) e [Evidence Report: SANS](https://humanresearchroadmap.nasa.gov/evidence/reports/SANS%20EB%202022%20FINAL_8-15-22.pdf)
- NASA OCHMO — [NASA-STD-3001 Vol. 1 Rev. C](https://standards.nasa.gov/sites/default/files/standards/NASA/C/nasa-std-3001-vol-1-rev-c-signature.pdf) e [Technical Brief: Radiation Protection](https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-020-radiation-protection.pdf)
- NIH MedlinePlus — [Vital signs](https://medlineplus.gov/ency/article/002341.htm), [Pulse Oximetry](https://medlineplus.gov/lab-tests/pulse-oximetry/)

Ferramenta de apoio e demonstração: não substitui avaliação médica nem o médico de voo.

## Desenvolvimento

```bash
npm install
npm run dev    # http://localhost:3000
npm test       # testes de regras, sinais vitais, alergias, filtro da IA, rotina e relatório
npm run lint
```
