export interface CtaSectionProps {
  title: string;
  subtitle: string;
  decorativeImage: string;
  [key: string]: unknown;
}

export interface PageHeroProps {
  title: string;
  backgroundImage: string;
  ctaText: string;
  ctaTo: string;
  [key: string]: unknown;
}

export interface SplitSectionProps {
  imagePosition: "left" | "right";
  imageSrc: string;
  imageAlt: string;
  title: string;
  text: string;
  [key: string]: unknown;
}

export type ComponentRegistry = {
  CtaSection: CtaSectionProps;
  PageHero: PageHeroProps;
  SplitSection: SplitSectionProps;
};

export type ComponentName = keyof ComponentRegistry;

export type Section = {
  [K in ComponentName]: { component: K; props: ComponentRegistry[K] }
}[ComponentName];
