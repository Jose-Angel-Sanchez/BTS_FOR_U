'use client';

import { useCallback, useState } from 'react';
import { generateTriviaQuestions, type TriviaQuestion } from '@/lib/trivia';

type MemberId = 'rm' | 'jin' | 'suga' | 'j-hope' | 'jimin' | 'v' | 'jungkook' | 'group' | 'unknown';

interface ValidationResult {
  allow: boolean;
  member: MemberId;
  reason: string;
}

interface TriviaApiQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

const suspiciousTerms = [
  'yoshihide suga',
  'prime minister',
  'politician',
  'cabinet',
  'government of japan',
  'minister',
  'president',
];

const validationCache = new Map<string, ValidationResult>();

function fallbackValidation(title: string, targetMember?: string): ValidationResult {
  const haystack = title.toLowerCase();
  if (suspiciousTerms.some((term) => haystack.includes(term))) {
    return { allow: false, member: 'unknown', reason: 'nombre ambiguo no relacionado con BTS' };
  }

  const guessedMember = haystack.includes('namjoon') || haystack.includes(' rm ') ? 'rm'
    : haystack.includes('seokjin') || haystack.includes(' jin ') ? 'jin'
    : haystack.includes('yoongi') || haystack.includes('agust d') || haystack.includes('suga') ? 'suga'
    : haystack.includes('hoseok') || haystack.includes('j-hope') || haystack.includes('jhope') ? 'j-hope'
    : haystack.includes('jimin') ? 'jimin'
    : haystack.includes('taehyung') ? 'v'
    : haystack.includes('jungkook') || haystack.includes('jung kook') ? 'jungkook'
    : haystack.includes('bts') || haystack.includes('bangtan') ? 'group'
    : 'unknown';

  const allow = guessedMember !== 'unknown' && (!targetMember || guessedMember === targetMember || guessedMember === 'group');
  return { allow, member: guessedMember, reason: allow ? 'coincidencia textual aceptable' : 'sin evidencia suficiente' };
}

function parseValidation(text: string | undefined, title: string, targetMember?: string): ValidationResult {
  if (!text) return fallbackValidation(title, targetMember);

  try {
    const raw = JSON.parse(text) as Partial<ValidationResult>;
    const member = (raw.member ?? 'unknown') as MemberId;
    const allow = Boolean(raw.allow);
    return {
      allow: targetMember ? allow && (member === targetMember || member === 'group') : allow,
      member,
      reason: raw.reason ?? '',
    };
  } catch {
    return fallbackValidation(title, targetMember);
  }
}

