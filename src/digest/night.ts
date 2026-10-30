// Plan morning-digest § 2b: validate :night at the edge so it can't reach outside runsDir.
const NIGHT = /^\d{4}-\d{2}-\d{2}$/;

export function isNight(value: string): boolean {
  if (!NIGHT.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}
