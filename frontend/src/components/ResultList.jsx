const TIER_INFO = {
  safe: { label: '穩陣', cls: 'safe', desc: '你的分數 ≥ 收生中位數' },
  competitive: { label: '有機會', cls: 'competitive', desc: '介乎下四分位數與中位數之間' },
  reach: { label: '衝刺', cls: 'reach', desc: '略低於下四分位數，可博一博' },
  below: { label: '機會偏低', cls: 'below', desc: '低於收生分數' },
  unqualified: { label: '未符要求', cls: 'unqualified', desc: '未達必修門檻' },
};

export default function ResultList({ results }) {
  if (!results) {
    return <div className="empty">填好成績後按「開始比對」，結果會顯示在這裡。</div>;
  }
  if (results.length === 0) {
    return <div className="empty">沒有符合條件的專業，試試調整興趣或取消篩選。</div>;
  }

  return (
    <div className="results">
      <h3>比對結果（{results.length} 個專業）</h3>
      {results.map((r) => {
        const t = TIER_INFO[r.tier] || TIER_INFO.below;
        return (
          <div className={`card tier-${t.cls}`} key={r.programmeId}>
            <div className="card-head">
              <div>
                <span className="uni">{r.universityShort}</span>
                <span className="pname">{r.name}</span>
                <span className="code">{r.jupasCode}</span>
              </div>
              <span className={`badge ${t.cls}`}>{t.label}</span>
            </div>

            <div className="scores">
              <div className="score-box mine">
                <span className="num">{r.yourScore}</span>
                <span className="cap">你的分數</span>
              </div>
              <div className="score-box">
                <span className="num">{r.admission?.median ?? '—'}</span>
                <span className="cap">收生中位數</span>
              </div>
              <div className="score-box">
                <span className="num">{r.admission?.lowerQuartile ?? '—'}</span>
                <span className="cap">下四分位數</span>
              </div>
            </div>

            {!r.requirementOk && (
              <div className="req-warn">
                ⚠️ 未符要求：{r.requirementReasons.join('；')}
              </div>
            )}

            <div className="meta">
              <span>{t.desc}</span>
              {r.gapToMedian != null && r.requirementOk && (
                <span className={r.gapToMedian >= 0 ? 'pos' : 'neg'}>
                  距中位數 {r.gapToMedian >= 0 ? '+' : ''}{r.gapToMedian}
                </span>
              )}
              {r.dataStatus === 'sample' && <span className="sample-tag">示例數據</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
