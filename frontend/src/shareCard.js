// 生成「我的 DSE 配對結果」分享圖（1080×1080 PNG），供學生分享到 IG / 小紅書等。
// 純 Canvas 繪製，用瀏覽器系統字型（含中文），無外部依賴。

const TIER_COLOR = { safe: '#16a34a', competitive: '#ca8a04', reach: '#ea580c', below: '#94a3b8', unqualified: '#dc2626', reference: '#94a3b8' };

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function truncate(ctx, text, maxW) {
  if (ctx.measureText(text).width <= maxW) return text;
  let s = text;
  while (s.length > 1 && ctx.measureText(s + '…').width > maxW) s = s.slice(0, -1);
  return s + '…';
}

// 斷行用的切詞：中日韓標點逐字可斷，拉丁字母要整個字一齊搬，
// 否則 "Biomedical" 會被斬成 "Biomedi / cal"。
function tokenize(text) {
  const out = [];
  let buf = '';
  for (const ch of text) {
    if (/[\u2e80-\u9fff\u3000-\u303f\uff00-\uffef]/.test(ch)) {
      if (buf) { out.push(buf); buf = ''; }
      out.push(ch);
    } else if (ch === ' ') {
      out.push(buf + ch); buf = '';
    } else {
      buf += ch;
    }
  }
  if (buf) out.push(buf);
  return out;
}

// 依目前 ctx.font 把文字排成最多 maxLines 行，放不下就在最後一行加省略號。
function wrapText(ctx, text, maxW, maxLines) {
  const rtrim = (x) => x.replace(/\s+$/, '');
  const lines = [];
  let line = '';
  for (const tk of tokenize(text)) {
    const test = line + tk;
    if (line && ctx.measureText(rtrim(test)).width > maxW) {
      lines.push(rtrim(line));
      line = tk.replace(/^\s+/, '');
    } else {
      line = test;
    }
  }
  if (rtrim(line)) lines.push(rtrim(line));
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  kept[maxLines - 1] = truncate(ctx, kept[maxLines - 1] + lines.slice(maxLines).join(''), maxW);
  return kept;
}

// canvas → File，全程同步。
// 唔用 canvas.toBlob（回呼／Promise）係因為 navigator.share() 必須喺 click 嘅同一個
// task 內叫：中間 await 過就會失去 transient user activation，Safari 會掟
// NotAllowedError，用家撳完分享乜都唔會發生。toDataURL + atob 就冇呢個問題。
function canvasToFile(canvas, filename) {
  const dataUrl = canvas.toDataURL('image/png');
  const b64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return new File([buf], filename, { type: 'image/png' });
}

// 舊 Safari／非 https 冇 navigator.clipboard，退回 execCommand。
function legacyCopy(str) {
  try {
    const ta = document.createElement('textarea');
    ta.value = str;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, str.length); // iOS 要明確指定範圍先 select 到
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch { return false; }
}

/**
 * 複製文字到剪貼簿。同樣要喺 user gesture 嘅同一個 task 內叫（前面唔好有 await）。
 * @returns {Promise<boolean>}
 */
