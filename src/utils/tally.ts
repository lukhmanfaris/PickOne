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

  // Assign ranks WITHIN each category.
  //
  // The previous version used the global row index (`i + 1`), so only the
  // first category ranked correctly — every category after it continued the
  // running count and showed 4, 5, 6 instead of 1, 2, 3. Grouping first and
  // numbering within each group fixes that. Equal points share a rank, and
  // the next distinct score skips ahead (1, 1, 3) the way standings normally
  // work.
  const byCategory = new Map<string, TallyRow[]>();
  rows.forEach((row) => {
    const cat = row.work.categoryId || "";
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat)!.push(row);
  });

  byCategory.forEach((catRows) => {
    catRows.forEach((row, i) => {
      if (i > 0 && row.pts === catRows[i - 1].pts) {
        row.rank = catRows[i - 1].rank; // tie shares the rank
      } else {
        row.rank = i + 1;
      }
    });
  });

  return rows;
}
