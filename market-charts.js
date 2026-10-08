// Market data charts — reads window.FAIRLINE_DATA written by scripts/export_chart_data.py
(() => {
  const data = window.FAIRLINE_DATA;
  if (!data) {
    // Data file not exported yet: hide the charts rather than show them empty
    document.querySelectorAll('#market, #portfolio .viz, #portfolioSource').forEach((el) => { el.hidden = true; });
    return;
  }

  const NS = 'http://www.w3.org/2000/svg';
  const fmt1 = new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const fmt2 = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const monthFmt = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
  const dayFmt = new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  const toDate = (s) => new Date(s + 'T00:00:00Z');
  const mult = (v) => fmt1.format(v) + 'x';
  const signed = (v) => (v >= 0 ? '+' : '−') + Math.round(Math.abs(v)) + '%';
  const ordinal = (n) => {
    const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };
  const justifiedPb = (roe) => (roe - data.banks.growth) / (data.banks.requiredReturn - data.banks.growth);
  const SHORT = {
    'Mining & Construction Materials': 'Mining & Materials',
    'Pharmaceuticals & Healthcare': 'Pharma & Healthcare',
    'Industrial Real Estate': 'Industrial Parks',
    'Fishery & Aquaculture': 'Seafood',
  };

  /* ---------- DOM helpers ---------- */
  function svg(tag, attrs, parent) {
    const node = document.createElementNS(NS, tag);
    for (const k in attrs) node.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(node);
    return node;
  }
  function label(parent, x, y, str, cls, anchor = 'start') {
    const t = svg('text', { x, y, class: cls, 'text-anchor': anchor }, parent);
    t.textContent = str;
    return t;
  }
  function h(tag, cls, txt) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt != null) n.textContent = txt;
    return n;
  }
  function tooltip(host) {
    const tip = h('div', 'viz__tip');
    tip.hidden = true;
    host.appendChild(tip);
    return {
      show(title, rows, x, y) {
        tip.replaceChildren(h('div', 'tip__title', title), ...rows.map(([value, name, key]) => {
          const row = h('div', 'tip__row');
          // key is a key-style name, or a hex color for a series line key
          if (key) {
            const k = row.appendChild(h('i', 'key key--' + (key[0] === '#' ? 'line' : key)));
            if (key[0] === '#') k.style.background = key;
          }
          row.append(h('strong', null, value), h('span', null, name));
          return row;
        }));
        tip.hidden = false;
        const left = x + 16 + tip.offsetWidth > host.clientWidth ? x - 16 - tip.offsetWidth : x + 16;
        tip.style.left = Math.max(0, left) + 'px';
        tip.style.top = Math.max(0, y - tip.offsetHeight / 2) + 'px';
      },
      hide() { tip.hidden = true; },
    };
  }
  function table(id, head, rows) {
    const t = h('table');
    const tr = t.appendChild(h('thead')).appendChild(h('tr'));
    head.forEach((c) => tr.appendChild(h('th', null, c)));
    const body = t.appendChild(h('tbody'));
    rows.forEach((r) => {
      const row = body.appendChild(h('tr'));
      r.forEach((c) => row.appendChild(h('td', null, c)));
    });
    const wrap = document.getElementById(id);
    wrap.className = 'tbl';
    wrap.replaceChildren(t);
  }

  /* ---------- 1. Market P/E line with interquartile band ---------- */
  function renderMarket(host) {
    const m = data.marketPe, last = m.dates.length - 1;
    const W = host.clientWidth, H = W < 560 ? 240 : 300;
    const M = { top: 12, right: 50, bottom: 28, left: 34 };
    const iw = W - M.left - M.right, ih = H - M.top - M.bottom;
    const lo = Math.floor(Math.min(...m.p25) / 5) * 5, hi = Math.ceil(Math.max(...m.p75) / 5) * 5;
    const x = (i) => M.left + (i / last) * iw;
    const y = (v) => M.top + (1 - (v - lo) / (hi - lo)) * ih;

    host.replaceChildren();
    const root = svg('svg', {
      width: W, height: H, class: 'viz__svg', tabindex: 0, role: 'img',
      'aria-label': `Median P/E ${mult(m.median[last])} in ${monthFmt.format(toDate(m.dates[last]))}, versus a ${mult(m.average)} average since 2018. Use arrow keys to step through months.`,
    }, host);
    for (let v = lo; v <= hi; v += 5) {
      svg('line', { class: 'viz__grid', x1: M.left, x2: M.left + iw, y1: y(v), y2: y(v) }, root);
      label(root, M.left - 8, y(v) + 4, v + 'x', 'viz__tick', 'end');
    }
    m.dates.forEach((d, i) => {
      const year = Number(d.slice(0, 4));
      if (d.slice(5, 7) === '01' && (W >= 560 || year % 2 === 0)) label(root, x(i), H - 8, year, 'viz__tick', 'middle');
    });
    const band = m.p75.map((v, i) => `${x(i)},${y(v)}`).concat(m.p25.map((v, i) => `${x(i)},${y(v)}`).reverse());
    svg('polygon', { class: 'viz__band', points: band.join(' ') }, root);
    svg('line', { class: 'viz__ref', x1: M.left, x2: M.left + iw, y1: y(m.average), y2: y(m.average) }, root);
    label(root, M.left + 6, y(m.average) - 7, 'Average ' + mult(m.average), 'viz__note');
    svg('path', { class: 'viz__line', d: 'M' + m.median.map((v, i) => `${x(i)},${y(v)}`).join('L') }, root);
    svg('circle', { class: 'viz__dot', cx: x(last), cy: y(m.median[last]), r: 4 }, root);
    label(root, x(last) + 9, y(m.median[last]) + 4, mult(m.median[last]), 'viz__label');

    // Crosshair snaps to the nearest month
    const cross = svg('g', { class: 'viz__cross', visibility: 'hidden' }, root);
    const vline = svg('line', { y1: M.top, y2: M.top + ih }, cross);
    const cdot = svg('circle', { class: 'viz__dot', r: 4 }, cross);
    const tip = tooltip(host);
    let current = last;
    const show = (i) => {
      const cx = x(i), cy = y(m.median[i]);
      vline.setAttribute('x1', cx);
      vline.setAttribute('x2', cx);
      cdot.setAttribute('cx', cx);
      cdot.setAttribute('cy', cy);
      cross.setAttribute('visibility', 'visible');
      tip.show(monthFmt.format(toDate(m.dates[i])), [
        [mult(m.median[i]), 'median P/E', 'line'],
        [`${fmt1.format(m.p25[i])}–${mult(m.p75[i])}`, 'middle 50%', 'band'],
        [String(m.n[i]), 'stocks'],
      ], cx, cy);
    };
    const hide = () => { cross.setAttribute('visibility', 'hidden'); tip.hide(); };
    root.addEventListener('pointermove', (e) => {
      const px = e.clientX - root.getBoundingClientRect().left;
      current = Math.max(0, Math.min(last, Math.round(((px - M.left) / iw) * last)));
      show(current);
    });
    root.addEventListener('pointerleave', hide);
    root.addEventListener('focus', () => show(current));
    root.addEventListener('blur', hide);
    root.addEventListener('keydown', (e) => {
      const step = { ArrowLeft: -1, ArrowRight: 1 }[e.key];
      if (!step) return;
      e.preventDefault();
      current = Math.max(0, Math.min(last, current + step));
      show(current);
    });
  }

  /* ---------- 2. Sector P/E today vs. own 5-year range ---------- */
  function renderSectors(host) {
    const rows = data.sectorPe;
    const max = Math.ceil(Math.max(...rows.map((r) => r.high)) / 5) * 5;
    const at = (v) => (v / max) * 100 + '%';
    const wrap = h('div', 'sx');
    wrap.style.setProperty('--grid', (10 / max) * 100 + '%');
    host.replaceChildren(wrap);
    const tip = tooltip(host);

    for (const r of rows) {
      const row = h('div', 'sx__row');
      row.tabIndex = 0;
      const track = h('span', 'sx__track');
      const range = h('span', 'sx__range');
      range.style.left = at(r.low);
      range.style.width = ((r.high - r.low) / max) * 100 + '%';
      const mid = h('span', 'sx__mid');
      mid.style.left = at(r.mid);
      const dot = h('span', 'sx__dot');
      dot.style.left = at(r.current);
      track.append(range, mid, dot);
      row.append(h('span', 'sx__name', SHORT[r.sector] || r.sector), track, h('span', 'sx__val', mult(r.current)));

      const show = () => tip.show(r.sector, [
        [mult(r.current), 'today', 'dot'],
        [mult(r.mid), '5-year median', 'tick'],
        [`${fmt1.format(r.low)}–${mult(r.high)}`, '5-year range', 'range'],
        [ordinal(r.percentile), 'percentile vs. own history'],
        [String(r.n), 'stocks'],
      ], track.offsetLeft + (r.current / max) * track.clientWidth, row.offsetTop + row.offsetHeight / 2);
      row.addEventListener('pointerenter', show);
      row.addEventListener('focus', show);
      row.addEventListener('pointerleave', tip.hide);
      row.addEventListener('blur', tip.hide);
      wrap.appendChild(row);
    }
    const axis = h('div', 'sx__axis');
    for (let v = 0; v <= max; v += 10) {
      const t = axis.appendChild(h('span', null, v + 'x'));
      t.style.left = at(v);
    }
    wrap.appendChild(axis);
  }

  /* ---------- 3. Banks: ROE vs. P/B with justified P/B line ---------- */
  function renderBanks(host) {
    const pts = data.banks.points, g = data.banks.growth;
    const W = host.clientWidth, H = Math.round(Math.min(560, Math.max(300, W * 1.1)));
    const M = { top: 24, right: 14, bottom: 42, left: 40 };
    const iw = W - M.left - M.right, ih = H - M.top - M.bottom;
    const xMax = Math.ceil(Math.max(...pts.map((p) => p.roe)) / 5) * 5;
    const yMax = Math.ceil(Math.max(...pts.map((p) => p.pb)) * 2) / 2;
    const x = (v) => M.left + (v / xMax) * iw;
    const y = (v) => M.top + (1 - v / yMax) * ih;

    host.replaceChildren();
    const below = pts.filter((p) => justifiedPb(p.roe) > p.pb).length;
    const root = svg('svg', {
      width: W, height: H, class: 'viz__svg', role: 'img',
      'aria-label': `${pts.length} banks plotted by ROE and P/B; ${below} trade below justified P/B.`,
    }, host);
    const defs = svg('defs', {}, root);
    svg('rect', { x: M.left, y: M.top, width: iw, height: ih }, svg('clipPath', { id: 'banksClip' }, defs));

    for (let v = 0; v <= yMax; v += 0.5) {
      svg('line', { class: 'viz__grid', x1: M.left, x2: M.left + iw, y1: y(v), y2: y(v) }, root);
      label(root, M.left - 8, y(v) + 4, fmt1.format(v) + 'x', 'viz__tick', 'end');
    }
    for (let v = 0; v <= xMax; v += 5) label(root, x(v), M.top + ih + 18, v + '%', 'viz__tick', 'middle');
    label(root, M.left + iw / 2, H - 4, 'ROE, trailing 12 months', 'viz__note', 'middle');
    label(root, M.left - 8, M.top - 12, 'P/B', 'viz__note', 'end');

    // Justified P/B line and the "cheaper than justified" region under it
    const clip = svg('g', { 'clip-path': 'url(#banksClip)' }, root);
    const line = `${x(g)},${y(0)} ${x(xMax)},${y(justifiedPb(xMax))}`;
    svg('polygon', { class: 'viz__cheap', points: `${line} ${x(xMax)},${y(0)}` }, clip);
    svg('polyline', { class: 'viz__fair', points: line }, clip);
    const regionLabels = [
      [M.left + iw - 6, y(0) - 8, 'Below justified P/B', 'end'],
      [x(xMax * 0.36), M.top + 12, 'Above justified P/B', 'start'],
    ];
    const placed = regionLabels.map(([lx, ly, str, anchor]) => {
      label(root, lx, ly, str, 'viz__note', anchor);
      const w = str.length * 6;
      return { x: anchor === 'end' ? lx - w : lx, y: ly - 10, w, h: 12 };
    });

    for (const p of pts) svg('circle', { class: 'viz__dot', cx: x(p.roe), cy: y(p.pb), r: 5 }, root);

    // Label the largest banks first, skipping any label that would collide
    const dotBoxes = pts.map((p) => ({ x: x(p.roe) - 6, y: y(p.pb) - 6, w: 12, h: 12 }));
    const hits = (a) => placed.concat(dotBoxes).some((b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h);
    let labelled = 0;
    for (const p of [...pts].sort((a, b) => b.marketCap - a.marketCap)) {
      if (labelled >= 12) break;
      const cx = x(p.roe), cy = y(p.pb), w = p.ticker.length * 7.4, lh = 12;
      const fit = [
        [cx + 9, cy + 4, 'start', { x: cx + 9, y: cy - 7, w, h: lh }],
        [cx - 9, cy + 4, 'end', { x: cx - 9 - w, y: cy - 7, w, h: lh }],
        [cx, cy - 10, 'middle', { x: cx - w / 2, y: cy - 20, w, h: lh }],
        [cx, cy + 18, 'middle', { x: cx - w / 2, y: cy + 8, w, h: lh }],
      ].find(([, , , b]) => b.x >= M.left && b.x + b.w <= M.left + iw && b.y >= M.top && !hits(b));
      if (!fit) continue;
      placed.push(fit[3]);
      label(root, fit[0], fit[1], p.ticker, 'viz__label viz__label--sm', fit[2]);
      labelled++;
    }

    const tip = tooltip(host);
    for (const p of pts) {
      const cx = x(p.roe), cy = y(p.pb), jp = justifiedPb(p.roe);
      const hit = svg('circle', {
        class: 'viz__hit', cx, cy, r: 12, tabindex: 0, role: 'img',
        'aria-label': `${p.ticker}: ROE ${fmt1.format(p.roe)}%, P/B ${fmt2.format(p.pb)}x`,
      }, root);
      const show = () => tip.show(p.ticker, [
        [fmt2.format(p.pb) + 'x', 'P/B', 'dot'],
        [fmt1.format(p.roe) + '%', 'ROE (TTM)'],
        [jp > 0 ? fmt2.format(jp) + 'x' : '—', 'justified P/B', 'fair'],
        [jp > 0 ? signed((p.pb / jp - 1) * 100) : '—', 'vs. justified'],
      ], cx, cy);
      hit.addEventListener('pointerenter', show);
      hit.addEventListener('focus', show);
      hit.addEventListener('pointerleave', tip.hide);
      hit.addEventListener('blur', tip.hide);
    }
  }

  /* ---------- 4. Portfolio weights by allocation method ---------- */
  const STOCK_COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300'];
  const CASH_COLOR = '#CFC9BC';
  const pct0 = (v) => Math.round(v * 100) + '%';
  const pct1 = (v) => fmt1.format(v * 100) + '%';
  // White text on dark fills, ink on light ones
  const textOn = (hex) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.45 ? 'var(--ink)' : '#fff';
  };

  function renderAllocation(host) {
    const p = data.portfolio;
    const wrap = h('div', 'al');
    const head = wrap.appendChild(h('div', 'al__row al__row--head'));
    ['', 'Weights', 'Return', 'Volatility', 'Sharpe'].forEach((t) => head.appendChild(h('span', null, t)));
    host.replaceChildren(wrap);
    const tip = tooltip(host);

    p.methods.forEach((m, i) => {
      const parts = p.tickers.map((t, k) => [t, m.weights[k], STOCK_COLORS[k]])
        .concat([['Cash', m.cash, CASH_COLOR]])
        .filter(([, w]) => w >= 0.005);
      const row = wrap.appendChild(h('div', 'al__row'));
      row.tabIndex = 0;
      const name = h('span', 'al__name');
      name.append(h('span', 'am__num am__num--sm', String(i + 1)), document.createTextNode(m.name));
      const bar = h('span', 'al__bar');
      for (const [, w, color] of parts) {
        const seg = bar.appendChild(h('span', 'al__seg', pct0(w)));
        seg.style.flexGrow = w * 1000;
        seg.style.background = color;
        seg.style.color = textOn(color);
      }
      row.append(name, bar, h('span', 'al__stat', pct1(m.ret)), h('span', 'al__stat', pct1(m.vol)),
        h('span', 'al__stat', fmt2.format(m.sharpe)));

      const show = (e) => {
        const x = e && e.clientX != null ? e.clientX - host.getBoundingClientRect().left : bar.offsetLeft + bar.clientWidth / 2;
        tip.show(m.name, parts.map(([t, w, color]) => [pct1(w), t, color]).concat([
          [pct1(m.ret), 'expected return'], [pct1(m.vol), 'volatility'], [fmt2.format(m.sharpe), 'Sharpe ratio'],
        ]), x, row.offsetTop + row.offsetHeight / 2);
      };
      row.addEventListener('pointermove', show);
      row.addEventListener('focus', show);
      row.addEventListener('pointerleave', tip.hide);
      row.addEventListener('blur', tip.hide);
    });
    // A percentage that doesn't fit its segment moves to the tooltip and table
    wrap.querySelectorAll('.al__seg').forEach((seg) => {
      if (seg.scrollWidth > seg.clientWidth) seg.textContent = '';
    });
  }

  /* ---------- 5. Efficient frontier with each method's portfolio ---------- */
  function renderFrontier(host) {
    const p = data.portfolio;
    const W = host.clientWidth, H = W < 560 ? 300 : 380;
    const M = { top: 26, right: 24, bottom: 44, left: 44 };
    const iw = W - M.left - M.right, ih = H - M.top - M.bottom;
    const vols = p.stocks.map((s) => s.vol).concat(p.methods.map((m) => m.vol), p.frontier.map((f) => f[0]));
    const rets = p.stocks.map((s) => s.ret).concat(p.methods.map((m) => m.ret), p.frontier.map((f) => f[1]));
    const x0 = Math.floor(Math.min(...vols) * 50) / 50, x1 = Math.ceil(Math.max(...vols) * 50) / 50;
    const y0 = Math.floor(Math.min(...rets) * 100) / 100, y1 = Math.ceil(Math.max(...rets) * 100) / 100;
    const x = (v) => M.left + ((v - x0) / (x1 - x0)) * iw;
    const y = (v) => M.top + (1 - (v - y0) / (y1 - y0)) * ih;

    host.replaceChildren();
    const root = svg('svg', {
      width: W, height: H, class: 'viz__svg', role: 'img',
      'aria-label': 'Expected return against volatility for each allocation method, the six stocks and the efficient frontier.',
    }, host);
    const yStep = y1 - y0 > 0.08 ? 0.02 : 0.01;
    for (let v = y0; v <= y1 + 1e-9; v += yStep) {
      svg('line', { class: 'viz__grid', x1: M.left, x2: M.left + iw, y1: y(v), y2: y(v) }, root);
      label(root, M.left - 8, y(v) + 4, pct0(v), 'viz__tick', 'end');
    }
    const xStep = W < 560 ? 0.04 : 0.02;
    for (let v = x0; v <= x1 + 1e-9; v += xStep) label(root, x(v), M.top + ih + 18, pct0(v), 'viz__tick', 'middle');
    label(root, M.left + iw / 2, H - 4, 'Volatility (annualized)', 'viz__note', 'middle');
    label(root, M.left - 8, M.top - 12, 'Expected return', 'viz__note', 'start');
    svg('path', { class: 'viz__line', d: 'M' + p.frontier.map(([v, r]) => `${x(v)},${y(r)}`).join('L') }, root);

    const tip = tooltip(host);
    const hover = (cx, cy, title, rows, ariaLabel) => {
      const hit = svg('circle', { class: 'viz__hit', cx, cy, r: 12, tabindex: 0, role: 'img', 'aria-label': ariaLabel }, root);
      const show = () => tip.show(title, rows, cx, cy);
      hit.addEventListener('pointerenter', show);
      hit.addEventListener('focus', show);
      hit.addEventListener('pointerleave', tip.hide);
      hit.addEventListener('blur', tip.hide);
    };

    p.stocks.forEach((s, k) => {
      const cx = x(s.vol), cy = y(s.ret);
      svg('circle', { class: 'pf__stock', cx, cy, r: 5, fill: STOCK_COLORS[k] }, root);
      label(root, cx + 9, cy + 4, s.ticker, 'viz__label viz__label--sm');
    });
    p.methods.forEach((m, i) => {
      const cx = x(m.vol), cy = y(m.ret);
      const g = svg('g', { class: 'pf__num' }, root);
      svg('circle', { cx, cy, r: 9 }, g);
      label(g, cx, cy + 3.5, String(i + 1), '', 'middle');
    });
    // Hit targets go last so they sit above every mark
    p.stocks.forEach((s, k) => hover(x(s.vol), y(s.ret), s.ticker, [
      [pct1(s.ret), 'expected return', STOCK_COLORS[k]], [pct1(s.vol), 'volatility'],
    ], `${s.ticker}: expected return ${pct1(s.ret)}, volatility ${pct1(s.vol)}`));
    p.methods.forEach((m, i) => hover(x(m.vol), y(m.ret), `${i + 1}. ${m.name}`, [
      [pct1(m.ret), 'expected return'], [pct1(m.vol), 'volatility'], [fmt2.format(m.sharpe), 'Sharpe ratio'],
    ], `${m.name}: expected return ${pct1(m.ret)}, volatility ${pct1(m.vol)}, Sharpe ${fmt2.format(m.sharpe)}`));
  }

  /* ---------- Headline stats and data tables ---------- */
  const m = data.marketPe, lastPe = m.median[m.median.length - 1];
  const b = data.banks;
  document.getElementById('asOf').textContent = dayFmt.format(toDate(data.asOf));
  document.getElementById('coverage').textContent = m.n[m.n.length - 1];
  document.getElementById('statPe').textContent = mult(lastPe);
  document.getElementById('statPeNote').textContent = `${signed((lastPe / m.average - 1) * 100)} vs. ${mult(m.average)} average since 2018`;
  document.getElementById('statSectors').textContent =
    `${data.sectorPe.filter((r) => r.current < r.mid).length} of ${data.sectorPe.length}`;
  document.getElementById('statBanks').textContent =
    `${b.points.filter((p) => justifiedPb(p.roe) > p.pb).length} of ${b.points.length}`;
  document.getElementById('statBanksNote').textContent = `Residual income at r = ${b.requiredReturn}%, g = ${b.growth}%`;
  document.getElementById('banksSub').textContent =
    `ROE to ${b.roePeriod}, P/B on ${dayFmt.format(toDate(b.pbDate))}; r = ${b.requiredReturn}%, g = ${b.growth}%`;

  table('tableMarket', ['Month', 'Median P/E', '25th pct', '75th pct', 'Stocks'],
    m.dates.map((d, i) => [monthFmt.format(toDate(d)), mult(m.median[i]), mult(m.p25[i]), mult(m.p75[i]), m.n[i]]).reverse());
  table('tableSectors', ['Sector', 'Today', '5-yr median', '10th pct', '90th pct', 'Percentile', 'Stocks'],
    data.sectorPe.map((r) => [r.sector, mult(r.current), mult(r.mid), mult(r.low), mult(r.high), ordinal(r.percentile), r.n]));
  table('tableBanks', ['Bank', 'ROE (TTM)', 'P/B', 'Justified P/B'],
    b.points.map((p) => [p.ticker, fmt1.format(p.roe) + '%', fmt2.format(p.pb) + 'x', justifiedPb(p.roe) > 0 ? fmt2.format(justifiedPb(p.roe)) + 'x' : '—']));

  const pf = data.portfolio;
  const allocLegend = document.getElementById('allocLegend');
  pf.tickers.concat('Cash').forEach((t, k) => {
    const li = allocLegend.appendChild(h('li'));
    li.appendChild(h('i', 'key key--box')).style.background = STOCK_COLORS[k] || CASH_COLOR;
    li.appendChild(document.createTextNode(t));
  });
  document.getElementById('allocSub').textContent =
    `Long-only weights for ${pf.tickers.join(', ')} — covariance from daily prices, ${monthFmt.format(toDate(pf.from))} to ${monthFmt.format(toDate(pf.to))}`;
  document.getElementById('portfolioSource').textContent =
    `Expected return = earnings yield + long-term growth; risk-free rate ${pct0(pf.riskFree)}. Long-only, no leverage. Illustrative sample — not a recommendation to buy these stocks.`;
  table('tableAlloc', ['Method', ...pf.tickers, 'Cash', 'Return', 'Volatility', 'Sharpe'],
    pf.methods.map((m) => [m.name, ...m.weights.map(pct1), pct1(m.cash), pct1(m.ret), pct1(m.vol), fmt2.format(m.sharpe)]));
  table('tableFrontier', ['Portfolio', 'Expected return', 'Volatility'],
    pf.methods.map((m, i) => [`${i + 1}. ${m.name}`, pct1(m.ret), pct1(m.vol)])
      .concat(pf.stocks.map((s) => [s.ticker, pct1(s.ret), pct1(s.vol)])));

  renderSectors(document.getElementById('vizSectors'));

  // Width-dependent charts redraw at their container's pixel width so text stays crisp
  const widths = new Map();
  const charts = new Map([
    [document.getElementById('vizMarket'), renderMarket],
    [document.getElementById('vizBanks'), renderBanks],
    [document.getElementById('vizAlloc'), renderAllocation],
    [document.getElementById('vizFrontier'), renderFrontier],
  ]);
  const observer = new ResizeObserver((entries) => {
    for (const { target, contentRect } of entries) {
      if (widths.get(target) === contentRect.width) continue;
      widths.set(target, contentRect.width);
      charts.get(target)(target);
    }
  });
  charts.forEach((_, el) => observer.observe(el));
})();
