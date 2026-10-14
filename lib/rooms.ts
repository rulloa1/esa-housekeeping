// Authentic physical room numbers from property evacuation plans:
// East Corridor (Odd): 01, 03, 05, 07, 09, 11, 15, 17, 23, 25, 27, 29, 31, 33, 35, 37, 39, 41, 43, 45 (13 skipped; 19, 21 elevator lobby)
// West Corridor (Even): 02, 04, 06, 08, 10, 12, 16, 18, 20, 22, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46 (14, 24 skipped; 22, 26, 28 oversized)

export const FLOOR_ROOM_NUMBERS: number[] = [
  1, 3, 5, 7, 9, 11, 15, 17, 23, 25, 27, 29, 31, 33, 35, 37, 39, 41, 43, 45,
  2, 4, 6, 8, 10, 12, 16, 18, 20, 22, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46,
].sort((a, b) => a - b);

export const SUITES: string[] = [1, 2, 3].flatMap((f) =>
  FLOOR_ROOM_NUMBERS.map((n) => `${f}${String(n).padStart(2, "0")}`)
);

export const ALL_SUITES: string[] = SUITES;
