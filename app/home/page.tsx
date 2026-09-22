import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Inter, Outfit } from "next/font/google";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { KaydLogo } from "@/components/landing/KaydLogo";
import {
  LANG_COOKIE,
  getDictionary,
  resolveLocale,
} from "@/components/landing/i18n";
import styles from "./page.module.css";

const display = Outfit({
  subsets: ["latin"],
  weight: ["600", "800", "900"],
  variable: "--font-display",
});

const body = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
});

// Set CALENDLY_URL in Vercel to the real booking link.
const CALENDLY_URL = process.env.CALENDLY_URL ?? "https://calendly.com/umrah_support/kayd-consultation";

type HomePageProps = {
  searchParams: { lang?: string | string[] };
};

function localeFor(searchParams: HomePageProps["searchParams"]) {
  return resolveLocale(searchParams.lang, cookies().get(LANG_COOKIE)?.value);
}

export function generateMetadata({ searchParams }: HomePageProps): Metadata {
  const locale = localeFor(searchParams);
  const { meta } = getDictionary(locale);
  return {
    title: meta.title,
    description: meta.description,
    alternates: {
      languages: { en: "/home?lang=en", so: "/home?lang=so" },
    },
  };
}

export default function HomePage({ searchParams }: HomePageProps) {
  const locale = localeFor(searchParams);
  const t = getDictionary(locale);

  return (
    <div
      lang={locale}
      className={`${styles.page} ${display.variable} ${body.variable}`}
    >
      <LandingHeader calendlyUrl={CALENDLY_URL} locale={locale} t={t.nav} />

      <main>
        {/* Hero */}
        <section className={styles.hero}>
          <div className={styles.container}>
            <p className={styles.eyebrow}>{t.hero.eyebrow}</p>
            <h1 className={styles.heroTitle}>
              {t.hero.title.before}
              <span className={styles.heroAccent}>{t.hero.title.accent}</span>
              {t.hero.title.after}
            </h1>
            <p className={styles.heroLead}>{t.hero.lead}</p>
            <div className={styles.heroActions}>
              <a
                href={CALENDLY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.ctaPrimary}
              >
                {t.hero.ctaPrimary}
              </a>
              <a href="#kayd-original" className={styles.ctaSecondary}>
                {t.hero.ctaSecondary}
              </a>
            </div>
          </div>
        </section>

        {/* Kayd Original showcase */}
        <section id="kayd-original" className={styles.showcase}>
          <div className={styles.container}>
            <div className={styles.showcaseHead}>
              <p className={styles.eyebrowOnDark}>{t.showcase.eyebrow}</p>
              <h2 className={styles.showcaseTitle}>{t.showcase.title}</h2>
              <p className={styles.showcaseLead}>{t.showcase.lead}</p>
            </div>

            <figure className={styles.videoFrame}>
              <video
                className={styles.video}
                src="/home/kayd-original.mp4"
                poster="/home/kayd-original-poster.jpg"
                controls
                playsInline
                preload="none"
                width={1920}
                height={1080}
                aria-label={t.showcase.videoLabel}
              />
            </figure>

            <ul className={styles.featureList}>
              {t.showcase.features.map((feature) => (
                <li key={feature} className={styles.featureItem}>
                  <span className={styles.featureTick} aria-hidden="true">
                    ✓
                  </span>
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* What we build */}
        <section id="what-we-build" className={styles.section}>
          <div className={styles.container}>
            <p className={styles.eyebrow}>{t.whatWeBuild.eyebrow}</p>
            <h2 className={styles.sectionTitle}>{t.whatWeBuild.title}</h2>
            <p className={styles.sectionLead}>{t.whatWeBuild.lead}</p>

            <div className={styles.cardGrid}>
              {t.whatWeBuild.capabilities.map((capability) => (
                <article key={capability.title} className={styles.card}>
                  <h3 className={styles.cardTitle}>{capability.title}</h3>
                  <p className={styles.cardBody}>{capability.body}</p>
                  <ul className={styles.chipList}>
                    {capability.examples.map((example) => (
                      <li key={example} className={styles.chip}>
                        {example}
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className={styles.sectionTinted}>
          <div className={styles.container}>
            <p className={styles.eyebrow}>{t.howItWorks.eyebrow}</p>
            <h2 className={styles.sectionTitle}>{t.howItWorks.title}</h2>

            <ol className={styles.steps}>
              {t.howItWorks.steps.map((step, index) => (
                <li key={step.title} className={styles.step}>
                  <span className={styles.stepNumber}>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className={styles.stepTitle}>{step.title}</h3>
                  <p className={styles.stepBody}>{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Closing CTA */}
        <section className={styles.ctaBand}>
          <div className={`${styles.container} ${styles.ctaInner}`}>
            <h2 className={styles.ctaTitle}>{t.cta.title}</h2>
            <p className={styles.ctaLead}>{t.cta.lead}</p>
            <a
              href={CALENDLY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.ctaOnDark}
            >
              {t.cta.button}
            </a>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={`${styles.container} ${styles.footerInner}`}>
          <KaydLogo tone="light" />
          <p className={styles.footerNote}>
            © {new Date().getFullYear()} Kayd. {t.footer.tagline}
          </p>
        </div>
      </footer>
    </div>
  );
}
