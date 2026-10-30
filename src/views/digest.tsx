import type { DigestRow } from '../digest/types.js';

const dash = '—';

function Row({ row }: { row: DigestRow }) {
  const failed = row.lastStatus === 'fail';
  return (
    <tr>
      <td>{row.job}</td>
      <td>{row.owner === null || row.owner === '' ? dash : row.owner}</td>
      <td>{row.runs}</td>
      <td class={row.retries >= 3 ? 'warn' : undefined}>{row.retries}</td>
      <td class={failed ? 'warn' : undefined}>{row.lastStatus}</td>
      <td class={failed ? 'warn' : undefined}>{row.lastError === null || row.lastError === '' ? dash : row.lastError}</td>
      <td>{row.firstAt}</td>
      <td>{row.lastAt}</td>
    </tr>
  );
}

export function DigestPage({ night, rows, badLines }: { night: string; rows: DigestRow[]; badLines: number }) {
  return (
    <>
      <h1>digest · {night}</h1>
      {badLines > 0 && (
        <p class="warn">
          {badLines} {badLines === 1 ? 'line' : 'lines'} couldn't be read
        </p>
      )}
      {rows.length === 0 ? (
        <p class="mute">nothing ran</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>job</th>
              <th>owner</th>
              <th>runs</th>
              <th>retries</th>
              <th>last status</th>
              <th>last error</th>
              <th>first</th>
              <th>last</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <Row row={row} />
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

export function DigestNotFound({ night }: { night: string }) {
  return (
    <>
      <h1>digest · {night}</h1>
      <p class="mute">no run log for this night</p>
    </>
  );
}
