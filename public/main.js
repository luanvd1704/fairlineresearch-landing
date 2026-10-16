const $ = (id) => document.getElementById(id);
const fmtInt = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });
const fmtOne = new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const fmtPct = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 });
const pct = (percent) => fmtPct.format(percent) + '%';

/* ---------- Hero chart: price oscillating around a rising fair-value line ---------- */
function drawHeroChart(svg) {
  const W = 600, H = 280, N = 120, LEFT = 6, RIGHT = 18;
  const fairStart = 38, fairEnd = 51.8, priceEnd = 42.3;

  // Seeded noise so the chart looks the same on every load
  let seed = 11;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5;

  const raw = [];
  let noise = 0;
  for (let i = 0; i < N; i++) {
    noise = noise * 0.8 + rand() * 0.03;
    raw.push(0.15 * Math.sin(i / 10 + 0.4) + 0.05 * Math.sin(i / 3.3) + noise);
  }
  // Bend the tail so the series ends exactly at the stated price
  const fix = (priceEnd / fairEnd - 1) - raw[N - 1];
  const fair = [], price = [];
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    fair.push(fairStart + (fairEnd - fairStart) * t);
    price.push(fair[i] * (1 + raw[i] + fix * t ** 3));
  }

  const all = fair.concat(price);
  const lo = Math.min(...all) * 0.96, hi = Math.max(...all) * 1.03;
  const x = (i) => LEFT + (i / (N - 1)) * (W - LEFT - RIGHT);
  const y = (v) => H - ((v - lo) / (hi - lo)) * H;
  const pts = (arr) => arr.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`);

  const pricePath = 'M' + pts(price).join('L');
  const fairPath = `M${x(0)},${y(fairStart)}L${x(N - 1)},${y(fairEnd)}`;
  const area = 'M' + pts(price).join('L') + 'L' + pts(fair).reverse().join('L') + 'Z';
  // The fair line is straight, so the regions above/below it are simple polygons
  const fy0 = y(fairStart).toFixed(1), fy1 = y(fairEnd).toFixed(1);
  const above = `0,0 ${W},0 ${W},${fy1} 0,${fy0}`;
  const below = `0,${fy0} ${W},${fy1} ${W},${H} 0,${H}`;
  const grid = [1, 2, 3].map((k) => `<line class="hc-grid" x1="0" x2="${W}" y1="${(H * k) / 4}" y2="${(H * k) / 4}"/>`).join('');

  svg.innerHTML = `
    <defs>
      <clipPath id="hcAbove"><polygon points="${above}"/></clipPath>
      <clipPath id="hcBelow"><polygon points="${below}"/></clipPath>
    </defs>
    ${grid}
    <path class="hc-area hc-area--over" d="${area}" clip-path="url(#hcAbove)"/>
    <path class="hc-area hc-area--under" d="${area}" clip-path="url(#hcBelow)"/>
    <path class="hc-fair" d="${fairPath}"/>
    <path class="hc-price hc-price--over" d="${pricePath}" clip-path="url(#hcAbove)"/>
    <path class="hc-price hc-price--under" d="${pricePath}" clip-path="url(#hcBelow)"/>
    <circle class="hc-dot hc-dot--fair" cx="${x(N - 1)}" cy="${y(fairEnd)}" r="5"/>
    <circle class="hc-dot hc-dot--price" cx="${x(N - 1)}" cy="${y(priceEnd)}" r="5"/>`;
}

/* ---------- Two-stage discounted earnings model ---------- */
function intrinsicValue(eps, g1, g2, r, years = 5) {
  let pvStage = 0, e = eps;
  for (let t = 1; t <= years; t++) {
    e *= 1 + g1;
    pvStage += e / (1 + r) ** t;
  }
  const pvTerminal = (e * (1 + g2)) / (r - g2) / (1 + r) ** years;
  return { value: pvStage + pvTerminal, pvStage, pvTerminal };
}

function renderSensitivity(eps, price, g1Pct, g2Pct, rPct) {
  const rows = [-2, -1, 0, 1, 2].map((d) => rPct + d);
  const cols = [-2, -1, 0, 1, 2].map((d) => g2Pct + d);
  let html = '<thead><tr><th></th>' + cols.map((g) => `<th scope="col">${pct(g)}</th>`).join('') + '</tr></thead><tbody>';
  for (const rr of rows) {
    html += `<tr><th scope="row">${pct(rr)}</th>`;
    for (const gg of cols) {
      const base = rr === rPct && gg === g2Pct ? ' is-base' : '';
      if (rr <= gg) {
        html += `<td class="s-na${base}">—</td>`;
        continue;
      }
      const { value } = intrinsicValue(eps, g1Pct / 100, gg / 100, rr / 100);
      const ratio = value / price;
      const cls = ratio >= 1.25 ? 's-hi' : ratio >= 1 ? 's-mid' : ratio >= 0.85 ? 's-near' : 's-lo';
      html += `<td class="${cls}${base}">${fmtOne.format(value / 1000)}</td>`;
    }
    html += '</tr>';
  }
  $('sens').innerHTML = html + '</tbody>';
}

function updateCalculator() {
  const eps = Number($('eps').value), price = Number($('price').value);
  const g1Pct = Number($('g1').value), g2Pct = Number($('g2').value), rPct = Number($('r').value);
  $('g1Out').textContent = pct(g1Pct);
  $('g2Out').textContent = pct(g2Pct);
  $('rOut').textContent = pct(rPct);

  const verdict = $('verdict');
  if (!(eps > 0 && price > 0)) {
    for (const id of ['value', 'mos', 'pe', 'pvStage', 'pvTerminal']) $(id).textContent = '—';
    verdict.className = 'verdict is-near';
    verdict.textContent = 'Nhập EPS và giá lớn hơn 0';
    $('gauge').hidden = true;
    $('sens').innerHTML = '';
    return;
  }

  // Slider bounds keep the required return above long-term growth
  const { value, pvStage, pvTerminal } = intrinsicValue(eps, g1Pct / 100, g2Pct / 100, rPct / 100);
  const mos = (value - price) / value;
  const round100 = (v) => fmtInt.format(Math.round(v / 100) * 100);

  $('value').textContent = round100(value);
  $('mos').textContent = pct(mos * 100);
  $('mos').className = mos >= 0 ? 'pos' : '';
  $('pe').textContent = fmtOne.format(value / eps) + 'x';
  $('pvStage').textContent = round100(pvStage);
  $('pvTerminal').textContent = round100(pvTerminal);

  if (mos >= 0.2) {
    verdict.className = 'verdict is-under';
    verdict.textContent = 'Giá thấp hơn nhiều so với giá trị ước tính';
  } else if (mos >= -0.1) {
    verdict.className = 'verdict is-near';
    verdict.textContent = 'Giá gần với giá trị ước tính';
  } else {
    verdict.className = 'verdict is-over';
    verdict.textContent = 'Giá cao hơn giá trị ước tính';
  }

  const max = Math.max(value, price) * 1.25;
  const at = (v) => (v / max) * 100 + '%';
  $('gauge').hidden = false;
  $('markPrice').style.left = at(price);
  $('markPrice').firstElementChild.textContent = 'Giá ' + fmtInt.format(price);
  $('markValue').style.left = at(value);
  $('markValue').firstElementChild.textContent = 'Giá trị ' + round100(value);
  const fill = $('gaugeFill');
  fill.style.left = at(Math.min(value, price));
  fill.style.width = (Math.abs(value - price) / max) * 100 + '%';
  fill.className = 'gauge__fill ' + (value >= price ? 'is-under' : 'is-over');

  renderSensitivity(eps, price, g1Pct, g2Pct, rPct);
}

// Each part checks for its own elements first: a page without one of them skips that part, the rest still run
const heroChart = $('heroChart');
if (heroChart) drawHeroChart(heroChart);

const calcForm = $('calcForm');
if (calcForm) {
  calcForm.addEventListener('input', updateCalculator);
  calcForm.addEventListener('submit', (e) => e.preventDefault());
  updateCalculator();
}

// No backend: hand the message to the visitor's email app, addressed to support
const contactForm = $('contactForm');
if (contactForm) {
  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target;
    const subject = `[${f.topic.value}] ${f.name.value}`;
    const body = `${f.message.value}\n\n— ${f.name.value}`;
    location.href = `mailto:${f.dataset.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });
}

// TODO: connect to a newsletter service (Mailchimp, MailerLite, Brevo, ...) — until then, like the contact form,
// hand the request to the visitor's email app
const signup = $('signup'), signupMsg = $('signupMsg');
if (signup && signupMsg) {
  signup.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target;
    const email = f.email.value.trim();
    const subject = `[Đăng ký bản tin] ${email}`;
    const body = `Tôi muốn đăng ký nhận bản tin Fairline Research bằng địa chỉ: ${email}`;
    location.href = `mailto:${f.dataset.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    signupMsg.textContent = 'Đã mở ứng dụng email — bấm Gửi để hoàn tất. Không thấy? Gửi email tới support@fairlineresearch.com.';
  });
}
