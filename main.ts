// make.fun bounty entry: world news of Tuesday 24 November 2026, as one image.
// Node 22+, standard library only, no network. Deterministic output.
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const W = 1024;
const H = 1024;
type RGB = [number, number, number];
const px = new Uint8Array(W * H * 3);

// ---------- drawing primitives ----------
function rect(x: number, y: number, w: number, h: number, c: RGB): void {
  const x0 = Math.max(0, x), y0 = Math.max(0, y);
  const x1 = Math.min(W, x + w), y1 = Math.min(H, y + h);
  for (let j = y0; j < y1; j++) {
    for (let i = x0; i < x1; i++) {
      const o = (j * W + i) * 3;
      px[o] = c[0]; px[o + 1] = c[1]; px[o + 2] = c[2];
    }
  }
}

// 5x7 bitmap font, uppercase only. Each glyph = 7 rows of 5 bits.
const FONT_SRC =
  "A:0E,11,11,1F,11,11,11;B:1E,11,11,1E,11,11,1E;C:0E,11,10,10,10,11,0E;" +
  "D:1E,11,11,11,11,11,1E;E:1F,10,10,1E,10,10,1F;F:1F,10,10,1E,10,10,10;" +
  "G:0E,11,10,17,11,11,0F;H:11,11,11,1F,11,11,11;I:0E,04,04,04,04,04,0E;" +
  "J:07,02,02,02,02,12,0C;K:11,12,14,18,14,12,11;L:10,10,10,10,10,10,1F;" +
  "M:11,1B,15,15,11,11,11;N:11,11,19,15,13,11,11;O:0E,11,11,11,11,11,0E;" +
  "P:1E,11,11,1E,10,10,10;Q:0E,11,11,11,15,12,0D;R:1E,11,11,1E,14,12,11;" +
  "S:0F,10,10,0E,01,01,1E;T:1F,04,04,04,04,04,04;U:11,11,11,11,11,11,0E;" +
  "V:11,11,11,11,11,0A,04;W:11,11,11,15,15,15,0A;X:11,11,0A,04,0A,11,11;" +
  "Y:11,11,0A,04,04,04,04;Z:1F,01,02,04,08,10,1F;" +
  "0:0E,11,13,15,19,11,0E;1:04,0C,04,04,04,04,0E;2:0E,11,01,02,04,08,1F;" +
  "3:1F,02,04,02,01,11,0E;4:02,06,0A,12,1F,02,02;5:1F,10,1E,01,01,11,0E;" +
  "6:06,08,10,1E,11,11,0E;7:1F,01,02,04,08,08,08;8:0E,11,11,0E,11,11,0E;" +
  "9:0E,11,11,0F,01,02,0C;" +
  ".:00,00,00,00,00,0C,0C;,:00,00,00,00,0C,04,08;::00,0C,0C,00,0C,0C,00;" +
  "-:00,00,00,1F,00,00,00;/:01,02,02,04,08,08,10;%:18,19,02,04,08,13,03;" +
  "+:00,04,04,1F,04,04,00;(:02,04,08,08,08,04,02;):08,04,02,02,02,04,08;" +
  "!:04,04,04,04,04,00,04;?:0E,11,01,02,04,00,04;\":0A,0A,0A,00,00,00,00;" +
  "':0C,04,08,00,00,00,00";
const FONT = new Map<string, number[]>();
for (const entry of FONT_SRC.split(";")) {
  const ch = entry[0];
  FONT.set(ch, entry.slice(2).split(",").map((h) => parseInt(h, 16)));
}

function drawText(s: string, x: number, y: number, scale: number, c: RGB): void {
  let cx = x;
  for (const ch of s) {
    const g = FONT.get(ch);
    if (g) {
      for (let r = 0; r < 7; r++) {
        for (let k = 0; k < 5; k++) {
          if (g[r] & (1 << (4 - k))) rect(cx + k * scale, y + r * scale, scale, scale, c);
        }
      }
    }
    cx += 6 * scale;
  }
}

function textWidth(s: string, scale: number): number {
  return s.length * 6 * scale - scale;
}

