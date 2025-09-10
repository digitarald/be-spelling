import Dexie, { Table } from 'dexie';
import { Word, Review, SRS } from '@/lib/types';

export class BeSpellingDatabase extends Dexie {
  words!: Table<Word>;
  reviews!: Table<Review>;
  srs!: Table<SRS>;

  constructor() {
    super('BeSpellingDatabase');
    
    this.version(1).stores({
      words: 'id, text, hint, sourcePromptHash',
      reviews: '++id, wordId, ts, rating',
      srs: 'wordId, ease, interval, due, reps'
    });
  }
}

export const db = new BeSpellingDatabase();