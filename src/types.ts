export interface Category {
  id: string;
  name: string;
}

export interface Work {
  id: string;
  categoryId: string;
  name: string;
  note?: string;
  img?: string;        // Primary asset URL
  images?: string[];   // All uploaded asset URLs for this concept
  presetStyle?: number;
}

export interface ReviewConfig {
  id: string;
  title: string;
  brief: string;
  categories: Category[];
  works: Work[];
  maxSubmits: number;  // e.g. 1, 2, 3 times
  pin: string;         // Admin passcode
  open: boolean;       // Voting status
  createdAt: number;
  updatedAt: number;
}

export interface Ballot {
  key: string;
  voterId: string;
  name: string;
  count: number;
  votes: Record<string, string>; // categoryId -> workId
  timestamp: number;
}

export interface TallyRow {
  work: Work;
  pts: number;
  votes: number;
  rank: number;
}

export interface Voter {
  id: string;
  name: string;
}

export interface ReviewStateResponse {
  cfg: ReviewConfig;
  ballots: Ballot[];
}
