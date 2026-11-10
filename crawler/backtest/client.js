export function createTikTokClient({ baseUrl, retries = 3, retryDelayMs = 100 }) {
  const stats = { requests: 0, retries: 0, failures: 0 };

  async function request(path) {
    let attempt = 0;
    while (true) {
      attempt += 1;
      stats.requests += 1;
      const response = await fetch(`${baseUrl}${path}`, { headers: { Accept: 'application/json' } });
      if (response.status === 429 || response.status === 503) {
        if (attempt > retries) {
          stats.failures += 1;
          throw new Error(`retry_exhausted_${response.status}`);
        }
        stats.retries += 1;
        const retryAfter = Number(response.headers.get('retry-after') || 0) * 1000;
        await new Promise((resolve) => setTimeout(resolve, retryAfter || retryDelayMs * attempt));
        continue;
      }
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || `http_${response.status}`);
      }
      return response.json();
    }
  }

  async function getProduct(id) {
    const product = await request(`/v1/products/${encodeURIComponent(id)}`);
    const observed = new Date();
    return {
      date: observed.toISOString().slice(0, 10),
      platform: 'tiktok',
      item_id: String(product.id),
      shop_id: String(product.shop_id),
      market: 'VN',
      title: product.title,
      price: Number(product.price || 0),
      units_sold_month: Number(product.sold_30d || 0),
      units_sold_total: Number(product.sold_total || 0),
      rating: Number(product.rating || 0),
      stock_total: Number(product.stock || 0),
      category_l1: product.category || null,
      observed_at: observed.toISOString(),
    };
  }

  async function search(query, page = 1, size = 2) {
    return request(`/v1/search?q=${encodeURIComponent(query)}&page=${page}&size=${size}`);
  }

  return { getProduct, search, stats };
}
