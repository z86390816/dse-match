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

// labels: { title, cta, domain, tierLabel(tk), uniName(r), progName(r) }
export async function generateShareBlob(results, labels) {
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

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
}

// 分享或下載
export async function shareResults(results, labels) {
  const blob = await generateShareBlob(results, labels);
  const file = new File([blob], 'jupas-calculator.png', { type: 'image/png' });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: labels.title });
      return 'shared';
    }
  } catch (e) { /* 用戶取消或不支援 → 退回下載 */ }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'jupas-calculator.png';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'downloaded';
}
