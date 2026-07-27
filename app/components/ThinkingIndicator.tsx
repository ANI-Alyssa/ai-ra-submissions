export function ThinkingIndicator({ label = "ANI is reviewing" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      {label}
      <span className="inline-flex items-end gap-1">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white" />
      </span>
    </span>
  );
}
