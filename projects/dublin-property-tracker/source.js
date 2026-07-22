(() => {
  "use strict";

  const API_BASE = (window.PROPERTY_TRACKER_CONFIG?.apiBaseUrl || "").replace(/\/$/, "");
  const limit = 100;
  let offset = 0;
  let total = 0;
  let meta = null;

  const els = Object.fromEntries([
    "sourceStatus", "sourceStatusDetail", "sourceCount", "sourceCounty", "sourceArea",
    "sourceBand", "sourceType", "sourceSearch", "sourceApply", "sourceReset",
    "sourceDownload", "sourcePrevious", "sourceNext", "sourcePage", "sourceRows"
  ].map(id => [id, document.getElementById(id)]));

  const money = new Intl.NumberFormat("en-IE", {
    style: "currency", currency: "EUR", maximumFractionDigits: 0
  });
  const integer = new Intl.NumberFormat("en-IE", { maximumFractionDigits: 0 });
  const percent = new Intl.NumberFormat("en-IE", { maximumFractionDigits: 1, minimumFractionDigits: 1 });

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function setStatus(kind, title, detail) {
    els.sourceStatus.className = `live-status ${kind || ""}`.trim();
    els.sourceStatus.querySelector("strong").textContent = title;
    els.sourceStatusDetail.textContent = detail;
  }

  function apiUrl(path, params = new URLSearchParams()) {
    return `${API_BASE}${path}${params.toString() ? `?${params}` : ""}`;
  }

  async function getJson(path, params) {
    const response = await fetch(apiUrl(path, params), { cache: "no-store" });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return response.json();
  }

  function addOptions(select, values, firstLabel) {
    select.replaceChildren(new Option(firstLabel, ""));
    values.forEach(value => select.add(new Option(value, value)));
  }

  function updateAreaOptions() {
    const current = els.sourceArea.value;
    const county = els.sourceCounty.value;
    const areas = county
      ? (meta.areas_by_county[county] || [])
      : meta.areas;
    addOptions(els.sourceArea, areas, "All areas");
    if (areas.includes(current)) els.sourceArea.value = current;
  }

  function filterParams(includePaging = true) {
    const params = new URLSearchParams();
    if (els.sourceCounty.value) params.append("counties", els.sourceCounty.value);
    if (els.sourceArea.value) params.append("areas", els.sourceArea.value);
    if (els.sourceBand.value) params.append("bands", els.sourceBand.value);
    if (els.sourceType.value) params.append("property_types", els.sourceType.value);
    if (els.sourceSearch.value.trim()) params.set("search", els.sourceSearch.value.trim());
    if (includePaging) {
      params.set("limit", String(limit));
      params.set("offset", String(offset));
    }
    return params;
  }

  function formatDate(value) {
    if (!value) return "—";
    return new Intl.DateTimeFormat("en-IE", {
      day: "2-digit", month: "short", year: "numeric"
    }).format(new Date(`${value}T00:00:00`));
  }

  function formatTimestamp(value) {
    if (!value) return "—";
    return new Intl.DateTimeFormat("en-IE", {
      day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
    }).format(new Date(value));
  }

  function signedMoney(value) {
    if (value == null || !Number.isFinite(value)) return "—";
    return `${value > 0 ? "+" : ""}${money.format(value)}`;
  }

  function signedPercent(value) {
    if (value == null || !Number.isFinite(value)) return "—";
    return `${value > 0 ? "+" : ""}${percent.format(value)}%`;
  }

  function renderRows(items) {
    if (!items.length) {
      els.sourceRows.innerHTML = '<tr><td colspan="14" class="loading-cell">No records match these filters.</td></tr>';
      return;
    }
    els.sourceRows.innerHTML = items.map(row => {
      const address = escapeHtml(row.address || "Address unavailable");
      const linkedAddress = row.detail_url?.startsWith("http")
        ? `<a href="${escapeHtml(row.detail_url)}" target="_blank" rel="noopener">${address}</a>`
        : address;
      const deltaClass = row.delta_eur > 0 ? "delta-positive" : row.delta_eur < 0 ? "delta-negative" : "";
      return `<tr>
        <td class="numeric">${formatDate(row.sale_date)}</td>
        <td>${escapeHtml(row.county || "Other")}</td>
        <td>${escapeHtml(row.area || "Other")}</td>
        <td class="address">${linkedAddress}</td>
        <td>${escapeHtml(row.property_type || "Unknown")}</td>
        <td>${escapeHtml(row.broad_property_type || "Other")}</td>
        <td class="numeric">${row.bedrooms ?? "—"}</td>
        <td class="numeric">${row.bathrooms ?? "—"}</td>
        <td class="numeric">${row.size_sqm == null ? "—" : row.size_sqm}</td>
        <td class="numeric">${row.asking_price_eur == null ? "—" : money.format(row.asking_price_eur)}</td>
        <td class="numeric">${row.sold_price_eur == null ? "—" : money.format(row.sold_price_eur)}</td>
        <td class="numeric ${deltaClass}">${signedMoney(row.delta_eur)}</td>
        <td class="numeric ${deltaClass}">${signedPercent(row.delta_pct)}</td>
        <td class="numeric">${formatTimestamp(row.scraped_at)}</td>
      </tr>`;
    }).join("");
  }

  function updatePaging() {
    const page = Math.floor(offset / limit) + 1;
    const pages = Math.max(1, Math.ceil(total / limit));
    els.sourcePage.textContent = `Page ${page} of ${pages}`;
    els.sourcePrevious.disabled = offset === 0;
    els.sourceNext.disabled = offset + limit >= total;
    const start = total ? offset + 1 : 0;
    const end = Math.min(offset + limit, total);
    els.sourceCount.textContent = `${integer.format(start)}–${integer.format(end)} of ${integer.format(total)} records`;
  }

  async function loadRows() {
    els.sourceRows.innerHTML = '<tr><td colspan="14" class="loading-cell">Loading source records…</td></tr>';
    try {
      const payload = await getJson("/api/properties", filterParams(true));
      total = payload.total || 0;
      renderRows(payload.items || []);
      updatePaging();
      els.sourceDownload.href = apiUrl("/api/export.csv", filterParams(false));
      setStatus("ready", "Source data connected", `${integer.format(total)} matching records`);
    } catch (error) {
      console.error(error);
      setStatus("error", "Source data unavailable", error.message);
      els.sourceRows.innerHTML = '<tr><td colspan="14" class="loading-cell">The source-data API could not be reached.</td></tr>';
    }
  }

  function resetFilters() {
    els.sourceCounty.value = "";
    updateAreaOptions();
    els.sourceArea.value = "";
    els.sourceBand.value = "";
    els.sourceType.value = "";
    els.sourceSearch.value = "";
    offset = 0;
    loadRows();
  }

  function attachEvents() {
    els.sourceCounty.addEventListener("change", () => {
      updateAreaOptions();
      offset = 0;
    });
    els.sourceApply.addEventListener("click", () => {
      offset = 0;
      loadRows();
    });
    els.sourceReset.addEventListener("click", resetFilters);
    els.sourceSearch.addEventListener("keydown", event => {
      if (event.key === "Enter") {
        offset = 0;
        loadRows();
      }
    });
    els.sourcePrevious.addEventListener("click", () => {
      offset = Math.max(0, offset - limit);
      loadRows();
    });
    els.sourceNext.addEventListener("click", () => {
      if (offset + limit < total) offset += limit;
      loadRows();
    });
  }

  async function initialise() {
    attachEvents();
    try {
      meta = await getJson("/api/meta");
      addOptions(els.sourceCounty, meta.counties, "All counties");
      updateAreaOptions();
      addOptions(els.sourceBand, meta.price_bands, "All price bands");
      addOptions(els.sourceType, meta.property_types, "All property types");
      await loadRows();
    } catch (error) {
      console.error(error);
      setStatus("error", "API not configured", `Expected ${API_BASE || "an API URL"}`);
      els.sourceRows.innerHTML = '<tr><td colspan="14" class="loading-cell">Complete the Render deployment to review source data.</td></tr>';
    }
  }

  initialise();
})();
