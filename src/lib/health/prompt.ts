/** Reasoning models (qwen3, deepseek-r1) may emit their thoughts inline. */
export function cleanModelText(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
}
