import { act, renderHook, waitFor } from '@testing-library/react';
import { ApiError } from '../api/client';
import { useApi } from './useApi';

test('starts loading, then gives the data', async () => {
  const { result } = renderHook(() => useApi(async () => 'merhaba', []));
  expect(result.current.loading).toBe(true);
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.data).toBe('merhaba');
  expect(result.current.error).toBeUndefined();
});

test('a failing load gives the ApiError and no data', async () => {
  const { result } = renderHook(() =>
    useApi(async () => {
      throw new ApiError(500, 'server_error', 'Sunucu hatası.');
    }, []),
  );
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.error?.message).toBe('Sunucu hatası.');
  expect(result.current.data).toBeUndefined();
});

test('reload runs the load again', async () => {
  let count = 0;
  const { result } = renderHook(() => useApi(async () => ++count, []));
  await waitFor(() => expect(result.current.data).toBe(1));
  act(() => result.current.reload());
  await waitFor(() => expect(result.current.data).toBe(2));
});

test('changing the dependencies loads again and an old slow answer is ignored', async () => {
  const resolvers: Record<string, (v: string) => void> = {};
  const load = (key: string) => new Promise<string>((resolve) => (resolvers[key] = resolve));
  const { result, rerender } = renderHook(({ key }) => useApi(() => load(key), [key]), { initialProps: { key: 'a' } });
  rerender({ key: 'b' });
  await act(async () => {
    resolvers.b('B');
  });
  await act(async () => {
    resolvers.a('A');
  });
  expect(result.current.data).toBe('B');
});

test('changing the dependencies hides the old data right away while the new load is pending', async () => {
  const resolvers: Record<string, (v: string) => void> = {};
  const load = (key: string) => new Promise<string>((resolve) => (resolvers[key] = resolve));
  const { result, rerender } = renderHook(({ key }) => useApi(() => load(key), [key]), { initialProps: { key: 'a' } });
  await act(async () => {
    resolvers.a('A');
  });
  expect(result.current.data).toBe('A');

  rerender({ key: 'b' });
  // Yeni istek bitmeden eski günün/haftanın verisi gösterilmez.
  expect(result.current.data).toBeUndefined();
  expect(result.current.loading).toBe(true);

  await act(async () => {
    resolvers.b('B');
  });
  expect(result.current.data).toBe('B');
  expect(result.current.loading).toBe(false);
});

test('reload keeps the old data on screen while the same request runs again', async () => {
  let count = 0;
  const pending: Array<(v: number) => void> = [];
  const { result } = renderHook(() =>
    useApi(
      () =>
        new Promise<number>((resolve) => {
          count += 1;
          pending.push(resolve);
        }),
      [],
    ),
  );
  await act(async () => {
    pending[0](1);
  });
  expect(result.current.data).toBe(1);
  act(() => result.current.reload());
  expect(result.current.data).toBe(1);
  expect(result.current.loading).toBe(true);
  await act(async () => {
    pending[1](2);
  });
  expect(result.current.data).toBe(2);
  expect(count).toBe(2);
});
