/**
 * Prénoms et noms pour les joueurs INVENTÉS du monde CP (effectifs complétés,
 * régénérés, jeunes du centre). Aucune correspondance voulue avec des personnes réelles.
 */

export const NAME_POOLS: Record<string, { first: string[]; last: string[] }> = {
  ENG: {
    first: ["Oliver", "Harry", "Jack", "Charlie", "George", "Alfie", "Freddie", "Theo", "Archie", "Leo", "Ethan", "Callum", "Kieran", "Reece", "Jamie", "Tyler", "Mason", "Lewis", "Ryan", "Josh", "Danny", "Connor", "Toby", "Rhys", "Jordan", "Kai", "Ollie", "Sam", "Ben", "Max"],
    last: ["Whitfield", "Hargreaves", "Pemberton", "Ashworth", "Blackwood", "Cartwright", "Fairbairn", "Hollins", "Kettering", "Langley", "Marston", "Northcott", "Oakden", "Prescott", "Radford", "Shelton", "Thornbury", "Underwood", "Wakefield", "Yardley", "Brennan", "Coulson", "Dawlish", "Ellery", "Foxley", "Grantham", "Hulme", "Ingram", "Jessop", "Kirkby"],
  },
  ESP: {
    first: ["Álvaro", "Pablo", "Sergio", "Hugo", "Adrián", "Iker", "Marcos", "Rubén", "Unai", "Javi", "Diego", "Raúl", "Óscar", "Mario", "Carlos", "Dani", "Aitor", "Jon", "Miguel", "Gonzalo", "Nacho", "Pau", "Íñigo", "Rodrigo", "Andrés"],
    last: ["Arroyo", "Benítez", "Cabañas", "Delgado", "Escribano", "Ferrero", "Galindo", "Hidalgo", "Iturralde", "Jurado", "Lozano", "Manzanares", "Navarrete", "Olmedo", "Pizarro", "Quintana", "Robledo", "Sarmiento", "Toledano", "Urquijo", "Valdés", "Zamorano", "Aranda", "Barrios", "Cuevas"],
  },
  ITA: {
    first: ["Lorenzo", "Matteo", "Alessandro", "Riccardo", "Federico", "Tommaso", "Davide", "Simone", "Gabriele", "Edoardo", "Andrea", "Nicolò", "Filippo", "Luca", "Marco", "Pietro", "Giacomo", "Samuele", "Emanuele", "Daniele"],
    last: ["Bertolini", "Castellano", "D'Ambrosio", "Ferraresi", "Galletti", "Lombardo", "Marchetti", "Nardelli", "Orlandini", "Pellegatti", "Quaranta", "Rinaldi", "Santoro", "Tedeschi", "Valentini", "Zanetti", "Albertini", "Brambilla", "Cattaneo", "De Santis"],
  },
  GER: {
    first: ["Lukas", "Jonas", "Leon", "Finn", "Paul", "Niklas", "Felix", "Tim", "Jan", "Moritz", "Maximilian", "Elias", "Noah", "Ben", "Tom", "Julian", "Simon", "Malte", "Hannes", "Florian"],
    last: ["Achterberg", "Brückner", "Dietrich", "Engelhardt", "Falkenberg", "Grünwald", "Hartung", "Kessler", "Lindner", "Meinhardt", "Neuhaus", "Oberländer", "Pfeiffer", "Reinhold", "Schaller", "Theissen", "Vogler", "Wendland", "Zeidler", "Kranz"],
  },
  FRA: {
    first: ["Lucas", "Hugo", "Théo", "Nathan", "Enzo", "Mathis", "Maxime", "Romain", "Kylian", "Yanis", "Ilyes", "Rayan", "Adam", "Bastien", "Clément", "Quentin", "Axel", "Baptiste", "Mehdi", "Moussa", "Ibrahima", "Samuel", "Killian", "Noah", "Évan"],
    last: ["Aubert", "Bellanger", "Chauvin", "Delattre", "Esnault", "Fabregue", "Guérin", "Hamelin", "Joubert", "Lacombe", "Marchal", "Nivelle", "Perrot", "Rouxel", "Sauvage", "Tessier", "Vasseur", "Delaunay", "Kanté-Diallo", "Traoré-Lemaire", "Bamba", "Koné", "Cissé", "Sissoko", "Diaby"],
  },
  POR: {
    first: ["João", "Tiago", "Rúben", "Diogo", "Gonçalo", "Rafael", "André", "Pedro", "Nuno", "Francisco"],
    last: ["Carvalhal", "Figueiredo", "Magalhães", "Pinheiro", "Quaresma", "Sequeira", "Teixeira", "Valadares", "Amorim", "Brandão"],
  },
  BRA: {
    first: ["Gabriel", "Matheus", "Lucas", "Vitor", "Igor", "Caio", "Thiago", "Rafael", "Bruno", "Wesley", "Kauã", "Endrick", "Luan", "Danilo", "Renan"],
    last: ["Albuquerque", "Bastos", "Cavalcanti", "Damasceno", "Esteves", "Fagundes", "Guimarães", "Holanda", "Leitão", "Moraes", "Nogueira", "Rezende", "Siqueira", "Tavares", "Vieira"],
  },
  ARG: {
    first: ["Santiago", "Thiago", "Facundo", "Nicolás", "Agustín", "Valentín", "Lautaro", "Joaquín", "Tomás", "Franco"],
    last: ["Benedetto", "Cardozo", "Etcheverry", "Gallardo", "Iglesias", "Larrea", "Medina", "Ocampo", "Paredes", "Sosa"],
  },
  NED: {
    first: ["Daan", "Sem", "Lars", "Bram", "Jesse", "Thijs", "Ruben", "Milan", "Stijn", "Joep"],
    last: ["van Dalen", "de Groot", "Hendriksen", "Jansma", "Kuipers", "van Leeuwen", "Mulder", "Peeters", "Smit", "Visser"],
  },
  BEL: {
    first: ["Arthur", "Louis", "Jules", "Victor", "Mathis", "Wout", "Seppe", "Lander", "Robbe", "Kobe"],
    last: ["Claes", "Dewulf", "Goossens", "Janssens", "Lambrecht", "Maes", "Peeters", "Raes", "Vermeulen", "Wouters"],
  },
  SEN: {
    first: ["Mamadou", "Cheikh", "Ousmane", "Pape", "Abdou", "Moustapha", "Ibrahima", "Lamine", "Babacar", "Saliou"],
    last: ["Ndiaye", "Diop", "Sow", "Faye", "Gueye", "Mbaye", "Sarr", "Diallo", "Ba", "Niang"],
  },
  CIV: {
    first: ["Yao", "Serge", "Ange", "Jean-Eudes", "Wilfried", "Franck", "Seko", "Ismaël", "Karim", "Bénie"],
    last: ["Kouadio", "Koffi", "Yao", "Bamba", "Gbamin", "N'Guessan", "Kouamé", "Zahui", "Aké", "Ouattara"],
  },
  MAR: {
    first: ["Youssef", "Achraf", "Hakim", "Amine", "Ilias", "Soufiane", "Anass", "Zakaria", "Bilal", "Oussama"],
    last: ["El Amrani", "Benali", "Chakir", "El Idrissi", "Haddadi", "Lamrani", "Ouazzani", "Tahiri", "Zerouali", "Bennani"],
  },
  NGA: {
    first: ["Chidi", "Emeka", "Tunde", "Ademola", "Samuel", "Victor", "Kelechi", "Femi", "Uche", "Bright"],
    last: ["Okafor", "Adeyemi", "Nwosu", "Balogun", "Eze", "Ogunleye", "Okonkwo", "Adebayo", "Nnadi", "Afolabi"],
  },
  DEN: {
    first: ["Mads", "Magnus", "Oliver", "Rasmus", "Frederik", "Mikkel", "Anders", "Jonas", "Emil", "Lucas"],
    last: ["Kristiansen", "Lauridsen", "Mortensen", "Nygaard", "Østergaard", "Poulsen", "Rasmussen", "Sørensen", "Thygesen", "Vestergaard"],
  },
  NOR: {
    first: ["Sander", "Kristian", "Eirik", "Henrik", "Jonas", "Mathias", "Sondre", "Tobias", "Vetle", "Aksel"],
    last: ["Bakken", "Dahl", "Haugen", "Johansen", "Lunde", "Moen", "Nygård", "Solberg", "Strand", "Vik"],
  },
  CRO: {
    first: ["Luka", "Ivan", "Marko", "Josip", "Ante", "Mateo", "Petar", "Dominik", "Filip", "Toni"],
    last: ["Babić", "Horvat", "Jurić", "Kovačević", "Marić", "Novak", "Pavlović", "Šarić", "Tomić", "Vuković"],
  },
  SRB: {
    first: ["Nikola", "Stefan", "Lazar", "Nemanja", "Uroš", "Vuk", "Strahinja", "Aleksa", "Miloš", "Andrija"],
    last: ["Jovanović", "Petrović", "Nikolić", "Stojanović", "Marković", "Đorđević", "Ilić", "Lukić", "Pavlović", "Simić"],
  },
  JPN: {
    first: ["Haruto", "Sota", "Yuto", "Ren", "Kaito", "Takumi", "Ryo", "Daiki", "Kenta", "Shun"],
    last: ["Takahashi", "Watanabe", "Yamamoto", "Nakamura", "Kobayashi", "Kato", "Yoshida", "Matsumoto", "Inoue", "Kimura"],
  },
  USA: {
    first: ["Tyler", "Brandon", "Cole", "Jaden", "Caleb", "Owen", "Logan", "Wyatt", "Dylan", "Chase"],
    last: ["Anderson", "Brooks", "Carter", "Dalton", "Ellis", "Foster", "Grant", "Hayes", "Mitchell", "Parker"],
  },
  GHA: {
    first: ["Kwame", "Kofi", "Yaw", "Kwabena", "Ebenezer", "Emmanuel", "Isaac", "Joseph", "Prince", "Michael"],
    last: ["Mensah", "Boateng", "Owusu", "Asante", "Agyemang", "Ofori", "Appiah", "Darko", "Frimpong", "Amankwah"],
  },
  CMR: {
    first: ["Jean", "Bryan", "Christian", "Junior", "Olivier", "Frank", "Arnaud", "Eric", "Joël", "Martin"],
    last: ["Mbarga", "Ngadeu", "Tchakounté", "Ekambi", "Onana", "Nkoudou", "Bassogog", "Mbia", "Nlend", "Etoundi"],
  },
  ALG: {
    first: ["Yacine", "Riyad", "Ismaël", "Rayan", "Adem", "Nabil", "Farès", "Houssem", "Amir", "Islam"],
    last: ["Benrahma", "Boudjema", "Chergui", "Djellal", "Ferhat", "Haddad", "Kaci", "Meziane", "Saïdi", "Zeroual"],
  },
  MLI: {
    first: ["Amadou", "Moussa", "Boubacar", "Sékou", "Adama", "Youssouf", "Hamari", "Kalifa", "Mamadou", "Abdoulaye"],
    last: ["Keïta", "Traoré", "Coulibaly", "Diarra", "Doumbia", "Sangaré", "Konaté", "Camara", "Dembélé", "Touré"],
  },
  COL: {
    first: ["Juan", "Andrés", "Camilo", "Sebastián", "Felipe", "Jhon", "Yerson", "Daniel", "Kevin", "Brayan"],
    last: ["Rentería", "Mosquera", "Valencia", "Cuesta", "Palacios", "Murillo", "Arboleda", "Hinestroza", "Quiñones", "Asprilla"],
  },
  URU: {
    first: ["Facundo", "Rodrigo", "Maximiliano", "Matías", "Nicolás", "Agustín", "Bruno", "Diego", "Santiago", "Federico"],
    last: ["Olivera", "Pereira", "Rodríguez", "Saracho", "Torres", "Bentancor", "Castro", "Ferreira", "Godoy", "Núñez"],
  },
  SUI: {
    first: ["Noah", "Luca", "Levin", "Gian", "Dario", "Fabian", "Nico", "Remo", "Silvan", "Joel"],
    last: ["Ammann", "Brunner", "Frei", "Huber", "Keller", "Meier", "Ruchti", "Steiner", "Widmer", "Zürcher"],
  },
  AUT: {
    first: ["Florian", "Stefan", "Matthias", "Dominik", "Philipp", "Lukas", "Patrick", "Raphael", "Manuel", "Christoph"],
    last: ["Auer", "Bauer", "Eder", "Gruber", "Hofer", "Leitner", "Moser", "Pichler", "Steiner", "Wallner"],
  },
  POL: {
    first: ["Jakub", "Kacper", "Mateusz", "Szymon", "Bartosz", "Filip", "Michał", "Kamil", "Piotr", "Patryk"],
    last: ["Nowak", "Kowalczyk", "Wiśniewski", "Zieliński", "Szymański", "Woźniak", "Dąbrowski", "Kaczmarek", "Mazur", "Krawczyk"],
  },
  TUR: {
    first: ["Emre", "Arda", "Kerem", "Berk", "Yusuf", "Mert", "Eren", "Burak", "Kaan", "Oğuz"],
    last: ["Yılmaz", "Kaya", "Demir", "Şahin", "Çelik", "Aydın", "Öztürk", "Arslan", "Doğan", "Kılıç"],
  },
  SCO: {
    first: ["Callum", "Lewis", "Ross", "Fraser", "Euan", "Calum", "Craig", "Ryan", "Liam", "Scott"],
    last: ["MacLeod", "Fraser", "Henderson", "McAllister", "Robertson", "Stewart", "Murray", "Paterson", "Cameron", "Sinclair"],
  },
};

/** Nationalités des joueurs inventés selon le pays du club (majorité locale, part internationale). */
export const IMPORT_MIX: Record<string, { local: string; local_share: number; imports: string[] }> = {
  eng: { local: "ENG", local_share: 0.55, imports: ["SCO", "FRA", "ESP", "POR", "BRA", "NED", "BEL", "DEN", "NOR", "NGA", "GHA", "USA", "JPN", "SEN", "CIV"] },
  esp: { local: "ESP", local_share: 0.65, imports: ["ARG", "URU", "COL", "BRA", "POR", "FRA", "MAR", "SEN", "NGA", "SRB"] },
  ita: { local: "ITA", local_share: 0.55, imports: ["ARG", "BRA", "SRB", "CRO", "POL", "SUI", "FRA", "NGA", "MAR", "DEN", "NED", "BEL"] },
  ger: { local: "GER", local_share: 0.55, imports: ["AUT", "SUI", "POL", "TUR", "DEN", "NOR", "NED", "FRA", "JPN", "USA", "CRO", "SRB"] },
  fra: { local: "FRA", local_share: 0.6, imports: ["SEN", "CIV", "MLI", "ALG", "MAR", "CMR", "BEL", "POR", "BRA", "NGA", "GHA"] },
};
