/* Motor estadístico del Instrumento UPP · Medicina Interna.
   Funciones puras sin dependencias. Validado contra SciPy y statsmodels. */
(function (root) {
"use strict";
const S = {};

/* ---------- utilidades ---------- */
const num = a => a.filter(v => typeof v === "number" && Number.isFinite(v));
S.clean = num;
S.sum = a => { let s = 0; for (const v of a) s += v; return s; };
S.mean = a => a.length ? S.sum(a) / a.length : NaN;
S.variance = a => { const n = a.length; if (n < 2) return NaN; const m = S.mean(a); let s = 0; for (const v of a) s += (v - m) ** 2; return s / (n - 1); };
S.sd = a => Math.sqrt(S.variance(a));
S.sorted = a => [...a].sort((x, y) => x - y);
S.quantile = (a, q) => { /* tipo 7 (R, Excel, SPSS lo aproxima) */
  const s = S.sorted(a), n = s.length; if (!n) return NaN;
  const h = (n - 1) * q, lo = Math.floor(h), hi = Math.ceil(h);
  return s[lo] + (h - lo) * (s[hi] - s[lo]);
};
S.median = a => S.quantile(a, 0.5);
S.skewness = a => { /* G1 ajustado (SPSS) */
  const n = a.length; if (n < 3) return NaN; const m = S.mean(a);
  let m2 = 0, m3 = 0; for (const v of a) { const d = v - m; m2 += d * d; m3 += d * d * d; }
  m2 /= n; m3 /= n; if (m2 === 0) return NaN;
  return Math.sqrt(n * (n - 1)) / (n - 2) * m3 / m2 ** 1.5;
};
S.kurtosis = a => { /* G2 exceso (SPSS) */
  const n = a.length; if (n < 4) return NaN; const m = S.mean(a);
  let m2 = 0, m4 = 0; for (const v of a) { const d = v - m; m2 += d * d; m4 += d ** 4; }
  m2 /= n; m4 /= n; if (m2 === 0) return NaN;
  const g2 = m4 / (m2 * m2) - 3;
  return ((n + 1) * g2 + 6) * (n - 1) / ((n - 2) * (n - 3));
};
S.describe = arr => {
  const a = num(arr), n = a.length;
  if (!n) return { n: 0 };
  return { n, mean: S.mean(a), sd: S.sd(a), median: S.median(a), q1: S.quantile(a, .25), q3: S.quantile(a, .75),
    min: Math.min(...a), max: Math.max(...a), skew: S.skewness(a), kurt: S.kurtosis(a) };
};

/* ---------- funciones especiales y distribuciones ---------- */
S.lgamma = x => {
  const c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let y = x, t = x + 5.5; t -= (x + 0.5) * Math.log(t); let s = 1.000000000190015;
  for (let j = 0; j < 6; j++) s += c[j] / ++y;
  return -t + Math.log(2.5066282746310005 * s / x);
};
function gser(a, x) { let ap = a, sum = 1 / a, del = sum; for (let n = 0; n < 1000; n++) { ap++; del *= x / ap; sum += del; if (Math.abs(del) < Math.abs(sum) * 1e-15) break; } return sum * Math.exp(-x + a * Math.log(x) - S.lgamma(a)); }
function gcf(a, x) { const FP = 1e-300; let b = x + 1 - a, c = 1 / FP, d = 1 / b, h = d;
  for (let i = 1; i < 1000; i++) { const an = -i * (i - a); b += 2; d = an * d + b; if (Math.abs(d) < FP) d = FP; c = b + an / c; if (Math.abs(c) < FP) c = FP; d = 1 / d; const del = d * c; h *= del; if (Math.abs(del - 1) < 1e-15) break; }
  return Math.exp(-x + a * Math.log(x) - S.lgamma(a)) * h; }
S.gammp = (a, x) => x <= 0 ? 0 : (x < a + 1 ? gser(a, x) : 1 - gcf(a, x));
S.gammq = (a, x) => x <= 0 ? 1 : (x < a + 1 ? 1 - gser(a, x) : gcf(a, x));
function betacf(a, b, x) { const FP = 1e-300; const qab = a + b, qap = a + 1, qam = a - 1; let c = 1, d = 1 - qab * x / qap; if (Math.abs(d) < FP) d = FP; d = 1 / d; let h = d;
  for (let m = 1; m <= 500; m++) { const m2 = 2 * m; let aa = m * (b - m) * x / ((qam + m2) * (a + m2)); d = 1 + aa * d; if (Math.abs(d) < FP) d = FP; c = 1 + aa / c; if (Math.abs(c) < FP) c = FP; d = 1 / d; h *= d * c;
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2)); d = 1 + aa * d; if (Math.abs(d) < FP) d = FP; c = 1 + aa / c; if (Math.abs(c) < FP) c = FP; d = 1 / d; const del = d * c; h *= del; if (Math.abs(del - 1) < 1e-15) break; }
  return h; }
