import { Rating, SRS } from '@/lib/types';
import { srsRepository } from '@/lib/storage/repositories';

/**
 * SM-2 Spaced Repetition Algorithm
 * Based on the simplified version from PRODUCT.md
 */
export class SpacedRepetitionService {
  /**
   * Convert rating to quality factor (q)
   */
  private ratingToQuality(rating: Rating): number {
    switch (rating) {
      case 'NAILED': return 5;
      case 'ALMOST': return 3;
      case 'STUMPED': return 1;
      default: return 1;
    }
  }

  /**
   * Calculate next due date from current date and interval
   */
  private calculateDueDate(intervalDays: number): string {
    const now = new Date();
    now.setDate(now.getDate() + intervalDays);
    return now.toISOString();
  }

  /**
   * Update SRS data based on review rating
   */
  async updateSRS(wordId: string, rating: Rating): Promise<SRS> {
    let srs = await srsRepository.getSRS(wordId);
    
    // Initialize if doesn't exist
    if (!srs) {
      srs = await srsRepository.initializeSRS(wordId);
    }

    const q = this.ratingToQuality(rating);
    let { ease, interval, reps = 0 } = srs;

    // SM-2 Algorithm implementation
    if (q < 3) {
      // Failed - reset interval and reps
      interval = 1;
      reps = 0;
    } else {
      // Success - increment reps and calculate new interval
      reps += 1;
      
      if (reps === 1) {
        interval = 1;
      } else if (reps === 2) {
        interval = 6;
      } else {
        interval = Math.round(interval * ease);
      }
    }

    // Update ease factor
    ease = Math.max(1.3, ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));

    // Calculate due date
    const due = this.calculateDueDate(interval);

    const updatedSRS: SRS = {
      wordId,
      ease,
      interval,
      due,
      reps
    };

    await srsRepository.setSRS(updatedSRS);
    return updatedSRS;
  }

  /**
   * Get next word to study based on due dates
   */
  async getNextWord(): Promise<string | null> {
    const dueWords = await srsRepository.getDueWords();
    
    if (dueWords.length === 0) {
      return null;
    }
    // Sort by due date (earliest first)
    dueWords.sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime());

    // Mild randomization for the "initial list" / early-learning stage:
    // When many brand-new words (interval===0 & reps===0) are all due at once we don't
    // want to drill them in the exact insertion order every session. We pick randomly
    // among a small prefix of the earliest new/early words to keep variety while still
    // roughly respecting due order.
    const earlyPool = dueWords.filter(w => (w.interval === 0 && (w.reps ?? 0) === 0) || (w.reps ?? 0) < 2);
    if (earlyPool.length > 1) {
      // Limit pool size so we don't drift too far from schedule (take earliest subset only)
      const earliestIds = new Set(
        dueWords
          .filter(w => earlyPool.includes(w))
          .slice(0, Math.min(5, earlyPool.length))
          .map(w => w.wordId)
      );
      const sample = Array.from(earliestIds);
      const pick = sample[Math.floor(Math.random() * sample.length)];
      return pick;
    }

    // Fallback: strict earliest due
    return dueWords[0].wordId;
  }

  /**
   * Get study statistics
   */
  async getStudyStats(): Promise<{
    total: number;
    due: number;
    learned: number;
  }> {
    const [allSRS, dueWords] = await Promise.all([
      srsRepository.getAllSRS(),
      srsRepository.getDueWords()
    ]);

    // Consider a word "learned" if it has interval >= 21 days (3 weeks)
    const learned = allSRS.filter(srs => srs.interval >= 21).length;

    return {
      total: allSRS.length,
      due: dueWords.length,
      learned
    };
  }

  /**
   * Check if a word is new (no SRS record)
   */
  async isNewWord(wordId: string): Promise<boolean> {
    const srs = await srsRepository.getSRS(wordId);
    return !srs;
  }
}

export const spacedRepetitionService = new SpacedRepetitionService();