function wrap(s: string, maxChars: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of s.split(" ")) {
    const next = line ? line + " " + word : word;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// ---------- content (checked against Democracy Now headlines and AAA, 24 Nov 2026) ----------
interface Tile { tag: string; color: RGB; head: string; detail: string }
const TILES: Tile[] = [
  { tag: "TECH + MARKETS", color: [37, 99, 235],
    head: "NVIDIA REINSTATES JENSEN HUANG AS CEO",
    detail: "TRUMP CALLED INTO THE BOARD MEETING TO PUSH FOR HIS RETURN. SHARES JUMPED OVER 30%." },
  { tag: "RUSSIA - UKRAINE", color: [220, 38, 38],
    head: "RUSSIAN STRIKE HITS ZAPORIZHZHIA",
    detail: "2 DEAD, 40+ HURT. MOSCOW SAYS ESTONIA IS ON THE VERGE OF TRIGGERING \"OPEN WAR\"." },
  { tag: "GAZA", color: [5, 150, 105],
    head: "ISRAELI STRIKE KILLS 2 POLICE IN AL-MAWASI",
    detail: "OXFAM REPORT: TOXIC CONTAMINATION ACROSS 99% OF GAZA'S TERRITORY." },
  { tag: "IRAN - HORMUZ", color: [234, 88, 12],
    head: "IRAN CLAIMS TANKERS HIT MINES IN HORMUZ",
    detail: "US NAVAL BLOCKADE OF IRANIAN PORTS CONTINUES. MINE CLAIMS NOT INDEPENDENTLY VERIFIED." },
  { tag: "SUDAN", color: [147, 51, 234],
    head: "RSF DRONES TARGET KHARTOUM",
    detail: "AIRPORT AND A UN FACILITY STRUCK, AT LEAST 4 REPORTED KILLED. POWER GRID NEARS COLLAPSE." },
  { tag: "UNITED STATES", color: [13, 148, 136],
    head: "81.5 MILLION EXPECTED TO TRAVEL FOR THANKSGIVING",
    detail: "AAA FORECAST FOR NOV 24-30, DOWN 0.1% FROM 2025. NEARLY 90% WILL DRIVE." },
];

// ---------- layout ----------
// background: deterministic vertical gradient
for (let j = 0; j < H; j++) {
  const t = j / (H - 1);
  rect(0, j, W, 1, [Math.round(14 + 8 * t), Math.round(20 + 10 * t), Math.round(30 + 16 * t)]);
}

const WHITE: RGB = [245, 247, 250];
const GREY: RGB = [176, 186, 200];
const CARD: RGB = [30, 38, 50];

// title block
rect(0, 0, W, 118, [10, 14, 22]);
rect(0, 118, W, 4, [250, 204, 21]);
drawText("WORLD NEWS", 24, 16, 6, WHITE);
drawText("TUESDAY 24 NOVEMBER 2026", 24, 68, 4, [250, 204, 21]);
drawText("IN 6 STORIES", W - 24 - textWidth("IN 6 STORIES", 3), 30, 3, GREY);

// tiles: 2 columns x 3 rows
const M = 24, G = 16, TOP = 138;
const TW = (W - 2 * M - G) / 2;           // 480
const TH = 274;
for (let n = 0; n < TILES.length; n++) {
  const t = TILES[n];
  const x = M + (n % 2) * (TW + G);
  const y = TOP + Math.floor(n / 2) * (TH + G);
  rect(x, y, TW, TH, CARD);
  rect(x, y, TW, 42, t.color);
  drawText(t.tag, x + 16, y + 11, 3, WHITE);
  const num = String(n + 1);
  drawText(num, x + TW - 16 - textWidth(num, 3), y + 11, 3, WHITE);
  let ty = y + 58;
  for (const line of wrap(t.head, 18)) {
    drawText(line, x + 16, ty, 4, WHITE);
    ty += 38;
  }
  ty += 6;
  rect(x + 16, ty, 56, 3, t.color);
  ty += 14;
  for (const line of wrap(t.detail, 36)) {
    drawText(line, x + 16, ty, 2, GREY);
    ty += 21;
  }
}

// footer
drawText("SOURCES: DEMOCRACY NOW HEADLINES, AAA. IRANIAN CLAIMS UNVERIFIED.", M, 1000, 2, GREY);

// ---------- PNG encoding (stdlib only) ----------
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c >>> 0;
}
function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Uint8Array): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), Buffer.from(data)]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // truecolor RGB
  const raw = Buffer.alloc((W * 3 + 1) * H);
  for (let j = 0; j < H; j++) {
    const o = j * (W * 3 + 1);
    raw[o] = 0; // filter: none
    raw.set(px.subarray(j * W * 3, (j + 1) * W * 3), o + 1);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", new Uint8Array(0)),
  ]);
}

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "entry.png"), encodePng());
