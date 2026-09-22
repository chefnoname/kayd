import type { LandingDictionary } from "../types";

// Somali copy — have a native speaker review before launch.
export const so: LandingDictionary = {
  meta: {
    title: "Kayd — Barnaamijyo lagula socdo ganacsigaaga, laguu habeeyey",
    description:
      "Kayd waxay dhistaa barnaamijyo gaar ah oo lagula socdo kaydka alaabta, socodka lacagta, macaamiisha iyo xisaabaadka. Ballanso wicitaan hordhac ah.",
  },
  nav: {
    kaydOriginal: "Kayd Original",
    whatWeBuild: "Waxa aanu dhisno",
    howItWorks: "Sida ay u shaqeyso",
    bookCall: "Ballanso wicitaan",
    logIn: "Soo gal",
    languageLabel: "Luqadda",
  },
  hero: {
    eyebrow: "Barnaamij la socod oo laguu habeeyey",
    title: { before: "Ganacsigaaga, ", accent: "la soco", after: " sidaad rabto." },
    lead: "Kayd waxay naqshadeysaa oo dhistaa barnaamijyo lagula socdo ganacsigaaga, loona habeeyey sida uu dhab ahaan u shaqeeyo — kaydka alaabta, socodka lacagta, macaamiisha iyo xisaabaadka. Hal wicitaan kadib, waxaanu qorsheyn doonnaa barnaamijka kuu habboon.",
    ctaPrimary: "Ballanso wicitaan hordhac ah",
    ctaSecondary: "Eeg waxa aanu dhisnay",
  },
  showcase: {
    eyebrow: "Tusaale · Kayd Original",
    title: "Loo dhisay xawaaladda. Caddayn waxa aanu dhisno.",
    lead: "Kayd Original waxay maamushaa xafiisyada dhexe ee shirkadaha xawaaladda Soomaaliyeed — iyada oo la socota lacag kasta oo soo gasha iyo mid kasta oo baxda, wakiilka haya, iyo inta lagu leeyahay sicirka maalinta.",
    videoLabel: "Muuqaal ku saabsan Kayd Original",
    features: [
      "Sicirka maalinta oo hal mar la dejiyo, kuna dhaqma macaamil kasta",
      "Haraaga tooska ah ee wakiil kasta, laan kasta iyo xafiis kasta",
      "Dhigaalka, xisaab-xiridda iyo lacagta jidka ku jirta oo hal buug ku wada jira",
      "Xiritaanka dhammaadka maalinta oo muujiya farqiga ka hor saxiixa",
    ],
  },
  whatWeBuild: {
    eyebrow: "Waxa aanu dhisno",
    title: "Hal nidaam. Loo habeeyey ganacsigaaga.",
    lead: "Haddii aad wareejiso alaab, lacag ama labadaba, Kayd waxaanu u qaabeynaa diiwaannada ganacsigaagu ku tiirsan yahay.",
    capabilities: [
      {
        title: "Kaydka alaabta",
        body: "Ogow waxa kuu yaal, waxa socda iyo waxa sii dhammaanaya — bakhaar kasta, dukaan kasta ama gaari kasta.",
        examples: ["Heerka kaydka", "Alaabta soo gasha / baxda", "Dalabaadka alaab-qeybiyeyaasha"],
      },
      {
        title: "Socodka lacagta & xisaabaadka",
        body: "Lacagta soo gasha, tan baxda iyo waxa lagugu leeyahay — maalin walba la isku dheellitiro si buugaagtaadu aysan bil uga dambeyn.",
        examples: ["Xiritaanka maalinta", "Sicirka & faa'iidada", "Buugaagta xisaabta"],
      },
      {
        title: "Maareynta macaamiisha & wakiillada",
        body: "Macmiil kasta, wakiil kasta iyo shariig kasta hal meel, haraagooda iyo taariikhdooda oo hal gujin kuu jira.",
        examples: ["Haraaga", "Bayaannada xisaabta", "Doorarka kooxda"],
      },
      {
        title: "Warbixinno kuu habboon",
        body: "Tirooyinka ganacsigaagu dhab ahaan ku socdo, loo habeeyey sida aad horeba ugu fekerto.",
        examples: ["Shaashadda guud", "Soo dejin", "Raadka hubinta"],
      },
    ],
  },
  howItWorks: {
    eyebrow: "Sida ay u shaqeyso",
    title: "Hal wicitaan ilaa barnaamijkaaga.",
    steps: [
      {
        title: "Ballanso wicitaan hordhac ah",
        body: "Noo sheeg sida ganacsigaagu u shaqeeyo — waxa aad maanta la socoto, meesha uu ku kaydsan yahay, iyo waxa had iyo jeer khaldama.",
      },
      {
        title: "Waxaanu qaabeynaa hab-shaqadaada",
        body: "Wadahadalkaas waxaanu u beddelnaa qorshe: shaashadaha, diiwaannada iyo hubinta ay kooxdaadu u baahan tahay.",
      },
      {
        title: "Waxaanu dhisnaa Kayd-kaaga",
        body: "Barnaamij la socod oo ku habboon ganacsigaaga, ammaan ah oo ay isticmaali karaan dad badan laga bilaabo maalinta koowaad — sida Kayd Original.",
      },
    ],
  },
  cta: {
    title: "Aan dhisno barnaamijka ganacsigaagu dhab ahaan u baahan yahay.",
    lead: "Ballanso wicitaan hordhac ah. Waanu ku dhageysan doonnaa, su'aalaha saxda ah ayaanu ku weydiin doonnaa, waxaanuna ku tusi doonnaa sida Kayd kuugu ekaan karto.",
    button: "Ballanso wicitaan hordhac ah",
  },
  footer: { tagline: "Barnaamij la socod oo laguu habeeyey." },
};
