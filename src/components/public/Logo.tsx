import { IconScissors } from "@/components/ui/Icons";

/** Logotipo tipográfico de MORÉN. Si el propietario dispone del logotipo oficial, puede sustituirse aquí. */
export function Logo({ size = "md" }: { size?: "md" | "lg" }) {
  return (
    <span className="inline-flex flex-col items-center leading-none">
      <span className={`flex items-center gap-2 font-display tracking-[0.35em] text-gold ${size === "lg" ? "text-5xl sm:text-7xl" : "text-xl"}`}>
        <IconScissors className={size === "lg" ? "h-7 w-7 rotate-[-30deg]" : "h-4 w-4 rotate-[-30deg]"} />
        MORÉN
      </span>
      <span className={`mt-1 uppercase text-ash ${size === "lg" ? "text-[11px] tracking-[0.5em] sm:text-sm" : "text-[8px] tracking-[0.35em]"}`}>
        Peluquería de caballeros
      </span>
    </span>
  );
}
