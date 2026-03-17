import { cn } from "@/lib/utils";

type SectionCardProps = {
  children: React.ReactNode;
  className?: string;
};

export function SectionCard({ children, className }: SectionCardProps) {
  return (
    <section
      className={cn(
        "rounded-[28px] border border-white/12 bg-[linear-gradient(180deg,rgba(11,21,42,0.92),rgba(8,12,24,0.92))] p-6 shadow-[0_24px_120px_rgba(4,7,17,0.35)] backdrop-blur",
        className,
      )}
    >
      {children}
    </section>
  );
}

