let revision = 0;
let committed;
export async function readShared() {
  const response = await fetch('/api/data', { cache: 'no-store', signal: AbortSignal.timeout(5000) });
  const result = await response.json();
  if (!response.ok) throw Error(result.error || 'Shared storage is unavailable.');
  return result;
}
export function adoptShared(result) {
  revision = result.revision;
  committed = result.data;
  return result.data ? structuredClone(result.data) : null;
}
export async function loadShared() {
  return adoptShared(await readShared());
}
export async function writeShared(data) {
  const response = await fetch('/api/data', {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ revision, data }), signal: AbortSignal.timeout(10000),
  });
  const result = await response.json();
  if (!response.ok) throw Error(result.error || 'Shared storage could not be saved.');
  revision = result.revision;
  committed = result.data;
}
export const lastSaved = () => committed && structuredClone(committed);
export const currentRevision = () => revision;
