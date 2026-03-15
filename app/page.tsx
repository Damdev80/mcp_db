export default function Home() {
  return (
    <div className="min-h-screen px-6 py-8 md:px-10">
      <main className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl flex-col justify-between rounded-3xl border border-gray-200 bg-white p-8 shadow-[0_1px_0_0_rgba(17,17,17,0.04)] md:p-12">
        <header className="flex items-center justify-between border-b border-gray-100 pb-6">
          <p className="text-sm font-medium tracking-[0.2em] text-gray-500">QUERY</p>
          <p className="text-xs text-gray-500">Base de datos conversacional</p>
        </header>

        <section className="grid gap-12 py-10 md:grid-cols-[1.4fr_1fr] md:items-end">
          <div className="space-y-6">
            <h1 className="text-5xl font-semibold leading-tight tracking-tight text-black md:text-6xl">
              Conversa con tus datos
              <br />
              sin escribir SQL
            </h1>
            <p className="max-w-2xl text-base leading-relaxed text-gray-600 md:text-lg">
              Pregunta en lenguaje natural, recibe respuestas claras y explora tu base de datos en segundos.
              Diseñado para flujos rápidos, sin ruido visual y con foco total en la información.
            </p>
            <div className="pt-2">
              <a
                href="/chat"
                className="inline-flex items-center rounded-xl border border-gray-300 bg-white px-7 py-3 text-sm font-medium text-gray-900 transition hover:bg-gray-50"
              >
                Iniciar conversación
              </a>
            </div>
          </div>

          <div className="space-y-4 border-l border-gray-200 pl-6">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-gray-500">Lo que puedes hacer</p>
            <ul className="space-y-3 text-sm text-gray-700">
              <li>Consultar conteos, estados y métricas operativas.</li>
              <li>Pedir listados y luego hacer preguntas de seguimiento.</li>
              <li>Analizar costos y rendimiento sin cambiar de pantalla.</li>
            </ul>
          </div>
        </section>

        <footer className="grid gap-4 border-t border-gray-100 pt-6 text-sm text-gray-500 md:grid-cols-3">
          <p>Minimalista</p>
          <p>Rápido</p>
          <p>Natural</p>
        </footer>
      </main>
    </div>
  );
}
