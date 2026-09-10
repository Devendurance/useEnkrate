import Image from "next/image";

type HeroLandscapeProps = {
  className?: string;
};

export function HeroLandscape({ className }: HeroLandscapeProps) {
  return (
    <div aria-hidden="true" className={className}>
      <Image
        src="/hero/hero-meadow.png"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
      />
      <video
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        poster="/hero/hero-meadow.png"
        tabIndex={-1}
        aria-hidden="true"
        className="hero-background-video absolute inset-0 h-full w-full object-cover object-center"
      >
        <source src="/hero/enkrate.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.84)_0%,rgba(255,255,255,0.7)_44%,rgba(255,255,255,0.45)_64%,rgba(255,255,255,0.12)_80%,rgba(255,255,255,0)_100%)]" />
    </div>
  );
}
