// Yer tutucu: ilgili ekran sonraki görevlerde gerçek sayfayla değişir.
export function Placeholder({ title }: { title: string }) {
  return (
    <section>
      <h1>{title}</h1>
      <p>Bu ekran yakında geliyor.</p>
    </section>
  );
}
