export interface TriviaQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface MemberProfile {
  stageName: string;
  fullName: string;
  hometown: string;
  instagram: string;
  bt21: string;
  role: string;
  soloRelease: string;
  birthYear: number;
}

export const BTS_MEMBERS: MemberProfile[] = [
  { stageName: 'RM', fullName: 'Kim Namjoon', hometown: 'Ilsan', instagram: 'rkive', bt21: 'KOYA', role: 'Lider', soloRelease: 'Indigo', birthYear: 1994 },
  { stageName: 'Jin', fullName: 'Kim Seokjin', hometown: 'Anyang', instagram: 'jin', bt21: 'RJ', role: 'Vocalista', soloRelease: 'The Astronaut', birthYear: 1992 },
  { stageName: 'SUGA', fullName: 'Min Yoongi', hometown: 'Daegu', instagram: 'agustd', bt21: 'SHOOKY', role: 'Rapero', soloRelease: 'D-DAY', birthYear: 1993 },
  { stageName: 'j-hope', fullName: 'Jung Hoseok', hometown: 'Gwangju', instagram: 'uarmyhope', bt21: 'MANG', role: 'Rapero', soloRelease: 'Jack In The Box', birthYear: 1994 },
  { stageName: 'Jimin', fullName: 'Park Jimin', hometown: 'Busan', instagram: 'j.m', bt21: 'CHIMMY', role: 'Vocalista', soloRelease: 'FACE', birthYear: 1995 },
  { stageName: 'V', fullName: 'Kim Taehyung', hometown: 'Daegu', instagram: 'thv', bt21: 'TATA', role: 'Vocalista', soloRelease: 'Layover', birthYear: 1995 },
  { stageName: 'Jung Kook', fullName: 'Jeon Jungkook', hometown: 'Busan', instagram: 'mnijungkook', bt21: 'COOKY', role: 'Vocalista', soloRelease: 'Golden', birthYear: 1997 },
];

const groupFacts = [
  {
    answer: '2013',
    prompt: 'En que año debuto BTS oficialmente?',
    options: ['2011', '2012', '2013', '2015'],
    difficulty: 'easy' as const,
  },
  {
    answer: 'ARMY',
    prompt: 'Cual es el nombre oficial del fandom de BTS?',
    options: ['MOA', 'ARMY', 'ENGENE', 'CARAT'],
    difficulty: 'easy' as const,
  },
  {
    answer: 'Proof',
    prompt: 'Que album antologico repasa la historia de BTS?',
    options: ['BE', 'Proof', 'WINGS', 'Butter'],
    difficulty: 'medium' as const,
  },
  {
    answer: 'Beyond The Scene',
    prompt: 'Que expansion en ingles ha usado BTS oficialmente?',
    options: ['Beyond The Story', 'Beyond The Scene', 'Bulletproof Team Sound', 'Boys Through Sound'],
    difficulty: 'medium' as const,
  },
];

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pickWrongAnswers<T extends keyof MemberProfile>(member: MemberProfile, key: T, count = 3): string[] {
  const unique = Array.from(
    new Set(BTS_MEMBERS.filter((entry) => entry.stageName !== member.stageName).map((entry) => String(entry[key]))),
  );
  return shuffle(unique).slice(0, count);
}

function buildMemberQuestions(member: MemberProfile): TriviaQuestion[] {
  return [
    {
      question: `Que integrante usa el nombre completo "${member.fullName}"?`,
      correctAnswer: member.stageName,
      options: shuffle([member.stageName, ...pickWrongAnswers(member, 'stageName')]),
      difficulty: 'easy',
    },
    {
      question: `Que integrante esta asociado al personaje BT21 "${member.bt21}"?`,
      correctAnswer: member.stageName,
      options: shuffle([member.stageName, ...pickWrongAnswers(member, 'stageName')]),
      difficulty: 'medium',
    },
    {
      question: `Que lanzamiento solista pertenece a ${member.stageName}?`,
      correctAnswer: member.soloRelease,
      options: shuffle([member.soloRelease, ...pickWrongAnswers(member, 'soloRelease')]),
      difficulty: 'medium',
    },
    {
      question: `Que cuenta de Instagram pertenece a ${member.stageName}?`,
      correctAnswer: `@${member.instagram}`,
      options: shuffle([`@${member.instagram}`, ...pickWrongAnswers(member, 'instagram').map((entry) => `@${entry}`)]),
      difficulty: 'hard',
    },
    {
      question: `De que ciudad es ${member.stageName}?`,
      correctAnswer: member.hometown,
      options: shuffle([member.hometown, ...pickWrongAnswers(member, 'hometown')]),
      difficulty: 'hard',
    },
    {
      question: `Cual es el rol principal de ${member.stageName} en BTS?`,
      correctAnswer: member.role,
      options: shuffle([member.role, ...pickWrongAnswers(member, 'role')]),
      difficulty: 'medium',
    },
    {
      question: `Que integrante nacio en ${member.birthYear}?`,
      correctAnswer: member.stageName,
      options: shuffle([member.stageName, ...pickWrongAnswers(member, 'stageName')]),
      difficulty: 'hard',
    },
  ];
}

export function generateTriviaQuestions(total = 8): TriviaQuestion[] {
  const memberQuestions = shuffle(BTS_MEMBERS.flatMap(buildMemberQuestions));
  const baseQuestions: TriviaQuestion[] = shuffle(
    groupFacts.map((fact) => ({
      question: fact.prompt,
      correctAnswer: fact.answer,
      options: shuffle([...fact.options]),
      difficulty: fact.difficulty,
    })),
  );

  return shuffle([...baseQuestions, ...memberQuestions]).slice(0, total);
}
