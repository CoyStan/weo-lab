// Where the cards sit and where each arrow leaves and enters them. Three
// columns (causes, channels, goals) side by side, or three rows on a phone.
// Every arrow gets its own slot on each card it touches, so arrows stack
// without overlapping and each one's number tag at the goal has room.

export type Mode = "h" | "v";
export type Box = { x: number; y: number; w: number; h: number };
/** `tag`: the arrow carries its cause's number tag at the goal, so its slot there leaves room for it. */
export type LFlow = { id: string; cause: string; channel: string; metric: string; thick: number; tag?: boolean };
/** Offsets of an arrow's four ends along the card side, from the card's top (columns) or left (rows). */
export type Ports = [causeOut: number, chanIn: number, chanOut: number, goalIn: number];
export type Layout = { nodes: Map<string, Box>; ports: Map<string, Ports>; height: number };

export type LayoutInput = {
  mode: Mode;
  W: number;
  /** Top of the map area. */
  top: number;
  /** Height available to the map (columns); rows grow as needed. */
  H: number;
  causes: string[];
  channels: string[];
  outcomes: string[];
  flows: LFlow[];
  /** Pixel scale for card sizes (1 on a laptop, larger on a TV). */
  u: number;
  /** The height a card's text needs ("c:food-price"), so text never runs out of its card. */
  minH?: (id: string) => number;
  /**
   * Causes drawn as the lines of one card ("Your moves (3)"): placed one under the other with no
   * gap, under a `head` for the card's title and above a `foot`; each line at least `line` tall.
   * The card is the node "c:__group"; each line keeps its own node, so its arrows start from it.
   */
  group?: { ids: string[]; head: number; foot: number; line: number };
  /** Base heights of the column cards (columns only): smaller in a short slot. */
  base?: { cause?: number; chan?: number; goal?: number };
  compact?: boolean;
};

const PAD = 12;

/** `compact`: a short, narrow slot, where the roads' column is a little wider (its cards drop their second line) and the roads a little shorter. */
export function columns(W: number, u: number, compact = false) {
  const causeW = Math.min(250 * u, Math.max(150, W * 0.27));
  const outW = Math.min(250 * u, Math.max(150, W * 0.27));
  const chanW = Math.min(180 * u, Math.max(compact ? 148 : 126, W * 0.2));
  const causeX = PAD;
  const outX = W - PAD - outW;
  const chanX = (causeX + causeW + outX) / 2 - chanW / 2;
  return { causeX, causeW, chanX, chanW, outX, outW };
}

