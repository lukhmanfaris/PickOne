import { ReviewConfig, Ballot, TallyRow } from "../types";

export function calculateTally(cfg: ReviewConfig, ballots: Ballot[]): TallyRow[] {
  if (!cfg || !cfg.works) return [];
  
  const map = new Map<string, { pts: number; votes: number }>();

  cfg.works.forEach((w) => {
    map.set(w.id, { pts: 0, votes: 0 });
  });

  ballots.forEach((b) => {
    if (!b.votes || typeof b.votes !== 'object') return;
    
    // Each vote gives 1 point to the concept in that category
    Object.values(b.votes).forEach((workId) => {
      const entry = map.get(workId);
      if (entry) {
        entry.pts += 1;
        entry.votes += 1;
      }
    });
  });

  const rows: TallyRow[] = cfg.works.map((work) => {
    const data = map.get(work.id) || { pts: 0, votes: 0 };
    return {
      work,
      pts: data.pts,
      votes: data.votes,
      rank: 1
    };
  });

  // Sort by points within categories (handled mostly by JuryPanel rendering)
  // but overall sorting helps to get the leader.
  rows.sort((a, b) => {
    const catA = a.work.categoryId || "";
    const catB = b.work.categoryId || "";
    if (catA !== catB) {
      return catA.localeCompare(catB);
    }
    if (b.pts !== a.pts) return b.pts - a.pts;
    return a.work.name.localeCompare(b.work.name);
  });

  // Assign ranks within categories
  let currentCat = "";
  let currentRank = 1;
  rows.forEach((row, i) => {
    const cat = row.work.categoryId || "";
    if (cat !== currentCat) {
      currentCat = cat;
      currentRank = 1;
    } else if (i > 0 && row.pts < rows[i - 1].pts) {
      currentRank = i + 1;
    }
    row.rank = currentRank;
  });

  return rows;
}
