/**
 * FC CAREER 27 — Monde CP : nations (sélections nationales).
 * Code FIFA à 3 lettres → nom français, drapeau, confédération.
 */

export interface Nation { id: string; name: string; flag: string; conf: "UEFA" | "CONMEBOL" | "CAF" | "AFC" | "CONCACAF" | "OFC" }

const N = (id: string, name: string, flag: string, conf: Nation["conf"]): Nation => ({ id, name, flag, conf });

export const NATIONS: Nation[] = [
  // UEFA
  N("ENG", "Angleterre", "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "UEFA"), N("ESP", "Espagne", "🇪🇸", "UEFA"), N("FRA", "France", "🇫🇷", "UEFA"),
  N("ITA", "Italie", "🇮🇹", "UEFA"), N("GER", "Allemagne", "🇩🇪", "UEFA"), N("POR", "Portugal", "🇵🇹", "UEFA"),
  N("NED", "Pays-Bas", "🇳🇱", "UEFA"), N("BEL", "Belgique", "🇧🇪", "UEFA"), N("CRO", "Croatie", "🇭🇷", "UEFA"),
  N("SUI", "Suisse", "🇨🇭", "UEFA"), N("AUT", "Autriche", "🇦🇹", "UEFA"), N("DEN", "Danemark", "🇩🇰", "UEFA"),
  N("NOR", "Norvège", "🇳🇴", "UEFA"), N("SWE", "Suède", "🇸🇪", "UEFA"), N("POL", "Pologne", "🇵🇱", "UEFA"),
  N("CZE", "Tchéquie", "🇨🇿", "UEFA"), N("SVK", "Slovaquie", "🇸🇰", "UEFA"), N("SRB", "Serbie", "🇷🇸", "UEFA"),
  N("SVN", "Slovénie", "🇸🇮", "UEFA"), N("HUN", "Hongrie", "🇭🇺", "UEFA"), N("UKR", "Ukraine", "🇺🇦", "UEFA"),
  N("TUR", "Turquie", "🇹🇷", "UEFA"), N("GRE", "Grèce", "🇬🇷", "UEFA"), N("SCO", "Écosse", "🏴󠁧󠁢󠁳󠁣󠁴󠁿", "UEFA"),
  N("WAL", "Pays de Galles", "🏴󠁧󠁢󠁷󠁬󠁳󠁿", "UEFA"), N("IRL", "Irlande", "🇮🇪", "UEFA"), N("NIR", "Irlande du Nord", "🇬🇧", "UEFA"),
  N("MDA", "Moldavie", "🇲🇩", "UEFA"), N("AND", "Andorre", "🇦🇩", "UEFA"), N("KAZ", "Kazakhstan", "🇰🇿", "UEFA"), N("ISL", "Islande", "🇮🇸", "UEFA"), N("FIN", "Finlande", "🇫🇮", "UEFA"), N("ALB", "Albanie", "🇦🇱", "UEFA"),
  N("KOS", "Kosovo", "🇽🇰", "UEFA"), N("MKD", "Macédoine du Nord", "🇲🇰", "UEFA"), N("BIH", "Bosnie-Herzégovine", "🇧🇦", "UEFA"),
  N("MNE", "Monténégro", "🇲🇪", "UEFA"), N("ROU", "Roumanie", "🇷🇴", "UEFA"), N("BUL", "Bulgarie", "🇧🇬", "UEFA"),
  N("GEO", "Géorgie", "🇬🇪", "UEFA"), N("ARM", "Arménie", "🇦🇲", "UEFA"), N("ISR", "Israël", "🇮🇱", "UEFA"),
  N("RUS", "Russie", "🇷🇺", "UEFA"), N("LUX", "Luxembourg", "🇱🇺", "UEFA"), N("EST", "Estonie", "🇪🇪", "UEFA"),
  N("LTU", "Lituanie", "🇱🇹", "UEFA"), N("LVA", "Lettonie", "🇱🇻", "UEFA"), N("CYP", "Chypre", "🇨🇾", "UEFA"),
  N("MLT", "Malte", "🇲🇹", "UEFA"), N("FRO", "Îles Féroé", "🇫🇴", "UEFA"), N("AZE", "Azerbaïdjan", "🇦🇿", "UEFA"),
  // CONMEBOL
  N("BRA", "Brésil", "🇧🇷", "CONMEBOL"), N("ARG", "Argentine", "🇦🇷", "CONMEBOL"), N("URU", "Uruguay", "🇺🇾", "CONMEBOL"),
  N("COL", "Colombie", "🇨🇴", "CONMEBOL"), N("ECU", "Équateur", "🇪🇨", "CONMEBOL"), N("PAR", "Paraguay", "🇵🇾", "CONMEBOL"),
  N("CHI", "Chili", "🇨🇱", "CONMEBOL"), N("PER", "Pérou", "🇵🇪", "CONMEBOL"), N("VEN", "Venezuela", "🇻🇪", "CONMEBOL"),
  N("BOL", "Bolivie", "🇧🇴", "CONMEBOL"),
  // CAF
  N("SEN", "Sénégal", "🇸🇳", "CAF"), N("CIV", "Côte d'Ivoire", "🇨🇮", "CAF"), N("MAR", "Maroc", "🇲🇦", "CAF"),
  N("ALG", "Algérie", "🇩🇿", "CAF"), N("TUN", "Tunisie", "🇹🇳", "CAF"), N("EGY", "Égypte", "🇪🇬", "CAF"),
  N("NGA", "Nigeria", "🇳🇬", "CAF"), N("GHA", "Ghana", "🇬🇭", "CAF"), N("CMR", "Cameroun", "🇨🇲", "CAF"),
  N("MLI", "Mali", "🇲🇱", "CAF"), N("GUI", "Guinée", "🇬🇳", "CAF"), N("COD", "RD Congo", "🇨🇩", "CAF"),
  N("CGO", "Congo", "🇨🇬", "CAF"), N("GAB", "Gabon", "🇬🇦", "CAF"), N("BFA", "Burkina Faso", "🇧🇫", "CAF"),
  N("CPV", "Cap-Vert", "🇨🇻", "CAF"), N("GNB", "Guinée-Bissau", "🇬🇼", "CAF"), N("ZAM", "Zambie", "🇿🇲", "CAF"),
  N("RSA", "Afrique du Sud", "🇿🇦", "CAF"), N("ANG", "Angola", "🇦🇴", "CAF"), N("BEN", "Bénin", "🇧🇯", "CAF"),
  N("TOG", "Togo", "🇹🇬", "CAF"), N("GAM", "Gambie", "🇬🇲", "CAF"), N("MTN", "Mauritanie", "🇲🇷", "CAF"),
  N("COM", "Comores", "🇰🇲", "CAF"), N("MAD", "Madagascar", "🇲🇬", "CAF"), N("EQG", "Guinée équatoriale", "🇬🇶", "CAF"),
  N("KEN", "Kenya", "🇰🇪", "CAF"), N("ZIM", "Zimbabwe", "🇿🇼", "CAF"), N("CTA", "Centrafrique", "🇨🇫", "CAF"),
  N("BDI", "Burundi", "🇧🇮", "CAF"), N("LBY", "Libye", "🇱🇾", "CAF"), N("MOZ", "Mozambique", "🇲🇿", "CAF"),
  N("NIG", "Niger", "🇳🇪", "CAF"), N("SLE", "Sierra Leone", "🇸🇱", "CAF"), N("TAN", "Tanzanie", "🇹🇿", "CAF"), N("NAM", "Namibie", "🇳🇦", "CAF"), N("UGA", "Ouganda", "🇺🇬", "CAF"), N("MWI", "Malawi", "🇲🇼", "CAF"),
  N("HAI", "Haïti", "🇭🇹", "CONCACAF"),
  // CONCACAF
  N("USA", "États-Unis", "🇺🇸", "CONCACAF"), N("MEX", "Mexique", "🇲🇽", "CONCACAF"), N("CAN", "Canada", "🇨🇦", "CONCACAF"),
  N("JAM", "Jamaïque", "🇯🇲", "CONCACAF"), N("CRC", "Costa Rica", "🇨🇷", "CONCACAF"), N("PAN", "Panama", "🇵🇦", "CONCACAF"),
  N("HON", "Honduras", "🇭🇳", "CONCACAF"), N("GLP", "Guadeloupe", "🇬🇵", "CONCACAF"), N("MTQ", "Martinique", "🇲🇶", "CONCACAF"),
  N("SUR", "Suriname", "🇸🇷", "CONCACAF"), N("CUW", "Curaçao", "🇨🇼", "CONCACAF"), N("DOM", "Rép. dominicaine", "🇩🇴", "CONCACAF"),
  N("BRB", "Barbade", "🇧🇧", "CONCACAF"), N("LCA", "Sainte-Lucie", "🇱🇨", "CONCACAF"), N("TRI", "Trinité-et-Tobago", "🇹🇹", "CONCACAF"),
  // AFC / OFC
  N("JPN", "Japon", "🇯🇵", "AFC"), N("KOR", "Corée du Sud", "🇰🇷", "AFC"), N("AUS", "Australie", "🇦🇺", "AFC"),
  N("IRN", "Iran", "🇮🇷", "AFC"), N("KSA", "Arabie saoudite", "🇸🇦", "AFC"), N("QAT", "Qatar", "🇶🇦", "AFC"),
  N("UZB", "Ouzbékistan", "🇺🇿", "AFC"), N("IRQ", "Irak", "🇮🇶", "AFC"), N("CHN", "Chine", "🇨🇳", "AFC"),
  N("IDN", "Indonésie", "🇮🇩", "AFC"), N("JOR", "Jordanie", "🇯🇴", "AFC"), N("PHI", "Philippines", "🇵🇭", "AFC"),
  N("THA", "Thaïlande", "🇹🇭", "AFC"), N("LBN", "Liban", "🇱🇧", "AFC"), N("SYR", "Syrie", "🇸🇾", "AFC"), N("UAE", "Émirats arabes unis", "🇦🇪", "AFC"),
  N("NZL", "Nouvelle-Zélande", "🇳🇿", "OFC"),
];

export const NATION_BY_ID: Record<string, Nation> = Object.fromEntries(NATIONS.map(n => [n.id, n]));
