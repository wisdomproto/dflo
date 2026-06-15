export function splitIntoPhrases(text: string, lang: string, opts?: { maxChars?: number }): string[];
export function distributeFrames(
  phrases: string[],
  durFrames: number,
): { text: string; fromFrame: number; durFrames: number }[];
export function buildCaptions(
  chunks: Array<{ id: string; durFrames: number } & Record<string, unknown>>,
  lang: string,
): Record<string, { text: string; fromFrame: number; durFrames: number }[]>;
