import { nanoid } from 'nanoid';
import { db } from '@/data/db';
import type { Stretch, SequenceStretch, MobilityTiming, MobilitySequence } from '@/types';

/**
 * Normalize a string for fuzzy matching: lowercase, strip punctuation, collapse whitespace.
 */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[''`]/g, '')        // smart quotes, apostrophes
    .replace(/[/\-–—]/g, ' ')    // slashes, dashes → spaces
    .replace(/[^a-z0-9\s]/g, '') // remove remaining punctuation
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Score how well two normalized strings match.
 * Returns 0 (no match) to 1 (exact match).
 */
function matchScore(query: string, candidate: string): number {
  if (query === candidate) return 1;
  if (candidate.includes(query)) return 0.8;
  if (query.includes(candidate)) return 0.7;

  // Check if all words in query appear in candidate (or vice versa)
  const qWords = query.split(' ');
  const cWords = candidate.split(' ');
  const qInC = qWords.filter((w) => cWords.some((cw) => cw.includes(w) || w.includes(cw))).length;
  const ratio = qInC / qWords.length;
  if (ratio >= 0.5) return ratio * 0.6;

  return 0;
}

/**
 * Find the best matching stretch from the DB for a given name.
 */
function findBestMatch(name: string, stretches: Stretch[]): Stretch | null {
  const nQuery = normalize(name);
  if (!nQuery) return null;

  let bestStretch: Stretch | null = null;
  let bestScore = 0;

  for (const s of stretches) {
    const score = matchScore(nQuery, normalize(s.name));
    if (score > bestScore) {
      bestScore = score;
      bestStretch = s;
    }
  }

  return bestScore >= 0.4 ? bestStretch : null;
}

/**
 * Infer timing from the staged workout title.
 */
function inferTiming(title: string): MobilityTiming {
  const lower = title.toLowerCase();
  if (lower.includes('morning')) return 'morning';
  if (lower.includes('pre') || lower.includes('warm')) return 'pre_workout';
  if (lower.includes('post') || lower.includes('cool') || lower.includes('recovery')) return 'post_workout';
  if (lower.includes('evening') || lower.includes('night')) return 'evening';
  return 'any';
}

/**
 * Parse a description like "Cat/cow, forward folds, slow air squats, world's greatest stretch"
 * into individual stretch names.
 */
function parseStretchNames(description: string): string[] {
  if (!description) return [];
  return description
    .split(/[,;·]+/)
    .map((s) => s.replace(/^\d+\s*min\b/i, '').trim()) // strip leading "5 min"
    .filter((s) => {
      if (!s) return false;
      // Filter out non-stretch descriptors
      const lower = s.toLowerCase();
      if (/^\d+\s*min(ute)?s?\s*(total)?$/i.test(s)) return false;
      if (lower === 'full body' || lower === 'foam roll') return false;
      return true;
    });
}

/**
 * Build a fully populated MobilitySequence from a staged workout's title and description.
 * Finds or creates Stretch records in the DB, then assembles the sequence.
 */
export async function buildSequenceFromDescription(
  title: string,
  description: string | undefined,
): Promise<MobilitySequence> {
  const allStretches = await db.stretches.toArray();
  const stretchNames = parseStretchNames(description ?? '');
  const sequenceStretches: SequenceStretch[] = [];
  const now = Date.now();

  for (let i = 0; i < stretchNames.length; i++) {
    const name = stretchNames[i];
    let stretch = findBestMatch(name, allStretches);

    if (!stretch) {
      // Create a new custom stretch
      stretch = {
        id: nanoid(),
        name: name.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        category: 'dynamic',
        targetAreas: ['full_body'],
        defaultDurationSeconds: 30,
        isCustom: true,
        createdAt: now,
        updatedAt: now,
      };
      await db.stretches.add(stretch);
      allStretches.push(stretch); // so subsequent iterations can match
    }

    sequenceStretches.push({
      stretchId: stretch.id,
      order: i,
      durationSeconds: stretch.defaultDurationSeconds,
    });
  }

  const timing = inferTiming(title);
  const totalDuration = sequenceStretches.reduce((sum, s) => sum + s.durationSeconds, 0);

  const sequence: MobilitySequence = {
    id: nanoid(),
    name: title.replace(/\*+/g, '').trim(), // strip any ** markers
    timing,
    stretches: sequenceStretches,
    totalDuration,
    createdAt: now,
    updatedAt: now,
  };

  await db.mobilitySequences.add(sequence);
  return sequence;
}
