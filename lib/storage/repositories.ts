import { db } from './database';
import { Word, Review, SRS, Rating } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

export class WordRepository {
  async getAllWords(): Promise<Word[]> {
    return await db.words.toArray();
  }

  async getWord(id: string): Promise<Word | undefined> {
    return await db.words.get(id);
  }

  async addWord(word: Omit<Word, 'id'>): Promise<string> {
    const id = uuidv4();
    const newWord: Word = { ...word, id };
    await db.words.add(newWord);
    return id;
  }

  async addWords(words: Omit<Word, 'id'>[]): Promise<string[]> {
    const wordsWithIds: Word[] = words.map(word => ({
      ...word,
      id: uuidv4()
    }));
    
    await db.words.bulkAdd(wordsWithIds);
    return wordsWithIds.map(w => w.id);
  }

  async deleteWord(id: string): Promise<void> {
    await db.transaction('rw', db.words, db.reviews, db.srs, async () => {
      await db.words.delete(id);
      await db.reviews.where('wordId').equals(id).delete();
      await db.srs.delete(id);
    });
  }

  async exportData(): Promise<{ words: Word[], reviews: Review[], srs: SRS[] }> {
    const [words, reviews, srs] = await Promise.all([
      db.words.toArray(),
      db.reviews.toArray(),
      db.srs.toArray()
    ]);
    
    return { words, reviews, srs };
  }

  async importData(data: { words: Word[], reviews: Review[], srs: SRS[] }): Promise<void> {
    await db.transaction('rw', db.words, db.reviews, db.srs, async () => {
      await db.words.clear();
      await db.reviews.clear();
      await db.srs.clear();
      
      await db.words.bulkAdd(data.words);
      await db.reviews.bulkAdd(data.reviews);
      await db.srs.bulkAdd(data.srs);
    });
  }

  async clearAll(): Promise<void> {
    await db.transaction('rw', db.words, db.reviews, db.srs, async () => {
      await db.words.clear();
      await db.reviews.clear();
      await db.srs.clear();
    });
  }
}

export class ReviewRepository {
  async addReview(wordId: string, rating: Rating): Promise<void> {
    const review: Review = {
      wordId,
      ts: Date.now(),
      rating
    };
    
    await db.reviews.add(review);
  }

  async getReviews(wordId: string): Promise<Review[]> {
    return await db.reviews.where('wordId').equals(wordId).toArray();
  }

  async getAllReviews(): Promise<Review[]> {
    return await db.reviews.toArray();
  }
}

export class SRSRepository {
  async getSRS(wordId: string): Promise<SRS | undefined> {
    return await db.srs.get(wordId);
  }

  async setSRS(srs: SRS): Promise<void> {
    await db.srs.put(srs);
  }

  async getDueWords(): Promise<SRS[]> {
    const now = new Date().toISOString();
    return await db.srs.where('due').belowOrEqual(now).toArray();
  }

  async getAllSRS(): Promise<SRS[]> {
    return await db.srs.toArray();
  }

  async initializeSRS(wordId: string): Promise<SRS> {
    const srs: SRS = {
      wordId,
      ease: 2.5,
      interval: 0,
      due: new Date().toISOString(),
      reps: 0
    };
    
    await this.setSRS(srs);
    return srs;
  }
}

// Singleton instances
export const wordRepository = new WordRepository();
export const reviewRepository = new ReviewRepository();
export const srsRepository = new SRSRepository();