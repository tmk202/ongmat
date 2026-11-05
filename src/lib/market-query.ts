export type MarketRow = {
  month: string;
  marketplace: string;
  category: string;
  units_sold: number;
  gmv_usd: number;
  orders: number;
  aov_usd: number;
  sellers: number;
  cvr_pct: number;
};

export type Filters = {
  marketplace: string;
  category: string;
  query: string;
};

export type Metric = 'units_sold' | 'orders' | 'gmv_usd' | 'sellers';

export type GroupRow = {
  marketplace: string;
  category: string;
  units_sold: number;
  gmv_usd: number;
  orders: number;
  sellers: number;
  aov_usd: number;
  cvr_pct: number;
  share_pct: number;
  mom_pct: number;
};

export type MonthRow = {
  month: string;
  units_sold: number;
  gmv_usd: number;
  orders: number;
  sellers: number;
  aov_usd: number;
  cvr_pct: number;
  share_pct: number;
};


export function filterRows(rows: MarketRow[], filters: Filters): MarketRow[] {
  const query = filters.query.trim().toLowerCase();

  return rows.filter((row) => {
    if (filters.marketplace !== 'all' && row.marketplace !== filters.marketplace) return false;
    if (filters.category !== 'all' && row.category !== filters.category) return false;
    if (!query) return true;

    const haystack = `${row.marketplace} ${row.category} ${row.month} ${formatMonth(row.month)}`.toLowerCase();
    return haystack.includes(query);
  });
}

export function totals(rows: MarketRow[]) {
  const units = rows.reduce((sum, row) => sum + row.units_sold, 0);
  const gmv = rows.reduce((sum, row) => sum + row.gmv_usd, 0);
  const orders = rows.reduce((sum, row) => sum + row.orders, 0);
  const sellers = rows.reduce((sum, row) => sum + row.sellers, 0);
  const cvr = rows.length ? rows.reduce((sum, row) => sum + row.cvr_pct, 0) / rows.length : 0;

  return {
    units_sold: units,
    gmv_usd: gmv,
    orders,
    sellers,
    aov_usd: orders ? gmv / orders : 0,
    cvr_pct: cvr,
    months: new Set(rows.map((row) => row.month)).size,
  };
}

export function byMonth(rows: MarketRow[], metric: Metric) {
  const map = new Map<string, number>();
  for (const row of rows) {
    map.set(row.month, (map.get(row.month) ?? 0) + row[metric]);
  }
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, value]) => ({ month, value }));
}

export function byMarketCategory(rows: MarketRow[]): GroupRow[] {
  const map = new Map<string, GroupRow & { cvrCount: number; months: Map<string, number> }>();

  for (const row of rows) {
    const key = `${row.marketplace}::${row.category}`;
    const current =
      map.get(key) ??
      ({
        marketplace: row.marketplace,
        category: row.category,
        units_sold: 0,
        gmv_usd: 0,
        orders: 0,
        sellers: 0,
        aov_usd: 0,
        cvr_pct: 0,
        share_pct: 0,
        mom_pct: 0,
        cvrCount: 0,
        months: new Map<string, number>(),
      } as GroupRow & { cvrCount: number; months: Map<string, number> });

    current.units_sold += row.units_sold;
    current.gmv_usd += row.gmv_usd;
    current.orders += row.orders;
    current.sellers += row.sellers;
    current.cvr_pct += row.cvr_pct;
    current.cvrCount += 1;
    current.months.set(row.month, (current.months.get(row.month) ?? 0) + row.units_sold);
    map.set(key, current);
  }

  const groups = [...map.values()];
  const totalUnits = groups.reduce((sum, group) => sum + group.units_sold, 0);
  const months = [...new Set(rows.map((row) => row.month))].sort();
  const last = months.at(-1);
  const prev = months.at(-2);

  return groups
    .map((group) => {
      const lastUnits = last ? group.months.get(last) ?? 0 : 0;
      const prevUnits = prev ? group.months.get(prev) ?? 0 : 0;
      return {
        ...group,
        aov_usd: group.orders ? group.gmv_usd / group.orders : 0,
        cvr_pct: group.cvrCount ? group.cvr_pct / group.cvrCount : 0,
        share_pct: totalUnits ? (group.units_sold / totalUnits) * 100 : 0,
        mom_pct: prevUnits ? ((lastUnits - prevUnits) / prevUnits) * 100 : 0,
      };
    })
    .sort((a, b) => b.units_sold - a.units_sold);
}

export function byMonthDetail(rows: MarketRow[]): MonthRow[] {
  const map = new Map<string, { units: number; gmv: number; orders: number; sellers: number; cvr: number; n: number }>();

  for (const row of rows) {
    const current = map.get(row.month) ?? { units: 0, gmv: 0, orders: 0, sellers: 0, cvr: 0, n: 0 };
    current.units += row.units_sold;
    current.gmv += row.gmv_usd;
    current.orders += row.orders;
    current.sellers += row.sellers;
    current.cvr += row.cvr_pct;
    current.n += 1;
    map.set(row.month, current);
  }

  const totalUnits = [...map.values()].reduce((sum, item) => sum + item.units, 0);

  const sorted = [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  return sorted.map(([month, item], index) => {
    const prevUnits = index > 0 ? sorted[index - 1][1].units : 0;
    return {
      month,
      units_sold: item.units,
      gmv_usd: item.gmv,
      orders: item.orders,
      sellers: item.sellers,
      aov_usd: item.orders ? item.gmv / item.orders : 0,
      cvr_pct: item.n ? item.cvr / item.n : 0,
      share_pct: totalUnits ? (item.units / totalUnits) * 100 : 0,
      mom_pct: prevUnits ? ((item.units - prevUnits) / prevUnits) * 100 : 0,
    };
  });
}

export function formatMoney(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

export function formatCompact(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return String(Math.round(value));
}

export function formatInt(value: number): string {
  return Math.round(value).toLocaleString('en-US');
}

export function formatPct(value: number, digits = 1): string {
  return `${value.toFixed(digits)}%`;
}

export function metricLabel(metric: Metric): string {
  if (metric === 'orders') return 'Orders';
  if (metric === 'sellers') return 'Active sellers';
  if (metric === 'gmv_usd') return 'GMV';
  return 'Units sold';
}

export function formatMetric(value: number, metric: Metric): string {
  return metric === 'gmv_usd' ? formatMoney(value) : formatInt(value);
}

export function formatMonth(month: string): string {
  const [year, m] = month.split('-');
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${names[Number(m) - 1] ?? m} ${String(year).slice(2)}`;
}

export function seriesByMarketplace(rows: MarketRow[]): {
  months: string[];
  series: { name: string; values: number[] }[];
} {
  const months = [...new Set(rows.map((row) => row.month))].sort();
  const index = new Map(months.map((month, i) => [month, i]));
  const markets = [...new Set(rows.map((row) => row.marketplace))].sort();

  const series = markets.map((name) => {
    const values = new Array(months.length).fill(0);
    for (const row of rows) {
      if (row.marketplace === name) {
        values[index.get(row.month) ?? 0] += row.units_sold;
      }
    }
    return { name, values };
  });

  return { months, series };
}
