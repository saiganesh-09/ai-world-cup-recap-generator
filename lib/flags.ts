// Country name → ISO-3166 alpha-2 code for locally-hosted flag PNGs.
// Flags live in /public/flags/{code}.png (downloaded from flagcdn.com —
// national flag designs are public-domain-safe for factual use).

const COUNTRY_TO_CODE: Record<string, string> = {
  Argentina: "ar",
  France: "fr",
  Croatia: "hr",
  Morocco: "ma",
  Brazil: "br",
  England: "gb-eng",
  Netherlands: "nl",
  Japan: "jp",
  Spain: "es",
  Germany: "de",
  Portugal: "pt",
  "Saudi Arabia": "sa",
  Mexico: "mx",
  Poland: "pl",
  Australia: "au",
  Denmark: "dk",
  Tunisia: "tn",
  Serbia: "rs",
  Switzerland: "ch",
  Cameroon: "cm",
  "South Korea": "kr",
  Iran: "ir",
  "United States": "us",
  Wales: "gb-wls",
  Senegal: "sn",
  Ecuador: "ec",
  Qatar: "qa",
  "Costa Rica": "cr",
  Ghana: "gh",
  Uruguay: "uy",
  Belgium: "be",
  Canada: "ca",
  India: "in",
  Nigeria: "ng",
};

export function flagUrlFor(country: string): string | null {
  const code = COUNTRY_TO_CODE[country];
  return code ? `/flags/${code}.png` : null;
}