S.ibeta = (x, a, b) => { if (x <= 0) return 0; if (x >= 1) return 1;
  const bt = Math.exp(S.lgamma(a + b) - S.lgamma(a) - S.lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  return x < (a + 1) / (a + b + 2) ? bt * betacf(a, b, x) / a : 1 - bt * betacf(b, a, 1 - x) / b; };

S.pnorm = z => { /* P(Z <= z) mediante erfc = Q(1/2, x²) */
  if (!Number.isFinite(z)) return z > 0 ? 1 : 0;
  const x = Math.abs(z) / Math.SQRT2, q = 0.5 * S.gammq(0.5, x * x);
  return z >= 0 ? 1 - q : q;
};
S.qnorm = p => { /* Acklam + un paso de Newton */
  if (p <= 0) return -Infinity; if (p >= 1) return Infinity;
  const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
  const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
  const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
  const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
  const pl = 0.02425; let x;
  if (p < pl) { const q = Math.sqrt(-2 * Math.log(p)); x = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  else if (p <= 1 - pl) { const q = p - 0.5, r = q * q; x = (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1); }
  else { const q = Math.sqrt(-2 * Math.log(1 - p)); x = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  const e = S.pnorm(x) - p, u = e * Math.sqrt(2 * Math.PI) * Math.exp(x * x / 2);
  return x - u / (1 + x * u / 2);
};
S.pt = (t, df) => { const x = df / (df + t * t), p = 0.5 * S.ibeta(x, df / 2, 0.5); return t >= 0 ? 1 - p : p; };
S.pt2 = (t, df) => Math.min(1, 2 * (1 - S.pt(Math.abs(t), df)));
S.qt = (p, df) => { let lo = -1e3, hi = 1e3; for (let i = 0; i < 200; i++) { const m = (lo + hi) / 2; if (S.pt(m, df) < p) lo = m; else hi = m; } return (lo + hi) / 2; };
S.pchisqUpper = (x, df) => x <= 0 ? 1 : S.gammq(df / 2, x / 2);
S.pfUpper = (f, d1, d2) => f <= 0 ? 1 : S.ibeta(d2 / (d2 + d1 * f), d2 / 2, d1 / 2);

/* ---------- normalidad ---------- */
const poly = (c, x) => { let r = 0; for (let i = c.length - 1; i >= 0; i--) r = r * x + c[i]; return r; };
S.shapiroWilk = arr => { /* Royston (1995), algoritmo AS R94 */
  const x = S.sorted(num(arr)), n = x.length;
  if (n < 3 || n > 5000) return null;
  const range = x[n - 1] - x[0]; if (range === 0) return null;
  const nn2 = Math.floor(n / 2), a = new Array(nn2 + 1).fill(0);
  if (n === 3) a[1] = Math.SQRT1_2;
  else {
    const an25 = n + 0.25, m = new Array(nn2 + 1); let summ2 = 0;
    for (let i = 1; i <= nn2; i++) { m[i] = S.qnorm((i - 0.375) / an25); summ2 += m[i] * m[i]; }
    summ2 *= 2; const ssumm2 = Math.sqrt(summ2), rsn = 1 / Math.sqrt(n);
    const c1 = [0, 0.221157, -0.147981, -2.07119, 4.434685, -2.706056];
    const c2 = [0, 0.042981, -0.293762, -1.752461, 5.682633, -3.582633];
    const a1 = poly(c1, rsn) - m[1] / ssumm2; let i1, fac;
    if (n > 5) { i1 = 3; const a2 = -m[2] / ssumm2 + poly(c2, rsn);
      fac = Math.sqrt((summ2 - 2 * m[1] ** 2 - 2 * m[2] ** 2) / (1 - 2 * a1 ** 2 - 2 * a2 ** 2)); a[2] = a2; }
    else { i1 = 2; fac = Math.sqrt((summ2 - 2 * m[1] ** 2) / (1 - 2 * a1 ** 2)); }
    a[1] = a1; for (let i = i1; i <= nn2; i++) a[i] = -m[i] / fac;
  }
  let num_ = 0; for (let i = 1; i <= nn2; i++) num_ += a[i] * (x[n - i] - x[i - 1]);
  const mean = S.mean(x); let ssq = 0; for (const v of x) ssq += (v - mean) ** 2;
  let W = num_ * num_ / ssq; if (W > 1) W = 1;
  let p;
  if (n === 3) { p = 6 / Math.PI * (Math.asin(Math.sqrt(W)) - Math.asin(Math.sqrt(0.75))); p = Math.max(0, Math.min(1, p)); }
  else {
    const w1 = Math.log(1 - W), xx = Math.log(n); let m, s, y;
    if (n <= 11) { const gamma = poly([-2.273, 0.459], n); if (w1 >= gamma) return { W, p: 1e-99, n };
      y = -Math.log(gamma - w1); m = poly([0.544, -0.39978, 0.025054, -6.714e-4], n); s = Math.exp(poly([1.3822, -0.77857, 0.062767, -0.0020322], n)); }
    else { m = poly([-1.5861, -0.31082, -0.083751, 0.0038915], xx); s = Math.exp(poly([-0.4803, -0.082676, 0.0030302], xx)); y = w1; }
    p = 1 - S.pnorm((y - m) / s);
  }
  return { W, p, n };
};
S.lilliefors = arr => { /* K-S con corrección de Lilliefors (Dallal-Wilkinson, como nortest::lillie.test) */
  const x = S.sorted(num(arr)), n = x.length; if (n < 5) return null;
  const m = S.mean(x), sd = S.sd(x); if (!(sd > 0)) return null;
  let Dp = 0, Dm = 0;
  for (let i = 0; i < n; i++) { const F = S.pnorm((x[i] - m) / sd); Dp = Math.max(Dp, (i + 1) / n - F); Dm = Math.max(Dm, F - i / n); }
  const D = Math.max(Dp, Dm); let Kd = D, nd = n;
  if (n > 100) { Kd = D * (n / 100) ** 0.49; nd = 100; }
  let p = Math.exp(-7.01256 * Kd * Kd * (nd + 2.78019) + 2.99587 * Kd * Math.sqrt(nd + 2.78019) - 0.122119 + 0.974598 / Math.sqrt(nd) + 1.67997 / nd);
  if (p > 0.1) {
    const KK = (Math.sqrt(n) - 0.01 + 0.85 / Math.sqrt(n)) * D;
    if (KK <= 0.302) p = 1;
    else if (KK <= 0.5) p = 2.76773 - 19.828315 * KK + 80.709644 * KK ** 2 - 138.55152 * KK ** 3 + 81.218052 * KK ** 4;
    else if (KK <= 0.9) p = -4.901232 + 40.662806 * KK - 97.490286 * KK ** 2 + 94.029866 * KK ** 3 - 32.355711 * KK ** 4;
    else if (KK <= 1.31) p = 6.198765 - 19.558097 * KK + 23.186922 * KK ** 2 - 12.234627 * KK ** 3 + 2.423045 * KK ** 4;
    else p = 0;
  }
  return { D, p: Math.max(0, Math.min(1, p)), n };
};
S.qqPoints = arr => { const x = S.sorted(num(arr)), n = x.length; const m = S.mean(x), sd = S.sd(x);
  return x.map((v, i) => ({ t: S.qnorm((i + 1 - 0.375) / (n + 0.25)), z: (v - m) / sd, v })); };
S.normality = arr => {
  const a = num(arr), sw = S.shapiroWilk(a), ks = S.lilliefors(a);
  const main = a.length > 50 && ks ? "ks" : "sw";
  const pm = main === "ks" ? ks && ks.p : sw && sw.p;
  return { n: a.length, sw, ks, main, normal: pm == null ? null : pm >= 0.05 };
};

/* ---------- rangos ---------- */
S.rank = a => { /* rangos promedio, devuelve ranks y suma de t³-t */
  const idx = a.map((v, i) => [v, i]).sort((p, q) => p[0] - q[0]); const r = new Array(a.length); let ties = 0;
  for (let i = 0; i < idx.length;) { let j = i; while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
    const avg = (i + j) / 2 + 1; for (let k = i; k <= j; k++) r[idx[k][1]] = avg; const t = j - i + 1; ties += t ** 3 - t; i = j + 1; }
  return { r, ties };
};

/* ---------- proporciones y tablas ---------- */
S.wilson = (k, n, conf = 0.95) => { if (!n) return { p: NaN, lo: NaN, hi: NaN };
  const z = S.qnorm(1 - (1 - conf) / 2), p = k / n, den = 1 + z * z / n, c = (p + z * z / (2 * n)) / den, h = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / den;
  return { p, lo: Math.max(0, c - h), hi: Math.min(1, c + h) }; };
const lchoose = (n, k) => S.lgamma(n + 1) - S.lgamma(k + 1) - S.lgamma(n - k + 1);
S.fisher2x2 = (a, b, c, d) => { const r1 = a + b, c1 = a + c, n = a + b + c + d; const lo = Math.max(0, c1 - (n - r1)), hi = Math.min(r1, c1);
  const lp = x => lchoose(c1, x) + lchoose(n - c1, r1 - x) - lchoose(n, r1); const obs = lp(a); let p = 0;
  for (let x = lo; x <= hi; x++) { const v = lp(x); if (v <= obs + 1e-7) p += Math.exp(v); } return Math.min(1, p); };
S.chisq = table => { /* tabla r×c de conteos */
  const R = table.length, C = table[0].length; const rs = table.map(r => S.sum(r)); const cs = table[0].map((_, j) => S.sum(table.map(r => r[j]))); const n = S.sum(rs);
  const keepR = rs.map(v => v > 0), keepC = cs.map(v => v > 0);
  const T = table.filter((_, i) => keepR[i]).map(r => r.filter((_, j) => keepC[j]));
  const r2 = rs.filter(v => v > 0), c2 = cs.filter(v => v > 0); const r = T.length, c = r ? T[0].length : 0;
  if (r < 2 || c < 2) return { n, df: 0, chi2: NaN, p: NaN, valid: false, R, C };
  let chi2 = 0, low = 0, minE = Infinity; const E = [];
  for (let i = 0; i < r; i++) { E.push([]); for (let j = 0; j < c; j++) { const e = r2[i] * c2[j] / n; E[i].push(e); if (e < 5) low++; if (e < minE) minE = e; chi2 += (T[i][j] - e) ** 2 / e; } }
  const df = (r - 1) * (c - 1), V = Math.sqrt(chi2 / (n * Math.min(r - 1, c - 1)));
  const out = { n, df, chi2, p: S.pchisqUpper(chi2, df), expected: E, pctLow: low / (r * c), minE, V, valid: true, r, c };
  if (r === 2 && c === 2) { out.fisher = S.fisher2x2(T[0][0], T[0][1], T[1][0], T[1][1]);
    const yates = T.flat().reduce((s, o, k) => { const e = E[Math.floor(k / 2)][k % 2]; return s + Math.max(0, Math.abs(o - e) - 0.5) ** 2 / e; }, 0);
    out.yates = { chi2: yates, p: S.pchisqUpper(yates, 1) }; }
  /* tendencia lineal (Mantel-Haenszel) si una dimensión es binaria y la otra ordinal */
  if (c === 2 && r > 2) { let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0;
    for (let i = 0; i < r; i++) for (let j = 0; j < 2; j++) { const w = T[i][j]; sx += w * i; sy += w * j; sxx += w * i * i; syy += w * j * j; sxy += w * i * j; }
    const rr = (sxy - sx * sy / n) / Math.sqrt((sxx - sx * sx / n) * (syy - sy * sy / n)); const m2 = (n - 1) * rr * rr; out.trend = { chi2: m2, p: S.pchisqUpper(m2, 1) }; }
  return out;
};
S.or2x2 = (a, b, c, d, conf = 0.95) => { /* a: expuesto con evento, b: expuesto sin evento, c: no expuesto con evento, d: no expuesto sin evento */
  const z = S.qnorm(1 - (1 - conf) / 2); let [A, B, Cc, D] = [a, b, c, d]; let corrected = false;
  if (A === 0 || B === 0 || Cc === 0 || D === 0) { A += .5; B += .5; Cc += .5; D += .5; corrected = true; }
  const or = A * D / (B * Cc), se = Math.sqrt(1 / A + 1 / B + 1 / Cc + 1 / D);
  const p1 = a / (a + b), p0 = c / (c + d); let rp = p1 / p0, lo2 = NaN, hi2 = NaN;
  if (a > 0 && c > 0) { const se2 = Math.sqrt(1 / a - 1 / (a + b) + 1 / c - 1 / (c + d)); lo2 = rp * Math.exp(-z * se2); hi2 = rp * Math.exp(z * se2); } else rp = NaN;
  return { or, lo: or * Math.exp(-z * se), hi: or * Math.exp(z * se), corrected, rp, rpLo: lo2, rpHi: hi2, p1, p0 };
};

/* ---------- comparación de grupos ---------- */
S.mannWhitney = (x0, y0) => {
  const x = num(x0), y = num(y0), n1 = x.length, n2 = y.length; if (n1 < 1 || n2 < 1) return null;
  const { r, ties } = S.rank([...x, ...y]); const R1 = S.sum(r.slice(0, n1)); const U1 = R1 - n1 * (n1 + 1) / 2, U = Math.min(U1, n1 * n2 - U1);
  const N = n1 + n2, mu = n1 * n2 / 2, sig = Math.sqrt(n1 * n2 / 12 * ((N + 1) - ties / (N * (N - 1))));
  if (!(sig > 0)) return { U1, U, z: 0, p: 1, r: 0, n1, n2 };
  const zc = (U1 - mu - Math.sign(U1 - mu) * 0.5) / sig; const p = Math.min(1, 2 * (1 - S.pnorm(Math.abs(zc))));
  return { U1, U, z: zc, p, r: Math.abs(zc) / Math.sqrt(N), n1, n2, md1: S.median(x), md2: S.median(y), auc: U1 / (n1 * n2) };
};
S.kruskal = groups0 => {
  const groups = groups0.map(num).filter(g => g.length); const k = groups.length; if (k < 2) return null;
  const all = groups.flat(), N = all.length; const { r, ties } = S.rank(all); let pos = 0, H = 0;
  for (const g of groups) { const Rg = S.sum(r.slice(pos, pos + g.length)); H += Rg * Rg / g.length; pos += g.length; }
  H = 12 / (N * (N + 1)) * H - 3 * (N + 1); const corr = 1 - ties / (N ** 3 - N); if (corr > 0) H /= corr;
  return { H, df: k - 1, p: S.pchisqUpper(H, k - 1), eps2: H / ((N * N - 1) / (N + 1)), N, k };
};
S.dunn = groups0 => { /* comparaciones por pares tras Kruskal-Wallis, corrección de Bonferroni */
  const groups = groups0.map(num); const all = groups.flat(), N = all.length; const { r, ties } = S.rank(all);
  const Rm = []; let pos = 0; for (const g of groups) { Rm.push(g.length ? S.mean(r.slice(pos, pos + g.length)) : NaN); pos += g.length; }
  const k = groups.filter(g => g.length).length, m = k * (k - 1) / 2, out = [];
  for (let i = 0; i < groups.length; i++) for (let j = i + 1; j < groups.length; j++) {
    if (!groups[i].length || !groups[j].length) continue;
    const se = Math.sqrt((N * (N + 1) / 12 - ties / (12 * (N - 1))) * (1 / groups[i].length + 1 / groups[j].length));
    const z = (Rm[i] - Rm[j]) / se, p = 2 * (1 - S.pnorm(Math.abs(z))); out.push({ i, j, z, p, padj: Math.min(1, p * m) }); }
  return out;
};
S.welch = (x0, y0) => { const x = num(x0), y = num(y0), nx = x.length, ny = y.length; if (nx < 2 || ny < 2) return null;
  const mx = S.mean(x), my = S.mean(y), vx = S.variance(x), vy = S.variance(y), se = Math.sqrt(vx / nx + vy / ny); const diff = mx - my;
  const df = (vx / nx + vy / ny) ** 2 / ((vx / nx) ** 2 / (nx - 1) + (vy / ny) ** 2 / (ny - 1)); const t = diff / se;
  const q = S.qt(0.975, df), sp = Math.sqrt(((nx - 1) * vx + (ny - 1) * vy) / (nx + ny - 2));
  return { t, df, p: S.pt2(t, df), diff, lo: diff - q * se, hi: diff + q * se, d: diff / sp, m1: mx, m2: my }; };
S.anova = groups0 => { const groups = groups0.map(num).filter(g => g.length); const k = groups.length; if (k < 2) return null;
  const all = groups.flat(), N = all.length, gm = S.mean(all); let ssb = 0, ssw = 0;
  for (const g of groups) { const m = S.mean(g); ssb += g.length * (m - gm) ** 2; for (const v of g) ssw += (v - m) ** 2; }
  const df1 = k - 1, df2 = N - k; if (df2 < 1) return null; const F = (ssb / df1) / (ssw / df2);
  return { F, df1, df2, p: S.pfUpper(F, df1, df2), eta2: ssb / (ssb + ssw) }; };
S.levene = groups0 => { /* Brown-Forsythe (mediana) */
  const groups = groups0.map(num).filter(g => g.length > 1); if (groups.length < 2) return null;
  return S.anova(groups.map(g => { const md = S.median(g); return g.map(v => Math.abs(v - md)); })); };

/* ---------- correlación ---------- */
const pairs = (x, y) => { const X = [], Y = []; for (let i = 0; i < x.length; i++) if (Number.isFinite(x[i]) && Number.isFinite(y[i]) && x[i] !== null && y[i] !== null) { X.push(x[i]); Y.push(y[i]); } return [X, Y]; };
S.pairs = pairs;
function pearsonRaw(X, Y) { const n = X.length, mx = S.mean(X), my = S.mean(Y); let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) { const a = X[i] - mx, b = Y[i] - my; sxy += a * b; sxx += a * a; syy += b * b; } return sxy / Math.sqrt(sxx * syy); }
S.pearson = (x, y) => { const [X, Y] = pairs(x, y), n = X.length; if (n < 3) return null; const r = pearsonRaw(X, Y); if (!Number.isFinite(r)) return null;
  const t = r * Math.sqrt((n - 2) / Math.max(1e-300, 1 - r * r)); const z = Math.atanh(r), se = 1 / Math.sqrt(n - 3), q = 1.959963984540054;
  return { r, n, p: Math.abs(r) >= 1 ? 0 : S.pt2(t, n - 2), lo: n > 3 ? Math.tanh(z - q * se) : NaN, hi: n > 3 ? Math.tanh(z + q * se) : NaN }; };
S.spearman = (x, y) => { const [X, Y] = pairs(x, y), n = X.length; if (n < 3) return null; const r = pearsonRaw(S.rank(X).r, S.rank(Y).r); if (!Number.isFinite(r)) return null;
  const t = r * Math.sqrt((n - 2) / Math.max(1e-300, 1 - r * r)); const z = Math.atanh(r), se = Math.sqrt((1 + r * r / 2) / (n - 3)), q = 1.959963984540054; /* Bonett-Wright */
  return { r, n, p: Math.abs(r) >= 1 ? 0 : S.pt2(t, n - 2), lo: n > 3 ? Math.tanh(z - q * se) : NaN, hi: n > 3 ? Math.tanh(z + q * se) : NaN }; };
S.ols = (x, y) => { const [X, Y] = pairs(x, y), n = X.length; if (n < 2) return null; const mx = S.mean(X), my = S.mean(Y); let sxy = 0, sxx = 0;
  for (let i = 0; i < n; i++) { sxy += (X[i] - mx) * (Y[i] - my); sxx += (X[i] - mx) ** 2; } const b = sxy / sxx; return { b, a: my - b * mx }; };

/* ---------- confiabilidad ---------- */
S.cronbach = rows0 => { /* filas completas, columnas = ítems */
  const rows = rows0.filter(r => r.every(v => Number.isFinite(v))); const n = rows.length; if (n < 3) return null; const k = rows[0].length; if (k < 2) return null;
  const col = j => rows.map(r => r[j]); const tot = rows.map(r => S.sum(r)); const vt = S.variance(tot); if (!(vt > 0)) return null;
  const vi = Array.from({ length: k }, (_, j) => S.variance(col(j))); const alpha = k / (k - 1) * (1 - S.sum(vi) / vt);
  const items = Array.from({ length: k }, (_, j) => { const rest = rows.map(r => S.sum(r) - r[j]); const vr = S.variance(rest);
    const vSub = S.sum(vi) - vi[j]; return { rit: pearsonRaw(col(j), rest), alphaDel: k > 2 && vr > 0 ? (k - 1) / (k - 2) * (1 - vSub / vr) : NaN, mean: S.mean(col(j)), sd: Math.sqrt(vi[j]) }; });
  return { alpha, n, k, items };
};

/* ---------- regresión logística (IRLS) ---------- */
function solve(A, b) { const n = A.length; const M = A.map((r, i) => [...r, b[i]]);
  for (let i = 0; i < n; i++) { let mx = i; for (let k = i + 1; k < n; k++) if (Math.abs(M[k][i]) > Math.abs(M[mx][i])) mx = k; [M[i], M[mx]] = [M[mx], M[i]];
    if (Math.abs(M[i][i]) < 1e-12) return null; for (let k = i + 1; k < n; k++) { const f = M[k][i] / M[i][i]; for (let j = i; j <= n; j++) M[k][j] -= f * M[i][j]; } }
  const x = new Array(n); for (let i = n - 1; i >= 0; i--) { let s = M[i][n]; for (let j = i + 1; j < n; j++) s -= M[i][j] * x[j]; x[i] = s / M[i][i]; } return x; }
function inverse(A) { const n = A.length; const out = []; for (let j = 0; j < n; j++) { const e = new Array(n).fill(0); e[j] = 1; const c = solve(A, e); if (!c) return null; out.push(c); }
  return A.map((_, i) => out.map(c => c[i])); }
S.logistic = (Xrows, y, names) => { /* Xrows sin intercepto */
  const n = y.length, p = Xrows[0].length + 1; const X = Xrows.map(r => [1, ...r]); let beta = new Array(p).fill(0);
  const ybar = S.mean(y); if (ybar === 0 || ybar === 1) return { error: "El desenlace no varía: todos los casos tienen el mismo valor." };
  beta[0] = Math.log(ybar / (1 - ybar)); let ll = -Infinity, conv = false, it = 0, H;
  for (it = 0; it < 60; it++) {
    const eta = X.map(r => r.reduce((s, v, j) => s + v * beta[j], 0)); const mu = eta.map(e => 1 / (1 + Math.exp(-e)));
    const g = new Array(p).fill(0); H = Array.from({ length: p }, () => new Array(p).fill(0));
    for (let i = 0; i < n; i++) { const w = mu[i] * (1 - mu[i]), r = y[i] - mu[i]; for (let j = 0; j < p; j++) { g[j] += X[i][j] * r; for (let k = j; k < p; k++) H[j][k] += w * X[i][j] * X[i][k]; } }
    for (let j = 0; j < p; j++) for (let k = 0; k < j; k++) H[j][k] = H[k][j];
    const step = solve(H, g); if (!step) return { error: "La matriz es singular: hay variables redundantes o sin variación." };
    beta = beta.map((b, j) => b + step[j]);
    const eta2 = X.map(r => r.reduce((s, v, j) => s + v * beta[j], 0)); let ll2 = 0;
    for (let i = 0; i < n; i++) { const e = eta2[i]; ll2 += y[i] * e - Math.log1p(Math.exp(-Math.abs(e))) - Math.max(e, 0); }
    if (Math.abs(ll2 - ll) < 1e-10) { ll = ll2; conv = true; break; } ll = ll2;
  }
  /* recalcular H en el óptimo */
  { const mu = X.map(r => 1 / (1 + Math.exp(-r.reduce((s, v, j) => s + v * beta[j], 0)))); H = Array.from({ length: p }, () => new Array(p).fill(0));
    for (let i = 0; i < n; i++) { const w = mu[i] * (1 - mu[i]); for (let j = 0; j < p; j++) for (let k = 0; k < p; k++) H[j][k] += w * X[i][j] * X[i][k]; } }
  const V = inverse(H); if (!V) return { error: "No se pudo invertir la matriz de información." };
  const k1 = S.sum(y), ll0 = k1 * Math.log(ybar) + (n - k1) * Math.log(1 - ybar); const LR = 2 * (ll - ll0);
  const cox = 1 - Math.exp(-LR / n), nag = cox / (1 - Math.exp(2 * ll0 / n));
  const coef = beta.map((b, j) => { const se = Math.sqrt(V[j][j]), z = b / se; return { name: j ? names[j - 1] : "Constante", b, se, z, p: 2 * (1 - S.pnorm(Math.abs(z))), or: Math.exp(b), lo: Math.exp(b - 1.959963984540054 * se), hi: Math.exp(b + 1.959963984540054 * se) }; });
  const separation = coef.some(c => Math.abs(c.b) > 15 || c.se > 50);
  /* clasificación con punto de corte 0,5 */
  let ok = 0; for (let i = 0; i < n; i++) { const pr = 1 / (1 + Math.exp(-X[i].reduce((s, v, j) => s + v * beta[j], 0))); if ((pr >= 0.5 ? 1 : 0) === y[i]) ok++; }
  return { coef, n, events: k1, ll, ll0, LR, df: p - 1, pLR: S.pchisqUpper(LR, p - 1), nagelkerke: nag, coxSnell: cox, converged: conv, iterations: it + 1, separation, accuracy: ok / n, epv: Math.min(k1, n - k1) / (p - 1) };
};

/* ---------- curva ROC ---------- */
S.roc = (score0, y0, lowerIsRisk = true) => { /* devuelve AUC con IC de Hanley-McNeil y el punto de Youden */
  const [sc, yy] = pairs(score0, y0); const pos = sc.filter((_, i) => yy[i] === 1), neg = sc.filter((_, i) => yy[i] === 0);
  const n1 = pos.length, n0 = neg.length; if (!n1 || !n0) return null;
  const s = lowerIsRisk ? v => -v : v => v; let A = 0;
  for (const a of pos) for (const b of neg) A += s(a) > s(b) ? 1 : s(a) === s(b) ? 0.5 : 0; A /= n1 * n0;
  const Q1 = A / (2 - A), Q2 = 2 * A * A / (1 + A); const se = Math.sqrt((A * (1 - A) + (n1 - 1) * (Q1 - A * A) + (n0 - 1) * (Q2 - A * A)) / (n1 * n0));
  const cuts = [...new Set(sc)].sort((a, b) => lowerIsRisk ? a - b : b - a); const pts = [{ fpr: 0, tpr: 0, cut: null }]; let best = null;
  for (const c of cuts) { const tp = pos.filter(v => lowerIsRisk ? v <= c : v >= c).length, fp = neg.filter(v => lowerIsRisk ? v <= c : v >= c).length;
    const sens = tp / n1, spec = 1 - fp / n0; pts.push({ fpr: 1 - spec, tpr: sens, cut: c, sens, spec, ppv: tp + fp ? tp / (tp + fp) : NaN, npv: (n0 - fp) + (n1 - tp) ? (n0 - fp) / ((n0 - fp) + (n1 - tp)) : NaN });
    const J = sens + spec - 1; if (!best || J > best.J) best = { J, cut: c, sens, spec }; }
  if (pts[pts.length - 1].tpr < 1 || pts[pts.length - 1].fpr < 1) pts.push({ fpr: 1, tpr: 1, cut: null });
  const z = (A - 0.5) / se;
  return { auc: A, se, lo: Math.max(0, A - 1.959963984540054 * se), hi: Math.min(1, A + 1.959963984540054 * se), p: se > 0 ? 2 * (1 - S.pnorm(Math.abs(z))) : NaN, pts, best, n1, n0 };
};

/* ---------- tamaño de muestra ---------- */
S.sampleSizeProportion = (p, d, conf = 0.95, N = Infinity) => { const z = S.qnorm(1 - (1 - conf) / 2); const n0 = z * z * p * (1 - p) / (d * d);
  return Number.isFinite(N) && N > 0 ? Math.ceil(N * n0 / (n0 + N - 1)) : Math.ceil(n0); };

root.STATS = S;
if (typeof module !== "undefined") module.exports = S;
})(typeof window !== "undefined" ? window : globalThis);