function parseTriviaPayload(text: string | undefined): TriviaQuestion[] {
  if (!text) return [];

  let parsed: unknown = null;
  try {
    parsed = JSON.parse(text);
  } catch {
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return [];
    try {
      parsed = JSON.parse(match[0]);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(parsed)) return [];

  const normalized = parsed
    .map((entry): TriviaQuestion | null => {
      if (!entry || typeof entry !== 'object') return null;
      const item = entry as Partial<TriviaApiQuestion>;
      const question = typeof item.question === 'string' ? item.question.trim() : '';
      const correctAnswer = typeof item.correctAnswer === 'string' ? item.correctAnswer.trim() : '';
      const options = Array.isArray(item.options)
        ? item.options.map((value) => (typeof value === 'string' ? value.trim() : '')).filter(Boolean)
        : [];
      const uniqueOptions = Array.from(new Set(options));
      const rawDifficulty = item.difficulty;
      const difficulty = rawDifficulty === 'easy' || rawDifficulty === 'medium' || rawDifficulty === 'hard'
        ? rawDifficulty
        : 'medium';

      if (!question || !correctAnswer || uniqueOptions.length !== 4 || !uniqueOptions.includes(correctAnswer)) {
        return null;
      }

      return { question, correctAnswer, options: uniqueOptions, difficulty };
    })
    .filter((item): item is TriviaQuestion => item !== null);

  return normalized;
}

export function usePuterAI() {
  const [busy, setBusy] = useState(false);

  const generateCaption = useCallback(async (title: string, tags: string[]): Promise<string> => {
    if (!window.puter?.ai?.chat) {
      return `Momento BTS: ${title}. #BTS #ARMY ${tags.slice(0, 3).map((tag) => `#${tag.replace(/\s+/g, '')}`).join(' ')}`.trim();
    }

    setBusy(true);
    try {
      const prompt = `Escribe una sola frase corta en espanol para fans de BTS, sin emojis. Titulo: ${title}. Tags: ${tags.join(', ')}.`;
      const out = await window.puter.ai.chat(prompt);
      return out.text?.trim() || title;
    } catch {
      return title;
    } finally {
      setBusy(false);
    }
  }, []);

  const classifyTags = useCallback(async (title: string): Promise<string[]> => {
    if (!window.puter?.ai?.chat) {
      return title.toLowerCase().split(/\s+/).filter((t) => t.length > 2).slice(0, 6);
    }

    setBusy(true);
    try {
      const prompt = `Devuelve solo tags separadas por comas para una imagen de BTS. Maximo 6, minusculas, sin hashtags. Titulo: ${title}`;
      const out = await window.puter.ai.chat(prompt);
      return (out.text || '')
        .split(',')
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 6);
    } catch {
      return ['bts', 'army'];
    } finally {
      setBusy(false);
    }
  }, []);

  const validateBtsImage = useCallback(async (input: {
    id: string;
    title: string;
    url: string;
    source: string;
    targetMember?: string;
  }): Promise<ValidationResult> => {
    const cacheKey = `${input.id}:${input.targetMember ?? 'all'}`;
    const cached = validationCache.get(cacheKey);
    if (cached) return cached;

    if (!window.puter?.ai?.chat) {
      const fallback = fallbackValidation(input.title, input.targetMember);
      validationCache.set(cacheKey, fallback);
      return fallback;
    }

    setBusy(true);
    try {
      const prompt = [
        'Valida si esta imagen debe mostrarse en una galeria exclusiva de BTS.',
        'Responde SOLO JSON de una linea con esta forma exacta:',
        '{"allow":true|false,"member":"rm|jin|suga|j-hope|jimin|v|jungkook|group|unknown","reason":"texto corto"}',
        'Reglas estrictas:',
        '- Rechaza homonimos y personas ajenas a BTS.',
        '- "Suga" NO debe aceptarse si parece Yoshihide Suga u otra persona.',
        '- Si hay duda, responde allow false.',
        `Integrante solicitado: ${input.targetMember ?? 'cualquiera'}.`,
        `Titulo: ${input.title}`,
        `Fuente: ${input.source}`,
        `URL: ${input.url}`,
      ].join('\n');

      const out = await window.puter.ai.chat(prompt);
      const parsed = parseValidation(out.text, input.title, input.targetMember);
      validationCache.set(cacheKey, parsed);
      return parsed;
    } catch {
      const fallback = fallbackValidation(input.title, input.targetMember);
      validationCache.set(cacheKey, fallback);
      return fallback;
    } finally {
      setBusy(false);
    }
  }, []);

  const generateTriviaWithPuter = useCallback(async (total = 8): Promise<TriviaQuestion[]> => {
    if (!window.puter?.ai?.chat) {
      return generateTriviaQuestions(total);
    }

    setBusy(true);
    try {
      const prompt = [
        'Genera trivia de BTS para fans en espanol.',
        `Necesito EXACTAMENTE ${total} preguntas.`,
        'Responde SOLO un arreglo JSON valido, sin texto adicional.',
        'Formato por item:',
        '{"question":"...","options":["A","B","C","D"],"correctAnswer":"...","difficulty":"easy|medium|hard"}',
        'Reglas:',
        '- 4 opciones por pregunta.',
        '- correctAnswer debe ser una de las 4 opciones.',
        '- Mezcla preguntas de integrantes, discografia y hitos de BTS.',
        '- Evita contenido ofensivo o ambiguo.',
      ].join('\n');

      const out = await window.puter.ai.chat(prompt);
      const parsed = parseTriviaPayload(out.text);
      if (parsed.length >= Math.max(4, total - 2)) {
        return parsed.slice(0, total);
      }

      return generateTriviaQuestions(total);
    } catch {
      return generateTriviaQuestions(total);
    } finally {
      setBusy(false);
    }
  }, []);

  return { busy, generateCaption, classifyTags, validateBtsImage, generateTriviaWithPuter };
}
