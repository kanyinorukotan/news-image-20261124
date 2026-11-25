// make.fun bounty entry: world news of Tuesday 24 November 2026, as one image.
// Node 22+, standard library only, no network. Deterministic output.
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const W = 1024;
const H = 1024;
const MAX_BYTES = 1048576;
type RGB = readonly [number, number, number];

// ---------- canvas ----------
class Canvas {
  pixels = new Uint8Array(W * H * 3);

  rect(x: number, y: number, w: number, h: number, c: RGB): void {
    const x0 = Math.max(0, Math.round(x));
    const y0 = Math.max(0, Math.round(y));
    const x1 = Math.min(W, Math.round(x + w));
    const y1 = Math.min(H, Math.round(y + h));
    for (let j = y0; j < y1; j++) {
      for (let i = x0; i < x1; i++) {
        const o = (j * W + i) * 3;
        this.pixels[o] = c[0];
        this.pixels[o + 1] = c[1];
        this.pixels[o + 2] = c[2];
      }
    }
  }

  hline(x: number, y: number, len: number, thickness: number, c: RGB): void {
    this.rect(x, y, len, thickness, c);
  }

  text(s: string, x: number, y: number, scale: number, c: RGB): void {
    const upper = s.toUpperCase();
    for (let i = 0; i < upper.length; i++) {
      const glyph = FONT.get(upper[i]);
      if (!glyph) continue;
      for (let r = 0; r < 7; r++) {
        const bits = glyph[r];
        if (!bits) continue;
        for (let k = 0; k < 5; k++) {
          if (bits & (1 << (4 - k))) {
            this.rect(x + (i * 6 + k) * scale, y + r * scale, scale, scale, c);
          }
        }
      }
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
  FONT.set(entry[0], entry.slice(2).split(",").map((row) => parseInt(row, 16)));
}

function textWidth(s: string, scale: number): number {
  return s.length === 0 ? 0 : (s.length * 6 - 1) * scale;
}

function wrapWords(s: string, maxChars: number): string[] {
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

function requireFits(label: string, s: string, x: number, y: number, maxX: number, maxY: number, scale: number): void {
  const right = x + textWidth(s, scale);
  const bottom = y + 7 * scale;
  if (right > maxX || bottom > maxY) {
    throw new Error(`${label} does not fit: "${s}" ends at ${right},${bottom} past ${maxX},${maxY}`);
  }
}

// ---------- content ----------
interface Tile {
  tag: string;
  color: RGB;
  head: string;
  detail: string;
}

const TILES: Tile[] = [
  {
    tag: "TECH + MARKETS",
    color: [37, 99, 235],
    head: "NVIDIA REINSTATES JENSEN HUANG AS CEO",
    detail: "TRUMP CALLED INTO THE BOARD MEETING TO PUSH FOR HIS RETURN. SHARES JUMPED OVER 30%.",
  },
  {
    tag: "RUSSIA - UKRAINE",
    color: [220, 38, 38],
    head: "RUSSIAN STRIKE HITS ZAPORIZHZHIA",
    detail: '2 DEAD, 40+ HURT. MOSCOW SAYS ESTONIA IS ON THE VERGE OF TRIGGERING "OPEN WAR".',
  },
  {
    tag: "GAZA",
    color: [5, 150, 105],
    head: "ISRAELI STRIKE KILLS 2 POLICE IN AL-MAWASI",
    detail: "OXFAM REPORT: TOXIC CONTAMINATION ACROSS 99% OF GAZA'S TERRITORY.",
  },
  {
    tag: "IRAN - HORMUZ",
    color: [234, 88, 12],
    head: "IRAN CLAIMS TANKERS HIT MINES IN HORMUZ",
    detail: "US NAVAL BLOCKADE OF IRANIAN PORTS CONTINUES. MINE CLAIMS NOT INDEPENDENTLY VERIFIED.",
  },
  {
    tag: "SUDAN",
    color: [147, 51, 234],
    head: "RSF DRONES TARGET KHARTOUM",
    detail: "AIRPORT AND A UN FACILITY STRUCK, AT LEAST 4 REPORTED KILLED. POWER GRID NEARS COLLAPSE.",
  },
  {
    tag: "UNITED STATES",
    color: [13, 148, 136],
    head: "81.5 MILLION EXPECTED TO TRAVEL FOR THANKSGIVING",
    detail: "AAA FORECAST FOR NOV 24-30, DOWN 0.1% FROM 2025. NEARLY 90% WILL DRIVE.",
  },
];

const WHITE: RGB = [245, 247, 250];
const GREY: RGB = [176, 186, 200];
const CARD: RGB = [30, 38, 50];
const GOLD: RGB = [250, 204, 21];
const ICON_BG: RGB = [42, 52, 66];
const M = 24;
const GAP = 16;
const TOP = 138;
const TILE_W = (W - 2 * M - GAP) / 2;
const TILE_H = 274;

// 7x7 pictograms, one per story, drawn at 6px per cell.
const ICONS: string[][] = [
  ["..###..", ".#####.", "##.#.##", "#######", "##.#.##", ".#####.", "..###.."],
  ["..#.#..", "...#...", ".#####.", "#.###.#", ".#####.", "...#...", "..#.#.."],
  [".##.##.", ".##.##.", ".####..", "...##..", ".####..", ".##.##.", ".##.##."],
  [".......", "..###..", ".#####.", "#######", "..###..", ".#.#.#.", "#.#.#.#"],
  ["##...##", "##...##", "..###..", ".#####.", "..###..", "##...##", "##...##"],
  ["..###..", ".#####.", "##...##", "##.#.##", "##.#.##", "##...##", ".#####."],
];

function drawIcon(canvas: Canvas, pattern: string[], x: number, y: number, color: RGB): void {
  canvas.rect(x - 5, y - 5, 52, 52, ICON_BG);
  for (let r = 0; r < pattern.length; r++) {
    const row = pattern[r];
    if (row.length !== 7) throw new Error("icon rows must be seven cells wide");
    for (let c = 0; c < row.length; c++) {
      if (row[c] === "#") canvas.rect(x + c * 6, y + r * 6, 6, 6, color);
    }
  }
}

function drawTile(canvas: Canvas, tile: Tile, index: number): void {
  const x = M + (index % 2) * (TILE_W + GAP);
  const y = TOP + Math.floor(index / 2) * (TILE_H + GAP);
  const innerRight = x + TILE_W - 16;
  const innerBottom = y + TILE_H - 8;

  canvas.rect(x, y, TILE_W, TILE_H, CARD);
  canvas.rect(x, y, TILE_W, 42, tile.color);
  const number = String(index + 1);
  requireFits("tag", tile.tag, x + 16, y + 11, innerRight - textWidth(number, 3) - 16, y + 42, 3);
  requireFits("number", number, innerRight - textWidth(number, 3), y + 11, innerRight, y + 42, 3);
  canvas.text(tile.tag, x + 16, y + 11, 3, WHITE);
  canvas.text(number, innerRight - textWidth(number, 3), y + 11, 3, WHITE);

  let ty = y + 58;
  for (const line of wrapWords(tile.head, 18)) {
    requireFits("headline", line, x + 16, ty, innerRight, innerBottom, 4);
    canvas.text(line, x + 16, ty, 4, WHITE);
    ty += 34;
  }

  ty += 6;
  canvas.hline(x + 16, ty, 56, 3, tile.color);
  ty += 14;
  for (const line of wrapWords(tile.detail, 30)) {
    requireFits("detail", line, x + 16, ty, x + TILE_W - 70, innerBottom, 2);
    canvas.text(line, x + 16, ty, 2, GREY);
    ty += 20;
  }
  drawIcon(canvas, ICONS[index], x + TILE_W - 62, y + TILE_H - 60, tile.color);
}

function drawImage(): Canvas {
  const canvas = new Canvas();
  for (let j = 0; j < H; j++) {
    const t = j / (H - 1);
    canvas.rect(0, j, W, 1, [Math.round(14 + 8 * t), Math.round(20 + 10 * t), Math.round(30 + 16 * t)]);
  }

  canvas.rect(0, 0, W, 118, [10, 14, 22]);
  canvas.hline(0, 118, W, 4, GOLD);
  canvas.text("WORLD NEWS", 24, 16, 6, WHITE);
  canvas.text("TUESDAY 24 NOVEMBER 2026", 24, 68, 4, GOLD);
  canvas.rect(848, 18, 152, 82, ICON_BG);
  canvas.hline(848, 18, 152, 3, GOLD);
  canvas.text("24", 862, 26, 8, GOLD);
  canvas.text("NOV 2026", 862, 82, 2, WHITE);

  TILES.forEach((tile, index) => drawTile(canvas, tile, index));

  const footer = "SOURCES: DEMOCRACY NOW HEADLINES, AAA. IRANIAN CLAIMS UNVERIFIED.";
  requireFits("footer", footer, M, 1000, W - M, H, 2);
  canvas.text(footer, M, 1000, 2, GREY);
  return canvas;
}

// ---------- PNG encoding and validation ----------
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

function encodePng(pixels: Uint8Array): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // truecolor RGB
  const stride = W * 3 + 1;
  const raw = Buffer.alloc(stride * H);
  for (let j = 0; j < H; j++) {
    const row = j * stride;
    raw[row] = 0; // filter: none
    raw.set(pixels.subarray(j * W * 3, (j + 1) * W * 3), row + 1);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", new Uint8Array(0)),
  ]);
}

function verifyPng(buf: Buffer): void {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (buf.length < 33 || !buf.subarray(0, 8).equals(signature)) throw new Error("not a PNG");
  if (buf.readUInt32BE(16) !== W || buf.readUInt32BE(20) !== H) throw new Error("wrong PNG dimensions");

  let offset = 8;
  let chunks = 0;
  let ended = false;
  while (offset + 12 <= buf.length) {
    const length = buf.readUInt32BE(offset);
    if (length > buf.length - offset - 12) throw new Error("truncated PNG chunk");
    const type = buf.toString("ascii", offset + 4, offset + 8);
    const data = buf.subarray(offset + 8, offset + 8 + length);
    const expected = buf.readUInt32BE(offset + 8 + length);
    if (crc32(Buffer.concat([Buffer.from(type, "ascii"), data])) !== expected) {
      throw new Error(`bad CRC in ${type}`);
    }
    chunks++;
    offset += 12 + length;
    if (type === "IEND") {
      ended = true;
      break;
    }
  }
  if (!ended || offset !== buf.length || chunks !== 3) throw new Error("incomplete PNG stream");
  if (buf.length > MAX_BYTES) throw new Error(`PNG is ${buf.length} bytes, over ${MAX_BYTES}`);
}

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
const png = encodePng(drawImage().pixels);
verifyPng(png);
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "entry.png"), png);
