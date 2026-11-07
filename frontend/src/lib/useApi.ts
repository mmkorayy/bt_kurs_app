import { useEffect, useRef, useState } from 'react';
import { ApiError } from '../api/client';

export interface UseApiResult<T> {
  data: T | undefined;
  loading: boolean;
  error: ApiError | undefined;
  reload(): void;
}

/**
 * `load` ilk çizimde ve `deps` değişince çalışır; `reload()` aynı isteği yeniden yapar.
 * Eski ve yavaş gelen bir cevap, daha yeni bir istek başladıysa yok sayılır.
 */
export function useApi<T>(load: () => Promise<T>, deps: unknown[]): UseApiResult<T> {
  const [state, setState] = useState<{ data?: T; loading: boolean; error?: ApiError }>({ loading: true });
  const [version, setVersion] = useState(0);
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    let current = true;
    setState((previous) => ({ data: previous.data, loading: true }));
    loadRef.current().then(
      (data) => {
        if (current) setState({ data, loading: false });
      },
      (error: unknown) => {
        if (!current) return;
        const apiError = error instanceof ApiError ? error : new ApiError(0, 'unknown', 'Bir şeyler ters gitti.');
        setState({ loading: false, error: apiError });
      },
    );
    return () => {
      current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, version]);

  return { data: state.data, loading: state.loading, error: state.error, reload: () => setVersion((v) => v + 1) };
}
