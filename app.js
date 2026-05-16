const DATA = window.GCT_INSIDER_DATA;
const app = document.querySelector("#app");

const CORE_IDS = ["wu", "wei", "hao", "wan", "schrock", "bernes", "lau"];
const peopleById = new Map(DATA.people.map((person) => [person.id, person]));

const state = {
  person: "all",
  action: "all",
  search: "",
  planStatus: "all",
};

function html(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function fmtShares(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return Math.round(value).toLocaleString("en-US");
}

function fmtMoney(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

function fmtPrice(value) {
  if (!value) return "—";
  return `$${value.toFixed(2)}`;
}

function fmtPct(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  if (Math.abs(value) < 0.0001 && value !== 0) return "<0.01%";
  return `${(value * 100).toFixed(2)}%`;
}

function personName(id) {
  return peopleById.get(id)?.name || id;
}

function badgeClass(row) {
  if (row.code === "S") return "sell";
  if (row.code === "P") return "buy";
  if (["A", "M"].includes(row.code)) return "award";
  return "neutral";
}

function isCore(rowOrPerson) {
  const id = rowOrPerson.personId || rowOrPerson.id;
  return CORE_IDS.includes(id);
}

function topnavActive(route) {
  document.querySelectorAll(".topnav a").forEach((link) => {
    link.classList.toggle("active", link.getAttribute("href") === `#${route}`);
  });
}

function sideNav(activeId = "") {
  return `
    <aside class="side">
      <div class="side-title">人员子页面</div>
      ${DATA.people.map((person) => `
        <a class="person-link ${person.id === activeId ? "active" : ""}" href="#person/${person.id}">
          <strong>${html(person.name)}</strong>
          <span>${html(person.role)}</span>
        </a>
      `).join("")}
    </aside>
  `;
}

function pageShell(content, activeId = "") {
  return `
    <div class="layout">
      ${sideNav(activeId)}
      <div class="stack">${content}</div>
    </div>
  `;
}

function totals() {
  const coreTransactions = DATA.transactions.filter(isCore);
  const coreSales = coreTransactions.filter((row) => row.code === "S");
  const pendingPlans = DATA.plans.filter((plan) => /尚未/.test(plan.status));
  const beneficialTotal = DATA.people
    .filter((person) => CORE_IDS.includes(person.id))
    .reduce((sum, person) => sum + person.beneficial.totalEquivalent, 0);
  return {
    coreSaleShares: coreSales.reduce((sum, row) => sum + row.shares, 0),
    coreSaleValue: coreSales.reduce((sum, row) => sum + row.transactionValue, 0),
    pendingShares: pendingPlans.reduce((sum, plan) => sum + plan.plannedShares, 0),
    pendingValue: pendingPlans.reduce((sum, plan) => sum + plan.aggregateMarketValue, 0),
    beneficialTotal,
  };
}

function monthlySalesRows() {
  const monthMap = new Map();
  DATA.transactions
    .filter((row) => isCore(row) && row.code === "S")
    .forEach((row) => {
      const month = row.date.slice(0, 7);
      const current = monthMap.get(month) || { month, shares: 0, value: 0 };
      current.shares += row.shares;
      current.value += row.transactionValue;
      monthMap.set(month, current);
    });
  const rows = [...monthMap.values()].sort((a, b) => a.month.localeCompare(b.month));
  const maxValue = Math.max(...rows.map((row) => row.value), 1);
  return rows.map((row) => ({ ...row, width: `${Math.max(2, (row.value / maxValue) * 100)}%` }));
}

function renderOverview() {
  topnavActive("overview");
  const t = totals();
  const pending = DATA.plans.filter((plan) => /尚未/.test(plan.status));
  const peopleCards = DATA.people.map((person) => personCard(person)).join("");
  const monthly = monthlySalesRows();

  app.innerHTML = pageShell(`
    <section class="hero">
      <div class="chips">
        <span class="chip strong">NASDAQ: GCT</span>
        <span class="chip">数据截至 ${html(DATA.currentDate)}</span>
        <span class="chip">参考价 ${fmtPrice(DATA.referencePrice)} / 股</span>
        <span class="chip">Form 4 汇总 ${DATA.transactions.length} 条</span>
        <span class="chip">Form 144 ${DATA.plans.length} 条</span>
      </div>
      <h1>管理层直接与间接持股、减持、增持及拟售计划</h1>
      <p class="lede">基于 SEC Form 3、Form 4、Form 144、10-K、10-Q 与 Proxy Statement 整理。页面将管理层个人、其控制主体与相关信托/公司拆开显示，并在每笔交易中给出交易前后持股、估算金额及占总股本比例。</p>
    </section>

    <section class="kpi-grid">
      <div class="kpi">
        <span>核心管理层累计市场减持</span>
        <strong>${fmtShares(t.coreSaleShares)}</strong>
        <small>${fmtMoney(t.coreSaleValue)}，按 Form 4 加权均价估算</small>
      </div>
      <div class="kpi">
        <span>已公告但未见执行披露</span>
        <strong>${fmtShares(t.pendingShares)}</strong>
        <small>${fmtMoney(t.pendingValue)}，来自 2026-05-11 Form 144</small>
      </div>
      <div class="kpi">
        <span>Proxy 口径核心管理层持股</span>
        <strong>${fmtShares(t.beneficialTotal)}</strong>
        <small>Class A + Class B 等效股，主要为 2026-03-31 披露</small>
      </div>
      <div class="kpi">
        <span>最新普通股股本口径</span>
        <strong>${fmtShares(DATA.shareTimeline.at(-1).total)}</strong>
        <small>${DATA.shareTimeline.at(-1).source}，A+B 普通股合计</small>
      </div>
    </section>

    <section class="section">
      <div class="section-head">
        <div>
          <h2>当前未执行/未见执行披露的减持计划</h2>
          <p>Form 144 为拟售通知，是否成交需要后续 Form 4 或公司披露确认。</p>
        </div>
        <a class="chip strong" href="#plans">查看全部拟售通知</a>
      </div>
      ${pending.length ? `<div class="plans-grid">${pending.map(planCard).join("")}</div>` : `<div class="empty">未发现仍未执行的 Form 144 计划。</div>`}
    </section>

    <section class="section">
      <div class="section-head">
        <div>
          <h2>月度减持金额节奏</h2>
          <p>仅统计核心管理层及历史高管的 Form 4 代码 S 交易。</p>
        </div>
      </div>
      <div class="timeline">
        ${monthly.map((row) => `
          <div class="bar-row">
            <span class="bar-label">${html(row.month)}</span>
            <div class="bar-track"><div class="bar-fill" style="width:${row.width}"></div></div>
            <span class="number">${fmtMoney(row.value)} / ${fmtShares(row.shares)} 股</span>
          </div>
        `).join("")}
      </div>
    </section>

    <section class="section">
      <div class="section-head">
        <div>
          <h2>人员子页面</h2>
          <p>每个页面包含履历、持股主体、当前披露持股、交易前后持股和相关披露原因。</p>
        </div>
      </div>
      <div class="people-grid">${peopleCards}</div>
    </section>
  `);
}

function personCard(person) {
  const summary = person.summary;
  return `
    <a class="card" href="#person/${person.id}">
      <div>
        <span class="chip">${html(person.category)}</span>
        <h3>${html(person.name)}</h3>
        <p class="role">${html(person.role)}</p>
      </div>
      <div class="mini-stats">
        <div>
          <span>披露持股</span>
          <strong>${fmtShares(person.beneficial.totalEquivalent)}</strong>
        </div>
        <div>
          <span>估算市值</span>
          <strong>${fmtMoney(person.beneficial.estimatedValue)}</strong>
        </div>
        <div>
          <span>累计减持</span>
          <strong>${fmtShares(summary.salesShares)}</strong>
        </div>
        <div>
          <span>减持金额</span>
          <strong>${fmtMoney(summary.salesValue)}</strong>
        </div>
      </div>
    </a>
  `;
}

function transactionTable(rows, includePerson = true) {
  if (!rows.length) return `<div class="empty">没有匹配的交易记录。</div>`;
  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>日期</th>
            ${includePerson ? "<th>人员</th>" : ""}
            <th>行为</th>
            <th>直接/间接主体</th>
            <th class="number">股数</th>
            <th class="number">价格</th>
            <th class="number">金额</th>
            <th class="number">交易前持股</th>
            <th class="number">交易后持股</th>
            <th class="number">占变动前持股</th>
            <th class="number">占总股本</th>
            <th>披露原因</th>
            <th>来源</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((row) => `
            <tr>
              <td>${html(row.date)}</td>
              ${includePerson ? `<td>${html(personName(row.personId))}</td>` : ""}
              <td><span class="badge ${badgeClass(row)}">${html(row.action)}</span><br><span class="chip">代码 ${html(row.code)}</span></td>
              <td>${html(row.entity)}<br><span class="chip">${html(row.directOrIndirect)} · ${html(row.security)}</span></td>
              <td class="number">${fmtShares(row.shares)}</td>
              <td class="number">${fmtPrice(row.price)}</td>
              <td class="number">${fmtMoney(row.transactionValue)}</td>
              <td class="number">${fmtShares(row.preShares)}<br><span class="bar-label">${fmtMoney(row.preValue)} / ${fmtPct(row.prePctOfCompany)}</span></td>
              <td class="number">${fmtShares(row.postShares)}<br><span class="bar-label">${fmtMoney(row.postValue)} / ${fmtPct(row.postPctOfCompany)}</span></td>
              <td class="number">${fmtPct(row.transactionPctOfPreHolding)}</td>
              <td class="number">${fmtPct(row.transactionPctOfCompany)}<br><span class="bar-label">${html(row.sharesOutstandingSource)}</span></td>
              <td class="reason">${html(row.reason)}</td>
              <td><a class="source-link" href="${html(row.source.url)}" target="_blank" rel="noreferrer">SEC</a><br><span class="bar-label">${html(row.source.accession)}</span></td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function latestLineItems(personId) {
  const map = new Map();
  DATA.transactions
    .filter((row) => row.personId === personId && row.postShares !== null)
    .forEach((row) => {
      const key = `${row.entity}||${row.security}`;
      const prior = map.get(key);
      if (!prior || row.date > prior.date) map.set(key, row);
    });
  return [...map.values()].sort((a, b) => b.postShares - a.postShares);
}

function renderPerson(id) {
  const person = peopleById.get(id) || DATA.people[0];
  topnavActive("");
  const rows = DATA.transactions.filter((row) => row.personId === person.id);
  const plans = DATA.plans.filter((plan) => plan.personId === person.id);
  const summary = person.summary;
  const lineItems = latestLineItems(person.id);

  app.innerHTML = pageShell(`
    <section class="person-head">
      <div class="chips">
        <span class="chip strong">${html(person.category)}</span>
        <span class="chip">${html(person.joined)}</span>
        <span class="chip">交易记录 ${summary.transactionCount} 条</span>
      </div>
      <h1>${html(person.name)}</h1>
      <p class="lede">${html(person.role)}。${html(person.bio)}</p>
    </section>

    <section class="section">
      <div class="section-head">
        <div>
          <h2>持股概览</h2>
          <p>${html(person.beneficial.note)}</p>
        </div>
      </div>
      <div class="holdings">
        <div class="holding">
          <span>Class A</span>
          <strong>${fmtShares(person.beneficial.classA)}</strong>
        </div>
        <div class="holding">
          <span>Class B</span>
          <strong>${fmtShares(person.beneficial.classB)}</strong>
        </div>
        <div class="holding">
          <span>A+B 等效持股</span>
          <strong>${fmtShares(person.beneficial.totalEquivalent)}</strong>
        </div>
        <div class="holding">
          <span>估算市值 / 占总股本</span>
          <strong>${fmtMoney(person.beneficial.estimatedValue)}</strong>
          <span>${fmtPct(person.beneficial.pctTotal)}</span>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="section-head">
        <div>
          <h2>持股主体与履历</h2>
        </div>
      </div>
      <div class="bio-grid">
        <dl class="fact-list">
          <div><dt>职务</dt><dd>${html(person.role)}</dd></div>
          <div><dt>加入时间</dt><dd>${html(person.joined)}</dd></div>
          <div><dt>持有主体</dt><dd>${person.entities.map((entity) => `<span class="chip">${html(entity)}</span>`).join(" ")}</dd></div>
          <div><dt>表决权</dt><dd>${person.beneficial.votingPower === null ? "未达 1% 或未单独列示" : fmtPct(person.beneficial.votingPower)}</dd></div>
        </dl>
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>最新 Form 4 行项目</th><th class="number">持股</th><th>日期</th></tr>
            </thead>
            <tbody>
              ${lineItems.length ? lineItems.map((row) => `
                <tr>
                  <td>${html(row.entity)}<br><span class="bar-label">${html(row.security)}</span></td>
                  <td class="number">${fmtShares(row.postShares)}</td>
                  <td>${html(row.date)}</td>
                </tr>
              `).join("") : `<tr><td colspan="3">未见后续 Form 4 行项目。</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <section class="kpi-grid">
      <div class="kpi"><span>累计减持</span><strong>${fmtShares(summary.salesShares)}</strong><small>${fmtMoney(summary.salesValue)}</small></div>
      <div class="kpi"><span>公开市场买入</span><strong>${fmtShares(summary.purchasesShares)}</strong><small>${fmtMoney(summary.purchasesValue)}</small></div>
      <div class="kpi"><span>股权授予/归属</span><strong>${fmtShares(summary.awardsShares)}</strong><small>代码 A/M</small></div>
      <div class="kpi"><span>税款预扣</span><strong>${fmtShares(summary.taxWithheldShares)}</strong><small>代码 F，不按主动减持处理</small></div>
    </section>

    <section class="section">
      <div class="section-head">
        <div>
          <h2>该人员相关 Form 144 拟售通知</h2>
          <p>包含已执行、过期及仍待后续确认的拟售通知。</p>
        </div>
      </div>
      ${plans.length ? `<div class="plans-grid">${plans.slice(0, 8).map(planCard).join("")}</div>` : `<div class="empty">未检索到该人员或其控制主体的 Form 144 拟售通知。</div>`}
    </section>

    <section class="section">
      <div class="section-head">
        <div>
          <h2>历次增减持与股权变动</h2>
          <p>交易前后持股为 Form 4 对应直接/间接主体的行项目口径。</p>
        </div>
      </div>
      ${transactionTable(rows, false)}
    </section>
  `, person.id);
}

function filteredTransactions() {
  return DATA.transactions.filter((row) => {
    if (state.person !== "all" && row.personId !== state.person) return false;
    if (state.action !== "all") {
      if (state.action === "sale" && row.code !== "S") return false;
      if (state.action === "buy" && row.code !== "P") return false;
      if (state.action === "award" && !["A", "M"].includes(row.code)) return false;
      if (state.action === "other" && ["S", "P", "A", "M"].includes(row.code)) return false;
    }
    if (state.search) {
      const haystack = `${row.date} ${personName(row.personId)} ${row.entity} ${row.reason} ${row.code}`.toLowerCase();
      if (!haystack.includes(state.search.toLowerCase())) return false;
    }
    return true;
  });
}

function renderTransactions() {
  topnavActive("transactions");
  app.innerHTML = pageShell(`
    <section class="hero">
      <div class="chips">
        <span class="chip strong">Form 4 明细</span>
        <span class="chip">${DATA.transactions.length} 条汇总交易</span>
      </div>
      <h1>增持、减持、授予、转换与税款预扣明细</h1>
      <p class="lede">同一 Form 4 中同日、同主体、同交易代码的多档成交价已按加权平均价合并；来源链接仍指向原始 SEC 文件。</p>
    </section>

    <section class="section">
      <div class="controls">
        <div class="control">
          <label for="personFilter">人员</label>
          <select id="personFilter">
            <option value="all">全部人员</option>
            ${DATA.people.map((person) => `<option value="${person.id}" ${state.person === person.id ? "selected" : ""}>${html(person.name)}</option>`).join("")}
          </select>
        </div>
        <div class="control">
          <label for="actionFilter">行为</label>
          <select id="actionFilter">
            <option value="all">全部行为</option>
            <option value="sale" ${state.action === "sale" ? "selected" : ""}>减持</option>
            <option value="buy" ${state.action === "buy" ? "selected" : ""}>买入</option>
            <option value="award" ${state.action === "award" ? "selected" : ""}>授予/归属</option>
            <option value="other" ${state.action === "other" ? "selected" : ""}>转换/转移/税款</option>
          </select>
        </div>
        <div class="control">
          <label for="searchFilter">关键词</label>
          <input id="searchFilter" type="search" value="${html(state.search)}" placeholder="主体、原因、日期、代码" />
        </div>
        <div class="control">
          <label>当前匹配</label>
          <input value="${filteredTransactions().length} 条" readonly />
        </div>
      </div>
      <div id="transactionResults">${transactionTable(filteredTransactions(), true)}</div>
    </section>
  `);

  document.querySelector("#personFilter").addEventListener("change", (event) => {
    state.person = event.target.value;
    renderTransactions();
  });
  document.querySelector("#actionFilter").addEventListener("change", (event) => {
    state.action = event.target.value;
    renderTransactions();
  });
  document.querySelector("#searchFilter").addEventListener("input", (event) => {
    state.search = event.target.value;
    document.querySelector("#transactionResults").innerHTML = transactionTable(filteredTransactions(), true);
  });
}

function planCard(plan) {
  const person = peopleById.get(plan.personId);
  const statusClass = /尚未/.test(plan.status) ? "sell" : "neutral";
  return `
    <article class="plan-card">
      <span class="badge ${statusClass}">${html(plan.status)}</span>
      <h3>${html(plan.seller)}</h3>
      <p>${html(person?.name || "")}</p>
      <div class="plan-meta">
        <div><span>拟售日</span><strong>${html(plan.approxSaleDate || plan.dateOfNotice)}</strong></div>
        <div><span>拟售股数</span><strong>${fmtShares(plan.plannedShares)}</strong></div>
        <div><span>披露市值</span><strong>${fmtMoney(plan.aggregateMarketValue)}</strong></div>
      </div>
      <p>${html(plan.reason)}</p>
      <div class="chips">
        <span class="chip">隐含价 ${fmtPrice(plan.impliedPrice)}</span>
        <span class="chip">占 Class A ${fmtPct(plan.pctOfOutstandingClassA)}</span>
        ${plan.pastSalesTotalShares ? `<span class="chip">前三个月已售 ${fmtShares(plan.pastSalesTotalShares)} 股</span>` : ""}
        <a class="chip strong" href="${html(plan.source.url)}" target="_blank" rel="noreferrer">SEC 来源</a>
      </div>
    </article>
  `;
}

function filteredPlans() {
  return DATA.plans.filter((plan) => {
    if (state.planStatus === "pending") return /尚未/.test(plan.status);
    if (state.planStatus === "archived") return !/尚未/.test(plan.status);
    return true;
  });
}

function renderPlans() {
  topnavActive("plans");
  app.innerHTML = pageShell(`
    <section class="hero">
      <div class="chips">
        <span class="chip strong">Form 144</span>
        <span class="chip">${DATA.plans.length} 条拟售通知</span>
      </div>
      <h1>已公告拟售计划与执行状态</h1>
      <p class="lede">Form 144 反映拟出售意向、计划或相关安排。页面将 2026-05-11 Ji Xiang Hu Tong 的 VPF 通知标记为未见执行披露；其他历史通知需要与后续 Form 4 对照。</p>
    </section>
    <section class="section">
      <div class="controls">
        <div class="control">
          <label for="planStatus">状态</label>
          <select id="planStatus">
            <option value="all">全部</option>
            <option value="pending" ${state.planStatus === "pending" ? "selected" : ""}>未见执行披露</option>
            <option value="archived" ${state.planStatus === "archived" ? "selected" : ""}>历史/需对照</option>
          </select>
        </div>
      </div>
      <div class="plans-grid">${filteredPlans().map(planCard).join("")}</div>
    </section>
  `);
  document.querySelector("#planStatus").addEventListener("change", (event) => {
    state.planStatus = event.target.value;
    renderPlans();
  });
}

function renderMethodology() {
  topnavActive("methodology");
  app.innerHTML = pageShell(`
    <section class="hero">
      <div class="chips">
        <span class="chip strong">口径说明</span>
        <span class="chip">自动生成于 ${html(DATA.generatedAt.slice(0, 10))}</span>
      </div>
      <h1>计算方法、限制与来源</h1>
      <p class="lede">这份网页适合用作投研底稿索引。涉及持股比例、交易前后金额和拟售状态时，仍应回到 SEC 原始文件复核。</p>
    </section>
    <section class="section">
      <div class="section-head"><h2>关键假设</h2></div>
      <ul class="note-list">
        ${DATA.assumptions.map((item) => `<li>${html(item)}</li>`).join("")}
        <li>“占变动前持股”按 Form 4 对应直接/间接主体的行项目计算；若同一高管还有其他主体持股，该比例不等同于其全部实益持股比例。</li>
        <li>“交易前/后金额”对有成交价的交易使用成交价，对授予、转换和未成交持股使用参考价估算。</li>
      </ul>
    </section>
    <section class="section">
      <div class="section-head"><h2>普通股股本时间线</h2></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>日期</th><th class="number">Class A</th><th class="number">Class B</th><th class="number">合计</th><th>来源</th></tr></thead>
          <tbody>
            ${DATA.shareTimeline.map((row) => `
              <tr>
                <td>${html(row.date)}</td>
                <td class="number">${fmtShares(row.classA)}</td>
                <td class="number">${fmtShares(row.classB)}</td>
                <td class="number">${fmtShares(row.total)}</td>
                <td>${html(row.source)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </section>
    <section class="section">
      <div class="section-head"><h2>主要来源</h2></div>
      <ul class="note-list">
        ${DATA.sources.map((source) => `<li><a class="source-link" href="${html(source.url)}" target="_blank" rel="noreferrer">${html(source.label)}</a></li>`).join("")}
      </ul>
    </section>
  `);
}

function renderRoute() {
  const hash = window.location.hash.replace(/^#/, "") || "overview";
  if (hash.startsWith("person/")) {
    renderPerson(hash.split("/")[1]);
    return;
  }
  if (hash === "transactions") renderTransactions();
  else if (hash === "plans") renderPlans();
  else if (hash === "methodology") renderMethodology();
  else renderOverview();
}

window.addEventListener("hashchange", renderRoute);
renderRoute();
