/* Gráficas SVG del Instrumento UPP. Colores desde tokens CSS; texto siempre en tokens de tinta. */
(function (root) {
"use strict";
const C = {};
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const nf = (x, d = 1) => x == null || !Number.isFinite(x) ? "—" : x.toLocaleString("es-CO", { minimumFractionDigits: d, maximumFractionDigits: d });
C.nf = nf;
const fill = v => `style="fill:var(${v})"`;
const T = (x, y, s, o = {}) => `<text x="${x}" y="${y}" class="${o.cls || "ct"}"${o.anchor ? ` text-anchor="${o.anchor}"` : ""}${o.rot ? ` transform="rotate(${o.rot} ${x} ${y})"` : ""}>${esc(s)}</text>`;
const wrapW = el => Math.max(300, Math.min(900, (el && el.clientWidth) || 640));
const niceMax = v => { if (!(v > 0)) return 1; const p = 10 ** Math.floor(Math.log10(v)), m = v / p; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p; };
const ticks = (lo, hi, n = 5) => { const step = niceMax((hi - lo) / n); const out = []; for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(+v.toFixed(10)); return out; };
const svg = (w, h, body, label) => `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${esc(label || "Gráfica")}" class="chart">${body}</svg>`;
C.empty = (msg) => `<div class="chart-empty">${esc(msg || "Aún no hay datos suficientes para esta gráfica.")}</div>`;

/* Barras horizontales: items [{label, value, n, tip, color}] ; value en % por defecto */
C.hbar = (el, items, o = {}) => {
  if (!items.length || items.every(i => !i.value)) return C.empty(o.empty);
  const W = wrapW(el), rowH = 26, lab = Math.min(W * 0.42, o.labelW || 210), right = 64, top = 6;
  const H = top + items.length * rowH + 6, max = o.max ?? niceMax(Math.max(...items.map(i => i.value)));
  const span = W - lab - right; let b = "";
  items.forEach((it, i) => { const y = top + i * rowH, w = Math.max(it.value > 0 ? 2 : 0, span * it.value / max);
    b += `<g data-tip="${esc(it.tip || `${it.label}: ${nf(it.value)}${o.unit ?? " %"}`)}"><rect x="0" y="${y}" width="${W}" height="${rowH}" class="hit"/>`;
    b += T(lab - 8, y + rowH / 2 + 4, it.label.length > 34 ? it.label.slice(0, 33) + "…" : it.label, { anchor: "end" });
    b += `<rect x="${lab}" y="${y + 6}" width="${w}" height="${rowH - 12}" rx="3" ${fill(it.color || o.color || "--c1")}/>`;
    b += T(lab + w + 6, y + rowH / 2 + 4, `${nf(it.value, o.dec ?? 1)}${o.unit ?? " %"}${it.n != null ? ` (${it.n})` : ""}`, { cls: "ct num" }) + `</g>`; });
  return svg(W, H, b, o.label);
};

/* Barras verticales por categoría: items [{label, value, tip, color}] */
C.vbar = (el, items, o = {}) => {
  if (!items.length) return C.empty(o.empty);
  const W = wrapW(el), H = o.h || 220, L = 40, R = 10, Tp = 12, B = 40; const max = niceMax(Math.max(1, ...items.map(i => i.value)));
  const pw = W - L - R, ph = H - Tp - B, bw = pw / items.length; let b = "";
  ticks(0, max, 4).forEach(t => { const y = Tp + ph - ph * t / max; b += `<line x1="${L}" x2="${W - R}" y1="${y}" y2="${y}" class="grid"/>` + T(L - 6, y + 4, nf(t, 0), { anchor: "end", cls: "ct small" }); });
  items.forEach((it, i) => { const h = ph * it.value / max, x = L + i * bw;
    b += `<g data-tip="${esc(it.tip || `${it.label}: ${it.value}`)}"><rect x="${x}" y="${Tp}" width="${bw}" height="${ph}" class="hit"/><rect x="${x + bw * 0.18}" y="${Tp + ph - h}" width="${bw * 0.64}" height="${h}" rx="3" ${fill(it.color || o.color || "--c1")}/>`;
    if (it.value) b += T(x + bw / 2, Tp + ph - h - 4, nf(it.value, 0), { anchor: "middle", cls: "ct small num" });
    const every = Math.ceil(items.length / Math.floor(pw / 46));
    if (i % every === 0) b += T(x + bw / 2, H - B + 16, it.label, { anchor: "middle", cls: "ct small" }); b += `</g>`; });
  b += `<line x1="${L}" x2="${W - R}" y1="${Tp + ph}" y2="${Tp + ph}" class="axis"/>`;
  if (o.xLabel) b += T(L + pw / 2, H - 4, o.xLabel, { anchor: "middle", cls: "ct small muted" });
  return svg(W, H, b, o.label);
};

/* Histograma con bandas de color opcionales y curva normal */
C.hist = (el, values, o = {}) => {
  const v = values.filter(Number.isFinite); if (v.length < 2) return C.empty(o.empty);
  const W = wrapW(el), H = o.h || 220, L = 40, R = 12, Tp = 12, B = 40;
  let lo = o.min ?? Math.min(...v), hi = o.max ?? Math.max(...v); if (lo === hi) { lo -= 1; hi += 1; }
  let edges;
  if (o.integer) { edges = []; for (let k = Math.floor(lo); k <= Math.ceil(hi) + 1; k++) edges.push(k - 0.5); }
  else { const k = o.bins || Math.max(5, Math.min(20, Math.ceil(Math.log2(v.length) + 1))); const w = (hi - lo) / k; edges = Array.from({ length: k + 1 }, (_, i) => lo + i * w); }
  const nb = edges.length - 1, cnt = new Array(nb).fill(0);
  v.forEach(x => { let i = edges.findIndex((e, j) => j < nb && x >= e && x < edges[j + 1]); if (i < 0) i = x >= edges[nb] - 1e-9 ? nb - 1 : 0; cnt[i]++; });
  const max = niceMax(Math.max(...cnt)), pw = W - L - R, ph = H - Tp - B, x0 = edges[0], x1 = edges[nb];
  const X = x => L + pw * (x - x0) / (x1 - x0), Y = c => Tp + ph - ph * c / max; let b = "";
  ticks(0, max, 4).forEach(t => b += `<line x1="${L}" x2="${W - R}" y1="${Y(t)}" y2="${Y(t)}" class="grid"/>` + T(L - 6, Y(t) + 4, nf(t, 0), { anchor: "end", cls: "ct small" }));
  for (let i = 0; i < nb; i++) { const mid = (edges[i] + edges[i + 1]) / 2, col = o.colorFn ? o.colorFn(mid) : (o.color || "--c1");
    const lab = o.integer ? `${Math.round(mid)}` : `${nf(edges[i])}–${nf(edges[i + 1])}`;
    b += `<g data-tip="${esc(`${o.xName || "Valor"} ${lab}: ${cnt[i]} (${nf(cnt[i] / v.length * 100)} %)`)}"><rect x="${X(edges[i])}" y="${Tp}" width="${X(edges[i + 1]) - X(edges[i])}" height="${ph}" class="hit"/>`;
    b += `<rect x="${X(edges[i]) + 1}" y="${Y(cnt[i])}" width="${Math.max(0, X(edges[i + 1]) - X(edges[i]) - 2)}" height="${ph - (Y(cnt[i]) - Tp)}" rx="2" ${fill(col)}/></g>`; }
  if (o.normal) { const m = o.normal.mean, s = o.normal.sd, bw = (x1 - x0) / nb; let d = "";
    for (let i = 0; i <= 80; i++) { const x = x0 + (x1 - x0) * i / 80, y = v.length * bw * Math.exp(-((x - m) ** 2) / (2 * s * s)) / (s * Math.sqrt(2 * Math.PI)); d += `${i ? "L" : "M"}${X(x).toFixed(1)},${Math.max(Tp, Y(y)).toFixed(1)}`; }
    b += `<path d="${d}" class="curve"/>`; }
  const xt = o.integer ? ticks(Math.ceil(lo), Math.floor(hi), Math.min(8, Math.floor(pw / 50))) : ticks(x0, x1, Math.min(6, Math.floor(pw / 60)));
  xt.forEach(t => { if (t >= x0 && t <= x1) b += T(X(t), Tp + ph + 16, nf(t, o.integer ? 0 : (Math.abs(x1 - x0) < 10 ? 1 : 0)), { anchor: "middle", cls: "ct small" }); });
  b += `<line x1="${L}" x2="${W - R}" y1="${Tp + ph}" y2="${Tp + ph}" class="axis"/>`;
  if (o.xLabel) b += T(L + pw / 2, H - 4, o.xLabel, { anchor: "middle", cls: "ct small muted" });
  return svg(W, H, b, o.label);
};

/* Barras 100 % apiladas; rows [{label, parts:[{v, color, name}]}], diverging centra en la categoría media */
C.stack = (el, rows, o = {}) => {
  if (!rows.length) return C.empty(o.empty);
  const W = wrapW(el), rowH = 30, lab = Math.min(W * 0.45, o.labelW || 260), R = 8, top = 4, H = top + rows.length * rowH + 22; const pw = W - lab - R; let b = "";
  if (o.diverging) { const cx = lab + pw / 2; b += `<line x1="${cx}" x2="${cx}" y1="${top}" y2="${H - 20}" class="axis"/>`;
    [-100, -50, 0, 50, 100].forEach(t => b += T(cx + pw / 2 * t / 100, H - 6, `${Math.abs(t)} %`, { anchor: "middle", cls: "ct small" })); }
  else[0, 25, 50, 75, 100].forEach(t => b += T(lab + pw * t / 100, H - 6, `${t} %`, { anchor: "middle", cls: "ct small" }));
  rows.forEach((r, i) => { const y = top + i * rowH, tot = r.parts.reduce((s, p) => s + p.v, 0) || 1;
    b += T(lab - 8, y + rowH / 2 + 4, r.label.length > 44 ? r.label.slice(0, 43) + "…" : r.label, { anchor: "end" });
    let x;
    if (o.diverging) { const k = r.parts.length, mid = (k - 1) / 2; let neg = 0; r.parts.forEach((p, j) => { if (j < mid) neg += p.v; if (j === mid) neg += p.v / 2; }); x = lab + pw / 2 - pw / 2 * neg / tot; }
    else x = lab;
    const scale = o.diverging ? pw / 2 : pw;
    r.parts.forEach(p => { const w = scale * p.v / tot; if (w > 0) {
      b += `<rect x="${x}" y="${y + 6}" width="${Math.max(0, w - 1.5)}" height="${rowH - 12}" ${fill(p.color)} data-tip="${esc(`${r.label} · ${p.name}: ${p.v} (${nf(p.v / tot * 100)} %)`)}"/>`;
      if (w > 28) b += `<text x="${x + w / 2}" y="${y + rowH / 2 + 4}" text-anchor="middle" class="ct small inbar" style="fill:var(${p.ink || "--on-dark"})">${nf(p.v / tot * 100, 0)}</text>`; x += w; } }); });
  return svg(W, H, b, o.label);
};

/* Diagrama de caja; groups [{label, values, color}] */
C.box = (el, groups, o = {}) => {
  const gs = groups.filter(g => g.values.length); if (!gs.length) return C.empty(o.empty);
  const S = root.STATS, W = wrapW(el), H = o.h || 230, L = 44, R = 12, Tp = 12, B = 40, all = gs.flatMap(g => g.values);
  let lo = o.min ?? Math.min(...all), hi = o.max ?? Math.max(...all); if (lo === hi) { lo -= 1; hi += 1; }
  const pw = W - L - R, ph = H - Tp - B, Y = v => Tp + ph - ph * (v - lo) / (hi - lo), bw = pw / groups.length; let b = "";
  ticks(lo, hi, 5).forEach(t => b += `<line x1="${L}" x2="${W - R}" y1="${Y(t)}" y2="${Y(t)}" class="grid"/>` + T(L - 6, Y(t) + 4, nf(t, Math.abs(hi - lo) < 6 ? 1 : 0), { anchor: "end", cls: "ct small" }));
  groups.forEach((g, i) => { const cx = L + bw * (i + 0.5); b += T(cx, H - B + 16, g.label, { anchor: "middle", cls: "ct small" }) + T(cx, H - B + 30, `n = ${g.values.length}`, { anchor: "middle", cls: "ct small muted" });
    if (!g.values.length) return; const q1 = S.quantile(g.values, .25), md = S.median(g.values), q3 = S.quantile(g.values, .75), iqr = q3 - q1;
    const wl = Math.min(...g.values.filter(v => v >= q1 - 1.5 * iqr)), wh = Math.max(...g.values.filter(v => v <= q3 + 1.5 * iqr)); const w = Math.min(70, bw * 0.45);
    b += `<g data-tip="${esc(`${g.label}: mediana ${nf(md)}; RIC ${nf(q1)}–${nf(q3)}; n = ${g.values.length}`)}"><rect x="${cx - bw / 2}" y="${Tp}" width="${bw}" height="${ph}" class="hit"/>`;
    b += `<line x1="${cx}" x2="${cx}" y1="${Y(wl)}" y2="${Y(q1)}" class="whisk"/><line x1="${cx}" x2="${cx}" y1="${Y(q3)}" y2="${Y(wh)}" class="whisk"/>`;
    b += `<line x1="${cx - w / 4}" x2="${cx + w / 4}" y1="${Y(wl)}" y2="${Y(wl)}" class="whisk"/><line x1="${cx - w / 4}" x2="${cx + w / 4}" y1="${Y(wh)}" y2="${Y(wh)}" class="whisk"/>`;
    b += `<rect x="${cx - w / 2}" y="${Y(q3)}" width="${w}" height="${Math.max(1, Y(q1) - Y(q3))}" rx="3" ${fill(g.color || "--c1")} class="boxf"/><line x1="${cx - w / 2}" x2="${cx + w / 2}" y1="${Y(md)}" y2="${Y(md)}" class="med"/>`;
    g.values.filter(v => v < wl || v > wh).forEach(v => b += `<circle cx="${cx}" cy="${Y(v)}" r="3" class="outl"/>`); b += `</g>`; });
  if (o.yLabel) b += T(12, Tp + ph / 2, o.yLabel, { anchor: "middle", cls: "ct small muted", rot: -90 });
  return svg(W, H, b, o.label);
};

/* Dispersión con recta y bandas opcionales */
C.scatter = (el, pts, o = {}) => {
  if (pts.length < 2) return C.empty(o.empty);
  const W = wrapW(el), H = o.h || 260, L = 46, R = 12, Tp = 12, B = 42;
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
  const x0 = o.xmin ?? Math.min(...xs), x1 = o.xmax ?? Math.max(...xs), y0 = o.ymin ?? Math.min(...ys), y1 = o.ymax ?? Math.max(...ys);
  const pw = W - L - R, ph = H - Tp - B, X = x => L + pw * (x - x0) / ((x1 - x0) || 1), Y = y => Tp + ph - ph * (y - y0) / ((y1 - y0) || 1); let b = "";
  ticks(y0, y1, 5).forEach(t => b += `<line x1="${L}" x2="${W - R}" y1="${Y(t)}" y2="${Y(t)}" class="grid"/>` + T(L - 6, Y(t) + 4, nf(t, (y1 - y0) < 6 ? 1 : 0), { anchor: "end", cls: "ct small" }));
  ticks(x0, x1, Math.min(8, Math.floor(pw / 50))).forEach(t => b += T(X(t), Tp + ph + 16, nf(t, (x1 - x0) < 6 ? 1 : 0), { anchor: "middle", cls: "ct small" }));
  b += `<line x1="${L}" x2="${W - R}" y1="${Tp + ph}" y2="${Tp + ph}" class="axis"/>`;
  let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 - 0.5; };
  pts.forEach(p => { const jx = o.jitterX ? rnd() * o.jitterX : 0, jy = o.jitterY ? rnd() * o.jitterY : 0;
    b += `<circle cx="${X(p.x + jx)}" cy="${Y(p.y + jy)}" r="4.5" class="dot" ${fill(p.color || "--c1")} data-tip="${esc(p.tip || `${nf(p.x)}; ${nf(p.y)}`)}"/>`; });
  if (o.line) { const { a, b: s } = o.line; b += `<line x1="${X(x0)}" y1="${Y(a + s * x0)}" x2="${X(x1)}" y2="${Y(a + s * x1)}" class="trend"/>`; }
  if (o.xLabel) b += T(L + pw / 2, H - 4, o.xLabel, { anchor: "middle", cls: "ct small muted" });
  if (o.yLabel) b += T(12, Tp + ph / 2, o.yLabel, { anchor: "middle", cls: "ct small muted", rot: -90 });
  return `<div class="clip">${svg(W, H, b, o.label)}</div>`;
};

/* Curvas (ROC, Q-Q): series [{pts:[{x,y,tip}], color, dash}] , opcional diagonal */
C.lines = (el, series, o = {}) => {
  const W = Math.min(wrapW(el), o.maxW || 900), H = o.h || 260, L = 46, R = 14, Tp = 12, B = 42;
  const all = series.flatMap(s => s.pts); if (all.length < 2) return C.empty(o.empty);
  const x0 = o.xmin ?? Math.min(...all.map(p => p.x)), x1 = o.xmax ?? Math.max(...all.map(p => p.x)), y0 = o.ymin ?? Math.min(...all.map(p => p.y)), y1 = o.ymax ?? Math.max(...all.map(p => p.y));
  const pw = W - L - R, ph = H - Tp - B, X = x => L + pw * (x - x0) / ((x1 - x0) || 1), Y = y => Tp + ph - ph * (y - y0) / ((y1 - y0) || 1); let b = "";
  ticks(y0, y1, 5).forEach(t => b += `<line x1="${L}" x2="${W - R}" y1="${Y(t)}" y2="${Y(t)}" class="grid"/>` + T(L - 6, Y(t) + 4, nf(t, 1), { anchor: "end", cls: "ct small" }));
  ticks(x0, x1, 5).forEach(t => b += T(X(t), Tp + ph + 16, nf(t, 1), { anchor: "middle", cls: "ct small" }));
  if (o.diag) { const a = Math.max(x0, y0), z = Math.min(x1, y1); b += `<line x1="${X(a)}" y1="${Y(a)}" x2="${X(z)}" y2="${Y(z)}" class="ref"/>`; }
  series.forEach(s => { if (s.step || s.path) { const d = s.pts.map((p, i) => `${i ? "L" : "M"}${X(p.x).toFixed(1)},${Y(p.y).toFixed(1)}`).join(""); b += `<path d="${d}" class="series" style="stroke:var(${s.color})"/>`; }
    if (s.dots !== false) s.pts.forEach(p => b += `<circle cx="${X(p.x)}" cy="${Y(p.y)}" r="${s.r || 3.5}" class="dot" ${fill(s.color)} data-tip="${esc(p.tip || "")}"/>`); });
  if (o.mark) b += `<circle cx="${X(o.mark.x)}" cy="${Y(o.mark.y)}" r="7" class="markring"/>` + T(X(o.mark.x) + 10, Y(o.mark.y) + 14, o.mark.label, { cls: "ct small" });
  b += `<line x1="${L}" x2="${W - R}" y1="${Tp + ph}" y2="${Tp + ph}" class="axis"/>`;
  if (o.xLabel) b += T(L + pw / 2, H - 4, o.xLabel, { anchor: "middle", cls: "ct small muted" });
  if (o.yLabel) b += T(12, Tp + ph / 2, o.yLabel, { anchor: "middle", cls: "ct small muted", rot: -90 });
  return svg(W, H, b, o.label);
};

/* Mapa de calor de correlaciones (diverging) */
C.heat = (el, rowsL, colsL, M, P, o = {}) => {
  const W0 = wrapW(el), lab = 150, cw = Math.max(34, Math.min(56, (W0 - lab - 8) / colsL.length)), ch = 28, top = 96;
  const W = lab + cw * colsL.length + 8, H = top + ch * rowsL.length + 8; let b = "";
  colsL.forEach((c, j) => b += T(lab + cw * (j + 0.5), top - 8, c, { cls: "ct small", rot: -50 }));
  rowsL.forEach((r, i) => { b += T(lab - 8, top + ch * i + ch / 2 + 4, r, { anchor: "end", cls: "ct small" });
    colsL.forEach((c, j) => { const v = M[i][j], p = P[i][j]; const lv = v == null ? null : Math.min(4, Math.floor(Math.abs(v) / 0.15));
      const col = v == null ? "--sunk" : v >= 0 ? `--dp${lv}` : `--dn${lv}`;
      b += `<rect x="${lab + cw * j + 1}" y="${top + ch * i + 1}" width="${cw - 2}" height="${ch - 2}" rx="3" ${fill(col)} data-tip="${esc(`${r} × ${c}: rho = ${nf(v, 2)}; p = ${p == null ? "—" : p < 0.001 ? "< 0,001" : nf(p, 3)}`)}"/>`;
      if (v != null) b += `<text x="${lab + cw * (j + 0.5)}" y="${top + ch * i + ch / 2 + 4}" text-anchor="middle" class="ct small num" style="fill:var(${lv >= 3 ? "--on-dark" : "--ink"})">${nf(v, 2).replace("0,", ",")}${p < 0.05 ? "*" : ""}</text>`; }); });
  return `<div class="clip">${svg(W, H, b, o.label)}</div>`;
};

/* Forest plot de OR en escala logarítmica */
C.forest = (el, rows, o = {}) => {
  const rs = rows.filter(r => Number.isFinite(r.lo) && Number.isFinite(r.hi)); if (!rs.length) return C.empty(o.empty);
  const W = wrapW(el), lab = Math.min(200, W * 0.38), R = 16, rowH = 30, top = 8, H = top + rs.length * rowH + 34;
  let lo = Math.min(0.5, ...rs.map(r => r.lo)), hi = Math.max(2, ...rs.map(r => r.hi)); lo = Math.max(lo, 0.01); hi = Math.min(hi, 100);
  const pw = W - lab - R, X = v => lab + pw * (Math.log(Math.min(hi, Math.max(lo, v))) - Math.log(lo)) / (Math.log(hi) - Math.log(lo)); let b = "";
  [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 4, 10, 25, 100].filter(t => t >= lo && t <= hi).forEach(t => b += `<line x1="${X(t)}" x2="${X(t)}" y1="${top}" y2="${H - 30}" class="${t === 1 ? "axis" : "grid"}"/>` + T(X(t), H - 14, String(t).replace(".", ","), { anchor: "middle", cls: "ct small" }));
  rs.forEach((r, i) => { const y = top + i * rowH + rowH / 2; b += T(lab - 8, y + 4, r.label, { anchor: "end" });
    b += `<g data-tip="${esc(`${r.label}: OR ${nf(r.or, 2)} (IC 95 % ${nf(r.lo, 2)}–${nf(r.hi, 2)}); p = ${r.p < 0.001 ? "< 0,001" : nf(r.p, 3)}`)}"><rect x="${lab}" y="${y - rowH / 2}" width="${pw}" height="${rowH}" class="hit"/><line x1="${X(r.lo)}" x2="${X(r.hi)}" y1="${y}" y2="${y}" class="ci"/><rect x="${X(r.or) - 5}" y="${y - 5}" width="10" height="10" ${fill(r.p < 0.05 ? "--c-upp" : "--c1")}/></g>`; });
  b += T(lab + pw / 2, H - 1, "Odds ratio (escala logarítmica) · 1 = sin asociación", { anchor: "middle", cls: "ct small muted" });
  return svg(W, H, b, o.label);
};

C.legend = items => `<div class="legend">${items.map(i => `<span><i style="background:var(${i.color})"></i>${esc(i.label)}</span>`).join("")}</div>`;

/* Tooltip global */
C.installTooltip = () => {
  const tip = document.createElement("div"); tip.className = "tip"; tip.hidden = true; document.body.appendChild(tip);
  const show = (e, t) => { tip.textContent = t; tip.hidden = false; const r = tip.getBoundingClientRect(); let x = e.clientX + 14, y = e.clientY + 14;
    if (x + r.width > innerWidth - 8) x = e.clientX - r.width - 14; if (y + r.height > innerHeight - 8) y = e.clientY - r.height - 14; tip.style.left = x + "px"; tip.style.top = y + "px"; };
  document.addEventListener("pointermove", e => { const g = e.target.closest && e.target.closest("[data-tip]"); if (g && g.closest("svg")) show(e, g.getAttribute("data-tip")); else tip.hidden = true; });
  document.addEventListener("pointerleave", () => tip.hidden = true);
};
root.CHARTS = C;
})(window);
