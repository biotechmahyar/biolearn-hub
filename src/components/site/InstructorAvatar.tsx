import { accent } from "@/lib/format";
import { cn } from "@/lib/utils";

export function InstructorAvatar({
  name,
  accent: key,
  className,
  photoUrl,
}: {
  name: string;
  accent?: string | null;
  className?: string;
  photoUrl?: string | null;
}) {
  const a = accent(key);
  const initials = name
    .replace("دکتر ", "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join(" ");

  if (photoUrl) {
    return (
      <span
        className={cn(
          "inline-flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full shadow-sm",
          className,
        )}
      >
        <img
          src={photoUrl}
          alt={name}
          className="size-full object-cover"
          draggable={false}
        />
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-xs font-bold text-white shadow-sm",
        a.grad,
        className,
      )}
    >
      {initials}
    </span>
  );
}
