// 日本語は分かち書きなしで検索するため、文字バイグラムによる類似度 + キーワード部分一致で
// スコアリングする簡易検索エンジン。形態素解析器なしでも実用的な精度が出せる手法。

function toBigrams(str) {
  const s = normalize(str);
  const grams = new Set();
  for (let i = 0; i < s.length - 1; i++) {
    grams.add(s.slice(i, i + 2));
  }
  if (grams.size === 0 && s.length > 0) grams.add(s);
  return grams;
}

function normalize(str) {
  return String(str || "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[！-～]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0)); // 全角記号→半角寄せ
}

function bigramOverlapScore(queryGrams, textGrams) {
  if (queryGrams.size === 0 || textGrams.size === 0) return 0;
  let hit = 0;
  for (const g of queryGrams) {
    if (textGrams.has(g)) hit++;
  }
  return hit / queryGrams.size; // クエリ側のどれだけがヒットしたか
}

function searchWiki(query, entries) {
  const qNorm = normalize(query);
  if (!qNorm) return [];
  const qGrams = toBigrams(qNorm);

  const scored = entries.map((entry) => {
    let score = 0;

    // キーワード完全部分一致は強いシグナル
    for (const kw of entry.keywords || []) {
      const kwNorm = normalize(kw);
      if (!kwNorm) continue;
      if (qNorm.includes(kwNorm)) score += 12;
      else if (kwNorm.includes(qNorm) && qNorm.length >= 2) score += 6;
    }

    // タイトル部分一致
    const titleNorm = normalize(entry.title);
    if (qNorm.length >= 2 && titleNorm.includes(qNorm)) score += 8;

    // バイグラム類似度(タイトル+キーワード+本文)
    const combinedText = [entry.title, ...(entry.keywords || []), entry.answer].join(" ");
    const textGrams = toBigrams(combinedText);
    score += bigramOverlapScore(qGrams, textGrams) * 10;

    return { entry, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);
}
