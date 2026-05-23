export interface SolutionStep {
  title: string
  detail: string
  result: string
  tip?: string
}

export interface Question {
  prompt: string
  answer: number
  choices: number[]
  patternId: string
  strategy: string
  steps: SolutionStep[]
}

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function makeChoices(answer: number): number[] {
  const range = Math.max(4, Math.round(Math.abs(answer) * 0.18))
  const wrong = new Set<number>()
  let tries = 0
  while (wrong.size < 3 && tries < 60) {
    tries++
    const offset = (Math.random() < 0.5 ? -1 : 1) * randInt(1, range)
    const c = answer + offset
    if (c > 0 && c !== answer) wrong.add(c)
  }
  return shuffle([answer, ...Array.from(wrong)])
}

type Gen = () => Omit<Question, 'choices'>

const GENS: Record<string, Gen[]> = {
  'number-sense': [
    () => {
      const n = randInt(1000, 9999)
      const places = ['ones', 'tens', 'hundreds', 'thousands'] as const
      const idx = randInt(0, 3)
      const digits = [n % 10, Math.floor(n / 10) % 10, Math.floor(n / 100) % 10, Math.floor(n / 1000)]
      const answer = digits[idx]
      return {
        prompt: `What is the ${places[idx]} digit of ${n.toLocaleString()}?`,
        answer,
        patternId: 'ns1',
        strategy: 'Place Value Breakdown',
        steps: [
          { title: 'Write the number', detail: `${n.toLocaleString()} in expanded form`, result: `${Math.floor(n/1000)}×1000 + ${Math.floor(n/100)%10}×100 + ${Math.floor(n/10)%10}×10 + ${n%10}` },
          { title: `Identify the ${places[idx]} place`, detail: `Count from the right: ones, tens, hundreds, thousands`, result: `The ${places[idx]} digit is ${answer}`, tip: 'Ones = rightmost digit, then left for each larger place' },
        ],
      }
    },
    () => {
      const n = randInt(12, 987)
      const answer = Math.round(n / 10) * 10
      const lastDigit = n % 10
      const roundUp = lastDigit >= 5
      return {
        prompt: `Round ${n} to the nearest 10`,
        answer,
        patternId: 'ns2',
        strategy: 'Round Half Up Rule',
        steps: [
          { title: 'Check the ones digit', detail: `Ones digit of ${n} is ${lastDigit}`, result: `${lastDigit} ${lastDigit >= 5 ? '≥ 5 → round up' : '< 5 → round down'}` },
          { title: roundUp ? 'Round up' : 'Round down', detail: roundUp ? `${n} → next ten = ${answer}` : `${n} → current ten = ${answer}`, result: `${answer}`, tip: '5 or more → round up; 4 or less → round down' },
        ],
      }
    },
    () => {
      const n = randInt(110, 9870)
      const answer = Math.round(n / 100) * 100
      const lastTwo = n % 100
      const roundUp = lastTwo >= 50
      return {
        prompt: `Round ${n.toLocaleString()} to the nearest 100`,
        answer,
        patternId: 'ns2',
        strategy: 'Round to Nearest Hundred',
        steps: [
          { title: 'Check the tens digit', detail: `Last two digits of ${n}: ${lastTwo}`, result: `${lastTwo} ${roundUp ? '≥ 50 → round up' : '< 50 → round down'}` },
          { title: roundUp ? 'Round up' : 'Round down', detail: roundUp ? `Go to next hundred: ${answer}` : `Stay at current hundred: ${answer}`, result: `${answer}`, tip: 'Look at the tens digit only — ≥ 5 means round up' },
        ],
      }
    },
  ],

  'addition': [
    () => {
      const a = randInt(13, 89), b = randInt(13, 89)
      const aRound = Math.ceil(a / 10) * 10
      const diff = aRound - a
      return {
        prompt: `${a} + ${b} = ?`,
        answer: a + b,
        patternId: 'ad1',
        strategy: 'Round & Compensate',
        steps: [
          { title: 'Round first number up', detail: `${a} → ${aRound}  (added ${diff})`, result: `${aRound}` },
          { title: 'Add second number', detail: `${aRound} + ${b} = ${aRound + b}`, result: `${aRound + b}` },
          { title: 'Compensate', detail: `Subtract the ${diff} we added: ${aRound + b} − ${diff}`, result: `${a + b}`, tip: 'Round up, then subtract the difference at the end' },
        ],
      }
    },
    () => {
      const a = randInt(100, 799), b = randInt(100, 799)
      const aH = Math.floor(a / 100) * 100
      const bH = Math.floor(b / 100) * 100
      const aRem = a - aH, bRem = b - bH
      return {
        prompt: `${a} + ${b} = ?`,
        answer: a + b,
        patternId: 'ad1',
        strategy: 'Split by Hundreds',
        steps: [
          { title: 'Add hundreds', detail: `${aH} + ${bH}`, result: `${aH + bH}` },
          { title: 'Add remainders', detail: `${aRem} + ${bRem}`, result: `${aRem + bRem}` },
          { title: 'Combine', detail: `${aH + bH} + ${aRem + bRem}`, result: `${a + b}`, tip: 'Split big numbers into hundreds + leftovers, add separately' },
        ],
      }
    },
    () => {
      const a = randInt(12, 45), b = randInt(12, 45), c = randInt(12, 45)
      return {
        prompt: `${a} + ${b} + ${c} = ?`,
        answer: a + b + c,
        patternId: 'ad2',
        strategy: 'Left to Right Addition',
        steps: [
          { title: 'Add first two', detail: `${a} + ${b}`, result: `${a + b}` },
          { title: 'Add third', detail: `${a + b} + ${c}`, result: `${a + b + c}`, tip: 'Chain additions left to right — each step is simpler' },
        ],
      }
    },
  ],

  'subtraction': [
    () => {
      const b = randInt(13, 79), a = b + randInt(13, 79)
      const aRound = Math.ceil(a / 10) * 10
      const diff = aRound - a
      return {
        prompt: `${a} − ${b} = ?`,
        answer: a - b,
        patternId: 'sb2',
        strategy: 'Round & Compensate',
        steps: [
          { title: 'Round the minuend', detail: `${a} → ${aRound}  (added ${diff})`, result: `${aRound}` },
          { title: 'Subtract', detail: `${aRound} − ${b} = ${aRound - b}`, result: `${aRound - b}` },
          { title: 'Compensate', detail: `Subtract the extra ${diff}: ${aRound - b} − ${diff}`, result: `${a - b}`, tip: 'Rounding the minuend up means the result is too big — subtract the difference' },
        ],
      }
    },
    () => {
      const b = randInt(11, 89)
      const a = Math.ceil(b / 100) * 100 + randInt(1, 9)
      const nextHundred = Math.ceil(b / 100) * 100
      return {
        prompt: `${a} − ${b} = ?`,
        answer: a - b,
        patternId: 'sb1',
        strategy: 'Bridge Through Hundred',
        steps: [
          { title: 'Identify nearest hundred', detail: `${a} is close to ${nextHundred}`, result: `gap = ${a - nextHundred} above ${nextHundred}` },
          { title: 'Subtract to hundred', detail: `${nextHundred} − ${b} = ${nextHundred - b}`, result: `${nextHundred - b}` },
          { title: 'Add the gap back', detail: `${nextHundred - b} + ${a - nextHundred}`, result: `${a - b}`, tip: 'Bridge through the nearest round number to break the problem in two' },
        ],
      }
    },
    () => {
      const b = randInt(50, 499), a = b + randInt(50, 499)
      const bRound = Math.round(b / 10) * 10
      const bAdj = bRound - b
      return {
        prompt: `${a} − ${b} = ?`,
        answer: a - b,
        patternId: 'sb1',
        strategy: 'Round Subtrahend',
        steps: [
          { title: 'Round subtrahend', detail: `${b} → ${bRound}  (${bAdj >= 0 ? '+' : ''}${bAdj})`, result: `${bRound}` },
          { title: 'Subtract rounded', detail: `${a} − ${bRound} = ${a - bRound}`, result: `${a - bRound}` },
          { title: 'Compensate', detail: `${bAdj >= 0 ? 'Added' : 'Removed'} ${Math.abs(bAdj)} from subtrahend → ${bAdj >= 0 ? 'add' : 'subtract'} back`, result: `${a - b}`, tip: 'Round the number being subtracted, then reverse the adjustment' },
        ],
      }
    },
  ],

  'multiplication': [
    () => {
      const hard = [6, 7, 8, 9]
      const a = hard[randInt(0, 3)], b = randInt(6, 12)
      const half = Math.floor(b / 2)
      return {
        prompt: `${a} × ${b} = ?`,
        answer: a * b,
        patternId: 'ml2',
        strategy: 'Double & Halve',
        steps: [
          { title: 'Split into two halves', detail: `${b} = ${half} + ${b - half}`, result: `${a} × ${half} = ${a * half}` },
          { title: 'Multiply second half', detail: `${a} × ${b - half} = ${a * (b - half)}`, result: `${a * (b - half)}` },
          { title: 'Add results', detail: `${a * half} + ${a * (b - half)}`, result: `${a * b}`, tip: 'Split the multiplier in half, multiply both parts, then add — easier on harder tables' },
        ],
      }
    },
    () => {
      const a = randInt(11, 29), b = randInt(2, 9)
      const tens = Math.floor(a / 10) * 10
      const ones = a % 10
      return {
        prompt: `${a} × ${b} = ?`,
        answer: a * b,
        patternId: 'ml1',
        strategy: 'Expand & Multiply',
        steps: [
          { title: 'Split the 2-digit number', detail: `${a} = ${tens} + ${ones}`, result: `${tens} and ${ones}` },
          { title: 'Multiply each part', detail: `${tens} × ${b} = ${tens * b},  ${ones} × ${b} = ${ones * b}`, result: `${tens * b} + ${ones * b}` },
          { title: 'Add together', detail: `${tens * b} + ${ones * b}`, result: `${a * b}`, tip: 'Distribute: (tens + ones) × b = tens×b + ones×b' },
        ],
      }
    },
    () => {
      const a = randInt(11, 25), b = randInt(11, 25)
      const aT = Math.floor(a / 10) * 10, aO = a % 10
      return {
        prompt: `${a} × ${b} = ?`,
        answer: a * b,
        patternId: 'ml1',
        strategy: 'Grid Method',
        steps: [
          { title: 'Expand first factor', detail: `${a} = ${aT} + ${aO}`, result: `${aT} and ${aO}` },
          { title: 'Multiply tens part', detail: `${aT} × ${b} = ${aT * b}`, result: `${aT * b}` },
          { title: 'Multiply ones part', detail: `${aO} × ${b} = ${aO * b}`, result: `${aO * b}` },
          { title: 'Add both products', detail: `${aT * b} + ${aO * b}`, result: `${a * b}`, tip: 'Grid: split one factor into tens + ones, multiply each, add' },
        ],
      }
    },
    () => {
      const tens = [10, 20, 30, 40, 50]
      const a = tens[randInt(0, 4)], b = randInt(2, 9)
      const aBase = a / 10
      return {
        prompt: `${a} × ${b} = ?`,
        answer: a * b,
        patternId: 'ml3',
        strategy: 'Multiply Then Scale',
        steps: [
          { title: 'Remove the zero', detail: `${a} = ${aBase} × 10`, result: `${aBase} × ${b} = ${aBase * b}` },
          { title: 'Scale by 10', detail: `${aBase * b} × 10`, result: `${a * b}`, tip: 'Multiply by the non-zero part first, then attach the zero' },
        ],
      }
    },
  ],

  'division': [
    () => {
      const b = randInt(2, 9), q = randInt(3, 12)
      return {
        prompt: `${b * q} ÷ ${b} = ?`,
        answer: q,
        patternId: 'dv1',
        strategy: 'Think Multiplication',
        steps: [
          { title: 'Reframe as multiplication', detail: `${b} × ? = ${b * q}`, result: `Use times table for ${b}` },
          { title: 'Find the missing factor', detail: `${b} × ${q} = ${b * q} ✓`, result: `${q}`, tip: 'Division is multiplication in reverse — ask "what times the divisor equals the dividend?"' },
        ],
      }
    },
    () => {
      const b = randInt(2, 9), q = randInt(3, 9)
      return {
        prompt: `${b * q} ÷ ${b} = ?`,
        answer: q,
        patternId: 'dv2',
        strategy: 'Repeated Subtraction',
        steps: [
          { title: 'Count groups of divisor', detail: `How many ${b}s fit in ${b * q}?`, result: `${b * q} ÷ ${b}` },
          { title: 'Recall times table', detail: `${b} × ${q} = ${b * q}`, result: `Answer: ${q}`, tip: 'Visualise splitting ${b * q} into equal groups of ${b}' },
        ],
      }
    },
    () => {
      const b = randInt(3, 9), q = randInt(10, 15)
      const qT = Math.floor(q / 10) * 10, qO = q % 10
      return {
        prompt: `${b * q} ÷ ${b} = ?`,
        answer: q,
        patternId: 'dv1',
        strategy: 'Partial Quotients',
        steps: [
          { title: 'Divide by easy chunk', detail: `${b * qT} ÷ ${b} = ${qT}`, result: `${qT}` },
          { title: 'Divide remainder', detail: `${b * qO} ÷ ${b} = ${qO}`, result: `${qO}` },
          { title: 'Add quotients', detail: `${qT} + ${qO}`, result: `${q}`, tip: 'Break the dividend into parts that are easy to divide, add the quotients' },
        ],
      }
    },
  ],

  'fractions': [
    () => {
      const d = randInt(3, 9), n1 = randInt(1, d - 2), n2 = randInt(1, d - n1 - 1)
      return {
        prompt: `${n1}/${d} + ${n2}/${d} = ?/${d}`,
        answer: n1 + n2,
        patternId: 'fr1',
        strategy: 'Same Denominator Addition',
        steps: [
          { title: 'Check denominators match', detail: `Both fractions have denominator ${d}`, result: `Denominators ✓` },
          { title: 'Add numerators only', detail: `${n1} + ${n2} = ${n1 + n2}`, result: `${n1 + n2}/${d}`, tip: 'Same bottom number → just add the tops, keep the denominator' },
        ],
      }
    },
    () => {
      const d = randInt(3, 8), n1 = randInt(2, d - 1), n2 = randInt(1, n1 - 1)
      return {
        prompt: `${n1}/${d} − ${n2}/${d} = ?/${d}`,
        answer: n1 - n2,
        patternId: 'fr2',
        strategy: 'Same Denominator Subtraction',
        steps: [
          { title: 'Check denominators match', detail: `Both fractions have denominator ${d}`, result: `Denominators ✓` },
          { title: 'Subtract numerators only', detail: `${n1} − ${n2} = ${n1 - n2}`, result: `${n1 - n2}/${d}`, tip: 'Same bottom number → just subtract the tops, keep the denominator' },
        ],
      }
    },
    () => {
      const pairs = [[1,2,50],[1,4,25],[3,4,75],[1,5,20],[2,5,40],[1,10,10]]
      const [n, d, pct] = pairs[randInt(0, pairs.length - 1)]
      return {
        prompt: `${n}/${d} = ?%`,
        answer: pct,
        patternId: 'fr2',
        strategy: 'Fraction to Percent',
        steps: [
          { title: 'Multiply numerator by 100', detail: `${n} × 100 = ${n * 100}`, result: `${n * 100}` },
          { title: 'Divide by denominator', detail: `${n * 100} ÷ ${d} = ${pct}`, result: `${pct}%`, tip: 'Percent means per hundred: (n ÷ d) × 100' },
        ],
      }
    },
  ],

  'decimals': [
    () => {
      const a = randInt(1, 18), b = randInt(1, 18)
      return {
        prompt: `${a}.5 + ${b}.5 = ?`,
        answer: a + b + 1,
        patternId: 'dc1',
        strategy: 'Pair the Halves',
        steps: [
          { title: 'Add the decimal parts', detail: `0.5 + 0.5 = 1.0`, result: `Carry 1` },
          { title: 'Add whole parts + carry', detail: `${a} + ${b} + 1 = ${a + b + 1}`, result: `${a + b + 1}`, tip: 'Two .5s always make a whole — pair them first' },
        ],
      }
    },
    () => {
      const a = randInt(1, 9), b = randInt(1, 9)
      return {
        prompt: `${a}.0 × ${b}.0 = ?`,
        answer: a * b,
        patternId: 'dc2',
        strategy: 'Ignore Trailing Zeros',
        steps: [
          { title: 'Strip decimals', detail: `${a}.0 and ${b}.0 are whole numbers`, result: `${a} × ${b}` },
          { title: 'Multiply', detail: `${a} × ${b} = ${a * b}`, result: `${a * b}.0 = ${a * b}`, tip: '.0 means whole number — just multiply normally' },
        ],
      }
    },
    () => {
      const a = randInt(10, 50), b = randInt(1, 9)
      const inner = a + b
      const answer = inner * 2 + 1
      return {
        prompt: `${a}.0 + ${b}.5 = ?  (× 2)`,
        answer,
        patternId: 'dc1',
        strategy: 'Combine Then Double',
        steps: [
          { title: 'Add the two numbers', detail: `${a}.0 + ${b}.5 = ${inner}.5`, result: `${inner}.5` },
          { title: 'Multiply by 2', detail: `${inner}.5 × 2 = ${inner * 2} + 1`, result: `${answer}`, tip: 'x.5 × 2 always adds 1 to the doubled whole: 2×x + 1' },
        ],
      }
    },
  ],

  'percentages': [
    () => {
      const pct = [10, 20, 25, 50][randInt(0, 3)]
      const n = randInt(2, 20) * 4
      const answer = Math.round((pct / 100) * n)
      const steps =
        pct === 10 ? [
          { title: 'Divide by 10', detail: `${n} ÷ 10 = ${answer}`, result: `${answer}`, tip: '10% = shift decimal one place left' },
        ] : pct === 20 ? [
          { title: 'Find 10%', detail: `${n} ÷ 10 = ${n / 10}`, result: `${n / 10}` },
          { title: 'Double it', detail: `${n / 10} × 2 = ${answer}`, result: `${answer}`, tip: '20% = 10% × 2' },
        ] : pct === 25 ? [
          { title: 'Divide by 4', detail: `${n} ÷ 4 = ${answer}`, result: `${answer}`, tip: '25% = ¼ of the number' },
        ] : [
          { title: 'Divide by 2', detail: `${n} ÷ 2 = ${answer}`, result: `${answer}`, tip: '50% = half the number' },
        ]
      return { prompt: `${pct}% of ${n} = ?`, answer, patternId: 'pc1', strategy: `${pct}% Shortcut`, steps }
    },
    () => {
      const pct = [10, 20, 25, 50, 75][randInt(0, 4)]
      const total = randInt(2, 8) * 20
      const part = Math.round((pct / 100) * total)
      return {
        prompt: `${part} is what % of ${total}?`,
        answer: pct,
        patternId: 'pc2',
        strategy: 'Fraction → Percent',
        steps: [
          { title: 'Write as fraction', detail: `${part} / ${total}`, result: `${part}/${total}` },
          { title: 'Simplify', detail: `${part}/${total} = ${pct}/100`, result: `${pct}/100` },
          { title: 'Convert to percent', detail: `${pct}/100 = ${pct}%`, result: `${pct}%`, tip: 'Divide part by whole, multiply by 100' },
        ],
      }
    },
  ],

  'speed-math': [
    () => {
      const a = randInt(10, 40), b = randInt(10, 40), c = randInt(2, 6)
      const sum = a + b
      return {
        prompt: `(${a} + ${b}) × ${c} = ?`,
        answer: (a + b) * c,
        patternId: 'sm1',
        strategy: 'Brackets First',
        steps: [
          { title: 'Solve the bracket', detail: `${a} + ${b} = ${sum}`, result: `${sum}` },
          { title: 'Multiply result', detail: `${sum} × ${c} = ${sum * c}`, result: `${sum * c}`, tip: 'Always resolve brackets before multiplying — BODMAS/PEMDAS' },
        ],
      }
    },
    () => {
      const a = randInt(11, 19)
      const half = Math.floor(a / 2)
      const isEven = a % 2 === 0
      return {
        prompt: `${a}² = ?`,
        answer: a * a,
        patternId: 'sm2',
        strategy: isEven ? '(n/2)² × 4' : '(n−1)(n+1) + 1',
        steps: isEven ? [
          { title: 'Halve the number', detail: `${a} ÷ 2 = ${half}`, result: `${half}` },
          { title: 'Square the half', detail: `${half}² = ${half * half}`, result: `${half * half}` },
          { title: 'Multiply by 4', detail: `${half * half} × 4 = ${a * a}`, result: `${a * a}`, tip: '(2k)² = 4k² — squaring the half and multiplying by 4 is faster' },
        ] : [
          { title: 'Use difference of squares', detail: `(${a})² = (${a-1})(${a+1}) + 1`, result: `${(a-1) * (a+1)} + 1` },
          { title: 'Multiply neighbours', detail: `${a-1} × ${a+1} = ${(a-1)*(a+1)}`, result: `${(a-1)*(a+1)}` },
          { title: 'Add 1', detail: `${(a-1)*(a+1)} + 1`, result: `${a * a}`, tip: 'n² = (n−1)(n+1) + 1 — multiply easy neighbours then add 1' },
        ],
      }
    },
    () => {
      const a = randInt(10, 99), b = randInt(10, 99)
      const aR = Math.ceil(a / 10) * 10, diff = aR - a
      return {
        prompt: `${a} + ${b} = ?`,
        answer: a + b,
        patternId: 'sm1',
        strategy: 'Round & Compensate',
        steps: [
          { title: 'Round first number', detail: `${a} → ${aR}  (+${diff})`, result: `${aR}` },
          { title: 'Add', detail: `${aR} + ${b} = ${aR + b}`, result: `${aR + b}` },
          { title: 'Subtract compensation', detail: `${aR + b} − ${diff}`, result: `${a + b}`, tip: 'Round up to nearest 10, add, then subtract the overshoot' },
        ],
      }
    },
    () => {
      const a = randInt(2, 9), b = randInt(2, 9), c = randInt(2, 9)
      return {
        prompt: `${a} × ${b} + ${c} = ?`,
        answer: a * b + c,
        patternId: 'sm2',
        strategy: 'Multiplication Before Addition',
        steps: [
          { title: 'Multiply first (BODMAS)', detail: `${a} × ${b} = ${a * b}`, result: `${a * b}` },
          { title: 'Then add', detail: `${a * b} + ${c} = ${a * b + c}`, result: `${a * b + c}`, tip: 'Multiplication before addition — always resolve × before +' },
        ],
      }
    },
  ],
}

export function generateQuestions(topicId: string, count: number): Question[] {
  const gens = GENS[topicId]
  if (!gens) return []
  const out: Question[] = []
  for (let i = 0; i < count; i++) {
    const gen = gens[i % gens.length]
    const base = gen()
    out.push({ ...base, choices: makeChoices(base.answer) })
  }
  return shuffle(out)
}
