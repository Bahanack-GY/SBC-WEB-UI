import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Progressive reveal over an already-loaded list.
 *
 * The directory endpoint has no pagination — one call returns every shop — so
 * paging must happen client-side. That is also what keeps the API quiet: one
 * request, cached, and scrolling costs nothing.
 *
 * Returns a ref to attach to a sentinel element at the end of the list.
 */
export function useInfiniteReveal<T>(items: T[], pageSize = 12) {
  const [count, setCount] = useState(pageSize);
  const sentinel = useRef<HTMLDivElement | null>(null);

  // Reset when the underlying list changes (search / filter).
  useEffect(() => {
    setCount(pageSize);
  }, [items, pageSize]);

  const hasMore = count < items.length;

  const loadMore = useCallback(() => {
    setCount((c) => Math.min(c + pageSize, items.length));
  }, [pageSize, items.length]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasMore) return;

    // IntersectionObserver rather than a scroll listener: no layout thrash,
    // and it self-throttles.
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) loadMore();
      },
      { rootMargin: '200px' }, // start loading just before it comes into view
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  return { visible: items.slice(0, count), hasMore, sentinel, loadMore };
}
