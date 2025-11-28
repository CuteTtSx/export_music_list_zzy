export interface SongEntry {
  songName: string;
  artistName: string;
}

export enum ProcessingStatus {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export interface ParsingResult {
  songs: SongEntry[];
  error?: string;
}