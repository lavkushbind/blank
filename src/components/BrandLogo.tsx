import Image from "next/image";

type BrandLogoProps = {
  className?: string;
  label?: string;
};

/** The shared BlankLearn mark used across app navigation and loading states. */
export function BrandLogo({ className = "", label = "BlankLearn" }: BrandLogoProps) {
  return (
    <Image src="/logo.png" alt={label} width={240} height={240} className={className} />
  );
}
