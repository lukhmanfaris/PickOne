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
  open: boolean;       // Voting status
  sizingOpen: boolean; // Jersey sizing form status
  createdAt: number;
  updatedAt: number;
  // NOTE: `pin` deliberately absent.
  // The admin passcode never leaves the database. Reads come from the
  // `reviews_public` view, which has no pin column at all. The PIN lives
  // only in React state after a successful verifyAdminPasscode() call.
}

/** Shape sent to saveReviewConfig(). `pin` here means "set a NEW pin". */
export interface SaveConfigPayload {
  title?: string;
  brief?: string;
  categories?: Category[];
  works?: Work[];
  maxSubmits?: number;
  pin?: string;         // optional: rotate the admin passcode
  currentPin?: string;  // required: authorises the write
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
