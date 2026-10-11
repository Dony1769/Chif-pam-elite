export default function GlobalLoading() {
  return (
    <div className="fixed inset-0 z-[180] flex items-center justify-center bg-[#020617]">
      <div className="flex flex-col items-center gap-4">
        <div className="absolute h-28 w-28 rounded-full bg-emerald-500/20 blur-3xl" />
        <svg
          viewBox="0 0 100 100"
          className="relative h-18 w-18 animate-[spin_2s_linear_infinite]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M75 35.5C71.5 28.5 64.2 24 56 24C41.6 24 30 35.6 30 50C30 64.4 41.6 76 56 76C66.5 76 75.5 69.8 79.5 61"
            stroke="#10B981"
            strokeWidth="10"
            strokeLinecap="round"
          />
          <path
            d="M55 45L76 24M76 24H58M76 24V42"
            stroke="#10B981"
            strokeWidth="10"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-300">Chargement</p>
      </div>
    </div>
  );
}
