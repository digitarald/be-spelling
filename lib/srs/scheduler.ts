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