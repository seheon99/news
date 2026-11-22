import type { ReactNode } from "react";

export function SwipeHint({
  icon,
  label,
  className,
  opacity,
  armed,
  settling,
}: {
  icon: ReactNode;
  label: string;
  className: string;
  opacity: number;
  armed: boolean;
  settling: boolean;
}) {
  return (
    <div
      aria-hidden="true"
      style={{ opacity }}
      className={`pointer-events-none absolute inset-0 flex items-center rounded-[20px] px-8 text-white ${settling ? "transition-opacity duration-180 motion-reduce:transition-none" : ""} ${className}`}
    >
      <div
        className={`flex flex-col items-center gap-2 transition-transform duration-150 [&>svg]:size-9 ${armed ? "scale-125" : ""}`}
      >
        {icon}
        <span className="text-lg font-bold">{label}</span>
      </div>
    </div>
  );
}
