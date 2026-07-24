const CONFIDENT_THRESHOLD = 9;
const SUGGEST_THRESHOLD = 3;

let wikiEntries = [];

const chatWindow = document.getElementById("chatWindow");
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const quickRepliesEl = document.getElementById("quickReplies");
const contactLink = document.getElementById("contactLink");

contactLink.href = CONTACT_FORM_URL;

function addMessage(html, sender) {
  const div = document.createElement("div");
  div.className = `msg ${sender}`;
  div.innerHTML = html;
  chatWindow.appendChild(div);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderAnswer(entry) {
  return `
    <p class="answer-title">${escapeHtml(entry.title)}</p>
    <p>${escapeHtml(entry.answer).replace(/\n/g, "<br>")}</p>
    <p class="answer-meta">カテゴリ: ${escapeHtml(entry.category)}</p>
  `;
}

function renderFallback(closeGuesses) {
  let html = `<p>申し訳ありません、はっきりお答えできる情報が見つかりませんでした。</p>`;
  if (closeGuesses.length > 0) {
    html += `<p>もしかして、こちらのことでしょうか?</p><ul class="guess-list">`;
    for (const g of closeGuesses.slice(0, 3)) {
      html += `<li><button type="button" class="guess-btn" data-id="${g.entry.id}">${escapeHtml(g.entry.title)}</button></li>`;
    }
    html += `</ul>`;
  }
  html += `<p>お手数ですが <a href="${CONTACT_FORM_URL}" target="_blank" rel="noopener">意見・お問い合わせフォーム</a> よりご質問ください。</p>`;
  return html;
}

function handleQuery(query) {
  addMessage(escapeHtml(query), "user");
  const results = searchWiki(query, wikiEntries);

  if (results.length > 0 && results[0].score >= CONFIDENT_THRESHOLD) {
    addMessage(renderAnswer(results[0].entry), "bot");
    const related = results.slice(1, 3).filter((r) => r.score >= SUGGEST_THRESHOLD);
    if (related.length > 0) {
      let html = `<p class="related-title">関連する質問:</p><ul class="guess-list">`;
      for (const r of related) {
        html += `<li><button type="button" class="guess-btn" data-id="${r.entry.id}">${escapeHtml(r.entry.title)}</button></li>`;
      }
      html += `</ul>`;
      addMessage(html, "bot");
    }
  } else {
    const guesses = results.filter((r) => r.score >= SUGGEST_THRESHOLD);
    addMessage(renderFallback(guesses), "bot");
  }
}

chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const q = chatInput.value.trim();
  if (!q) return;
  chatInput.value = "";
  handleQuery(q);
});

chatWindow.addEventListener("click", (e) => {
  const btn = e.target.closest(".guess-btn");
  if (!btn) return;
  const entry = wikiEntries.find((en) => en.id === btn.dataset.id);
  if (entry) {
    addMessage(escapeHtml(entry.title), "user");
    addMessage(renderAnswer(entry), "bot");
  }
});

function renderQuickReplies() {
  quickRepliesEl.innerHTML = "";
  const featured = wikiEntries.slice(0, 6);
  for (const entry of featured) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "quick-btn";
    btn.textContent = entry.title;
    btn.addEventListener("click", () => handleQuery(entry.title));
    quickRepliesEl.appendChild(btn);
  }
}

fetch("wiki.json")
  .then((res) => res.json())
  .then((data) => {
    wikiEntries = data.entries || [];
    renderQuickReplies();
  })
  .catch(() => {
    addMessage("データの読み込みに失敗しました。しばらくしてから再度お試しください。", "bot");
  });