export function layout(inp: LayoutInput): Layout {
  const { mode, W, top, H, causes, channels, outcomes, flows, u, minH, group } = inp;
  const ci = new Map(causes.map((c, i) => [c, i]));
  const hi = new Map(channels.map((c, i) => [c, i]));
  const oi = new Map(outcomes.map((c, i) => [c, i]));
  const tagRoom = mode === "h" ? 22 : 46;
  const slot = (t: number) => Math.max(t, 4) + 4;
  const goalSlotOf = (f: LFlow) => (f.tag === false ? slot(f.thick) : Math.max(f.thick, tagRoom) + 4);

  const by = (key: (f: LFlow) => string) => {
    const m = new Map<string, LFlow[]>();
    for (const f of flows) {
      const k = key(f);
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(f);
    }
    return m;
  };
  const cOut = by((f) => f.cause);
  const hIn = by((f) => f.channel);
  const oIn = by((f) => f.metric);
  const ord = (a: number | undefined, b: number | undefined) => (a ?? 0) - (b ?? 0);
  for (const l of cOut.values()) l.sort((a, b) => ord(hi.get(a.channel), hi.get(b.channel)) || ord(oi.get(a.metric), oi.get(b.metric)));
  const hOut = new Map<string, LFlow[]>();
  for (const [k, l] of hIn) {
    l.sort((a, b) => ord(ci.get(a.cause), ci.get(b.cause)) || ord(oi.get(a.metric), oi.get(b.metric)));
    hOut.set(k, [...l].sort((a, b) => ord(oi.get(a.metric), oi.get(b.metric)) || ord(ci.get(a.cause), ci.get(b.cause))));
  }
  for (const l of oIn.values()) l.sort((a, b) => ord(hi.get(a.channel), hi.get(b.channel)) || ord(ci.get(a.cause), ci.get(b.cause)));
  const sum = (l: LFlow[] | undefined, s: (f: LFlow) => number) => (l ?? []).reduce((a, f) => a + s(f), 0);
  const plain = (f: LFlow) => slot(f.thick);

  const nodes = new Map<string, Box>();
  let height = top + H;

  if (mode === "h") {
    const col = columns(W, u, inp.compact);
    type Item = { ids: string[]; hs: number[]; h: number; grouped: boolean };
    const place = (ids: string[], x: number, w: number, base: number, need: (id: string) => number, prefix: string, grp?: LayoutInput["group"]) => {
      // One item per card; the grouped causes are one card, their lines stacked with no gap.
      const items: Item[] = [];
      for (const id of ids) {
        if (grp?.ids.includes(id)) {
          let it = items.find((x) => x.grouped);
          if (!it) items.push((it = { ids: [], hs: [], h: grp.head + grp.foot, grouped: true }));
          const h = Math.max(grp.line, need(id) + 4, minH?.(prefix + id) ?? 0);
          it.ids.push(id);
          it.hs.push(h);
          it.h += h;
        } else {
          const h = Math.max(base, need(id) + 16, minH?.(prefix + id) ?? 0);
          items.push({ ids: [id], hs: [h], h, grouped: false });
        }
      }
      const total = items.reduce((a, it) => a + it.h, 0);
      const gap = items.length > 1 ? Math.max(6, Math.min(22 * u, (H - total) / (items.length - 1))) : 0;
      const span = total + gap * (items.length - 1);
      let y = top + Math.max(0, (H - span) / 2);
      for (const it of items) {
        if (it.grouped) {
          nodes.set(prefix + "__group", { x, y, w, h: it.h });
          let yy = y + grp!.head;
          it.ids.forEach((id, i) => {
            nodes.set(prefix + id, { x, y: yy, w, h: it.hs[i] });
            yy += it.hs[i];
          });
        } else nodes.set(prefix + it.ids[0], { x, y, w, h: it.h });
        y += it.h + gap;
      }
      height = Math.max(height, y - gap);
    };
    place(causes, col.causeX, col.causeW, inp.base?.cause ?? 60 * u, (id) => sum(cOut.get(id), plain), "c:", group);
    place(channels, col.chanX, col.chanW, inp.base?.chan ?? 56 * u, (id) => Math.max(sum(hIn.get(id), plain), sum(hOut.get(id), plain)), "h:");
    place(outcomes, col.outX, col.outW, Math.min(120 * u, Math.max(inp.base?.goal ?? 84, (H - 2 * 12) / Math.max(1, outcomes.length))), (id) => sum(oIn.get(id), goalSlotOf), "o:");
  } else {
    const rowH = { c: 60, h: 50, o: 96 };
    const gapY = 50;
    const row = (ids: string[], y: number, h: number, need: (id: string) => number, prefix: string, maxW: number) => {
      const n = Math.max(1, ids.length);
      const gap = 8;
      const w = Math.min(maxW, (W - 2 * PAD - gap * (n - 1)) / n);
      const ws = ids.map((id) => Math.max(w, Math.min(need(id) + 8, W - 2 * PAD)));
      const total = ws.reduce((a, b) => a + b, 0) + gap * (n - 1);
      let x = Math.max(PAD, (W - total) / 2);
      ids.forEach((id, i) => {
        nodes.set(prefix + id, { x, y, w: ws[i], h });
        x += ws[i] + gap;
      });
    };
    let y = top;
    row(causes, y, rowH.c, (id) => sum(cOut.get(id), plain), "c:", 170);
    y += rowH.c + gapY;
    row(channels, y, rowH.h, (id) => Math.max(sum(hIn.get(id), plain), sum(hOut.get(id), plain)), "h:", 150);
    y += rowH.h + gapY;
    row(outcomes, y, rowH.o, (id) => sum(oIn.get(id), goalSlotOf), "o:", 170);
    height = y + rowH.o;
  }

  // Ports: each arrow's slot along each card side, centred on the side.
  const len = (b: Box) => (mode === "h" ? b.h : b.w);
  const ports = new Map<string, Ports>();
  for (const f of flows) ports.set(f.id, [0, 0, 0, 0]);
  const assign = (groups: Map<string, LFlow[]>, prefix: string, idx: 0 | 1 | 2 | 3, s: (f: LFlow) => number) => {
    for (const [k, l] of groups) {
      const b = nodes.get(prefix + k);
      if (!b) continue;
      const total = sum(l, s);
      let at = (len(b) - total) / 2;
      for (const f of l) {
        const w = s(f);
        ports.get(f.id)![idx] = at + w / 2;
        at += w;
      }
    }
  };
  assign(cOut, "c:", 0, plain);
  assign(hIn, "h:", 1, plain);
  assign(hOut, "h:", 2, plain);
  assign(oIn, "o:", 3, goalSlotOf);
  return { nodes, ports, height };
}
