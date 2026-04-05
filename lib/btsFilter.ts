const BTS_CORE = ['bts', 'bangtan', 'bangtan sonyeondan', 'bulletproof boy scouts', 'army'];
const MEMBERS = ['rm', 'namjoon', 'jin', 'seokjin', 'suga', 'yoongi', 'j-hope', 'hoseok', 'jhope', 'jimin', 'v', 'taehyung', 'jungkook'];
const EXCLUDED_TERMS = ['blackpink', 'twice', 'stray kids', 'newjeans', 'exo', 'nct', 'itzy', 'aespa', 'ive'];

export const MEMBER_SET = new Set(MEMBERS);

export function isLikelyBts(title: string, tags: string[] = []): boolean {
  const haystack = `${title} ${tags.join(' ')}`.toLowerCase();
  if (EXCLUDED_TERMS.some((term) => haystack.includes(term))) return false;
  return [...BTS_CORE, ...MEMBERS].some((term) => haystack.includes(term));
}

export function detectMember(title: string, tags: string[] = []): string | null {
  const haystack = `${title} ${tags.join(' ')}`.toLowerCase();
  const found = MEMBERS.find((member) => haystack.includes(member));
  return found ?? null;
}

export function sanitizeText(input: string): string {
  return input.replace(/[<>`]/g, '').trim();
}
