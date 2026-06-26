import Image from "next/image";

interface BrandLogoProps {
  className?: string;
  variant?: "full" | "icon-only";
  width?: number;
  height?: number;
}

export const BrandLogo = ({ 
  className = "", 
  variant = "full",
  width = 300,
  height = 80
}: BrandLogoProps) => {
  const logoSrc = "/assets/logo_final.png";
  
  if (variant === "icon-only") {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <Image
          src={logoSrc}
          alt="CyberAgent Studio"
          width={width}
          height={height}
          priority
          className="h-16 w-auto object-contain"
        />
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Image
        src={logoSrc}
        alt="CyberAgent Studio"
        width={width}
        height={height}
        priority
        className="h-20 w-auto object-contain"
      />
      <span className="font-bold text-lg text-slate-900">CyberAgent Studio</span>
    </div>
  );
};
