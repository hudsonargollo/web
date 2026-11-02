import { n as Va } from "./rolldown-runtime-DpiKQypI.js";
var ar = /* @__PURE__ */ Va({
  Deflate: () => Ha,
  Inflate: () => Ya,
  constants: () => Wa,
  default: () => er,
  deflate: () => Ba,
  deflateRaw: () => Pa,
  gzip: () => Ka,
  inflate: () => Ga,
  inflateRaw: () => Xa,
  ungzip: () => ja
}), Ja = 4, kt = 0, Et = 1, Qa = 2;
function he(e) {
  let a = e.length;
  for (; --a >= 0; ) e[a] = 0;
}
var qa = 29, ut = 256, oa = 286, we = 30, ha = 19, fa = 573, ve = 15, Ke = 16, ei = 7, ct = 256, ti = 16, ai = 17, ii = 18, nt = new Uint8Array([
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  1,
  1,
  1,
  1,
  2,
  2,
  2,
  2,
  3,
  3,
  3,
  3,
  4,
  4,
  4,
  4,
  5,
  5,
  5,
  5,
  0
]), Ce = new Uint8Array([
  0,
  0,
  0,
  0,
  1,
  1,
  2,
  2,
  3,
  3,
  4,
  4,
  5,
  5,
  6,
  6,
  7,
  7,
  8,
  8,
  9,
  9,
  10,
  10,
  11,
  11,
  12,
  12,
  13,
  13
]), ni = new Uint8Array([
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  2,
  3,
  7
]), da = new Uint8Array([
  16,
  17,
  18,
  0,
  8,
  7,
  9,
  6,
  10,
  5,
  11,
  4,
  12,
  3,
  13,
  2,
  14,
  1,
  15
]), ri = 512, Y = new Array(576);
he(Y);
var be = new Array(60);
he(be);
var ke = new Array(ri);
he(ke);
var Ee = new Array(256);
he(Ee);
var wt = new Array(qa);
he(wt);
var $e = new Array(we);
he($e);
function Ye(e, a, t, i, r) {
  this.static_tree = e, this.extra_bits = a, this.extra_base = t, this.elems = i, this.max_length = r, this.has_stree = e && e.length;
}
var sa, ua, ca;
function Ge(e, a) {
  this.dyn_tree = e, this.max_code = 0, this.stat_desc = a;
}
var wa = (e) => e < 256 ? ke[e] : ke[256 + (e >>> 7)], ye = (e, a) => {
  e.pending_buf[e.pending++] = a & 255, e.pending_buf[e.pending++] = a >>> 8 & 255;
}, N = (e, a, t) => {
  e.bi_valid > Ke - t ? (e.bi_buf |= a << e.bi_valid & 65535, ye(e, e.bi_buf), e.bi_buf = a >> Ke - e.bi_valid, e.bi_valid += t - Ke) : (e.bi_buf |= a << e.bi_valid & 65535, e.bi_valid += t);
}, H = (e, a, t) => {
  N(e, t[a * 2], t[a * 2 + 1]);
}, va = (e, a) => {
  let t = 0;
  do
    t |= e & 1, e >>>= 1, t <<= 1;
  while (--a > 0);
  return t >>> 1;
}, li = (e) => {
  e.bi_valid === 16 ? (ye(e, e.bi_buf), e.bi_buf = 0, e.bi_valid = 0) : e.bi_valid >= 8 && (e.pending_buf[e.pending++] = e.bi_buf & 255, e.bi_buf >>= 8, e.bi_valid -= 8);
}, _i = (e, a) => {
  const t = a.dyn_tree, i = a.max_code, r = a.stat_desc.static_tree, n = a.stat_desc.has_stree, h = a.stat_desc.extra_bits, _ = a.stat_desc.extra_base, f = a.stat_desc.max_length;
  let l, o, y, u, d, c, R = 0;
  for (u = 0; u <= ve; u++) e.bl_count[u] = 0;
  for (t[e.heap[e.heap_max] * 2 + 1] = 0, l = e.heap_max + 1; l < fa; l++)
    o = e.heap[l], u = t[t[o * 2 + 1] * 2 + 1] + 1, u > f && (u = f, R++), t[o * 2 + 1] = u, !(o > i) && (e.bl_count[u]++, d = 0, o >= _ && (d = h[o - _]), c = t[o * 2], e.opt_len += c * (u + d), n && (e.static_len += c * (r[o * 2 + 1] + d)));
  if (R !== 0) {
    do {
      for (u = f - 1; e.bl_count[u] === 0; ) u--;
      e.bl_count[u]--, e.bl_count[u + 1] += 2, e.bl_count[f]--, R -= 2;
    } while (R > 0);
    for (u = f; u !== 0; u--)
      for (o = e.bl_count[u]; o !== 0; )
        y = e.heap[--l], !(y > i) && (t[y * 2 + 1] !== u && (e.opt_len += (u - t[y * 2 + 1]) * t[y * 2], t[y * 2 + 1] = u), o--);
  }
}, ba = (e, a, t) => {
  const i = new Array(16);
  let r = 0, n, h;
  for (n = 1; n <= ve; n++)
    r = r + t[n - 1] << 1, i[n] = r;
  for (h = 0; h <= a; h++) {
    let _ = e[h * 2 + 1];
    _ !== 0 && (e[h * 2] = va(i[_]++, _));
  }
}, oi = () => {
  let e, a, t, i, r;
  const n = new Array(16);
  for (t = 0, i = 0; i < 28; i++)
    for (wt[i] = t, e = 0; e < 1 << nt[i]; e++) Ee[t++] = i;
  for (Ee[t - 1] = i, r = 0, i = 0; i < 16; i++)
    for ($e[i] = r, e = 0; e < 1 << Ce[i]; e++) ke[r++] = i;
  for (r >>= 7; i < we; i++)
    for ($e[i] = r << 7, e = 0; e < 1 << Ce[i] - 7; e++) ke[256 + r++] = i;
  for (a = 0; a <= ve; a++) n[a] = 0;
  for (e = 0; e <= 143; )
    Y[e * 2 + 1] = 8, e++, n[8]++;
  for (; e <= 255; )
    Y[e * 2 + 1] = 9, e++, n[9]++;
  for (; e <= 279; )
    Y[e * 2 + 1] = 7, e++, n[7]++;
  for (; e <= 287; )
    Y[e * 2 + 1] = 8, e++, n[8]++;
  for (ba(Y, 287, n), e = 0; e < we; e++)
    be[e * 2 + 1] = 5, be[e * 2] = va(e, 5);
  sa = new Ye(Y, nt, 257, oa, ve), ua = new Ye(be, Ce, 0, we, ve), ca = new Ye(new Array(0), ni, 0, ha, ei);
}, ga = (e) => {
  let a;
  for (a = 0; a < oa; a++) e.dyn_ltree[a * 2] = 0;
  for (a = 0; a < we; a++) e.dyn_dtree[a * 2] = 0;
  for (a = 0; a < ha; a++) e.bl_tree[a * 2] = 0;
  e.dyn_ltree[ct * 2] = 1, e.opt_len = e.static_len = 0, e.sym_next = e.matches = 0;
}, pa = (e) => {
  e.bi_valid > 8 ? ye(e, e.bi_buf) : e.bi_valid > 0 && (e.pending_buf[e.pending++] = e.bi_buf), e.bi_buf = 0, e.bi_valid = 0;
}, yt = (e, a, t, i) => {
  const r = a * 2, n = t * 2;
  return e[r] < e[n] || e[r] === e[n] && i[a] <= i[t];
}, Xe = (e, a, t) => {
  const i = e.heap[t];
  let r = t << 1;
  for (; r <= e.heap_len && (r < e.heap_len && yt(a, e.heap[r + 1], e.heap[r], e.depth) && r++, !yt(a, i, e.heap[r], e.depth)); )
    e.heap[t] = e.heap[r], t = r, r <<= 1;
  e.heap[t] = i;
}, mt = (e, a, t) => {
  let i, r, n = 0, h, _;
  if (e.sym_next !== 0) do
    i = e.pending_buf[e.sym_buf + n++] & 255, i += (e.pending_buf[e.sym_buf + n++] & 255) << 8, r = e.pending_buf[e.sym_buf + n++], i === 0 ? H(e, r, a) : (h = Ee[r], H(e, h + ut + 1, a), _ = nt[h], _ !== 0 && (r -= wt[h], N(e, r, _)), i--, h = wa(i), H(e, h, t), _ = Ce[h], _ !== 0 && (i -= $e[h], N(e, i, _)));
  while (n < e.sym_next);
  H(e, ct, a);
}, rt = (e, a) => {
  const t = a.dyn_tree, i = a.stat_desc.static_tree, r = a.stat_desc.has_stree, n = a.stat_desc.elems;
  let h, _, f = -1, l;
  for (e.heap_len = 0, e.heap_max = fa, h = 0; h < n; h++) t[h * 2] !== 0 ? (e.heap[++e.heap_len] = f = h, e.depth[h] = 0) : t[h * 2 + 1] = 0;
  for (; e.heap_len < 2; )
    l = e.heap[++e.heap_len] = f < 2 ? ++f : 0, t[l * 2] = 1, e.depth[l] = 0, e.opt_len--, r && (e.static_len -= i[l * 2 + 1]);
  for (a.max_code = f, h = e.heap_len >> 1; h >= 1; h--) Xe(e, t, h);
  l = n;
  do
    h = e.heap[1], e.heap[1] = e.heap[e.heap_len--], Xe(e, t, 1), _ = e.heap[1], e.heap[--e.heap_max] = h, e.heap[--e.heap_max] = _, t[l * 2] = t[h * 2] + t[_ * 2], e.depth[l] = (e.depth[h] >= e.depth[_] ? e.depth[h] : e.depth[_]) + 1, t[h * 2 + 1] = t[_ * 2 + 1] = l, e.heap[1] = l++, Xe(e, t, 1);
  while (e.heap_len >= 2);
  e.heap[--e.heap_max] = e.heap[1], _i(e, a), ba(t, f, e.bl_count);
}, xt = (e, a, t) => {
  let i, r = -1, n, h = a[1], _ = 0, f = 7, l = 4;
  for (h === 0 && (f = 138, l = 3), a[(t + 1) * 2 + 1] = 65535, i = 0; i <= t; i++)
    n = h, h = a[(i + 1) * 2 + 1], !(++_ < f && n === h) && (_ < l ? e.bl_tree[n * 2] += _ : n !== 0 ? (n !== r && e.bl_tree[n * 2]++, e.bl_tree[32]++) : _ <= 10 ? e.bl_tree[34]++ : e.bl_tree[36]++, _ = 0, r = n, h === 0 ? (f = 138, l = 3) : n === h ? (f = 6, l = 3) : (f = 7, l = 4));
}, zt = (e, a, t) => {
  let i, r = -1, n, h = a[1], _ = 0, f = 7, l = 4;
  for (h === 0 && (f = 138, l = 3), i = 0; i <= t; i++)
    if (n = h, h = a[(i + 1) * 2 + 1], !(++_ < f && n === h)) {
      if (_ < l) do
        H(e, n, e.bl_tree);
      while (--_ !== 0);
      else n !== 0 ? (n !== r && (H(e, n, e.bl_tree), _--), H(e, ti, e.bl_tree), N(e, _ - 3, 2)) : _ <= 10 ? (H(e, ai, e.bl_tree), N(e, _ - 3, 3)) : (H(e, ii, e.bl_tree), N(e, _ - 11, 7));
      _ = 0, r = n, h === 0 ? (f = 138, l = 3) : n === h ? (f = 6, l = 3) : (f = 7, l = 4);
    }
}, hi = (e) => {
  let a;
  for (xt(e, e.dyn_ltree, e.l_desc.max_code), xt(e, e.dyn_dtree, e.d_desc.max_code), rt(e, e.bl_desc), a = 18; a >= 3 && e.bl_tree[da[a] * 2 + 1] === 0; a--) ;
  return e.opt_len += 3 * (a + 1) + 5 + 5 + 4, a;
}, fi = (e, a, t, i) => {
  let r;
  for (N(e, a - 257, 5), N(e, t - 1, 5), N(e, i - 4, 4), r = 0; r < i; r++) N(e, e.bl_tree[da[r] * 2 + 1], 3);
  zt(e, e.dyn_ltree, a - 1), zt(e, e.dyn_dtree, t - 1);
}, di = (e) => {
  let a = 4093624447, t;
  for (t = 0; t <= 31; t++, a >>>= 1) if (a & 1 && e.dyn_ltree[t * 2] !== 0) return kt;
  if (e.dyn_ltree[18] !== 0 || e.dyn_ltree[20] !== 0 || e.dyn_ltree[26] !== 0) return Et;
  for (t = 32; t < ut; t++) if (e.dyn_ltree[t * 2] !== 0) return Et;
  return kt;
}, At = !1, si = (e) => {
  At || (oi(), At = !0), e.l_desc = new Ge(e.dyn_ltree, sa), e.d_desc = new Ge(e.dyn_dtree, ua), e.bl_desc = new Ge(e.bl_tree, ca), e.bi_buf = 0, e.bi_valid = 0, ga(e);
}, ka = (e, a, t, i) => {
  N(e, 0 + (i ? 1 : 0), 3), pa(e), ye(e, t), ye(e, ~t), t && e.pending_buf.set(e.window.subarray(a, a + t), e.pending), e.pending += t;
}, ui = (e) => {
  N(e, 2, 3), H(e, ct, Y), li(e);
}, ci = (e, a, t, i) => {
  let r, n, h = 0;
  e.level > 0 ? (e.strm.data_type === Qa && (e.strm.data_type = di(e)), rt(e, e.l_desc), rt(e, e.d_desc), h = hi(e), r = e.opt_len + 3 + 7 >>> 3, n = e.static_len + 3 + 7 >>> 3, n <= r && (r = n)) : r = n = t + 5, t + 4 <= r && a !== -1 ? ka(e, a, t, i) : e.strategy === Ja || n === r ? (N(e, 2 + (i ? 1 : 0), 3), mt(e, Y, be)) : (N(e, 4 + (i ? 1 : 0), 3), fi(e, e.l_desc.max_code + 1, e.d_desc.max_code + 1, h + 1), mt(e, e.dyn_ltree, e.dyn_dtree)), ga(e), i && pa(e);
}, wi = (e, a, t) => (e.pending_buf[e.sym_buf + e.sym_next++] = a, e.pending_buf[e.sym_buf + e.sym_next++] = a >> 8, e.pending_buf[e.sym_buf + e.sym_next++] = t, a === 0 ? e.dyn_ltree[t * 2]++ : (e.matches++, a--, e.dyn_ltree[(Ee[t] + ut + 1) * 2]++, e.dyn_dtree[wa(a) * 2]++), e.sym_next === e.sym_end), vi = {
  _tr_init: si,
  _tr_stored_block: ka,
  _tr_flush_block: ci,
  _tr_tally: wi,
  _tr_align: ui
}, bi = (e, a, t, i) => {
  let r = e & 65535 | 0, n = e >>> 16 & 65535 | 0, h = 0;
  for (; t !== 0; ) {
    h = t > 2e3 ? 2e3 : t, t -= h;
    do
      r = r + a[i++] | 0, n = n + r | 0;
    while (--h);
    r %= 65521, n %= 65521;
  }
  return r | n << 16 | 0;
}, me = bi, gi = () => {
  let e, a = [];
  for (var t = 0; t < 256; t++) {
    e = t;
    for (var i = 0; i < 8; i++) e = e & 1 ? 3988292384 ^ e >>> 1 : e >>> 1;
    a[t] = e;
  }
  return a;
}, pi = new Uint32Array(gi()), ki = (e, a, t, i) => {
  const r = pi, n = i + t;
  e ^= -1;
  for (let h = i; h < n; h++) e = e >>> 8 ^ r[(e ^ a[h]) & 255];
  return e ^ -1;
}, D = ki, q = {
  2: "need dictionary",
  1: "stream end",
  0: "",
  "-1": "file error",
  "-2": "stream error",
  "-3": "data error",
  "-4": "insufficient memory",
  "-5": "buffer error",
  "-6": "incompatible version"
}, ie = {
  Z_NO_FLUSH: 0,
  Z_PARTIAL_FLUSH: 1,
  Z_SYNC_FLUSH: 2,
  Z_FULL_FLUSH: 3,
  Z_FINISH: 4,
  Z_BLOCK: 5,
  Z_TREES: 6,
  Z_OK: 0,
  Z_STREAM_END: 1,
  Z_NEED_DICT: 2,
  Z_ERRNO: -1,
  Z_STREAM_ERROR: -2,
  Z_DATA_ERROR: -3,
  Z_MEM_ERROR: -4,
  Z_BUF_ERROR: -5,
  Z_NO_COMPRESSION: 0,
  Z_BEST_SPEED: 1,
  Z_BEST_COMPRESSION: 9,
  Z_DEFAULT_COMPRESSION: -1,
  Z_FILTERED: 1,
  Z_HUFFMAN_ONLY: 2,
  Z_RLE: 3,
  Z_FIXED: 4,
  Z_DEFAULT_STRATEGY: 0,
  Z_BINARY: 0,
  Z_TEXT: 1,
  Z_UNKNOWN: 2,
  Z_DEFLATED: 8
}, { _tr_init: Ei, _tr_stored_block: lt, _tr_flush_block: yi, _tr_tally: X, _tr_align: mi } = vi, { Z_NO_FLUSH: j, Z_PARTIAL_FLUSH: xi, Z_FULL_FLUSH: zi, Z_FINISH: C, Z_BLOCK: St, Z_OK: O, Z_STREAM_END: Rt, Z_STREAM_ERROR: B, Z_DATA_ERROR: Ai, Z_BUF_ERROR: je, Z_DEFAULT_COMPRESSION: Si, Z_FILTERED: Ri, Z_HUFFMAN_ONLY: De, Z_RLE: Ti, Z_FIXED: Zi, Z_DEFAULT_STRATEGY: Di, Z_UNKNOWN: Oi, Z_DEFLATED: He } = ie, Ii = 9, Ni = 15, Ui = 8, Li = 573, T = 3, V = 258, P = 262, Ci = 32, _e = 42, vt = 57, _t = 69, ot = 73, ht = 91, ft = 103, J = 113, ue = 666, I = 1, fe = 2, ee = 3, de = 4, $i = 3, Q = (e, a) => (e.msg = q[a], a), Tt = (e) => e * 2 - (e > 4 ? 9 : 0), G = (e) => {
  let a = e.length;
  for (; --a >= 0; ) e[a] = 0;
}, Fi = (e) => {
  let a, t, i, r = e.w_size;
  a = e.hash_size, i = a;
  do
    t = e.head[--i], e.head[i] = t >= r ? t - r : 0;
  while (--a);
  a = r, i = a;
  do
    t = e.prev[--i], e.prev[i] = t >= r ? t - r : 0;
  while (--a);
}, bt = (e, a, t) => (a << e.hash_shift ^ t) & e.hash_mask, te = (e, a) => {
  let t;
  if (e.legacy_hash) t = e.ins_h = bt(e, e.ins_h, e.window[a + T - 1]);
  else {
    const r = e.window, n = r[a] | r[a + 1] << 8 | r[a + 2] << 16 | r[a + 3] << 24;
    t = e.ins_h = Math.imul(n, 66521) + 66521 >>> 16 & e.hash_mask;
  }
  const i = e.prev[a & e.w_mask] = e.head[t];
  return e.head[t] = a, i;
}, U = (e) => {
  const a = e.state;
  let t = a.pending;
  t > e.avail_out && (t = e.avail_out), t !== 0 && (e.output.set(a.pending_buf.subarray(a.pending_out, a.pending_out + t), e.next_out), e.next_out += t, a.pending_out += t, e.total_out += t, e.avail_out -= t, a.pending -= t, a.pending === 0 && (a.pending_out = 0));
}, L = (e, a) => {
  yi(e, e.block_start >= 0 ? e.block_start : -1, e.strstart - e.block_start, a), e.block_start = e.strstart, U(e.strm);
}, x = (e, a) => {
  e.pending_buf[e.pending++] = a;
}, se = (e, a) => {
  e.pending_buf[e.pending++] = a >>> 8 & 255, e.pending_buf[e.pending++] = a & 255;
}, dt = (e, a, t, i) => {
  let r = e.avail_in;
  return r > i && (r = i), r === 0 ? 0 : (e.avail_in -= r, a.set(e.input.subarray(e.next_in, e.next_in + r), t), e.state.wrap === 1 ? e.adler = me(e.adler, a, r, t) : e.state.wrap === 2 && (e.adler = D(e.adler, a, r, t)), e.next_in += r, e.total_in += r, r);
}, Ea = (e, a) => {
  let t = e.max_chain_length, i = e.strstart, r, n, h = e.prev_length, _ = e.nice_match;
  const f = e.strstart > e.w_size - P ? e.strstart - (e.w_size - P) : 0, l = e.window, o = e.w_mask, y = e.prev, u = e.strstart + V;
  let d = l[i + h - 1], c = l[i + h];
  e.prev_length >= e.good_match && (t >>= 2), _ > e.lookahead && (_ = e.lookahead);
  do
    if (r = a, !(l[r + h] !== c || l[r + h - 1] !== d || l[r] !== l[i] || l[++r] !== l[i + 1])) {
      i += 2, r++;
      do
        ;
      while (l[++i] === l[++r] && l[++i] === l[++r] && l[++i] === l[++r] && l[++i] === l[++r] && l[++i] === l[++r] && l[++i] === l[++r] && l[++i] === l[++r] && l[++i] === l[++r] && i < u);
      if (n = V - (u - i), i = u - V, n > h) {
        if (e.match_start = a, h = n, n >= _) break;
        d = l[i + h - 1], c = l[i + h];
      }
    }
  while ((a = y[a & o]) > f && --t !== 0);
  return h <= e.lookahead ? h : e.lookahead;
}, oe = (e) => {
  const a = e.w_size;
  let t, i, r;
  do {
    if (i = e.window_size - e.lookahead - e.strstart, e.strstart >= a + (a - P) && (e.window.set(e.window.subarray(a, a + a - i), 0), e.match_start -= a, e.strstart -= a, e.block_start -= a, e.insert > e.strstart && (e.insert = e.strstart), Fi(e), i += a), e.strm.avail_in === 0) break;
    if (t = dt(e.strm, e.window, e.strstart + e.lookahead, i), e.lookahead += t, e.legacy_hash) {
      if (e.lookahead + e.insert >= T)
        for (r = e.strstart - e.insert, e.ins_h = e.window[r], e.ins_h = bt(e, e.ins_h, e.window[r + 1]); e.insert && (te(e, r), r++, e.insert--, !(e.lookahead + e.insert < T)); )
          ;
    } else if (e.lookahead + e.insert > T)
      for (r = e.strstart - e.insert; e.insert && (te(e, r), r++, e.insert--, !(e.lookahead + e.insert <= T)); )
        ;
  } while (e.lookahead < P && e.strm.avail_in !== 0);
}, ya = (e, a) => {
  let t = e.pending_buf_size - 5 > e.w_size ? e.w_size : e.pending_buf_size - 5, i, r, n, h = 0, _ = e.strm.avail_in;
  do {
    if (i = 65535, n = e.bi_valid + 42 >> 3, e.strm.avail_out < n || (n = e.strm.avail_out - n, r = e.strstart - e.block_start, i > r + e.strm.avail_in && (i = r + e.strm.avail_in), i > n && (i = n), i < t && (i === 0 && a !== C || a === j || i !== r + e.strm.avail_in))) break;
    h = a === C && i === r + e.strm.avail_in ? 1 : 0, lt(e, 0, 0, h), e.pending_buf[e.pending - 4] = i, e.pending_buf[e.pending - 3] = i >> 8, e.pending_buf[e.pending - 2] = ~i, e.pending_buf[e.pending - 1] = ~i >> 8, U(e.strm), r && (r > i && (r = i), e.strm.output.set(e.window.subarray(e.block_start, e.block_start + r), e.strm.next_out), e.strm.next_out += r, e.strm.avail_out -= r, e.strm.total_out += r, e.block_start += r, i -= r), i && (dt(e.strm, e.strm.output, e.strm.next_out, i), e.strm.next_out += i, e.strm.avail_out -= i, e.strm.total_out += i);
  } while (h === 0);
  return _ -= e.strm.avail_in, _ && (_ >= e.w_size ? (e.matches = 2, e.window.set(e.strm.input.subarray(e.strm.next_in - e.w_size, e.strm.next_in), 0), e.strstart = e.w_size, e.insert = e.strstart) : (e.window_size - e.strstart <= _ && (e.strstart -= e.w_size, e.window.set(e.window.subarray(e.w_size, e.w_size + e.strstart), 0), e.matches < 2 && e.matches++, e.insert > e.strstart && (e.insert = e.strstart)), e.window.set(e.strm.input.subarray(e.strm.next_in - _, e.strm.next_in), e.strstart), e.strstart += _, e.insert += _ > e.w_size - e.insert ? e.w_size - e.insert : _), e.block_start = e.strstart), e.high_water < e.strstart && (e.high_water = e.strstart), h ? de : a !== j && a !== C && e.strm.avail_in === 0 && e.strstart === e.block_start ? fe : (n = e.window_size - e.strstart, e.strm.avail_in > n && e.block_start >= e.w_size && (e.block_start -= e.w_size, e.strstart -= e.w_size, e.window.set(e.window.subarray(e.w_size, e.w_size + e.strstart), 0), e.matches < 2 && e.matches++, n += e.w_size, e.insert > e.strstart && (e.insert = e.strstart)), n > e.strm.avail_in && (n = e.strm.avail_in), n && (dt(e.strm, e.window, e.strstart, n), e.strstart += n, e.insert += n > e.w_size - e.insert ? e.w_size - e.insert : n), e.high_water < e.strstart && (e.high_water = e.strstart), n = e.bi_valid + 42 >> 3, n = e.pending_buf_size - n > 65535 ? 65535 : e.pending_buf_size - n, t = n > e.w_size ? e.w_size : n, r = e.strstart - e.block_start, (r >= t || (r || a === C) && a !== j && e.strm.avail_in === 0 && r <= n) && (i = r > n ? n : r, h = a === C && e.strm.avail_in === 0 && i === r ? 1 : 0, lt(e, e.block_start, i, h), e.block_start += i, U(e.strm)), h ? ee : I);
}, We = (e, a) => {
  let t, i;
  for (; ; ) {
    if (e.lookahead < P) {
      if (oe(e), e.lookahead < P && a === j) return I;
      if (e.lookahead === 0) break;
    }
    if (t = 0, e.lookahead >= T && (t = te(e, e.strstart)), t !== 0 && e.strstart - t <= e.w_size - P && (e.match_length = Ea(e, t)), e.match_length >= T)
      if (i = X(e, e.strstart - e.match_start, e.match_length - T), e.lookahead -= e.match_length, e.match_length <= e.max_lazy_match && e.lookahead >= T) {
        e.match_length--;
        do
          e.strstart++, t = te(e, e.strstart);
        while (--e.match_length !== 0);
        e.strstart++;
      } else
        e.strstart += e.match_length, e.match_length = 0, e.legacy_hash && (e.ins_h = e.window[e.strstart], e.ins_h = bt(e, e.ins_h, e.window[e.strstart + 1]));
    else
      i = X(e, 0, e.window[e.strstart]), e.lookahead--, e.strstart++;
    if (i && (L(e, !1), e.strm.avail_out === 0))
      return I;
  }
  return e.insert = e.strstart < 2 ? e.strstart : 2, a === C ? (L(e, !0), e.strm.avail_out === 0 ? ee : de) : e.sym_next && (L(e, !1), e.strm.avail_out === 0) ? I : fe;
}, re = (e, a) => {
  let t, i, r;
  for (; ; ) {
    if (e.lookahead < P) {
      if (oe(e), e.lookahead < P && a === j) return I;
      if (e.lookahead === 0) break;
    }
    if (t = 0, e.lookahead >= T && (t = te(e, e.strstart)), e.prev_length = e.match_length, e.prev_match = e.match_start, e.match_length = 2, t !== 0 && e.prev_length < e.max_lazy_match && e.strstart - t <= e.w_size - P && (e.match_length = Ea(e, t), e.match_length <= 5 && (e.strategy === Ri || e.match_length === T && e.strstart - e.match_start > 4096) && (e.match_length = 2)), e.prev_length >= T && e.match_length <= e.prev_length) {
      r = e.strstart + e.lookahead - T, i = X(e, e.strstart - 1 - e.prev_match, e.prev_length - T), e.lookahead -= e.prev_length - 1, e.prev_length -= 2;
      do
        ++e.strstart <= r && (t = te(e, e.strstart));
      while (--e.prev_length !== 0);
      if (e.match_available = 0, e.match_length = 2, e.strstart++, i && (L(e, !1), e.strm.avail_out === 0))
        return I;
    } else if (e.match_available) {
      if (i = X(e, 0, e.window[e.strstart - 1]), i && L(e, !1), e.strstart++, e.lookahead--, e.strm.avail_out === 0) return I;
    } else
      e.match_available = 1, e.strstart++, e.lookahead--;
  }
  return e.match_available && (i = X(e, 0, e.window[e.strstart - 1]), e.match_available = 0), e.insert = e.strstart < 2 ? e.strstart : 2, a === C ? (L(e, !0), e.strm.avail_out === 0 ? ee : de) : e.sym_next && (L(e, !1), e.strm.avail_out === 0) ? I : fe;
}, Mi = (e, a) => {
  let t, i, r, n;
  const h = e.window;
  for (; ; ) {
    if (e.lookahead <= V) {
      if (oe(e), e.lookahead <= V && a === j) return I;
      if (e.lookahead === 0) break;
    }
    if (e.match_length = 0, e.lookahead >= T && e.strstart > 0 && (r = e.strstart - 1, i = h[r], i === h[++r] && i === h[++r] && i === h[++r])) {
      n = e.strstart + V;
      do
        ;
      while (i === h[++r] && i === h[++r] && i === h[++r] && i === h[++r] && i === h[++r] && i === h[++r] && i === h[++r] && i === h[++r] && r < n);
      e.match_length = V - (n - r), e.match_length > e.lookahead && (e.match_length = e.lookahead);
    }
    if (e.match_length >= T ? (t = X(e, 1, e.match_length - T), e.lookahead -= e.match_length, e.strstart += e.match_length, e.match_length = 0) : (t = X(e, 0, e.window[e.strstart]), e.lookahead--, e.strstart++), t && (L(e, !1), e.strm.avail_out === 0))
      return I;
  }
  return e.insert = 0, a === C ? (L(e, !0), e.strm.avail_out === 0 ? ee : de) : e.sym_next && (L(e, !1), e.strm.avail_out === 0) ? I : fe;
}, Hi = (e, a) => {
  let t;
  for (; ; ) {
    if (e.lookahead === 0 && (oe(e), e.lookahead === 0)) {
      if (a === j) return I;
      break;
    }
    if (e.match_length = 0, t = X(e, 0, e.window[e.strstart]), e.lookahead--, e.strstart++, t && (L(e, !1), e.strm.avail_out === 0))
      return I;
  }
  return e.insert = 0, a === C ? (L(e, !0), e.strm.avail_out === 0 ? ee : de) : e.sym_next && (L(e, !1), e.strm.avail_out === 0) ? I : fe;
};
function F(e, a, t, i, r) {
  this.good_length = e, this.max_lazy = a, this.nice_length = t, this.max_chain = i, this.func = r;
}
var ce = [
  new F(0, 0, 0, 0, ya),
  new F(4, 4, 8, 4, We),
  new F(4, 5, 16, 8, We),
  new F(4, 6, 32, 32, We),
  new F(4, 4, 16, 16, re),
  new F(8, 16, 32, 32, re),
  new F(8, 16, 128, 128, re),
  new F(8, 32, 128, 256, re),
  new F(32, 128, 258, 1024, re),
  new F(32, 258, 258, 4096, re)
], Bi = (e) => {
  e.window_size = 2 * e.w_size, G(e.head), e.max_lazy_match = ce[e.level].max_lazy, e.good_match = ce[e.level].good_length, e.nice_match = ce[e.level].nice_length, e.max_chain_length = ce[e.level].max_chain, e.strstart = 0, e.block_start = 0, e.lookahead = 0, e.insert = 0, e.match_length = e.prev_length = 2, e.match_available = 0, e.ins_h = 0;
};
function Pi() {
  this.strm = null, this.status = 0, this.pending_buf = null, this.pending_buf_size = 0, this.pending_out = 0, this.pending = 0, this.wrap = 0, this.gzhead = null, this.gzindex = 0, this.method = He, this.last_flush = -1, this.w_size = 0, this.w_bits = 0, this.w_mask = 0, this.window = null, this.window_size = 0, this.prev = null, this.head = null, this.ins_h = 0, this.legacy_hash = 0, this.hash_size = 0, this.hash_bits = 0, this.hash_mask = 0, this.hash_shift = 0, this.block_start = 0, this.match_length = 0, this.prev_match = 0, this.match_available = 0, this.strstart = 0, this.match_start = 0, this.lookahead = 0, this.prev_length = 0, this.max_chain_length = 0, this.max_lazy_match = 0, this.level = 0, this.strategy = 0, this.good_match = 0, this.nice_match = 0, this.dyn_ltree = new Uint16Array(Li * 2), this.dyn_dtree = /* @__PURE__ */ new Uint16Array(122), this.bl_tree = /* @__PURE__ */ new Uint16Array(78), G(this.dyn_ltree), G(this.dyn_dtree), G(this.bl_tree), this.l_desc = null, this.d_desc = null, this.bl_desc = null, this.bl_count = /* @__PURE__ */ new Uint16Array(16), this.heap = /* @__PURE__ */ new Uint16Array(573), G(this.heap), this.heap_len = 0, this.heap_max = 0, this.depth = /* @__PURE__ */ new Uint16Array(573), G(this.depth), this.sym_buf = 0, this.lit_bufsize = 0, this.sym_next = 0, this.sym_end = 0, this.opt_len = 0, this.static_len = 0, this.matches = 0, this.insert = 0, this.bi_buf = 0, this.bi_valid = 0;
}
var Ae = (e) => {
  if (!e) return 1;
  const a = e.state;
  return !a || a.strm !== e || a.status !== _e && a.status !== vt && a.status !== _t && a.status !== ot && a.status !== ht && a.status !== ft && a.status !== J && a.status !== ue ? 1 : 0;
}, ma = (e) => {
  if (Ae(e)) return Q(e, B);
  e.total_in = e.total_out = 0, e.data_type = Oi;
  const a = e.state;
  return a.pending = 0, a.pending_out = 0, a.wrap < 0 && (a.wrap = -a.wrap), a.status = a.wrap === 2 ? vt : a.wrap ? _e : J, e.adler = a.wrap === 2 ? 0 : 1, a.last_flush = -2, Ei(a), O;
}, xa = (e) => {
  const a = ma(e);
  return a === O && Bi(e.state), a;
}, Ki = (e, a) => Ae(e) || e.state.wrap !== 2 ? B : (e.state.gzhead = a, O), za = (e, a, t, i, r, n, h) => {
  if (!e) return B;
  let _ = 1;
  if (a === Si && (a = 6), i < 0 ? (_ = 0, i = -i) : i > 15 && (_ = 2, i -= 16), r < 1 || r > Ii || t !== He || i < 8 || i > 15 || a < 0 || a > 9 || n < 0 || n > Zi || i === 8 && _ !== 1) return Q(e, B);
  i === 8 && (i = 9);
  const f = new Pi();
  return e.state = f, f.strm = e, f.status = _e, f.wrap = _, f.gzhead = null, f.w_bits = i, f.w_size = 1 << f.w_bits, f.w_mask = f.w_size - 1, f.legacy_hash = h ? 1 : 0, f.hash_bits = r + 7, !f.legacy_hash && f.hash_bits < 15 && (f.hash_bits = 15), f.hash_size = 1 << f.hash_bits, f.hash_mask = f.hash_size - 1, f.hash_shift = ~~((f.hash_bits + T - 1) / T), f.window = new Uint8Array(f.w_size * 2), f.head = new Uint16Array(f.hash_size), f.prev = new Uint16Array(f.w_size), f.lit_bufsize = 1 << r + 6, f.pending_buf_size = f.lit_bufsize * 4, f.pending_buf = new Uint8Array(f.pending_buf_size), f.sym_buf = f.lit_bufsize, f.sym_end = (f.lit_bufsize - 1) * 3, f.level = a, f.strategy = n, f.method = t, xa(e);
}, Yi = (e, a) => za(e, a, He, Ni, Ui, Di), Gi = (e, a) => {
  if (Ae(e) || a > St || a < 0) return e ? Q(e, B) : B;
  const t = e.state;
  if (!e.output || e.avail_in !== 0 && !e.input || t.status === ue && a !== C) return Q(e, e.avail_out === 0 ? je : B);
  const i = t.last_flush;
  if (t.last_flush = a, t.pending !== 0) {
    if (U(e), e.avail_out === 0)
      return t.last_flush = -1, O;
  } else if (e.avail_in === 0 && Tt(a) <= Tt(i) && a !== C) return Q(e, je);
  if (t.status === ue && e.avail_in !== 0) return Q(e, je);
  if (t.status === _e && t.wrap === 0 && (t.status = J), t.status === _e) {
    let r = He + (t.w_bits - 8 << 4) << 8, n = -1;
    if (t.strategy >= De || t.level < 2 ? n = 0 : t.level < 6 ? n = 1 : t.level === 6 ? n = 2 : n = 3, r |= n << 6, t.strstart !== 0 && (r |= Ci), r += 31 - r % 31, se(t, r), t.strstart !== 0 && (se(t, e.adler >>> 16), se(t, e.adler & 65535)), e.adler = 1, t.status = J, U(e), t.pending !== 0)
      return t.last_flush = -1, O;
  }
  if (t.status === vt) {
    if (e.adler = 0, x(t, 31), x(t, 139), x(t, 8), t.gzhead)
      x(t, (t.gzhead.text ? 1 : 0) + (t.gzhead.hcrc ? 2 : 0) + (t.gzhead.extra ? 4 : 0) + (t.gzhead.name ? 8 : 0) + (t.gzhead.comment ? 16 : 0)), x(t, t.gzhead.time & 255), x(t, t.gzhead.time >> 8 & 255), x(t, t.gzhead.time >> 16 & 255), x(t, t.gzhead.time >> 24 & 255), x(t, t.level === 9 ? 2 : t.strategy >= De || t.level < 2 ? 4 : 0), x(t, t.gzhead.os & 255), t.gzhead.extra && t.gzhead.extra.length && (x(t, t.gzhead.extra.length & 255), x(t, t.gzhead.extra.length >> 8 & 255)), t.gzhead.hcrc && (e.adler = D(e.adler, t.pending_buf, t.pending, 0)), t.gzindex = 0, t.status = _t;
    else if (x(t, 0), x(t, 0), x(t, 0), x(t, 0), x(t, 0), x(t, t.level === 9 ? 2 : t.strategy >= De || t.level < 2 ? 4 : 0), x(t, $i), t.status = J, U(e), t.pending !== 0)
      return t.last_flush = -1, O;
  }
  if (t.status === _t) {
    if (t.gzhead.extra) {
      let r = t.pending, n = (t.gzhead.extra.length & 65535) - t.gzindex;
      for (; t.pending + n > t.pending_buf_size; ) {
        let _ = t.pending_buf_size - t.pending;
        if (t.pending_buf.set(t.gzhead.extra.subarray(t.gzindex, t.gzindex + _), t.pending), t.pending = t.pending_buf_size, t.gzhead.hcrc && t.pending > r && (e.adler = D(e.adler, t.pending_buf, t.pending - r, r)), t.gzindex += _, U(e), t.pending !== 0)
          return t.last_flush = -1, O;
        r = 0, n -= _;
      }
      let h = new Uint8Array(t.gzhead.extra);
      t.pending_buf.set(h.subarray(t.gzindex, t.gzindex + n), t.pending), t.pending += n, t.gzhead.hcrc && t.pending > r && (e.adler = D(e.adler, t.pending_buf, t.pending - r, r)), t.gzindex = 0;
    }
    t.status = ot;
  }
  if (t.status === ot) {
    if (t.gzhead.name) {
      let r = t.pending, n;
      do {
        if (t.pending === t.pending_buf_size) {
          if (t.gzhead.hcrc && t.pending > r && (e.adler = D(e.adler, t.pending_buf, t.pending - r, r)), U(e), t.pending !== 0)
            return t.last_flush = -1, O;
          r = 0;
        }
        t.gzindex < t.gzhead.name.length ? n = t.gzhead.name.charCodeAt(t.gzindex++) & 255 : n = 0, x(t, n);
      } while (n !== 0);
      t.gzhead.hcrc && t.pending > r && (e.adler = D(e.adler, t.pending_buf, t.pending - r, r)), t.gzindex = 0;
    }
    t.status = ht;
  }
  if (t.status === ht) {
    if (t.gzhead.comment) {
      let r = t.pending, n;
      do {
        if (t.pending === t.pending_buf_size) {
          if (t.gzhead.hcrc && t.pending > r && (e.adler = D(e.adler, t.pending_buf, t.pending - r, r)), U(e), t.pending !== 0)
            return t.last_flush = -1, O;
          r = 0;
        }
        t.gzindex < t.gzhead.comment.length ? n = t.gzhead.comment.charCodeAt(t.gzindex++) & 255 : n = 0, x(t, n);
      } while (n !== 0);
      t.gzhead.hcrc && t.pending > r && (e.adler = D(e.adler, t.pending_buf, t.pending - r, r));
    }
    t.status = ft;
  }
  if (t.status === ft) {
    if (t.gzhead.hcrc) {
      if (t.pending + 2 > t.pending_buf_size && (U(e), t.pending !== 0))
        return t.last_flush = -1, O;
      x(t, e.adler & 255), x(t, e.adler >> 8 & 255), e.adler = 0;
    }
    if (t.status = J, U(e), t.pending !== 0)
      return t.last_flush = -1, O;
  }
  if (e.avail_in !== 0 || t.lookahead !== 0 || a !== j && t.status !== ue) {
    let r = t.level === 0 ? ya(t, a) : t.strategy === De ? Hi(t, a) : t.strategy === Ti ? Mi(t, a) : ce[t.level].func(t, a);
    if ((r === ee || r === de) && (t.status = ue), r === I || r === ee)
      return e.avail_out === 0 && (t.last_flush = -1), O;
    if (r === fe && (a === xi ? mi(t) : a !== St && (lt(t, 0, 0, !1), a === zi && (G(t.head), t.lookahead === 0 && (t.strstart = 0, t.block_start = 0, t.insert = 0))), U(e), e.avail_out === 0))
      return t.last_flush = -1, O;
  }
  return a !== C ? O : t.wrap <= 0 ? Rt : (t.wrap === 2 ? (x(t, e.adler & 255), x(t, e.adler >> 8 & 255), x(t, e.adler >> 16 & 255), x(t, e.adler >> 24 & 255), x(t, e.total_in & 255), x(t, e.total_in >> 8 & 255), x(t, e.total_in >> 16 & 255), x(t, e.total_in >> 24 & 255)) : (se(t, e.adler >>> 16), se(t, e.adler & 65535)), U(e), t.wrap > 0 && (t.wrap = -t.wrap), t.pending !== 0 ? O : Rt);
}, Xi = (e) => {
  if (Ae(e)) return B;
  const a = e.state.status;
  return e.state = null, a === J ? Q(e, Ai) : O;
}, ji = (e, a) => {
  let t = a.length;
  if (Ae(e)) return B;
  const i = e.state, r = i.wrap;
  if (r === 2 || r === 1 && i.status !== _e || i.lookahead) return B;
  if (r === 1 && (e.adler = me(e.adler, a, t, 0)), i.wrap = 0, t >= i.w_size) {
    r === 0 && (G(i.head), i.strstart = 0, i.block_start = 0, i.insert = 0);
    let f = new Uint8Array(i.w_size);
    f.set(a.subarray(t - i.w_size, t), 0), a = f, t = i.w_size;
  }
  const n = e.avail_in, h = e.next_in, _ = e.input;
  for (e.avail_in = t, e.next_in = 0, e.input = a, oe(i); i.lookahead >= T; ) {
    let f = i.strstart, l = i.lookahead - 2;
    do
      te(i, f), f++;
    while (--l);
    i.strstart = f, i.lookahead = 2, oe(i);
  }
  return i.strstart += i.lookahead, i.block_start = i.strstart, i.insert = i.lookahead, i.lookahead = 0, i.match_length = i.prev_length = 2, i.match_available = 0, e.next_in = h, e.input = _, e.avail_in = n, i.wrap = r, O;
}, ge = {
  deflateInit: Yi,
  deflateInit2: za,
  deflateReset: xa,
  deflateResetKeep: ma,
  deflateSetHeader: Ki,
  deflate: Gi,
  deflateEnd: Xi,
  deflateSetDictionary: ji,
  deflateInfo: "pako deflate (from Nodeca project)"
}, Wi = (e, a) => Object.prototype.hasOwnProperty.call(e, a), Vi = function(e) {
  const a = Array.prototype.slice.call(arguments, 1);
  for (; a.length; ) {
    const t = a.shift();
    if (t) {
      if (typeof t != "object") throw new TypeError(t + "must be non-object");
      for (const i in t) Wi(t, i) && (e[i] = t[i]);
    }
  }
  return e;
}, Ji = (e) => {
  let a = 0;
  for (let i = 0, r = e.length; i < r; i++) a += e[i].length;
  const t = new Uint8Array(a);
  for (let i = 0, r = 0, n = e.length; i < n; i++) {
    let h = e[i];
    t.set(h, r), r += h.length;
  }
  return t;
}, Be = {
  assign: Vi,
  flattenChunks: Ji
}, Aa = !0;
try {
  String.fromCharCode.apply(null, /* @__PURE__ */ new Uint8Array(1));
} catch {
  Aa = !1;
}
var xe = /* @__PURE__ */ new Uint8Array(256);
for (let e = 0; e < 256; e++) xe[e] = e >= 252 ? 6 : e >= 248 ? 5 : e >= 240 ? 4 : e >= 224 ? 3 : e >= 192 ? 2 : 1;
xe[254] = xe[255] = 1;
var Qi = (e) => {
  if (typeof TextEncoder == "function" && TextEncoder.prototype.encode) return new TextEncoder().encode(e);
  let a, t, i, r, n, h = e.length, _ = 0;
  for (r = 0; r < h; r++)
    t = e.charCodeAt(r), (t & 64512) === 55296 && r + 1 < h && (i = e.charCodeAt(r + 1), (i & 64512) === 56320 && (t = 65536 + (t - 55296 << 10) + (i - 56320), r++)), _ += t < 128 ? 1 : t < 2048 ? 2 : t < 65536 ? 3 : 4;
  for (a = new Uint8Array(_), n = 0, r = 0; n < _; r++)
    t = e.charCodeAt(r), (t & 64512) === 55296 && r + 1 < h && (i = e.charCodeAt(r + 1), (i & 64512) === 56320 && (t = 65536 + (t - 55296 << 10) + (i - 56320), r++)), t < 128 ? a[n++] = t : t < 2048 ? (a[n++] = 192 | t >>> 6, a[n++] = 128 | t & 63) : t < 65536 ? (a[n++] = 224 | t >>> 12, a[n++] = 128 | t >>> 6 & 63, a[n++] = 128 | t & 63) : (a[n++] = 240 | t >>> 18, a[n++] = 128 | t >>> 12 & 63, a[n++] = 128 | t >>> 6 & 63, a[n++] = 128 | t & 63);
  return a;
}, qi = (e, a) => {
  if (a < 65534 && e.subarray && Aa)
    return String.fromCharCode.apply(null, e.length === a ? e : e.subarray(0, a));
  let t = "";
  for (let i = 0; i < a; i++) t += String.fromCharCode(e[i]);
  return t;
}, en = (e, a) => {
  const t = a || e.length;
  if (typeof TextDecoder == "function" && TextDecoder.prototype.decode) return new TextDecoder().decode(e.subarray(0, a));
  let i, r;
  const n = new Array(t * 2);
  for (r = 0, i = 0; i < t; ) {
    let h = e[i++];
    if (h < 128) {
      n[r++] = h;
      continue;
    }
    let _ = xe[h];
    if (_ > 4) {
      n[r++] = 65533, i += _ - 1;
      continue;
    }
    for (h &= _ === 2 ? 31 : _ === 3 ? 15 : 7; _ > 1 && i < t; )
      h = h << 6 | e[i++] & 63, _--;
    if (_ > 1) {
      n[r++] = 65533;
      continue;
    }
    h < 65536 ? n[r++] = h : (h -= 65536, n[r++] = 55296 | h >> 10 & 1023, n[r++] = 56320 | h & 1023);
  }
  return qi(n, r);
}, tn = (e, a) => {
  a = a || e.length, a > e.length && (a = e.length);
  let t = a - 1;
  for (; t >= 0 && (e[t] & 192) === 128; ) t--;
  return t < 0 || t === 0 ? a : t + xe[e[t]] > a ? t : a;
}, ze = {
  string2buf: Qi,
  buf2string: en,
  utf8border: tn
};
function an() {
  this.input = null, this.next_in = 0, this.avail_in = 0, this.total_in = 0, this.output = null, this.next_out = 0, this.avail_out = 0, this.total_out = 0, this.msg = "", this.state = null, this.data_type = 2, this.adler = 0;
}
var Sa = an, Ra = Object.prototype.toString, { Z_NO_FLUSH: nn, Z_SYNC_FLUSH: rn, Z_FULL_FLUSH: ln, Z_FINISH: _n, Z_OK: Fe, Z_STREAM_END: on, Z_DEFAULT_COMPRESSION: hn, Z_DEFAULT_STRATEGY: fn, Z_DEFLATED: dn } = ie, sn = {
  level: hn,
  method: dn,
  chunkSize: 16384,
  windowBits: 15,
  memLevel: 8,
  strategy: fn,
  legacyHash: !0
};
function Se(e) {
  this.options = Be.assign({}, sn, e || {});
  let a = this.options;
  a.raw && a.windowBits > 0 ? a.windowBits = -a.windowBits : a.gzip && a.windowBits > 0 && a.windowBits < 16 && (a.windowBits += 16), this.err = 0, this.msg = "", this.ended = !1, this.chunks = [], this.strm = new Sa(), this.strm.avail_out = 0;
  let t = ge.deflateInit2(this.strm, a.level, a.method, a.windowBits, a.memLevel, a.strategy, a.legacyHash);
  if (t !== Fe) throw new Error(q[t]);
  if (a.header && ge.deflateSetHeader(this.strm, a.header), a.dictionary) {
    let i;
    if (typeof a.dictionary == "string" ? i = ze.string2buf(a.dictionary) : Ra.call(a.dictionary) === "[object ArrayBuffer]" ? i = new Uint8Array(a.dictionary) : i = a.dictionary, t = ge.deflateSetDictionary(this.strm, i), t !== Fe) throw new Error(q[t]);
    this._dict_set = !0;
  }
}
Se.prototype.push = function(e, a) {
  const t = this.strm, i = this.options.chunkSize;
  let r, n;
  if (this.ended) return !1;
  for (a === ~~a ? n = a : n = a === !0 ? _n : nn, typeof e == "string" ? t.input = ze.string2buf(e) : Ra.call(e) === "[object ArrayBuffer]" ? t.input = new Uint8Array(e) : t.input = e, t.next_in = 0, t.avail_in = t.input.length; ; ) {
    if (t.avail_out === 0 && (t.output = new Uint8Array(i), t.next_out = 0, t.avail_out = i), (n === rn || n === ln) && t.avail_out <= 6) {
      this.onData(t.output.subarray(0, t.next_out)), t.avail_out = 0;
      continue;
    }
    if (r = ge.deflate(t, n), r === on)
      return t.next_out > 0 && this.onData(t.output.subarray(0, t.next_out)), r = ge.deflateEnd(this.strm), this.onEnd(r), this.ended = !0, r === Fe;
    if (t.avail_out === 0) {
      this.onData(t.output);
      continue;
    }
    if (n > 0 && t.next_out > 0) {
      this.onData(t.output.subarray(0, t.next_out)), t.avail_out = 0;
      continue;
    }
    if (t.avail_in === 0) break;
  }
  return !0;
};
Se.prototype.onData = function(e) {
  this.chunks.push(e);
};
Se.prototype.onEnd = function(e) {
  e === Fe && (this.result = Be.flattenChunks(this.chunks)), this.chunks = [], this.err = e, this.msg = this.strm.msg;
};
function gt(e, a) {
  const t = new Se(a);
  if (t.push(e, !0), t.err) throw t.msg || q[t.err];
  return t.result;
}
function un(e, a) {
  return a = a || {}, a.raw = !0, gt(e, a);
}
function cn(e, a) {
  return a = a || {}, a.gzip = !0, gt(e, a);
}
var wn = {
  Deflate: Se,
  deflate: gt,
  deflateRaw: un,
  gzip: cn,
  constants: ie
}, Oe = 16209, vn = 16191, bn = function(a, t) {
  let i, r, n, h, _, f, l, o, y, u, d, c, R, k, b, z, g, s, m, Z, w, A, E, v;
  const p = a.state;
  i = a.next_in, E = a.input, r = i + (a.avail_in - 5), n = a.next_out, v = a.output, h = n - (t - a.avail_out), _ = n + (a.avail_out - 257), f = p.dmax, l = p.wsize, o = p.whave, y = p.wnext, u = p.window, d = p.hold, c = p.bits, R = p.lencode, k = p.distcode, b = (1 << p.lenbits) - 1, z = (1 << p.distbits) - 1;
  e: do {
    c < 15 && (d += E[i++] << c, c += 8, d += E[i++] << c, c += 8), g = R[d & b];
    t: for (; ; ) {
      if (s = g >>> 24, d >>>= s, c -= s, s = g >>> 16 & 255, s === 0) v[n++] = g & 65535;
      else if (s & 16) {
        m = g & 65535, s &= 15, s && (c < s && (d += E[i++] << c, c += 8), m += d & (1 << s) - 1, d >>>= s, c -= s), c < 15 && (d += E[i++] << c, c += 8, d += E[i++] << c, c += 8), g = k[d & z];
        a: for (; ; ) {
          if (s = g >>> 24, d >>>= s, c -= s, s = g >>> 16 & 255, s & 16) {
            if (Z = g & 65535, s &= 15, c < s && (d += E[i++] << c, c += 8, c < s && (d += E[i++] << c, c += 8)), Z += d & (1 << s) - 1, Z > f) {
              a.msg = "invalid distance too far back", p.mode = Oe;
              break e;
            }
            if (d >>>= s, c -= s, s = n - h, Z > s) {
              if (s = Z - s, s > o && p.sane) {
                a.msg = "invalid distance too far back", p.mode = Oe;
                break e;
              }
              if (w = 0, A = u, y === 0) {
                if (w += l - s, s < m) {
                  m -= s;
                  do
                    v[n++] = u[w++];
                  while (--s);
                  w = n - Z, A = v;
                }
              } else if (y < s) {
                if (w += l + y - s, s -= y, s < m) {
                  m -= s;
                  do
                    v[n++] = u[w++];
                  while (--s);
                  if (w = 0, y < m) {
                    s = y, m -= s;
                    do
                      v[n++] = u[w++];
                    while (--s);
                    w = n - Z, A = v;
                  }
                }
              } else if (w += y - s, s < m) {
                m -= s;
                do
                  v[n++] = u[w++];
                while (--s);
                w = n - Z, A = v;
              }
              for (; m > 2; )
                v[n++] = A[w++], v[n++] = A[w++], v[n++] = A[w++], m -= 3;
              m && (v[n++] = A[w++], m > 1 && (v[n++] = A[w++]));
            } else {
              w = n - Z;
              do
                v[n++] = v[w++], v[n++] = v[w++], v[n++] = v[w++], m -= 3;
              while (m > 2);
              m && (v[n++] = v[w++], m > 1 && (v[n++] = v[w++]));
            }
          } else if ((s & 64) === 0) {
            g = k[(g & 65535) + (d & (1 << s) - 1)];
            continue a;
          } else {
            a.msg = "invalid distance code", p.mode = Oe;
            break e;
          }
          break;
        }
      } else if ((s & 64) === 0) {
        g = R[(g & 65535) + (d & (1 << s) - 1)];
        continue t;
      } else if (s & 32) {
        p.mode = vn;
        break e;
      } else {
        a.msg = "invalid literal/length code", p.mode = Oe;
        break e;
      }
      break;
    }
  } while (i < r && n < _);
  m = c >> 3, i -= m, c -= m << 3, d &= (1 << c) - 1, a.next_in = i, a.next_out = n, a.avail_in = i < r ? 5 + (r - i) : 5 - (i - r), a.avail_out = n < _ ? 257 + (_ - n) : 257 - (n - _), p.hold = d, p.bits = c;
}, Ie = 15, Zt = 852, Dt = 592, Ot = 0, Ve = 1, It = 2, gn = new Uint16Array([
  3,
  4,
  5,
  6,
  7,
  8,
  9,
  10,
  11,
  13,
  15,
  17,
  19,
  23,
  27,
  31,
  35,
  43,
  51,
  59,
  67,
  83,
  99,
  115,
  131,
  163,
  195,
  227,
  258,
  0,
  0
]), pn = new Uint8Array([
  16,
  16,
  16,
  16,
  16,
  16,
  16,
  16,
  17,
  17,
  17,
  17,
  18,
  18,
  18,
  18,
  19,
  19,
  19,
  19,
  20,
  20,
  20,
  20,
  21,
  21,
  21,
  21,
  16,
  199,
  75
]), kn = new Uint16Array([
  1,
  2,
  3,
  4,
  5,
  7,
  9,
  13,
  17,
  25,
  33,
  49,
  65,
  97,
  129,
  193,
  257,
  385,
  513,
  769,
  1025,
  1537,
  2049,
  3073,
  4097,
  6145,
  8193,
  12289,
  16385,
  24577,
  0,
  0
]), En = new Uint8Array([
  16,
  16,
  16,
  16,
  17,
  17,
  18,
  18,
  19,
  19,
  20,
  20,
  21,
  21,
  22,
  22,
  23,
  23,
  24,
  24,
  25,
  25,
  26,
  26,
  27,
  27,
  28,
  28,
  29,
  29,
  64,
  64
]), yn = (e, a, t, i, r, n, h, _) => {
  const f = _.bits;
  let l = 0, o = 0, y = 0, u = 0, d = 0, c = 0, R = 0, k = 0, b = 0, z = 0, g, s, m, Z, w, A = null, E;
  const v = /* @__PURE__ */ new Uint16Array(16), p = /* @__PURE__ */ new Uint16Array(16);
  let W = null, pt, Te, Ze;
  for (l = 0; l <= Ie; l++) v[l] = 0;
  for (o = 0; o < i; o++) v[a[t + o]]++;
  for (d = f, u = Ie; u >= 1 && v[u] === 0; u--) ;
  if (d > u && (d = u), u === 0)
    return r[n++] = 20971520, r[n++] = 20971520, _.bits = 1, 0;
  for (y = 1; y < u && v[y] === 0; y++) ;
  for (d < y && (d = y), k = 1, l = 1; l <= Ie; l++)
    if (k <<= 1, k -= v[l], k < 0) return -1;
  if (k > 0 && (e === Ot || u !== 1)) return -1;
  for (p[1] = 0, l = 1; l < Ie; l++) p[l + 1] = p[l] + v[l];
  for (o = 0; o < i; o++) a[t + o] !== 0 && (h[p[a[t + o]]++] = o);
  if (e === Ot ? (A = W = h, E = 20) : e === Ve ? (A = gn, W = pn, E = 257) : (A = kn, W = En, E = 0), z = 0, o = 0, l = y, w = n, c = d, R = 0, m = -1, b = 1 << d, Z = b - 1, e === Ve && b > Zt || e === It && b > Dt) return 1;
  for (; ; ) {
    pt = l - R, h[o] + 1 < E ? (Te = 0, Ze = h[o]) : h[o] >= E ? (Te = W[h[o] - E], Ze = A[h[o] - E]) : (Te = 96, Ze = 0), g = 1 << l - R, s = 1 << c, y = s;
    do
      s -= g, r[w + (z >> R) + s] = pt << 24 | Te << 16 | Ze | 0;
    while (s !== 0);
    for (g = 1 << l - 1; z & g; ) g >>= 1;
    if (g !== 0 ? (z &= g - 1, z += g) : z = 0, o++, --v[l] === 0) {
      if (l === u) break;
      l = a[t + h[o]];
    }
    if (l > d && (z & Z) !== m) {
      for (R === 0 && (R = d), w += y, c = l - R, k = 1 << c; c + R < u && (k -= v[c + R], !(k <= 0)); )
        c++, k <<= 1;
      if (b += 1 << c, e === Ve && b > Zt || e === It && b > Dt) return 1;
      m = z & Z, r[m] = d << 24 | c << 16 | w - n | 0;
    }
  }
  return z !== 0 && (r[w + z] = l - R << 24 | 4194304), _.bits = d, 0;
}, pe = yn, mn = 0, Ta = 1, Za = 2, { Z_FINISH: Nt, Z_BLOCK: xn, Z_TREES: Ne, Z_OK: ae, Z_STREAM_END: zn, Z_NEED_DICT: An, Z_STREAM_ERROR: $, Z_DATA_ERROR: Da, Z_MEM_ERROR: Oa, Z_BUF_ERROR: Sn, Z_DEFLATED: Ut } = ie, Pe = 16180, Lt = 16181, Ct = 16182, $t = 16183, Ft = 16184, Mt = 16185, Ht = 16186, Bt = 16187, Pt = 16188, Kt = 16189, Me = 16190, K = 16191, Je = 16192, Yt = 16193, Qe = 16194, Gt = 16195, Xt = 16196, jt = 16197, Wt = 16198, Ue = 16199, Le = 16200, Vt = 16201, Jt = 16202, Qt = 16203, qt = 16204, ea = 16205, qe = 16206, ta = 16207, aa = 16208, S = 16209, Ia = 16210, Na = 16211, Rn = 852, Tn = 592, Zn = 15, ia = (e) => (e >>> 24 & 255) + (e >>> 8 & 65280) + ((e & 65280) << 8) + ((e & 255) << 24);
function Dn() {
  this.strm = null, this.mode = 0, this.last = !1, this.wrap = 0, this.havedict = !1, this.flags = 0, this.dmax = 0, this.check = 0, this.total = 0, this.head = null, this.wbits = 0, this.wsize = 0, this.whave = 0, this.wnext = 0, this.window = null, this.hold = 0, this.bits = 0, this.length = 0, this.offset = 0, this.extra = 0, this.lencode = null, this.distcode = null, this.lenbits = 0, this.distbits = 0, this.ncode = 0, this.nlen = 0, this.ndist = 0, this.have = 0, this.next = null, this.lens = /* @__PURE__ */ new Uint16Array(320), this.work = /* @__PURE__ */ new Uint16Array(288), this.lendyn = null, this.distdyn = null, this.sane = 0, this.back = 0, this.was = 0;
}
var ne = (e) => {
  if (!e) return 1;
  const a = e.state;
  return !a || a.strm !== e || a.mode < Pe || a.mode > Na ? 1 : 0;
}, Ua = (e) => {
  if (ne(e)) return $;
  const a = e.state;
  return e.total_in = e.total_out = a.total = 0, e.msg = "", a.wrap && (e.adler = a.wrap & 1), a.mode = Pe, a.last = 0, a.havedict = 0, a.flags = -1, a.dmax = 32768, a.head = null, a.hold = 0, a.bits = 0, a.lencode = a.lendyn = new Int32Array(Rn), a.distcode = a.distdyn = new Int32Array(Tn), a.sane = 1, a.back = -1, ae;
}, La = (e) => {
  if (ne(e)) return $;
  const a = e.state;
  return a.wsize = 0, a.whave = 0, a.wnext = 0, Ua(e);
}, Ca = (e, a) => {
  let t;
  if (ne(e)) return $;
  const i = e.state;
  return a < 0 ? (t = 0, a = -a) : (t = (a >> 4) + 5, a < 48 && (a &= 15)), a && (a < 8 || a > 15) ? $ : (i.window !== null && i.wbits !== a && (i.window = null), i.wrap = t, i.wbits = a, La(e));
}, $a = (e, a) => {
  if (!e) return $;
  const t = new Dn();
  e.state = t, t.strm = e, t.window = null, t.mode = Pe;
  const i = Ca(e, a);
  return i !== ae && (e.state = null), i;
}, On = (e) => $a(e, Zn), na = !0, et, tt, In = (e) => {
  if (na) {
    et = /* @__PURE__ */ new Int32Array(512), tt = /* @__PURE__ */ new Int32Array(32);
    let a = 0;
    for (; a < 144; ) e.lens[a++] = 8;
    for (; a < 256; ) e.lens[a++] = 9;
    for (; a < 280; ) e.lens[a++] = 7;
    for (; a < 288; ) e.lens[a++] = 8;
    for (pe(Ta, e.lens, 0, 288, et, 0, e.work, { bits: 9 }), a = 0; a < 32; ) e.lens[a++] = 5;
    pe(Za, e.lens, 0, 32, tt, 0, e.work, { bits: 5 }), na = !1;
  }
  e.lencode = et, e.lenbits = 9, e.distcode = tt, e.distbits = 5;
}, Fa = (e, a, t, i) => {
  let r;
  const n = e.state;
  return n.window === null && (n.window = new Uint8Array(1 << n.wbits)), n.wsize === 0 && (n.wsize = 1 << n.wbits, n.wnext = 0, n.whave = 0), i >= n.wsize ? (n.window.set(a.subarray(t - n.wsize, t), 0), n.wnext = 0, n.whave = n.wsize) : (r = n.wsize - n.wnext, r > i && (r = i), n.window.set(a.subarray(t - i, t - i + r), n.wnext), i -= r, i ? (n.window.set(a.subarray(t - i, t), 0), n.wnext = i, n.whave = n.wsize) : (n.wnext += r, n.wnext === n.wsize && (n.wnext = 0), n.whave < n.wsize && (n.whave += r))), 0;
}, Nn = (e, a) => {
  let t, i, r, n, h, _, f, l, o, y, u, d, c, R, k = 0, b, z, g, s, m, Z, w, A;
  const E = /* @__PURE__ */ new Uint8Array(4);
  let v, p;
  const W = new Uint8Array([
    16,
    17,
    18,
    0,
    8,
    7,
    9,
    6,
    10,
    5,
    11,
    4,
    12,
    3,
    13,
    2,
    14,
    1,
    15
  ]);
  if (ne(e) || !e.output || !e.input && e.avail_in !== 0) return $;
  t = e.state, t.mode === K && (t.mode = Je), h = e.next_out, r = e.output, f = e.avail_out, n = e.next_in, i = e.input, _ = e.avail_in, l = t.hold, o = t.bits, y = _, u = f, A = ae;
  e: for (; ; ) switch (t.mode) {
    case Pe:
      if (t.wrap === 0) {
        t.mode = Je;
        break;
      }
      for (; o < 16; ) {
        if (_ === 0) break e;
        _--, l += i[n++] << o, o += 8;
      }
      if (t.wrap & 2 && l === 35615) {
        t.wbits === 0 && (t.wbits = 15), t.check = 0, E[0] = l & 255, E[1] = l >>> 8 & 255, t.check = D(t.check, E, 2, 0), l = 0, o = 0, t.mode = Lt;
        break;
      }
      if (t.head && (t.head.done = !1), !(t.wrap & 1) || (((l & 255) << 8) + (l >> 8)) % 31) {
        e.msg = "incorrect header check", t.mode = S;
        break;
      }
      if ((l & 15) !== Ut) {
        e.msg = "unknown compression method", t.mode = S;
        break;
      }
      if (l >>>= 4, o -= 4, w = (l & 15) + 8, t.wbits === 0 && (t.wbits = w), w > 15 || w > t.wbits) {
        e.msg = "invalid window size", t.mode = S;
        break;
      }
      t.dmax = 1 << t.wbits, t.flags = 0, e.adler = t.check = 1, t.mode = l & 512 ? Kt : K, l = 0, o = 0;
      break;
    case Lt:
      for (; o < 16; ) {
        if (_ === 0) break e;
        _--, l += i[n++] << o, o += 8;
      }
      if (t.flags = l, (t.flags & 255) !== Ut) {
        e.msg = "unknown compression method", t.mode = S;
        break;
      }
      if (t.flags & 57344) {
        e.msg = "unknown header flags set", t.mode = S;
        break;
      }
      t.head && (t.head.text = l >> 8 & 1), t.flags & 512 && t.wrap & 4 && (E[0] = l & 255, E[1] = l >>> 8 & 255, t.check = D(t.check, E, 2, 0)), l = 0, o = 0, t.mode = Ct;
    case Ct:
      for (; o < 32; ) {
        if (_ === 0) break e;
        _--, l += i[n++] << o, o += 8;
      }
      t.head && (t.head.time = l), t.flags & 512 && t.wrap & 4 && (E[0] = l & 255, E[1] = l >>> 8 & 255, E[2] = l >>> 16 & 255, E[3] = l >>> 24 & 255, t.check = D(t.check, E, 4, 0)), l = 0, o = 0, t.mode = $t;
    case $t:
      for (; o < 16; ) {
        if (_ === 0) break e;
        _--, l += i[n++] << o, o += 8;
      }
      t.head && (t.head.xflags = l & 255, t.head.os = l >> 8), t.flags & 512 && t.wrap & 4 && (E[0] = l & 255, E[1] = l >>> 8 & 255, t.check = D(t.check, E, 2, 0)), l = 0, o = 0, t.mode = Ft;
    case Ft:
      if (t.flags & 1024) {
        for (; o < 16; ) {
          if (_ === 0) break e;
          _--, l += i[n++] << o, o += 8;
        }
        t.length = l, t.head && (t.head.extra_len = l), t.flags & 512 && t.wrap & 4 && (E[0] = l & 255, E[1] = l >>> 8 & 255, t.check = D(t.check, E, 2, 0)), l = 0, o = 0;
      } else t.head && (t.head.extra = null);
      t.mode = Mt;
    case Mt:
      if (t.flags & 1024 && (d = t.length, d > _ && (d = _), d && (t.head && (w = t.head.extra_len - t.length, t.head.extra || (t.head.extra = new Uint8Array(t.head.extra_len)), t.head.extra.set(i.subarray(n, n + d), w)), t.flags & 512 && t.wrap & 4 && (t.check = D(t.check, i, d, n)), _ -= d, n += d, t.length -= d), t.length))
        break e;
      t.length = 0, t.mode = Ht;
    case Ht:
      if (t.flags & 2048) {
        if (_ === 0) break e;
        d = 0;
        do
          w = i[n + d++], t.head && w && t.length < 65536 && (t.head.name += String.fromCharCode(w));
        while (w && d < _);
        if (t.flags & 512 && t.wrap & 4 && (t.check = D(t.check, i, d, n)), _ -= d, n += d, w) break e;
      } else t.head && (t.head.name = null);
      t.length = 0, t.mode = Bt;
    case Bt:
      if (t.flags & 4096) {
        if (_ === 0) break e;
        d = 0;
        do
          w = i[n + d++], t.head && w && t.length < 65536 && (t.head.comment += String.fromCharCode(w));
        while (w && d < _);
        if (t.flags & 512 && t.wrap & 4 && (t.check = D(t.check, i, d, n)), _ -= d, n += d, w) break e;
      } else t.head && (t.head.comment = null);
      t.mode = Pt;
    case Pt:
      if (t.flags & 512) {
        for (; o < 16; ) {
          if (_ === 0) break e;
          _--, l += i[n++] << o, o += 8;
        }
        if (t.wrap & 4 && l !== (t.check & 65535)) {
          e.msg = "header crc mismatch", t.mode = S;
          break;
        }
        l = 0, o = 0;
      }
      t.head && (t.head.hcrc = t.flags >> 9 & 1, t.head.done = !0), e.adler = t.check = 0, t.mode = K;
      break;
    case Kt:
      for (; o < 32; ) {
        if (_ === 0) break e;
        _--, l += i[n++] << o, o += 8;
      }
      e.adler = t.check = ia(l), l = 0, o = 0, t.mode = Me;
    case Me:
      if (t.havedict === 0)
        return e.next_out = h, e.avail_out = f, e.next_in = n, e.avail_in = _, t.hold = l, t.bits = o, An;
      e.adler = t.check = 1, t.mode = K;
    case K:
      if (a === xn || a === Ne) break e;
    case Je:
      if (t.last) {
        l >>>= o & 7, o -= o & 7, t.mode = qe;
        break;
      }
      for (; o < 3; ) {
        if (_ === 0) break e;
        _--, l += i[n++] << o, o += 8;
      }
      switch (t.last = l & 1, l >>>= 1, o -= 1, l & 3) {
        case 0:
          t.mode = Yt;
          break;
        case 1:
          if (In(t), t.mode = Ue, a === Ne) {
            l >>>= 2, o -= 2;
            break e;
          }
          break;
        case 2:
          t.mode = Xt;
          break;
        case 3:
          e.msg = "invalid block type", t.mode = S;
      }
      l >>>= 2, o -= 2;
      break;
    case Yt:
      for (l >>>= o & 7, o -= o & 7; o < 32; ) {
        if (_ === 0) break e;
        _--, l += i[n++] << o, o += 8;
      }
      if ((l & 65535) !== (l >>> 16 ^ 65535)) {
        e.msg = "invalid stored block lengths", t.mode = S;
        break;
      }
      if (t.length = l & 65535, l = 0, o = 0, t.mode = Qe, a === Ne) break e;
    case Qe:
      t.mode = Gt;
    case Gt:
      if (d = t.length, d) {
        if (d > _ && (d = _), d > f && (d = f), d === 0) break e;
        r.set(i.subarray(n, n + d), h), _ -= d, n += d, f -= d, h += d, t.length -= d;
        break;
      }
      t.mode = K;
      break;
    case Xt:
      for (; o < 14; ) {
        if (_ === 0) break e;
        _--, l += i[n++] << o, o += 8;
      }
      if (t.nlen = (l & 31) + 257, l >>>= 5, o -= 5, t.ndist = (l & 31) + 1, l >>>= 5, o -= 5, t.ncode = (l & 15) + 4, l >>>= 4, o -= 4, t.nlen > 286 || t.ndist > 30) {
        e.msg = "too many length or distance symbols", t.mode = S;
        break;
      }
      t.have = 0, t.mode = jt;
    case jt:
      for (; t.have < t.ncode; ) {
        for (; o < 3; ) {
          if (_ === 0) break e;
          _--, l += i[n++] << o, o += 8;
        }
        t.lens[W[t.have++]] = l & 7, l >>>= 3, o -= 3;
      }
      for (; t.have < 19; ) t.lens[W[t.have++]] = 0;
      if (t.lencode = t.lendyn, t.lenbits = 7, v = { bits: t.lenbits }, A = pe(mn, t.lens, 0, 19, t.lencode, 0, t.work, v), t.lenbits = v.bits, A) {
        e.msg = "invalid code lengths set", t.mode = S;
        break;
      }
      t.have = 0, t.mode = Wt;
    case Wt:
      for (; t.have < t.nlen + t.ndist; ) {
        for (; k = t.lencode[l & (1 << t.lenbits) - 1], b = k >>> 24, z = k >>> 16 & 255, g = k & 65535, !(b <= o); ) {
          if (_ === 0) break e;
          _--, l += i[n++] << o, o += 8;
        }
        if (g < 16)
          l >>>= b, o -= b, t.lens[t.have++] = g;
        else {
          if (g === 16) {
            for (p = b + 2; o < p; ) {
              if (_ === 0) break e;
              _--, l += i[n++] << o, o += 8;
            }
            if (l >>>= b, o -= b, t.have === 0) {
              e.msg = "invalid bit length repeat", t.mode = S;
              break;
            }
            w = t.lens[t.have - 1], d = 3 + (l & 3), l >>>= 2, o -= 2;
          } else if (g === 17) {
            for (p = b + 3; o < p; ) {
              if (_ === 0) break e;
              _--, l += i[n++] << o, o += 8;
            }
            l >>>= b, o -= b, w = 0, d = 3 + (l & 7), l >>>= 3, o -= 3;
          } else {
            for (p = b + 7; o < p; ) {
              if (_ === 0) break e;
              _--, l += i[n++] << o, o += 8;
            }
            l >>>= b, o -= b, w = 0, d = 11 + (l & 127), l >>>= 7, o -= 7;
          }
          if (t.have + d > t.nlen + t.ndist) {
            e.msg = "invalid bit length repeat", t.mode = S;
            break;
          }
          for (; d--; ) t.lens[t.have++] = w;
        }
      }
      if (t.mode === S) break;
      if (t.lens[256] === 0) {
        e.msg = "invalid code -- missing end-of-block", t.mode = S;
        break;
      }
      if (t.lenbits = 9, v = { bits: t.lenbits }, A = pe(Ta, t.lens, 0, t.nlen, t.lencode, 0, t.work, v), t.lenbits = v.bits, A) {
        e.msg = "invalid literal/lengths set", t.mode = S;
        break;
      }
      if (t.distbits = 6, t.distcode = t.distdyn, v = { bits: t.distbits }, A = pe(Za, t.lens, t.nlen, t.ndist, t.distcode, 0, t.work, v), t.distbits = v.bits, A) {
        e.msg = "invalid distances set", t.mode = S;
        break;
      }
      if (t.mode = Ue, a === Ne) break e;
    case Ue:
      t.mode = Le;
    case Le:
      if (_ >= 6 && f >= 258) {
        e.next_out = h, e.avail_out = f, e.next_in = n, e.avail_in = _, t.hold = l, t.bits = o, bn(e, u), h = e.next_out, r = e.output, f = e.avail_out, n = e.next_in, i = e.input, _ = e.avail_in, l = t.hold, o = t.bits, t.mode === K && (t.back = -1);
        break;
      }
      for (t.back = 0; k = t.lencode[l & (1 << t.lenbits) - 1], b = k >>> 24, z = k >>> 16 & 255, g = k & 65535, !(b <= o); ) {
        if (_ === 0) break e;
        _--, l += i[n++] << o, o += 8;
      }
      if (z && (z & 240) === 0) {
        for (s = b, m = z, Z = g; k = t.lencode[Z + ((l & (1 << s + m) - 1) >> s)], b = k >>> 24, z = k >>> 16 & 255, g = k & 65535, !(s + b <= o); ) {
          if (_ === 0) break e;
          _--, l += i[n++] << o, o += 8;
        }
        l >>>= s, o -= s, t.back += s;
      }
      if (l >>>= b, o -= b, t.back += b, t.length = g, z === 0) {
        t.mode = ea;
        break;
      }
      if (z & 32) {
        t.back = -1, t.mode = K;
        break;
      }
      if (z & 64) {
        e.msg = "invalid literal/length code", t.mode = S;
        break;
      }
      t.extra = z & 15, t.mode = Vt;
    case Vt:
      if (t.extra) {
        for (p = t.extra; o < p; ) {
          if (_ === 0) break e;
          _--, l += i[n++] << o, o += 8;
        }
        t.length += l & (1 << t.extra) - 1, l >>>= t.extra, o -= t.extra, t.back += t.extra;
      }
      t.was = t.length, t.mode = Jt;
    case Jt:
      for (; k = t.distcode[l & (1 << t.distbits) - 1], b = k >>> 24, z = k >>> 16 & 255, g = k & 65535, !(b <= o); ) {
        if (_ === 0) break e;
        _--, l += i[n++] << o, o += 8;
      }
      if ((z & 240) === 0) {
        for (s = b, m = z, Z = g; k = t.distcode[Z + ((l & (1 << s + m) - 1) >> s)], b = k >>> 24, z = k >>> 16 & 255, g = k & 65535, !(s + b <= o); ) {
          if (_ === 0) break e;
          _--, l += i[n++] << o, o += 8;
        }
        l >>>= s, o -= s, t.back += s;
      }
      if (l >>>= b, o -= b, t.back += b, z & 64) {
        e.msg = "invalid distance code", t.mode = S;
        break;
      }
      t.offset = g, t.extra = z & 15, t.mode = Qt;
    case Qt:
      if (t.extra) {
        for (p = t.extra; o < p; ) {
          if (_ === 0) break e;
          _--, l += i[n++] << o, o += 8;
        }
        t.offset += l & (1 << t.extra) - 1, l >>>= t.extra, o -= t.extra, t.back += t.extra;
      }
      if (t.offset > t.dmax) {
        e.msg = "invalid distance too far back", t.mode = S;
        break;
      }
      t.mode = qt;
    case qt:
      if (f === 0) break e;
      if (d = u - f, t.offset > d) {
        if (d = t.offset - d, d > t.whave && t.sane) {
          e.msg = "invalid distance too far back", t.mode = S;
          break;
        }
        d > t.wnext ? (d -= t.wnext, c = t.wsize - d) : c = t.wnext - d, d > t.length && (d = t.length), R = t.window;
      } else
        R = r, c = h - t.offset, d = t.length;
      d > f && (d = f), f -= d, t.length -= d;
      do
        r[h++] = R[c++];
      while (--d);
      t.length === 0 && (t.mode = Le);
      break;
    case ea:
      if (f === 0) break e;
      r[h++] = t.length, f--, t.mode = Le;
      break;
    case qe:
      if (t.wrap) {
        for (; o < 32; ) {
          if (_ === 0) break e;
          _--, l |= i[n++] << o, o += 8;
        }
        if (u -= f, e.total_out += u, t.total += u, t.wrap & 4 && u && (e.adler = t.check = t.flags ? D(t.check, r, u, h - u) : me(t.check, r, u, h - u)), u = f, t.wrap & 4 && (t.flags ? l : ia(l)) !== t.check) {
          e.msg = "incorrect data check", t.mode = S;
          break;
        }
        l = 0, o = 0;
      }
      t.mode = ta;
    case ta:
      if (t.wrap && t.flags) {
        for (; o < 32; ) {
          if (_ === 0) break e;
          _--, l += i[n++] << o, o += 8;
        }
        if (t.wrap & 4 && l !== (t.total & 4294967295)) {
          e.msg = "incorrect length check", t.mode = S;
          break;
        }
        l = 0, o = 0;
      }
      t.mode = aa;
    case aa:
      A = zn;
      break e;
    case S:
      A = Da;
      break e;
    case Ia:
      return Oa;
    case Na:
    default:
      return $;
  }
  return e.next_out = h, e.avail_out = f, e.next_in = n, e.avail_in = _, t.hold = l, t.bits = o, (t.wsize || u !== e.avail_out && t.mode < S && (t.mode < qe || a !== Nt)) && Fa(e, e.output, e.next_out, u - e.avail_out), y -= e.avail_in, u -= e.avail_out, e.total_in += y, e.total_out += u, t.total += u, t.wrap & 4 && u && (e.adler = t.check = t.flags ? D(t.check, r, u, e.next_out - u) : me(t.check, r, u, e.next_out - u)), e.data_type = t.bits + (t.last ? 64 : 0) + (t.mode === K ? 128 : 0) + (t.mode === Ue || t.mode === Qe ? 256 : 0), (y === 0 && u === 0 || a === Nt) && A === ae && (A = Sn), A;
}, Un = (e) => {
  if (ne(e)) return $;
  let a = e.state;
  return a.window && (a.window = null), e.state = null, ae;
}, Ln = (e, a) => {
  if (ne(e)) return $;
  const t = e.state;
  return (t.wrap & 2) === 0 ? $ : (t.head = a, a.done = !1, ae);
}, Cn = (e, a) => {
  const t = a.length;
  let i, r, n;
  return ne(e) || (i = e.state, i.wrap !== 0 && i.mode !== Me) ? $ : i.mode === Me && (r = 1, r = me(r, a, t, 0), r !== i.check) ? Da : (n = Fa(e, a, t, t), n ? (i.mode = Ia, Oa) : (i.havedict = 1, ae));
}, M = {
  inflateReset: La,
  inflateReset2: Ca,
  inflateResetKeep: Ua,
  inflateInit: On,
  inflateInit2: $a,
  inflate: Nn,
  inflateEnd: Un,
  inflateGetHeader: Ln,
  inflateSetDictionary: Cn,
  inflateInfo: "pako inflate (from Nodeca project)"
};
function $n() {
  this.text = 0, this.time = 0, this.xflags = 0, this.os = 0, this.extra = null, this.extra_len = 0, this.name = "", this.comment = "", this.hcrc = 0, this.done = !1;
}
var Fn = $n, Ma = Object.prototype.toString, { Z_NO_FLUSH: Mn, Z_FINISH: ra, Z_OK: le, Z_STREAM_END: at, Z_NEED_DICT: it, Z_STREAM_ERROR: Hn, Z_DATA_ERROR: la, Z_MEM_ERROR: Bn, Z_BUF_ERROR: _a } = ie, Pn = {
  chunkSize: 65536,
  windowBits: 15,
  to: ""
};
function Re(e) {
  this.options = Be.assign({}, Pn, e || {});
  const a = this.options;
  a.raw && a.windowBits >= 0 && a.windowBits < 16 && (a.windowBits = -a.windowBits, a.windowBits === 0 && (a.windowBits = -15)), a.windowBits >= 0 && a.windowBits < 16 && !(e && e.windowBits) && (a.windowBits += 32), a.windowBits > 15 && a.windowBits < 48 && (a.windowBits & 15) === 0 && (a.windowBits |= 15), this.err = 0, this.msg = "", this.ended = !1, this.chunks = [], this.strm = new Sa(), this.strm.avail_out = 0;
  let t = M.inflateInit2(this.strm, a.windowBits);
  if (t !== le) throw new Error(q[t]);
  if (this.header = new Fn(), M.inflateGetHeader(this.strm, this.header), a.dictionary && (typeof a.dictionary == "string" ? a.dictionary = ze.string2buf(a.dictionary) : Ma.call(a.dictionary) === "[object ArrayBuffer]" && (a.dictionary = new Uint8Array(a.dictionary)), a.raw && (t = M.inflateSetDictionary(this.strm, a.dictionary), t !== le)))
    throw new Error(q[t]);
}
Re.prototype.push = function(e, a) {
  const t = this.strm, i = this.options.chunkSize, r = this.options.dictionary;
  let n, h, _;
  if (this.ended) return !1;
  for (a === ~~a ? h = a : h = a === !0 ? ra : Mn, Ma.call(e) === "[object ArrayBuffer]" ? t.input = new Uint8Array(e) : t.input = e, t.next_in = 0, t.avail_in = t.input.length; ; ) {
    for (t.avail_out === 0 && (t.output = new Uint8Array(i), t.next_out = 0, t.avail_out = i), n = M.inflate(t, h), n === it && r && (n = M.inflateSetDictionary(t, r), n === le ? n = M.inflate(t, h) : n === la && (n = it)); t.avail_in > 0 && n === at && t.state.wrap & 2 && t.state.flags !== 0 && t.input[t.next_in] !== 0; )
      M.inflateReset(t), n = M.inflate(t, h);
    switch (n) {
      case Hn:
      case la:
      case it:
      case Bn:
        return this.onEnd(n), this.ended = !0, !1;
    }
    if (_ = t.avail_out, t.next_out && (t.avail_out === 0 || n === at || h > 0))
      if (this.options.to === "string") {
        let f = ze.utf8border(t.output, t.next_out), l = t.next_out - f, o = ze.buf2string(t.output, f);
        t.next_out = l, t.avail_out = i - l, l && t.output.set(t.output.subarray(f, f + l), 0), this.onData(o);
      } else
        this.onData(t.output.length === t.next_out ? t.output : t.output.subarray(0, t.next_out)), t.avail_out = 0, t.next_out = 0;
    if (!((n === le || n === _a) && _ === 0)) {
      if (n === at)
        return n = M.inflateEnd(this.strm), this.onEnd(n), this.ended = !0, !0;
      if (t.avail_in === 0) {
        if (h === ra)
          return n = M.inflateEnd(this.strm), this.onEnd(n === le ? _a : n), this.ended = !0, !1;
        break;
      }
    }
  }
  return !0;
};
Re.prototype.onData = function(e) {
  this.chunks.push(e);
};
Re.prototype.onEnd = function(e) {
  e === le && (this.options.to === "string" ? this.result = this.chunks.join("") : this.result = Be.flattenChunks(this.chunks)), this.chunks = [], this.err = e, this.msg = this.strm.msg;
};
function st(e, a) {
  const t = new Re(a);
  if (t.push(e, !0), t.err) throw t.msg || q[t.err];
  return t.result;
}
function Kn(e, a) {
  return a = a || {}, a.raw = !0, st(e, a);
}
var Yn = {
  Inflate: Re,
  inflate: st,
  inflateRaw: Kn,
  ungzip: st,
  constants: ie
}, { Deflate: Gn, deflate: Xn, deflateRaw: jn, gzip: Wn } = wn, { Inflate: Vn, inflate: Jn, inflateRaw: Qn, ungzip: qn } = Yn, Ha = Gn, Ba = Xn, Pa = jn, Ka = Wn, Ya = Vn, Ga = Jn, Xa = Qn, ja = qn, Wa = ie, er = {
  Deflate: Ha,
  deflate: Ba,
  deflateRaw: Pa,
  gzip: Ka,
  Inflate: Ya,
  inflate: Ga,
  inflateRaw: Xa,
  ungzip: ja,
  constants: Wa
};
export {
  ar as n,
  ja as r,
  er as t
};

//# sourceMappingURL=pako.esm-DQUXHgNn.js.map