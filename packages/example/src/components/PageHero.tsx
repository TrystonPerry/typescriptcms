import type { PageHeroProps } from "../cms/components";

export default function PageHero({ title, backgroundImage, ctaText, ctaTo }: PageHeroProps) {
  return (
    <section
      className="hero"
      style={{ backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined }}
    >
      <div className="hero-content">
        <h1>{title}</h1>
        {ctaText && <a href={ctaTo} className="cta-button">{ctaText}</a>}
      </div>
    </section>
  );
}
