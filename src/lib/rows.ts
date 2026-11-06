/** Server-side helper: zip `${prefix}_${col}[]` arrays into row objects, dropping empty rows. */
export function zipRows(obj: Record<string, unknown>, prefix: string, cols: string[], requiredCol: string) {
  const arr = (c: string) => ((obj[`${prefix}_${c}`] as string[] | undefined) ?? []).map((v) => String(v).trim().slice(0, 300));
  const columns = Object.fromEntries(cols.map((c) => [c, arr(c)]));
  const n = Math.max(0, ...cols.map((c) => columns[c].length));
  const rows: Record<string, string>[] = [];
  for (let i = 0; i < n && rows.length < 20; i++) {
    const r = Object.fromEntries(cols.map((c) => [c, columns[c][i] ?? ""]));
    if (r[requiredCol]) rows.push(r);
  }
  return rows;
}
