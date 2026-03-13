import type { SplitSectionProps } from "../cms/components";

export default function SplitSection({ imagePosition, imageSrc, imageAlt, title, text }: SplitSectionProps) {
  return (
    <section className={`split split--${imagePosition}`}>
      <img src={imageSrc} alt={imageAlt} className="split-image" />
      <div className="split-body">
        <h2>{title}</h2>
        <p>{text}</p>
      </div>
    </section>
  );
}
