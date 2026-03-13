import type { CtaSectionProps } from "../cms/components";

export default function CtaSection({ title, subtitle, decorativeImage }: CtaSectionProps) {
  return (
    <section className="cta">
      {decorativeImage && <img src={decorativeImage} alt="" className="cta-decor" />}
      <h2>{title}</h2>
      {subtitle && <p>{subtitle}</p>}
    </section>
  );
}
