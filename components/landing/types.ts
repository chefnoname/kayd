export type Locale = "en" | "so";

export type Capability = {
  title: string;
  body: string;
  examples: string[];
};

export type Step = {
  title: string;
  body: string;
};

export type LandingDictionary = {
  meta: { title: string; description: string };
  nav: {
    kaydOriginal: string;
    whatWeBuild: string;
    howItWorks: string;
    bookCall: string;
    logIn: string;
    languageLabel: string;
  };
  hero: {
    eyebrow: string;
    /** Headline split so the accent word can be highlighted in either word order. */
    title: { before: string; accent: string; after: string };
    lead: string;
    ctaPrimary: string;
    ctaSecondary: string;
  };
  showcase: {
    eyebrow: string;
    title: string;
    lead: string;
    videoLabel: string;
    features: string[];
  };
  whatWeBuild: {
    eyebrow: string;
    title: string;
    lead: string;
    capabilities: Capability[];
  };
  howItWorks: {
    eyebrow: string;
    title: string;
    steps: Step[];
  };
  cta: { title: string; lead: string; button: string };
  footer: { tagline: string };
};
