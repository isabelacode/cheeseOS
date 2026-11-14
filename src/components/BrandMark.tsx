import Image from "next/image";

/** The cheeseOS mascot head, used wherever the product shows its mark. */
export function BrandMark({ size = 40, className = "" }: { size?: number; className?: string }) {
  return (
    <Image
      src="/brand/icon.png"
      alt=""
      width={size}
      height={size}
      className={`select-none ${className}`}
      draggable={false}
    />
  );
}
