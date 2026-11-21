// The WhatsApp share card as a PNG. It is drawn ONLY from names, score and verdict: the function
// has no way to receive birth details, so they can never reach the image (CLAUDE.md privacy rule).
import type { Status } from './components/StatusChip';
import type { Lang } from './types';

export type ShareCardData = {
  names: [string, string];
  score: number;
  max: number;
  verdict: string;
  status: Status;
  approxLabel?: string | undefined;
  kicker: string;
  foot: string;
  lang: Lang;
};

// The light theme of design/handoff tokens.json: a shared image should look the same in any theme.
const C = { surface: '#ffffff', ink: '#2b1d14', muted: '#6b5848', gold: '#b8860b', leaf: '#2e7d32', leafSoft: '#e6f2e3', kumkum: '#c8102e', caution: '#e07a1f', avoid: '#8e1b1b' };
const FILL: Record<Status, [string, string]> = { good: [C.leaf, '#ffffff'], mixed: [C.caution, C.ink], avoid: [C.avoid, '#ffffff'] };

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

export async function drawShareCard(d: ShareCardData): Promise<Blob> {
  const W = 640, H = 820, S = 2; // 320 × 410 CSS px at 2×
  const display = d.lang === 'te' ? 'Ramabhadra, "Noto Sans Telugu", sans-serif' : 'Fraunces, Georgia, serif';
  const body = '"Noto Sans Telugu", "Noto Sans", sans-serif';
  await Promise.all([`26px ${display}`, `600 14px ${body}`, '600 56px Fraunces'].map((f) => document.fonts.load(f).catch(() => undefined)));

  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const g = canvas.getContext('2d');
  if (!g) throw new Error('canvas unavailable');
  g.scale(S, S);
  const w = W / S, h = H / S;

  // Card with the double gold border.
  g.fillStyle = C.surface; g.fillRect(0, 0, w, h);
  g.strokeStyle = C.gold; g.lineWidth = 1.5; roundRect(g, 1, 1, w - 2, h - 2, 16); g.stroke();
  g.lineWidth = 1; roundRect(g, 7, 7, w - 14, h - 14, 11); g.stroke();

  // Thoranam (mango-leaf festoon), as in the design.
  g.strokeStyle = C.gold; g.lineWidth = 1.5;
  g.beginPath(); g.moveTo(54, 18); g.quadraticCurveTo(w / 2, 34, w - 54, 18); g.stroke();
  for (let i = 0; i <= 8; i++) {
    const t = i / 8, x = 54 + (w - 108) * t, y = 18 + 2 * t * (1 - t) * 16, len = i % 2 ? 14 : 19, lw = i % 2 ? 4 : 5;
    g.beginPath(); g.moveTo(x, y);
    g.bezierCurveTo(x - lw, y + len * 0.3, x - lw, y + len * 0.7, x, y + len);
    g.bezierCurveTo(x + lw, y + len * 0.7, x + lw, y + len * 0.3, x, y);
    g.fillStyle = C.leafSoft; g.fill(); g.strokeStyle = C.leaf; g.stroke();
  }

  g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  g.fillStyle = C.muted; g.font = `600 14px ${body}`; g.fillText(d.kicker, w / 2, 86);
  g.fillStyle = C.ink; g.font = `${d.lang === 'en' ? '600 ' : ''}26px ${display}`;
  fitText(g, d.names.join(' & '), w / 2, 124, w - 48);

  g.font = '600 56px Fraunces, Georgia, serif';
  const score = fmt(d.score), max = `/${d.max}`;
  const sw = g.measureText(score).width; g.font = '22px Fraunces, Georgia, serif';
  const mw = g.measureText(max).width;
  g.textAlign = 'left'; g.fillStyle = C.ink; g.font = '600 56px Fraunces, Georgia, serif';
  g.fillText(score, w / 2 - (sw + mw) / 2, 200);
  g.fillStyle = C.muted; g.font = '22px Fraunces, Georgia, serif'; g.fillText(max, w / 2 - (sw + mw) / 2 + sw + 2, 200);

  // Verdict chip.
  g.textAlign = 'center'; g.font = `600 15px ${body}`;
  const vw = g.measureText(d.verdict).width + 32;
  const [bg, fg] = FILL[d.status];
  g.fillStyle = bg; roundRect(g, w / 2 - vw / 2, 222, vw, 32, 16); g.fill();
  g.fillStyle = fg; g.fillText(d.verdict, w / 2, 243);

  if (d.approxLabel) { g.fillStyle = C.muted; g.font = `13px ${body}`; g.fillText(d.approxLabel, w / 2, 282); }

  g.fillStyle = C.kumkum; g.font = '600 16px Fraunces, Georgia, serif'; g.fillText('AstroZ', w / 2, h - 52);
  g.fillStyle = C.muted; g.font = `13px ${body}`; g.fillText(d.foot, w / 2, h - 30);

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png'));
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

function fitText(g: CanvasRenderingContext2D, text: string, x: number, y: number, max: number) {
  const size = parseFloat(g.font.match(/(\d+)px/)?.[1] ?? '26');
  let s = size;
  while (g.measureText(text).width > max && s > 14) { s -= 1; g.font = g.font.replace(/\d+px/, `${s}px`); }
  g.fillText(text, x, y);
}

/** Share via the system sheet (WhatsApp etc.) when files can be shared; otherwise download the PNG. */
export async function shareOrSave(blob: Blob, mode: 'share' | 'save'): Promise<'shared' | 'saved'> {
  const file = new File([blob], 'astroz-match.png', { type: 'image/png' });
  if (mode === 'share' && navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file] });
    return 'shared';
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'astroz-match.png'; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'saved';
}
