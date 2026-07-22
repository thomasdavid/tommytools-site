(() => {
  "use strict";

  const API_BASE = (window.PROPERTY_TRACKER_CONFIG?.apiBaseUrl || "").replace(/\/$/, "");
  const chart = echarts.init(document.getElementById("trendChart"), null, { renderer: "canvas" });
  const els = Object.fromEntries([
    "liveStatus", "statusDetail", "countySummary", "areaSummary", "bandSummary", "typeSummary",
    "countyOptions", "areaOptions", "bandOptions", "typeOptions", "metricSelect", "statisticSelect",
    "groupSelect", "minCount", "minCountValue", "resetButton", "refreshButton",
    "kpiCount", "kpiSold", "kpiDelta", "kpiMedian", "kpiDeltaLabel",
    "chartTitle", "selectionNote", "chartEmpty", "propertyRows"
  ].map(id => [id, document.getElementById(id)]));

  const state = {
    meta: null,
    counties: new Set(),
    areas: new Set(), // Empty means all areas within the selected counties.
    bands: new Set(),
    propertyTypes: new Set(),
    metric: "delta_pct",
    statistic: "mean",
    groupBy: "asking_band",
    minCount: 2
  };

  const money = new Intl.NumberFormat("en-IE", {
    style: "currency", currency: "EUR", maximumFractionDigits: 0
  });
  const integer = new Intl.NumberFormat("en-IE", { maximumFractionDigits: 0 });
  const percent = new Intl.NumberFormat("en-IE", { maximumFractionDigits: 1, minimumFractionDigits: 1 });

  function apiUrl(path, params = new URLSearchParams()) {
    return `${API_BASE}${path}${params.toString() ? `?${params}` : ""}`;
  }

  async function getJson(path, params) {
    const response = await fetch(apiUrl(path, params), { cache: "no-store" });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return response.json();
  }

  function setStatus(kind, title, detail) {
    els.liveStatus.className = `live-status ${kind || ""}`.trim();
    els.liveStatus.querySelector("strong").textContent = title;
    els.statusDetail.textContent = detail;
  }

  function addRepeated(params, key, values) {
    [...values].forEach(value => params.append(key, value));
  }

  function filterParams() {
    const params = new URLSearchParams();
    addRepeated(params, "counties", state.counties);
    if (state.areas.size) addRepeated(params, "areas", state.areas);
    addRepeated(params, "bands", state.bands);
    addRepeated(params, "property_types", state.propertyTypes);
    return params;
  }

  function trendParams() {
    const params = filterParams();
    params.set("metric", state.metric);
    params.set("statistic", state.statistic);
    params.set("group_by", state.groupBy);
    params.set("min_count", String(state.minCount));
    return params;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function visibleAreas() {
    if (!state.meta) return [];
    const selected = [...state.counties];
    return [...new Set(selected.flatMap(county => state.meta.areas_by_county[county] || []))].sort((a, b) => a.localeCompare(b));
  }

  function reconcileAreas() {
    const allowed = new Set(visibleAreas());
    state.areas = new Set([...state.areas].filter(area => allowed.has(area)));
  }

  function createOptions(container, values, selectedSet, onChange) {
    container.replaceChildren();
    if (!values.length) {
      const empty = document.createElement("span");
      empty.className = "empty-option";
      empty.textContent = "No options available";
      container.append(empty);
      return;
    }
    values.forEach(value => {
      const label = document.createElement("label");
      label.className = "option-item";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.value = value;
      input.checked = selectedSet.has(value);
      input.addEventListener("change", () => {
        input.checked ? selectedSet.add(value) : selectedSet.delete(value);
        onChange?.();
      });
      const span = document.createElement("span");
      span.textContent = value;
      label.append(input, span);
      container.append(label);
    });
  }

  function conciseSelection(selected, total, allLabel) {
    if (selected.size === 0) return "None selected";
    if (selected.size === total.length) return allLabel;
    if (selected.size === 1) return [...selected][0];
    return `${selected.size} selected`;
  }

  function updateSummaries() {
    if (!state.meta) return;
    els.countySummary.textContent = conciseSelection(state.counties, state.meta.counties, "All counties");
    const areas = visibleAreas();
    els.areaSummary.textContent = !state.areas.size
      ? "All areas in selected counties"
      : conciseSelection(state.areas, areas, "All shown areas");
    els.bandSummary.textContent = conciseSelection(state.bands, state.meta.price_bands, "All price bands");
    els.typeSummary.textContent = conciseSelection(state.propertyTypes, state.meta.property_types, "All types");
  }

  function defaultBandSelection(bands) {
    const preferred = new Set(["500-700k", "700-900k", "900-1100k", "1100-1300k"]);
    const available = bands.filter(band => preferred.has(band));
    return new Set(available.length ? available : bands);
  }

  function resetSelections() {
    if (!state.meta) return;
    state.counties = new Set(state.meta.default_counties.length ? state.meta.default_counties : state.meta.counties);
    const availableAreas = new Set(visibleAreas());
    state.areas = new Set(state.meta.default_areas.filter(area => availableAreas.has(area)));
    state.bands = defaultBandSelection(state.meta.price_bands);
    state.propertyTypes = new Set(state.meta.property_types.filter(type => type !== "Other"));
    if (!state.propertyTypes.size) state.propertyTypes = new Set(state.meta.property_types);
    state.metric = "delta_pct";
    state.statistic = "mean";
    state.groupBy = "asking_band";
    state.minCount = 2;
    els.metricSelect.value = state.metric;
    els.statisticSelect.value = state.statistic;
    els.groupSelect.value = state.groupBy;
    els.minCount.value = String(state.minCount);
    els.minCountValue.value = String(state.minCount);
    renderFilterOptions();
  }

  function renderFilterOptions() {
    createOptions(els.countyOptions, state.meta.counties, state.counties, () => {
      reconcileAreas();
      renderFilterOptions();
      applyFilters();
    });
    createOptions(els.areaOptions, visibleAreas(), state.areas, () => {
      updateSummaries();
      applyFilters();
    });
    createOptions(els.bandOptions, state.meta.price_bands, state.bands, () => {
      updateSummaries();
      applyFilters();
    });
    createOptions(els.typeOptions, state.meta.property_types, state.propertyTypes, () => {
      updateSummaries();
      applyFilters();
    });
    updateSummaries();
  }

  function signedMoney(value) {
    if (value == null || !Number.isFinite(value)) return "—";
    const sign = value > 0 ? "+" : "";
    return `${sign}${money.format(value)}`;
  }

  function signedPercent(value) {
    if (value == null || !Number.isFinite(value)) return "—";
    const sign = value > 0 ? "+" : "";
    return `${sign}${percent.format(value)}%`;
  }

  function renderSummary(summary) {
    els.kpiCount.textContent = integer.format(summary.count || 0);
    els.kpiSold.textContent = summary.average_sold_price == null ? "—" : money.format(summary.average_sold_price);
    const useEuro = state.metric === "delta_eur";
    els.kpiDelta.textContent = useEuro ? signedMoney(summary.average_delta_eur) : signedPercent(summary.average_delta_pct);
    els.kpiMedian.textContent = useEuro ? signedMoney(summary.median_delta_eur) : signedPercent(summary.median_delta_pct);
    els.kpiDeltaLabel.textContent = useEuro ? "Sold minus asking price" : "Sold minus asking, as %";
  }

  function chartValue(value) {
    if (value == null) return "—";
    return state.metric === "delta_eur" ? signedMoney(value) : signedPercent(value);
  }

  function monthLabel(month) {
    const date = new Date(`${month}-01T00:00:00Z`);
    return new Intl.DateTimeFormat("en-IE", { month: "short", year: "numeric", timeZone: "UTC" }).format(date);
  }

  function renderChart(payload) {
    const months = [...new Set(payload.series.flatMap(series => series.points.map(point => point.month)))].sort();
    const bySeries = payload.series.map(series => {
      const pointMap = new Map(series.points.map(point => [point.month, point]));
      return {
        name: series.name,
        type: "line",
        smooth: 0.22,
        symbol: "circle",
        symbolSize: 7,
        connectNulls: false,
        emphasis: { focus: "series" },
        lineStyle: { width: 3 },
        data: months.map(month => {
          const point = pointMap.get(month);
          return point ? { value: point.value, count: point.count, month } : null;
        }),
        markLine: {
          silent: true,
          symbol: "none",
          label: { show: false },
          lineStyle: { color: "#9aa8b0", type: "dashed", width: 1 },
          data: [{ yAxis: 0 }]
        }
      };
    });

    const hasPoints = payload.series.some(series => series.points.length);
    els.chartEmpty.hidden = hasPoints;
    document.getElementById("trendChart").hidden = !hasPoints;
    if (!hasPoints) {
      chart.clear();
      return;
    }

    const metricTitle = state.metric === "delta_eur" ? "euro difference" : "percentage difference";
    const statTitle = state.statistic === "mean" ? "Average" : "Median";
    els.chartTitle.textContent = `${statTitle} monthly ${metricTitle}`;

    chart.setOption({
      animationDuration: 450,
      textStyle: { fontFamily: "Inter, system-ui, sans-serif", color: "#17202a" },
      grid: { left: 76, right: 28, top: 56, bottom: 74 },
      legend: { top: 4, type: "scroll", textStyle: { color: "#4f5f68" } },
      tooltip: {
        trigger: "axis",
        confine: true,
        backgroundColor: "rgba(23,32,42,.96)",
        borderWidth: 0,
        textStyle: { color: "#fff" },
        formatter(items) {
          if (!items.length) return "";
          const heading = `<strong>${monthLabel(items[0].axisValue)}</strong>`;
          const lines = items.filter(item => item.data).map(item => {
            const count = item.data.count === 1 ? "1 sale" : `${item.data.count} sales`;
            return `${item.marker}${escapeHtml(item.seriesName)}: <strong>${chartValue(item.data.value)}</strong> <span style="opacity:.65">(${count})</span>`;
          });
          return [heading, ...lines].join("<br>");
        }
      },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: months,
        axisLabel: { formatter: monthLabel, color: "#647180", hideOverlap: true },
        axisLine: { lineStyle: { color: "#cfd9de" } },
        axisTick: { show: false }
      },
      yAxis: {
        type: "value",
        name: state.metric === "delta_eur" ? "Sold − asking (€)" : "Sold − asking (%)",
        nameTextStyle: { color: "#647180", padding: [0, 0, 8, 0] },
        axisLabel: {
          color: "#647180",
          formatter: value => state.metric === "delta_eur" ? money.format(value) : `${value.toFixed(1)}%`
        },
        splitLine: { lineStyle: { color: "#e7edef" } }
      },
      dataZoom: [{ type: "inside", zoomOnMouseWheel: false }, { type: "slider", height: 20, bottom: 18, borderColor: "transparent", backgroundColor: "#eef3f4", fillerColor: "rgba(14,91,118,.15)" }],
      series: bySeries
    }, true);
  }

  function renderProperties(payload) {
    if (!payload.items.length) {
      els.propertyRows.innerHTML = '<tr><td colspan="8" class="loading-cell">No properties match the current filters.</td></tr>';
      return;
    }
    els.propertyRows.innerHTML = payload.items.map(row => {
      const deltaClass = row.delta_eur > 0 ? "delta-positive" : row.delta_eur < 0 ? "delta-negative" : "";
      const date = row.sale_date ? new Intl.DateTimeFormat("en-IE", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${row.sale_date}T00:00:00`)) : "—";
      const address = escapeHtml(row.address || "Address unavailable");
      const addressCell = row.detail_url?.startsWith("http") ? `<a href="${escapeHtml(row.detail_url)}" target="_blank" rel="noopener">${address}</a>` : address;
      return `<tr>
        <td class="numeric">${date}</td>
        <td class="address">${addressCell}</td>
        <td>${escapeHtml(row.county || "Other")}</td>
        <td>${escapeHtml(row.area || "Other")}</td>
        <td>${escapeHtml(row.broad_property_type || row.property_type || "Unknown")}</td>
        <td class="numeric">${row.asking_price_eur == null ? "—" : money.format(row.asking_price_eur)}</td>
        <td class="numeric">${row.sold_price_eur == null ? "—" : money.format(row.sold_price_eur)}</td>
        <td class="numeric ${deltaClass}">${row.delta_eur == null ? "—" : signedMoney(row.delta_eur)}</td>
      </tr>`;
    }).join("");
  }

  function selectionDescription() {
    const countyText = state.counties.size === state.meta.counties.length ? "all counties" : `${state.counties.size} count${state.counties.size === 1 ? "y" : "ies"}`;
    const areaText = state.areas.size ? `${state.areas.size} area${state.areas.size === 1 ? "" : "s"}` : "all areas in selected counties";
    const bandText = `${state.bands.size} price band${state.bands.size === 1 ? "" : "s"}`;
    const typeText = `${state.propertyTypes.size} property type${state.propertyTypes.size === 1 ? "" : "s"}`;
    return `${countyText} · ${areaText} · ${bandText} · ${typeText} · minimum ${state.minCount} sale${state.minCount === 1 ? "" : "s"} per point`;
  }

  async function applyFilters() {
    if (!state.meta) return;
    if (!state.counties.size || !state.bands.size || !state.propertyTypes.size) {
      renderSummary({ count: 0 });
      renderChart({ series: [] });
      renderProperties({ items: [] });
      els.selectionNote.textContent = "Select at least one county, price band and property type.";
      return;
    }

    els.refreshButton.disabled = true;
    els.refreshButton.textContent = "Loading…";
    els.selectionNote.textContent = selectionDescription();
    try {
      const [summary, trends, properties] = await Promise.all([
        getJson("/api/summary", filterParams()),
        getJson("/api/trends", trendParams()),
        getJson("/api/properties", (() => { const p = filterParams(); p.set("limit", "100"); return p; })())
      ]);
      renderSummary(summary);
      renderChart(trends);
      renderProperties(properties);
      const latest = state.meta.latest_sale_date ? `Latest sale ${state.meta.latest_sale_date}` : "Data loaded";
      setStatus("ready", "Data connected", `${integer.format(summary.count || 0)} selected · ${latest}`);
    } catch (error) {
      console.error(error);
      setStatus("error", "Data unavailable", "Check the Render API deployment and configuration");
      els.selectionNote.textContent = `API error: ${error.message}`;
      els.propertyRows.innerHTML = '<tr><td colspan="8" class="loading-cell">The dashboard could not reach the property API.</td></tr>';
      chart.clear();
    } finally {
      els.refreshButton.disabled = false;
      els.refreshButton.textContent = "Refresh data";
    }
  }

  function attachEvents() {
    els.metricSelect.addEventListener("change", () => { state.metric = els.metricSelect.value; applyFilters(); });
    els.statisticSelect.addEventListener("change", () => { state.statistic = els.statisticSelect.value; applyFilters(); });
    els.groupSelect.addEventListener("change", () => { state.groupBy = els.groupSelect.value; applyFilters(); });
    els.minCount.addEventListener("input", () => { state.minCount = Number(els.minCount.value); els.minCountValue.value = String(state.minCount); });
    els.minCount.addEventListener("change", applyFilters);
    els.refreshButton.addEventListener("click", applyFilters);
    els.resetButton.addEventListener("click", () => { resetSelections(); applyFilters(); });

    document.querySelectorAll("[data-select-all]").forEach(button => button.addEventListener("click", () => {
      const key = button.dataset.selectAll;
      if (key === "counties") state.counties = new Set(state.meta.counties);
      if (key === "areas") state.areas = new Set(visibleAreas());
      if (key === "bands") state.bands = new Set(state.meta.price_bands);
      if (key === "propertyTypes") state.propertyTypes = new Set(state.meta.property_types);
      reconcileAreas();
      renderFilterOptions();
      applyFilters();
    }));
    document.querySelectorAll("[data-clear]").forEach(button => button.addEventListener("click", () => {
      const key = button.dataset.clear;
      state[key] = new Set();
      if (key === "counties") state.areas = new Set();
      renderFilterOptions();
      applyFilters();
    }));

    document.addEventListener("click", event => {
      document.querySelectorAll("details.filter-menu[open]").forEach(details => {
        if (!details.contains(event.target)) details.removeAttribute("open");
      });
    });
    window.addEventListener("resize", () => chart.resize());
  }

  async function initialise() {
    attachEvents();
    try {
      state.meta = await getJson("/api/meta");
      resetSelections();
      const run = state.meta.last_run;
      const detail = run ? `Last scrape ${run.status} · ${run.listings_seen || 0} listings checked` : "Database ready; no scrape recorded yet";
      setStatus("ready", "Data service online", detail);
      await applyFilters();
    } catch (error) {
      console.error(error);
      setStatus("error", "API not configured", `Expected ${API_BASE || "an API URL"}`);
      els.countySummary.textContent = "Unavailable";
      els.areaSummary.textContent = "Unavailable";
      els.bandSummary.textContent = "Unavailable";
      els.typeSummary.textContent = "Unavailable";
      els.selectionNote.textContent = "Deploy the Render service, then check config.js if the generated hostname differs.";
      els.propertyRows.innerHTML = '<tr><td colspan="8" class="loading-cell">Complete the Render deployment to load live data.</td></tr>';
      chart.clear();
    }
  }

  initialise();
})();
