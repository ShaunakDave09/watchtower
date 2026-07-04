export default function OpportunityCard({ label, html }: { label: string; html: string }) {
  return (
    <div className="rounded-xl bg-[var(--color-dark)] px-5 py-[18px]">
      <div className="font-mono text-[10px] tracking-[0.07em] text-[#c9a68a]">{label}</div>
      <div
        className="mt-2 text-[14px] leading-[1.45] text-white"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
