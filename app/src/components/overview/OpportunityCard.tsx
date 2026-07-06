export default function OpportunityCard({ label, html }: { label: string; html: string }) {
  return (
    <div className="rounded-xl bg-[var(--color-callout)] px-5 py-[12px]">
      <div className="font-mono text-[10px] tracking-[0.07em] text-[#c9a68a]">{label}</div>
      <div
        className="mt-1 text-[13px] leading-[1.35] text-white"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