export async function copyText(str) {
  if (navigator.clipboard?.writeText) {
    try { await navigator.clipboard.writeText(str); return true; } catch { /* 試舊方法 */ }
  }
  return legacyCopy(str);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// labels: { title, cta, domain, tierLabel(tk), uniName(r), progName(r) }
// 同步畫，理由同 canvasToFile 一樣：navigator.share() 前面唔可以有 await。
function drawResultsCard(results, labels) {
  const S = 1080;
  const canvas = document.createElement('canvas');
  canvas.width = S; canvas.height = S;
  const ctx = canvas.getContext('2d');
  const FONT = '-apple-system, "Segoe UI", "Microsoft JhengHei", "PingFang HK", sans-serif';

  // 背景漸層
  const g = ctx.createLinearGradient(0, 0, S, S);
  g.addColorStop(0, '#1e3a8a'); g.addColorStop(0.55, '#2563eb'); g.addColorStop(1, '#3b82f6');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);

  // 品牌列
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#ffffff';
  ctx.font = `700 34px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText('🎓 JUPAS Calculator', 70, 92);
  ctx.font = `600 28px ${FONT}`;
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.textAlign = 'right';
  ctx.fillText(labels.domain, S - 70, 90);

  // 標題
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.font = `800 66px ${FONT}`;
  ctx.fillText(labels.title, 70, 215);

  // tier 統計
  const counts = {};
  results.forEach((r) => { counts[r.tier] = (counts[r.tier] || 0) + 1; });
  const summaryParts = ['safe', 'competitive', 'reach']
    .filter((tk) => counts[tk])
    .map((tk) => ({ tk, label: labels.tierLabel(tk), n: counts[tk] }));
  let sx = 70;
  ctx.font = `700 30px ${FONT}`;
  summaryParts.forEach(({ tk, label, n }) => {
    const txt = `${label} ${n}`;
    const w = ctx.measureText(txt).width + 36;
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    roundRect(ctx, sx, 250, w, 50, 25); ctx.fill();
    ctx.fillStyle = TIER_COLOR[tk]; ctx.beginPath(); ctx.arc(sx + 22, 275, 8, 0, 7); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.textAlign = 'left';
    ctx.fillText(txt, sx + 38, 285);
    sx += w + 14;
  });

  // 白色面板：最佳配對清單
  const panelX = 60, panelY = 340, panelW = S - 120;
  // 取最佳配對，並讓院校多元（每校最多 2 個），更有「睇下我入到幾多間」的觀感
  const pool = results.filter((r) => ['safe', 'competitive', 'reach'].includes(r.tier));
  const perUni = {};
  const top = [];
  for (const r of pool) {
    const u = r.universityShort;
    if ((perUni[u] || 0) >= 2) continue;
    perUni[u] = (perUni[u] || 0) + 1;
    top.push(r);
    if (top.length >= 6) break;
  }
  if (top.length < 6) for (const r of pool) { if (!top.includes(r)) { top.push(r); if (top.length >= 6) break; } }
  const rowH = 96;
  const panelH = 40 + Math.max(top.length, 1) * rowH + 20;
  ctx.fillStyle = 'rgba(255,255,255,0.97)';
  roundRect(ctx, panelX, panelY, panelW, panelH, 36); ctx.fill();

  let ry = panelY + 40;
  if (top.length === 0) {
    ctx.fillStyle = '#5b6b80'; ctx.font = `500 34px ${FONT}`; ctx.textAlign = 'center';
    ctx.fillText('—', S / 2, ry + 40);
  }
  top.forEach((r) => {
    // tier 圓點
    ctx.fillStyle = TIER_COLOR[r.tier] || '#94a3b8';
    ctx.beginPath(); ctx.arc(panelX + 56, ry + 36, 11, 0, 7); ctx.fill();
    // 院校簡稱
    ctx.textAlign = 'left';
    ctx.fillStyle = '#2563eb'; ctx.font = `800 34px ${FONT}`;
    const uni = labels.uniName(r);
    ctx.fillText(uni, panelX + 92, ry + 47);
    const uniW = ctx.measureText(uni).width;
    // 專業名（截斷）
    ctx.fillStyle = '#0f1b2d'; ctx.font = `600 32px ${FONT}`;
    const nameX = panelX + 92 + uniW + 20;
    const tierLabel = labels.tierLabel(r.tier);
    ctx.font = `700 26px ${FONT}`;
    const tierW = ctx.measureText(tierLabel).width + 28;
    ctx.font = `600 32px ${FONT}`;
    const name = truncate(ctx, labels.progName(r), panelW - (nameX - panelX) - tierW - 60);
    ctx.fillText(name, nameX, ry + 47);
    // tier 標籤（右側）
    ctx.font = `700 26px ${FONT}`;
    const tlx = panelX + panelW - tierW - 24;
    ctx.fillStyle = (TIER_COLOR[r.tier] || '#94a3b8') + '22';
    roundRect(ctx, tlx, ry + 14, tierW, 44, 22); ctx.fill();
    ctx.fillStyle = TIER_COLOR[r.tier] || '#94a3b8'; ctx.textAlign = 'center';
    ctx.fillText(tierLabel, tlx + tierW / 2, ry + 44);
    // 分隔線
    if (r !== top[top.length - 1]) {
      ctx.strokeStyle = '#eef2f7'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(panelX + 40, ry + rowH - 8); ctx.lineTo(panelX + panelW - 40, ry + rowH - 8); ctx.stroke();
    }
    ry += rowH;
  });

  // 底部 CTA
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff'; ctx.font = `700 36px ${FONT}`;
  ctx.fillText(labels.cta, S / 2, panelY + panelH + 78);
  ctx.font = `800 44px ${FONT}`;
  ctx.fillText(labels.domain, S / 2, panelY + panelH + 138);

  return canvas;
}

/** 分享或下載比對結果。同 shareProgramme 一樣，必須由 click handler 直接叫。 */
export function shareResults(results, labels) {
  const name = 'jupas-calculator.png';
  const canvas = drawResultsCard(results, labels);
  const file = canvasToFile(canvas, name);
  const fallback = () => {
    canvas.toBlob((b) => b && downloadBlob(b, name), 'image/png');
    return 'downloaded';
  };
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    return navigator.share({ files: [file], title: labels.title })
      .then(() => 'shared')
      .catch((e) => (e?.name === 'AbortError' ? 'cancelled' : fallback()));
  }
  return Promise.resolve(fallback());
}

// ══════════════════════════════════════════════════════════════
// 單一專業分享圖（1080×1350）
// 比對結果那張是 1:1，但單科要放收生分、取錄人數同「我的分數」，
// 直度不夠用，所以改用 4:5——IG 版面不會裁到，小紅書／WhatsApp 也照樣好睇。
// labels 由元件組好（已處理繁／簡／英），這裡不碰 i18n。
//   { brand, domain, uni, name, code, category, cta,
//     tier, tierLabel, yourScore, yourScoreLabel, gapLabel,
//     stats: [{ label, value }], facts: [{ label, value }] }
// ══════════════════════════════════════════════════════════════
function drawProgrammeCard(labels) {
  const W = 1080, H = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const FONT = '-apple-system, "Segoe UI", "Microsoft JhengHei", "PingFang HK", sans-serif';

  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#1e3a8a'); g.addColorStop(0.55, '#2563eb'); g.addColorStop(1, '#3b82f6');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // 品牌列
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.font = `700 34px ${FONT}`;
  ctx.fillText(labels.brand, 70, 92);
  ctx.textAlign = 'right';
  ctx.font = `600 28px ${FONT}`;
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText(labels.domain, W - 70, 90);

  // 院校膠囊
  ctx.textAlign = 'left';
  ctx.font = `700 34px ${FONT}`;
  const chipW = ctx.measureText(labels.uni).width + 48;
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  roundRect(ctx, 70, 142, chipW, 64, 32); ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.fillText(labels.uni, 70 + 24, 186);

  // 專業名（最多 3 行）
  ctx.font = `800 62px ${FONT}`;
  ctx.fillStyle = '#ffffff';
  let y = 296;
  wrapText(ctx, labels.name, W - 140, 3).forEach((line) => {
    ctx.fillText(line, 70, y);
    y += 78;
  });

  // JS code · 類別
  ctx.font = `600 34px ${FONT}`;
  ctx.fillStyle = 'rgba(255,255,255,0.82)';
  ctx.fillText([labels.code, labels.category].filter(Boolean).join(' · '), 70, y);
  y += 52;

  // ── 白色面板 ──
  const panelX = 60, panelW = W - 120;
  const hasMine = labels.yourScore != null;
  const mineH = hasMine ? 152 : 0;
  const statsH = labels.stats.length ? 190 : 0;
  const factsH = labels.facts.length ? 116 : 0;
  const panelH = 36 + mineH + statsH + factsH + 20;
  // 面板置中在「標題底」到「CTA 頂」之間：標題一行同三行、有無「我的分數」，
  // 高度差成三百幾 px，若死釘在標題下面，短標題那張底部會空一大截。
  const bandTop = y + 30;
  const bandBottom = H - 220;
  const panelY = Math.max(bandTop, bandTop + (bandBottom - bandTop - panelH) / 2);
  ctx.fillStyle = 'rgba(255,255,255,0.97)';
  roundRect(ctx, panelX, panelY, panelW, panelH, 36); ctx.fill();

  let ry = panelY + 36;

  // 「我的分數」——只有由比對結果點進來先有
  if (hasMine) {
    const color = TIER_COLOR[labels.tier] || '#2563eb';
    ctx.fillStyle = color + '18';
    roundRect(ctx, panelX + 28, ry, panelW - 56, 124, 24); ctx.fill();

    ctx.textAlign = 'left';
    ctx.fillStyle = '#5b6b80'; ctx.font = `600 26px ${FONT}`;
    ctx.fillText(labels.yourScoreLabel, panelX + 60, ry + 48);
    ctx.fillStyle = color; ctx.font = `800 62px ${FONT}`;
    ctx.fillText(String(labels.yourScore), panelX + 60, ry + 106);

    if (labels.tierLabel) {
      ctx.font = `700 30px ${FONT}`;
      const tw = ctx.measureText(labels.tierLabel).width + 40;
      const tx = panelX + panelW - 60 - tw;
      ctx.fillStyle = color;
      roundRect(ctx, tx, ry + 26, tw, 52, 26); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center';
      ctx.fillText(labels.tierLabel, tx + tw / 2, ry + 62);

      if (labels.gapLabel) {
        ctx.textAlign = 'right';
        ctx.fillStyle = '#5b6b80'; ctx.font = `600 26px ${FONT}`;
        ctx.fillText(labels.gapLabel, panelX + panelW - 60, ry + 106);
      }
    }
    ry += mineH;
  }

  // 收生分數欄（上四分位／中位數／下四分位，缺就少一欄）
  if (labels.stats.length) {
    const n = labels.stats.length;
    const gap = 16;
    const boxW = (panelW - 56 - gap * (n - 1)) / n;
    labels.stats.forEach((st, i) => {
      const bx = panelX + 28 + i * (boxW + gap);
      ctx.fillStyle = '#f5f8fc';
      roundRect(ctx, bx, ry, boxW, 158, 22); ctx.fill();
      ctx.textAlign = 'center';
      ctx.fillStyle = '#2563eb'; ctx.font = `800 56px ${FONT}`;
      ctx.fillText(truncate(ctx, String(st.value), boxW - 20), bx + boxW / 2, ry + 82);
      ctx.fillStyle = '#5b6b80'; ctx.font = `600 25px ${FONT}`;
      ctx.fillText(truncate(ctx, st.label, boxW - 16), bx + boxW / 2, ry + 126);
    });
    ry += statsH;
  }

  // 取錄人數 / 學額
  if (labels.facts.length) {
    ctx.textAlign = 'left';
    let fx = panelX + 32;
    labels.facts.forEach((f) => {
      const txt = `${f.label} ${f.value}`;
      ctx.font = `700 29px ${FONT}`;
      const w = ctx.measureText(txt).width + 40;
      ctx.fillStyle = '#fff7ed';
      roundRect(ctx, fx, ry + 8, w, 62, 31); ctx.fill();
      ctx.fillStyle = '#c2410c';
      ctx.fillText(txt, fx + 20, ry + 48);
      fx += w + 14;
    });
  }

  // 底部 CTA（釘在畫布底部，標題長短都不會頂到）
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = `700 36px ${FONT}`;
  ctx.fillText(truncate(ctx, labels.cta, W - 120), W / 2, H - 150);
  ctx.font = `800 46px ${FONT}`;
  ctx.fillText(labels.domain, W / 2, H - 82);

  return canvas;
}

/**
 * 分享單一專業：圖 + 連結。
 *
 * ⚠️ 必須由 click handler 直接叫，前面唔可以有 await。
 * navigator.share() 要 transient user activation，中間 await 過（例如等 canvas.toBlob）
 * 就會失效：Safari 掟 NotAllowedError，之前的寫法再靜靜咁跌落 fallback，
 * 用家撳完分享乜都唔會發生——就係「分享唔出去」的成因。
 * 所以畫圖同轉 File 全部改成同步，share() 喺同一個 task 內即刻叫。
 *
 * 手機會彈系統分享面板（IG／WhatsApp／微信都收得到）；冇 Web Share API
 * （多數桌面瀏覽器）或分享失敗，就退到「複製連結 + 下載分享圖」，
 * 保證用家至少攞到條連結。用戶自己撳取消（AbortError）不當失敗，也不會彈個檔案出嚟。
 */
export function shareProgramme(labels) {
  const { url, text, title } = labels;
  const name = `${labels.code || 'jupas'}.png`;
  let canvas = null;
  let file = null;
  try {
    canvas = drawProgrammeCard(labels);
    file = canvasToFile(canvas, name);
  } catch { /* 畫唔到圖都仲可以分享連結 */ }

  const fallback = () => {
    if (canvas) canvas.toBlob((b) => b && downloadBlob(b, name), 'image/png');
    return copyText(`${text}\n${url}`).then((ok) => (ok ? 'copied' : 'downloaded'));
  };

  if (navigator.share) {
    const payload = file && navigator.canShare?.({ files: [file] })
      ? { files: [file], title, text, url }
      : { title, text, url };
    return navigator.share(payload)
      .then(() => 'shared')
      .catch((e) => (e?.name === 'AbortError' ? 'cancelled' : fallback()));
  }
  return fallback();
}

/**
 * 只分享連結，唔帶圖。
 *
 * 帶住圖分享時，好多接收 app（IG、相簿類）只會收圖，text／url 會被丟埋一邊——
 * 結果就係「連結分享唔出去」。呢個入口保證條 link 一定係主角：
 * 有分享面板就淨係傳 title/text/url，冇就複製落剪貼簿。
 * 同 shareProgramme 一樣，必須由 click handler 直接叫，前面唔可以有 await。
 */
export function shareLink(labels) {
  const { url, text, title } = labels;
  const copy = () => copyText(`${text}\n${url}`).then((ok) => (ok ? 'copied' : 'failed'));
  if (navigator.share) {
    return navigator.share({ title, text, url })
      .then(() => 'shared')
      .catch((e) => (e?.name === 'AbortError' ? 'cancelled' : copy()));
  }
  return copy();
}
