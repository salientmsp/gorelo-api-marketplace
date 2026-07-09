/**
 * Pagination normalization. The public surface always returns Halo's envelope
 * shape, regardless of provider. Gorelo returns bare unpaginated arrays, so we
 * synthesize the envelope client-side.
 */

/** Halo-style paged list envelope, keyed by the resource's plural name. */
export type HaloPage<T> = { record_count: number } & Record<string, T[] | number>;

export interface PageParams {
  page_no?: number;
  page_size?: number;
}

/**
 * Wrap a full array in Halo's envelope, applying client-side paging when
 * `page_no`/`page_size` are supplied (Gorelo cannot page server-side).
 *
 * @param key   the plural resource key Halo uses (e.g. `"clients"`)
 * @param items the full result set from the backend
 * @param params optional client-side paging window
 */
export function toHaloPage<T>(key: string, items: T[], params?: PageParams): HaloPage<T> {
  const total = items.length;
  let windowed = items;
  if (params?.page_size && params.page_size > 0) {
    const page = params.page_no && params.page_no > 0 ? params.page_no : 1;
    const start = (page - 1) * params.page_size;
    windowed = items.slice(start, start + params.page_size);
  }
  return { record_count: total, [key]: windowed } as HaloPage<T>;
}
