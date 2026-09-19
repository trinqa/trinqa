export function stageLog(index: number, total: number, label: string, status: 'PASS' | 'FAIL' | 'SKIP', detail?: string) {
  const msg = `[${index}/${total}] ${label} — ${status}`;
  console.log(detail ? `${msg} (${detail})` : msg);
}
