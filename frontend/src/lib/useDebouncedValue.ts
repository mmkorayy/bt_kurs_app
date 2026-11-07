import { useEffect, useState } from 'react';

/** `value` değişince `ms` kadar bekler; bu sürede yeni değer gelmezse onu döndürür. */
export function useDebouncedValue<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return debounced;
}
