/** Yangilik matni: bo'sh qator — yangi xatboshi, oddiy qator — qator ko'chishi (HTML yo'q). */
export function NewsBody({ text, className }: { text: string; className?: string }) {
  return (
    <div className={className}>
      {text.split(/\n{2,}/).map((para, i) => (
        <p key={i} className="whitespace-pre-line">
          {para}
        </p>
      ))}
    </div>
  );
}
