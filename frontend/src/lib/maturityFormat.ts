import type { MaturityLevel } from "@/api/types";

export function getLevelNumber(
  levelName: string | undefined,
  levels?: MaturityLevel[] | null
): number | null {
  if (!levelName) return null;

  const normalized = levelName.trim().toLowerCase();
  const list = levels?.length
    ? [...levels].sort((a, b) => a.number - b.number)
    : [];

  for (const lvl of list) {
    if (lvl.name && lvl.name.trim().toLowerCase() === normalized) {
      return lvl.number;
    }
  }

  const levelMap: Record<string, number> = {
    "not implemented": 1,
    initial: 2,
    managed: 3,
    defined: 4,
    optimised: 5,
    optimized: 5,
  };

  if (levelMap[normalized]) {
    return levelMap[normalized];
  }

  const levelMatch = normalized.match(/level\s+(\d+)/);
  if (levelMatch) {
    return Number(levelMatch[1]);
  }

  return null;
}

export function formatLevelWithNumber(
  levelName: string | undefined,
  levels: MaturityLevel[] | null | undefined,
  scaleN: number
): string {
  if (!levelName) return "N/A";
  const levelNumber = getLevelNumber(levelName, levels ?? null);
  return levelNumber != null
    ? `${levelName} (Level ${levelNumber} of ${scaleN})`
    : levelName;
}

export function formatScore1ToN(
  avg: number | null | undefined,
  scaleN: number
): string {
  const n = Number(avg);
  return Number.isFinite(n) ? `${n.toFixed(1)} / ${scaleN}` : "—";
}
