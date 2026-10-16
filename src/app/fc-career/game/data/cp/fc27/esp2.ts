/**
 * CP LaLiga 2 2026-27 — notes et cartes officielles EA SPORTS FC 27
 * (pages « teams-ratings » d'ea.com, effectifs après le mercato d'été 2026).
 * Ligne : POSTE EA|Nom complet|NAT|année de naissance|note|6 cases de la carte
 * (gardien : PLO,PRI,PIE,RÉF,VIT,PLA). « ? » : année inconnue (reprise des
 * anciennes listes si le joueur y figure, sinon déduite à la génération).
 */
export const FC27_ESP2: Record<string, string> = {
  "esp-ceu": `
RM|Cedric Teguia|ESP|?|69|83,64,61,72,53,76
LB|Matos|ESP|?|69|78,61,64,68,61,56
RM|Kenneth Mamah|NGA|?|68|81,61,63,67,59,70
RB|Anuar|MAR|?|68|73,63,62,68,62,71
CM|Mawuli Mensah|GHA|?|68|70,57,65,73,68,61
LM|Kialy Abdoul Koné|CIV|?|68|81,64,58,69,47,70
GK|Guille Vallejo|ESP|?|68|67,68,64,67,48,68
CDM|Yann Bodiger|FRA|?|68|42,57,66,61,65,77
CM|Marino Illescas|ESP|?|67|72,63,67,67,61,67
GK|Pedro López|ESP|?|67|65,66,60,66,48,69
CAM|Kuki Zalazar|ESP|?|67|65,68,67,68,33,56
ST|Jordi Escobar|ESP|?|67|78,67,55,65,18,63
RB|Petxarroman|ESP|?|66|75,49,61,61,60,72
CM|Ale Meléndez|ESP|?|66|57,56,61,68,60,63
CB|Lapeña|ESP|?|66|67,34,49,55,67,66
RM|Salvi Sánchez|ESP|?|66|62,61,64,68,35,44
CB|Carlos Hernández|ESP|?|66|32,44,49,45,65,80
LB|Redru|ESP|?|65|66,29,54,61,62,75
ST|Omar Sadik|MAR|?|65|68,65,51,63,28,69
CB|Capa|ESP|?|63|50,35,44,56,66,60
CM|Josema|ESP|?|59|64,48,61,62,58,57
`,
  "esp-alb": `
LM|Munir|MAR|?|74|76,74,72,74,34,61
RW|Rober|ESP|?|73|80,62,71,77,32,48
RM|Puertas|ESP|?|72|69,71,71,73,43,69
CB|Vallejo|ESP|?|72|62,42,55,63,72,63
CM|Agus Medina|ESP|?|70|66,69,67,69,66,77
RM|Corpas|ESP|?|70|83,64,67,69,59,65
LB|Carlos Neva|ESP|?|70|76,52,60,68,65,70
RB|Fran Gámez|ESP|?|69|70,54,59,64,65,76
CB|Pepe Sánchez|ESP|?|69|63,48,59,66,69,66
CB|Lluís López|ESP|?|69|64,36,56,61,68,77
CM|Sergio Ortuño|ESP|?|68|71,63,62,69,63,69
ST|Samuel Obeng|GHA|?|68|83,68,50,62,24,85
GK|Carlos Marín|ESP|?|68|70,64,64,70,29,65
GK|Diego Mariño|ESP|?|67|67,67,64,65,50,66
CM|Pacheco|ESP|?|66|54,59,63,67,60,63
CB|Javi Moreno|ESP|?|66|68,36,53,59,64,71
ST|Higinio|ESP|?|66|54,67,59,64,37,60
ST|Álex Rubio|ESP|?|66|74,67,54,67,23,52
CAM|San Bartolomé|ESP|?|65|67,61,66,66,51,69
CM|Javi Villar|ESP|?|65|57,57,62,65,66,62
LM|Víctor Valverde|ESP|?|65|78,60,58,66,34,57
RB|Lorenzo Aguado|ESP|?|65|69,34,56,61,63,60
ST|Soberón|ESP|?|64|47,68,63,63,32,63
CDM|Capi|ESP|?|62|73,54,58,64,60,61
LB|Dani Bernabéu|ESP|?|62|79,47,56,65,54,50
GK|Mario Ramos|ESP|?|59|59,62,52,56,28,61
RB|Jota|ESP|?|58|73,44,49,59,53,49
CB|Antonio Velilla|ESP|?|58|72,25,43,54,57,67
ST|Alberto Morientes|ESP|?|58|73,61,44,61,21,39
`,
  "esp-bur": `
CDM|José Gragera|ESP|?|71|59,50,66,64,71,76
GK|Cantero|ESP|?|70|70,69,68,70,60,71
RM|David González|ESP|?|70|68,67,68,69,55,71
CAM|Santiago Lencina|ARG|?|70|73,67,70,74,57,56
CB|Sergio González|ESP|?|70|56,52,62,62,67,85
CAM|Curro Sánchez|ESP|?|70|74,69,68,72,40,57
ST|Alex Forés|ESP|?|70|68,73,56,67,37,60
CM|Kévin Appin|FRA|?|69|72,62,67,67,64,78
LB|Vilarrasa|ESP|?|69|74,61,69,67,62,77
RB|Alex Lizancos|ESP|?|69|71,42,63,64,65,73
LW|Javi Llabrés|ESP|?|69|78,63,63,70,32,52
ST|Mollejo|ESP|?|68|81,63,65,69,39,77
CB|Oier Luengo|ESP|?|68|58,32,49,54,68,79
CM|Pablo Galdames|CHI|?|67|74,60,67,68,59,72
CB|Gregorio Sierra|ESP|?|67|43,50,52,56,67,78
RB|Dadie|ESP|?|66|78,59,62,66,59,70
LB|Brais Martínez|ESP|?|66|75,33,58,63,62,67
CM|Mario Cantero|ESP|?|64|64,61,59,64,62,59
CM|del Cerro|ESP|?|63|41,53,61,59,59,71
GK|Bruno Iribarne|ESP|?|63|61,61,62,64,30,61
CM|Ethan|ESP|?|61|63,53,60,60,62,69
CDM|Marcelo|ESP|?|61|59,53,62,62,55,63
RM|Fermín García|ESP|?|61|67,49,57,62,37,62
GK|Diego González|ESP|?|57|57,57,55,58,24,57
`,
  "esp-cas": `
LM|Iñigo Córdoba|ESP|?|72|81,70,67,73,62,74
RB|Jérémy Mellot|FRA|?|72|80,43,63,70,66,82
CB|Alberto Jiménez|ESP|?|72|60,56,59,60,69,88
GK|Amir Saipi|KOS|?|71|71,69,68,72,30,72
CM|Diego Barri|ESP|?|70|65,59,66,69,68,81
LB|Lucas Alcázar|ESP|?|70|83,36,62,70,63,66
GK|Romain Matthys|BEL|?|70|69,69,67,69,36,69
ST|Ousmane Camara|GUI|?|70|86,68,57,72,22,61
CB|Fabrizio Brignani|ITA|?|70|60,43,41,54,71,77
RB|Juanjo Nieto|ESP|?|69|79,62,64,69,62,68
ST|Isra Suero|ESP|?|69|70,73,65,72,42,56
CDM|Jari Vlak|NED|?|69|59,55,58,64,64,77
LM|Raúl Sánchez|ESP|?|68|67,67,64,65,61,76
ST|Douglas Aurélio|BRA|?|67|78,67,61,68,48,69
ST|Adam Jakobsen|DEN|?|67|82,66,63,66,26,74
CB|Agustín Sienra|ARG|?|67|69,37,58,62,67,72
LW|Pablo Santiago|ESP|?|67|78,65,64,69,32,50
CB|Ilias Kostis|GRE|?|67|53,22,47,51,67,69
CDM|Marc-Olivier Doué|FRA|?|66|62,53,59,61,61,71
CM|Álvaro Martín|ESP|?|65|71,60,67,67,52,55
RW|Rodrigo Rêgo|POR|?|64|71,62,58,66,33,50
ST|Álvaro García|ESP|?|63|53,64,45,61,25,70
RB|Michał Willmann|POL|?|62|78,50,59,62,55,56
CM|Fran Castillo|ESP|?|62|61,54,64,68,48,48
LB|Tincho|ESP|?|62|65,41,55,60,59,53
GK|Sergi Torner|ESP|?|57|55,57,59,58,22,58
`,
  "esp-eld": `
CDM|Justin Smith|CAN|?|68|61,41,59,60,67,73
RM|Fidel|ESP|?|68|59,67,69,69,38,51
CB|Floris Smand|NED|?|68|62,30,49,55,67,75
CM|Javi Martínez|ESP|?|67|64,63,64,68,62,74
LM|Jordi Martín|ESP|?|67|72,57,64,68,61,56
GK|Ramón Vila|ESP|?|67|70,63,63,70,48,63
CDM|Guirao|ESP|?|67|55,48,60,66,65,65
ST|Manu Nieto|ESP|?|67|68,67,62,67,29,63
GK|Juanpa|ESP|?|66|64,63,61,67,29,66
ST|Pau Cabanes|ESP|?|65|62,69,53,67,25,48
RB|Jesús Clemente|ESP|?|64|81,56,59,63,56,70
LB|Julien Yanda|GER|?|63|78,37,61,64,58,59
CB|Javier Olaizola|ESP|?|59|58,34,45,47,58,60
`,
  "esp-leg": `
RB|Álvaro Tejero|ESP|?|73|76,66,73,72,66,67
LM|Dani Rodríguez|ESP|?|72|67,68,73,71,60,59
CM|Yassine Kechta|MAR|?|72|56,60,72,74,63,63
CDM|Amadou Diawara|GUI|?|71|59,57,65,71,71,74
GK|Raúl Fernández|ESP|?|71|71,73,67,71,38,73
CM|Atienza|ESP|?|71|50,62,62,66,67,76
LM|Ismaël Gharbi|TUN|?|71|71,64,67,77,41,54
RB|Rubén Peña|ESP|?|70|69,67,68,70,67,65
CM|Zico Buurmeester|NED|?|70|64,63,67,71,64,69
LB|Javi Hernández|ESP|?|70|68,56,66,66,67,71
ST|Alex Millán|ESP|?|70|74,69,60,68,35,75
CB|Lalo Aguilar|ESP|?|70|65,32,49,56,71,77
ST|Patrick Soko|CMR|?|68|89,67,62,68,34,77
LB|Franquesa|ESP|?|68|71,52,63,66,63,62
CM|Melero|ESP|?|68|37,71,71,63,65,66
GK|Luca Zidane|ALG|?|68|64,63,67,73,37,64
CB|Marvel|ESP|?|68|74,34,55,51,63,85
CAM|Roberto López|ESP|?|67|44,69,70,68,48,56
LM|Naim García|ESP|?|67|78,61,63,67,43,43
CB|Rubén Pulido|ESP|?|67|61,37,52,61,66,70
CB|Ignasi Miquel|ESP|?|67|36,35,55,55,66,70
ST|Unax del Cura|ESP|?|64|59,64,61,65,46,63
LW|Benjamin Pauwels|BEL|?|64|82,55,58,67,26,58
RB|Marcos Leiva|ESP|?|63|63,52,61,61,59,66
RM|Andrés Campos|ESP|?|63|70,61,61,63,32,59
ST|Alfred Gøthler|DEN|?|62|68,63,58,65,46,51
CAM|Gift Siame|ZAM|?|58|63,59,56,58,39,53
`,
  "esp-ten": `
CM|Mauro Pittón|ARG|?|72|78,59,70,72,67,72
ST|Enric Gallego|ESP|?|70|54,71,58,63,25,74
RM|Nacho Gil|ESP|?|69|78,64,65,71,44,52
CDM|Jesús Alvarez|ESP|?|68|65,54,60,65,67,75
GK|Dani Martín|ESP|?|68|67,67,66,69,47,67
CB|Anthony Landázuri|ECU|?|68|77,43,53,56,67,76
RB|David Rodríguez|ESP|?|67|85,51,57,64,61,66
ST|Martin Pečar|SVN|?|67|76,65,65,71,47,58
RW|Víctor Moreno|ESP|?|67|81,58,64,66,31,63
LM|Chapela|ESP|?|67|74,66,62,69,30,56
ST|Jesús de Miguel|ESP|?|67|62,68,52,61,30,74
CB|Jorge More|ESP|?|67|72,37,48,47,66,76
LB|Marc Mateu|ESP|?|66|61,69,72,68,62,63
LB|Roko Jureškin|CRO|?|66|82,51,62,66,57,65
LW|Baba|ESP|?|65|82,64,60,64,43,72
CB|José León|ESP|?|65|69,36,52,53,64,73
LM|Noel|ESP|?|65|81,61,55,68,28,54
RB|César Álvarez|ESP|?|65|78,36,51,62,61,59
RM|Dani Fernández|ESP|?|64|72,58,60,68,41,49
CM|Anes Krdžalić|BIH|?|63|68,59,61,71,47,53
LM|Alassan|ESP|?|63|85,58,57,65,35,53
ST|Grant-Leon Ranos|ARM|?|63|62,65,53,65,27,55
CB|Neal Viereck|NED|?|62|61,35,41,46,62,67
GK|Sergio Aragoneses|ESP|?|60|59,60,58,63,31,57
`,
  "esp-sab": `
CM|Pere Pons|ESP|?|73|58,63,71,71,69,69
ST|Nicholas Gioacchini|USA|?|70|81,70,57,70,29,72
RB|Pipa|ESP|?|68|78,57,63,68,64,68
CB|Edgar González|ESP|?|67|63,52,59,58,65,79
LM|López-Pinto|ESP|?|67|75,69,64,67,29,65
GK|Diego Fuoli|ESP|?|67|66,66,65,67,39,64
LW|Yanis Rahmani|FRA|?|65|82,63,59,67,31,58
ST|Gastón Valles|URU|?|65|68,64,55,62,32,71
RW|Xavi Moreno|ESP|?|64|75,57,60,64,25,54
ST|Nikolay Obolskii|RUS|?|64|53,63,55,61,26,69
CB|Català|ESP|?|63|55,43,51,54,62,66
`,
  "esp-cef": `
CDM|Hugo Burcio|ESP|?|67|63,48,60,62,65,70
LB|Joel López|ESP|?|66|74,50,60,64,61,63
GK|Coke Carrillo|ESP|?|66|65,65,62,65,33,64
LW|Ángel Arcos|ESP|?|65|77,59,61,67,38,57
ST|Bernard Sarpong Somuah|GHA|?|65|77,63,59,66,33,58
LM|Óscar Marcos|ESP|?|65|77,61,60,66,35,55
CB|Anxo Rodríguez|ESP|?|65|64,46,50,54,65,67
CM|Andrés Antañón|ESP|?|64|65,62,63,62,61,57
LB|Jan Oliveras|ESP|?|64|71,46,60,63,59,60
RW|Hugo Cuenca|PAR|?|61|66,54,62,64,47,59
`,
  "esp-cad": `
CDM|Damián Rodríguez|ESP|?|71|70,59,67,69,68,72
ST|Izeta|ESP|?|71|67,72,62,67,26,75
RW|Suso|ESP|?|71|64,70,74,72,32,52
CB|Javi Castro|ESP|?|71|63,32,48,63,71,75
LB|Cristian Gutiérrez|ESP|?|70|81,62,67,70,65,67
RW|Iuri Tabatadze|GEO|?|70|80,74,65,71,51,60
GK|Ezkieta|ESP|?|70|68,69,67,70,43,67
CB|Manu Fernández|ESP|?|70|59,43,56,57,70,68
RB|Giorgi Gocholeishvili|GEO|?|69|75,55,63,69,62,70
GK|David Gil|ESP|?|68|68,67,66,68,47,67
CB|Iker Recio|ESP|?|68|72,40,54,54,67,76
ST|García Pascual|ESP|?|68|69,66,56,66,28,74
LW|Ontiveros|ESP|?|68|64,70,70,68,29,46
CM|Rominigue Kouamé|MLI|?|67|58,59,64,70,68,66
ST|Jerónimo Domina|ARG|?|67|80,69,57,71,39,57
LW|Antoñito Cordero|ESP|?|67|78,64,63,69,32,57
CB|Bojan Kovačević|SRB|?|67|79,39,45,57,65,73
RW|De la Rosa|ESP|?|67|79,62,58,67,30,55
LB|Sergio Arribas|ESP|?|66|70,30,57,60,64,68
CAM|Ibon Sánchez|ESP|?|65|65,66,65,66,45,58
LW|Efe Aghama|NGA|?|64|82,51,56,70,23,40
CDM|Joaquín González|ESP|?|63|66,49,59,59,59,70
RB|Juan Díaz|ESP|?|63|69,27,57,59,59,59
`,
  "esp-cor": `
RW|Carracedo|ESP|?|72|79,64,70,73,32,65
CDM|Isma Ruiz|ESP|?|71|53,59,65,67,69,76
CB|Juan Gutiérrez|ESP|?|70|72,32,47,49,68,84
GK|Iker Álvarez|AND|?|69|69,67,69,70,38,66
GK|Guilherme|POR|?|69|68,69,65,68,33,68
LW|Kevin Medina|ESP|?|69|85,61,62,74,33,43
CB|Álex Martín|ESP|?|69|66,42,50,53,68,73
LB|Tasende|ESP|?|68|77,69,68,68,61,69
LW|Diego Bri|ESP|?|68|79,61,65,70,52,67
CB|Rubén Alves|BRA|?|68|66,55,52,61,67,69
ST|Enol Rodríguez|ESP|?|68|71,69,60,68,24,76
CB|Franck Fomeyem|CMR|?|68|80,33,44,52,67,79
CM|Youssouf Diarra|MLI|?|67|81,57,64,69,59,77
RB|Albarrán|ESP|?|67|72,53,61,58,63,77
LW|Adilson|POR|?|67|77,62,62,72,31,48
CM|Eder García|ESP|?|66|67,62,65,67,64,56
RB|Dani Budesca|ESP|?|66|76,46,63,63,63,66
CM|Théo|FRA|?|65|53,67,63,64,57,64
LM|Salim El Jebari|MAR|?|65|72,57,59,67,24,52
CDM|Damián Cáceres|ESP|?|64|65,54,56,60,64,69
RW|Percan|ESP|?|64|69,62,56,66,19,59
GK|Alejandro Arévalo|ESP|?|57|56,53,52,60,36,55
`,
  "esp-and": `
GK|Pau López|ESP|?|77|76,76,77,77,48,77
CB|Gael Alonso|ESP|?|68|62,43,55,57,68,71
CAM|Nacho Quintana|ESP|?|67|75,64,65,69,51,69
CM|Sergio Molina|ESP|?|67|58,61,64,64,68,72
RB|Juan Sebastián|ESP|?|67|69,37,63,58,65,81
RB|Thomas Carrique|FRA|?|67|72,38,59,67,64,67
ST|Lautaro|URU|?|67|65,67,49,65,20,67
CB|Diego Alende|ESP|?|67|44,26,46,48,66,69
CM|Randy Schneider|PHI|?|66|76,56,64,72,53,62
CM|Marc Doménech|ESP|?|66|65,62,68,64,55,67
GK|Nicolás Ratti|ARG|?|66|66,65,64,66,54,65
LB|Martí Vilà|ESP|?|66|71,42,59,62,61,67
CB|Bomba|ESP|?|66|65,31,54,54,65,72
CM|Efe Akman|TUR|?|65|73,56,62,71,55,57
RW|Álex Calvo|ESP|?|65|82,61,61,67,36,56
LB|Andoni López|ESP|?|65|74,34,57,58,60,66
ST|Julian Rijkhoff|NED|?|65|70,63,57,70,25,54
CAM|Théo Le Normand|FRA|?|64|73,59,63,66,32,70
CM|Hugo Solozábal|ESP|?|61|60,58,64,62,49,49
LW|Enes Sali|ROU|?|61|81,52,54,68,23,37
CAM|Hugo López|ESP|?|60|62,55,56,61,43,49
`,
  "esp-gir": `
CM|Azzedine Ounahi|MAR|?|79|77,73,78,82,68,72
RW|Viktor Tsygankov|UKR|?|78|78,77,77,78,43,61
GK|Paulo Gazzaniga|ARG|?|77|77,76,78,78,57,75
RB|Arnau Martínez|ESP|?|77|78,55,72,72,75,72
CM|Fran Beltrán|ESP|?|77|55,67,76,76,75,69
CB|Abdul Mumin|GHA|?|77|76,56,61,69,77,76
ST|Vladyslav Vanat|UKR|?|77|78,77,64,75,34,71
LB|Alex Moreno|ESP|?|76|78,63,73,75,73,68
CB|Francés|ESP|?|75|75,46,68,68,75,77
ST|Cristhian Stuani|URU|?|75|53,78,68,68,49,71
LW|Bryan Gil|ESP|?|75|84,67,73,78,31,48
LW|Portu|ESP|?|74|77,74,72,74,56,72
CAM|Donny van de Beek|NED|?|74|55,74,74,75,70,65
RM|Yáser Asprilla|COL|?|74|81,72,71,75,50,63
CB|David López|ESP|?|74|36,57,69,64,75,72
ST|Abel Ruiz|ESP|?|72|72,72,68,73,39,69
CM|Izan González|ESP|?|71|74,62,69,73,66,68
LW|Kim Min Su|KOR|?|71|81,65,64,75,26,49
CDM|Iván Morante|ESP|?|68|63,61,62,66,67,66
ST|Dawda Camara|MTN|?|68|86,66,53,59,30,73
LM|Jastin|POR|?|68|78,61,61,71,23,61
CAM|Gabriel Misehouy|NED|?|67|67,61,67,70,34,58
ST|Oleksandr Pyshchur|UKR|?|66|65,64,50,57,31,71
LM|Unai Hernández|ESP|?|65|80,58,58,69,48,59
CM|Lass Kourouma|GUI|?|65|57,56,60,64,60,65
CB|Antal Yaakobishvili|HUN|?|65|58,25,50,53,65,67
GK|Vladyslav Krapyvtsov|UKR|?|64|64,64,62,64,33,64
GK|Sergi Puig|ESP|?|63|61,62,57,63,35,60
RM|Papa Dame Ba|SEN|?|62|78,56,56,64,29,54
RB|Gibi|ESP|?|62|70,30,59,60,58,54
LM|Juan Arango|VEN|?|61|69,56,57,63,34,48
CB|Holmes Júnior|ESP|?|59|57,34,45,56,58,62
`,
  "esp-gra": `
CM|Gumbau|ESP|?|73|40,70,75,69,72,70
CM|Rubén Alcaraz|ESP|?|72|44,68,73,70,69,83
CB|Manu Lama|ESP|?|72|63,48,56,63,71,78
LW|José Arnáiz|ESP|?|71|80,70,70,71,40,53
CB|Benedikt Gimber|GER|?|71|64,48,59,57,71,77
ST|Alejandro Marqués|VEN|?|71|69,71,60,71,36,66
CM|Alemañ|ESP|?|70|70,64,70,73,52,64
LW|Abdoul Kader Bamba|FRA|?|70|82,64,64,72,36,59
RB|Oscar Naasei|GHA|?|69|83,54,57,62,67,74
RB|Sergio López|ESP|?|69|76,56,66,71,64,62
GK|Raúl Lizoain|ESP|?|69|67,68,67,67,50,70
LB|Baïla Diallo|SEN|?|69|89,38,58,67,62,67
LB|Diego Pampín|ESP|?|69|77,41,64,69,63,64
ST|Jorge Pascual|ESP|?|68|75,67,63,70,37,76
GK|Alberto Flores|ESP|?|65|65,66,63,64,30,63
LW|Rodelas|ESP|?|64|81,57,58,67,31,38
RB|Casadesús|ESP|?|63|76,44,56,58,57,67
LB|Hormigo|ESP|?|63|68,26,53,57,59,61
GK|Iker García|ESP|?|60|62,58,60,58,26,58
CAM|Gambín|ESP|?|59|57,56,59,61,49,41
RW|Owen Emeka|ESP|?|58|80,51,49,61,29,45
`,
  "esp-mll": `
CM|Sergi Darder|ESP|?|78|69,72,80,79,69,73
CB|Raíllo|ESP|?|78|35,37,60,61,80,82
CB|Martin Valjent|SVK|?|77|58,36,59,64,78,83
GK|Arnau Tenas|ESP|?|75|74,70,81,77,52,74
CDM|Manu Morlanes|ESP|?|75|64,64,74,73,71,67
CAM|Pablo Torre|ESP|?|75|71,66,77,76,45,53
ST|Adri Fuentes|ESP|?|74|88,72,63,70,29,80
RM|Antoniu Roca|ESP|?|73|79,64,68,74,42,61
ST|Adrián Liso|ESP|?|72|83,70,66,73,40,76
LB|Toni Lato|ESP|?|72|76,56,69,70,68,60
ST|Zito Luvumbo|ANG|?|71|86,69,65,76,44,70
CDM|Álex Sala|ESP|?|71|62,68,67,69,70,71
RB|Mateu Morey|ESP|?|71|74,46,66,72,67,60
ST|Adam Buksa|POL|?|71|49,73,56,67,32,76
RM|Antonio Sánchez|ESP|?|70|69,65,70,70,65,74
RM|Puigmal|ESP|?|70|85,64,66,71,57,55
ST|Abdón Prats|ESP|?|70|59,72,59,68,30,56
CB|David López|ESP|?|70|58,32,48,53,69,77
LW|Josep Cerdà|ESP|?|68|76,64,63,69,31,63
GK|Lucas Bergström|FIN|?|68|66,68,65,69,29,67
GK|Pichu Cuéllar|ESP|?|67|65,67,64,67,47,66
LM|Justin Kalumba|FRA|?|65|68,51,63,69,50,55
RW|Daniel Luna|COL|?|65|77,57,60,66,33,42
CB|Aboubaka Soumahoro|FRA|?|64|62,25,52,57,62,67
CM|Jan Salas|ESP|?|62|55,58,58,63,56,54
LB|Orejuela|ESP|?|61|66,36,55,55,55,53
`,
  "esp-ovi": `
GK|Aarón Escandell|ESP|?|78|78,77,73,80,52,75
CB|David Costas|ESP|?|74|67,46,66,71,74,76
LW|Ilyas Chaira|MAR|?|74|79,73,69,74,40,63
CAM|Alberto Reina|ESP|?|73|68,69,73,74,67,70
LB|Juan Cruz|ESP|?|73|68,40,64,64,73,69
CB|Carlos Domínguez|ESP|?|73|61,28,56,56,74,72
ST|Chris Ramos|ESP|?|72|80,69,63,71,34,70
CB|Dani Calvo|ESP|?|72|44,46,53,55,73,79
RB|Nacho Vidal|ESP|?|71|71,59,67,67,67,66
ST|Carlos Fernández|ESP|?|71|62,73,62,68,26,73
CDM|Aldasoro|ESP|?|70|67,65,65,70,67,71
LW|Jacobo González|ESP|?|70|77,72,69,72,33,53
LM|Estanis Pedrola|ESP|?|70|86,70,64,73,26,53
RM|Aisar|ESP|?|69|80,59,63,71,59,58
CAM|Luka Ilić|SRB|?|69|68,66,69,69,46,65
CM|Villahermosa|ESP|?|68|66,67,69,69,61,69
RW|Pablo Sáenz|ESP|?|68|84,66,61,69,31,64
LM|Brandon Domingues|FRA|?|68|74,66,65,69,37,54
CDM|Youness Lachhab|MAR|?|66|54,54,59,60,66,75
ST|Alexandru Ișfan|ROU|?|65|78,64,57,67,34,65
CB|Marco Esteban|ESP|?|64|65,30,56,59,63,62
GK|Miguel Narváez|ESP|?|63|64,65,56,62,25,59
CM|Dieguito|ESP|?|62|69,60,63,66,50,57
`,
  "esp-rsb": `
GK|Aitor Fraga|ESP|?|69|67,69,64,69,30,69
CB|Kazunari Kita|JPN|?|68|67,41,58,55,68,70
LB|Jon Balda|ESP|?|67|65,57,64,66,64,66
ST|Mariezkurrena|ESP|?|67|74,66,62,70,34,66
ST|Gorka Carrera|ESP|?|67|72,67,59,67,24,66
CB|Luken Beitia|ESP|?|67|47,31,55,50,66,72
CM|Gorka Gorosabel|ESP|?|65|63,60,65,69,56,58
CM|Tomy Carbonell|ESP|?|65|62,50,63,65,61,62
CAM|Astiazarán|ESP|?|65|66,63,63,66,44,48
LB|Unax Agote|ESP|?|65|62,32,58,63,64,54
RB|Rupérez|ESP|?|64|62,58,60,63,61,62
CM|Ibai Aguirre|ESP|?|64|55,52,59,66,56,54
RM|Dani Díaz|ESP|?|64|70,57,60,68,26,42
CM|Alex Lebarbier|FRA|?|63|46,52,56,61,62,79
LW|Alex Marchal|ESP|?|63|76,54,56,65,22,48
ST|Sydney Osazuwa|ESP|?|62|70,59,48,60,30,69
CM|Joan Oleaga|ESP|?|61|57,55,57,62,55,58
LW|Andrews Adjabeng|GHA|?|61|75,60,56,61,31,50
GK|Theo Folgado|FRA|?|61|59,60,58,62,19,61
ST|Orobengoa|ESP|?|61|63,62,53,60,24,53
CB|Iker Calderón|ESP|?|61|46,38,42,51,59,75
CM|Jon Eceizabarrena|ESP|?|60|60,55,60,61,60,46
RB|Jon Garro|ESP|?|60|70,41,53,58,57,49
CB|Unax Ayo|ESP|?|60|55,40,47,57,59,64
LB|Pello Arana|ESP|?|60|64,38,52,59,56,51
CB|Astigarraga|ESP|?|60|49,31,44,50,65,58
`,
  "esp-vll": `
LM|Julien Ponceau|FRA|?|71|70,62,68,72,55,60
CAM|Chacón|ESP|?|70|77,66,68,71,26,49
CB|Miguel Rubio|ESP|?|70|37,29,48,45,69,73
RB|Iván Alejo|ESP|?|69|78,66,65,67,65,75
CDM|Stanko Jurić|CRO|?|69|58,67,57,65,68,85
CB|Pablo Tomeo|ESP|?|69|64,56,63,65,68,80
GK|Aceves|ESP|?|69|68,68,71,67,24,68
CB|David Torres|ESP|?|69|62,27,55,47,69,70
CM|Mathis Lachuer|FRA|?|68|72,58,68,71,64,74
CDM|Thiago Ojeda|ARG|?|68|65,61,62,63,66,76
RB|Clément Michelin|FRA|?|68|71,56,63,67,64,70
LW|Kaj de Rooij|NED|?|68|73,69,65,67,34,65
LB|Guille Bueno|ESP|?|68|83,34,59,72,59,64
RW|Yeray Cabanzón|ESP|?|68|75,67,65,71,29,49
ST|Latasa|ESP|?|68|60,67,55,63,21,74
ST|Marcos André|BRA|?|67|67,67,60,67,37,71
LB|Clerc|ESP|?|66|74,57,63,66,60,75
CM|Meseguer|ESP|?|66|60,66,63,64,63,74
LB|Homam Al Amin|QAT|?|66|73,48,58,59,59,74
ST|Vegard Erlien|NOR|?|66|66,65,60,67,35,71
RB|Trilli|ESP|?|66|70,27,54,55,63,66
CM|Álex Balboa|EQG|?|65|61,59,62,66,58,68
LB|Iván Garriel|ESP|?|65|75,36,52,68,62,53
CB|Ramón Martínez|ESP|?|65|46,29,50,56,65,66
GK|Lucas Lavagnino|ARG|?|64|63,61,60,67,48,61
ST|Víctor Barberá|ESP|?|64|77,62,57,66,20,58
CAM|Dani Pérez|ESP|?|64|56,54,64,68,53,39
CAM|Víctor Jr|ESP|?|64|72,60,61,67,34,39
ST|Robin van Duiven|NED|?|64|67,64,50,62,25,53
ST|Arnu|ESP|?|62|62,63,49,61,26,62
RB|Koke Iglesias|ESP|?|61|47,39,47,59,63,48
`,
  "esp-eib": `
CDM|Nolaskoain|ESP|?|72|54,62,61,64,71,80
GK|Magunagoitia|ESP|?|72|72,71,68,73,27,69
CDM|Sergio Álvarez|ESP|?|70|52,65,64,64,67,77
LB|Imanol|ESP|?|70|68,47,67,66,67,62
CB|Elgezabal|ESP|?|70|54,49,58,59,71,75
ST|Javi Martón|ESP|?|70|62,72,56,66,25,74
CM|Iván Gil|ESP|?|69|73,70,69,72,58,60
RB|Cubero|ESP|?|69|71,32,60,62,65,77
CB|Arbilla|ESP|?|69|44,54,68,59,66,75
ST|Jon Bautista|ESP|?|69|60,72,60,68,26,64
CM|Olaetxea|ESP|?|68|59,68,65,67,67,78
LB|Juan Bernat|ESP|?|68|65,63,71,72,69,58
CM|Aleix Garrido|ESP|?|68|75,60,65,73,56,52
CAM|Guruzeta|ESP|?|68|75,62,66,68,34,64
CAM|Mada|ESP|?|67|75,66,64,67,46,63
RM|Pejiño|ESP|?|67|86,71,63,70,32,53
CAM|Magunazelaia|ESP|?|67|74,66,63,68,46,57
CB|Jair Amador|POR|?|67|53,30,43,43,66,82
LM|Adu Ares|ESP|?|66|76,70,62,67,25,65
RB|Alvaro Rodríguez|ESP|?|66|64,43,60,61,63,71
GK|Luis López|ESP|?|64|64,63,60,64,30,62
LM|Eric|ESP|?|62|70,59,60,61,28,56
CM|Lucas Núñez|ESP|?|60|53,57,56,62,56,60
RM|Hugo García|ESP|?|59|70,53,55,59,29,41
CB|Korta|ESP|?|58|60,34,46,48,61,58
LM|Sarasketa|ESP|?|57|62,57,54,57,39,44
`,
  "esp-spo": `
ST|Juan Ferney Otero|COL|?|74|88,73,72,74,31,81
CAM|Gelabert|ESP|?|74|74,68,72,75,51,70
RB|Guille Rosas|ESP|?|73|79,57,72,74,66,81
CM|Àlex Corredera|ESP|?|73|64,64,73,74,61,80
GK|Rubén Yáñez|ESP|?|73|73,69,64,78,46,69
LM|Gaspar Campos|ESP|?|70|80,75,65,69,33,76
CM|Hugo Guillamón|ESP|?|70|52,64,65,68,75,70
CB|Pablo Vázquez|ESP|?|70|51,32,49,50,69,69
ST|Antonio Casas|ESP|?|69|77,68,58,68,32,75
LB|Diego Sánchez|ESP|?|69|73,41,58,63,67,76
LB|Pablo García|ESP|?|68|78,44,60,68,62,72
CDM|Nacho Martín|ESP|?|68|70,47,66,67,64,69
ST|Andrés Ferrari|URU|?|68|76,68,57,68,28,67
CB|Jorge Sáenz|ESP|?|68|53,41,56,58,67,78
CB|Emanuel Gularte|URU|?|68|52,29,38,45,69,73
LW|Nikita Iosifov|RUS|?|67|76,64,65,68,26,46
GK|Egoitz Arana|ESP|?|66|65,68,63,66,20,65
CDM|Mamadou Loum|SEN|?|66|33,55,58,60,65,74
LM|Konrad de la Fuente|USA|?|66|77,64,62,72,20,48
CB|Andrés Cuenca|ESP|?|64|71,39,63,63,62,65
ST|Alejo Sarco|ARG|?|64|72,64,50,65,28,59
CAM|Enol Prendes|ESP|?|63|73,57,62,66,34,56
CM|Manu Rodríguez|ESP|?|62|64,54,60,64,57,55
RB|Iker Martínez|ESP|?|61|62,33,53,60,57,64
`,
  "esp-alm": `
CAM|Arribas|ESP|?|77|84,76,74,79,43,64
LW|Embarba|ESP|?|75|75,76,76,75,42,64
LB|Álex Muñoz|ESP|?|74|78,70,67,67,69,84
LW|Brian Cipenga|COD|?|73|88,67,65,76,33,67
CB|Federico Bonini|ITA|?|73|68,53,57,58,73,77
RB|Luna|ESP|?|72|81,52,63,66,69,83
RW|Álex Sola|ESP|?|72|80,59,66,75,60,71
LW|Morci|ESP|?|72|79,71,70,73,48,68
GK|Andrés Fernández|ESP|?|72|72,69,65,72,57,70
ST|Miguel de la Fuente|ESP|?|71|75,69,61,70,37,81
CDM|Vesga|ESP|?|71|45,70,67,64,70,72
RW|Léo Baptistão|BRA|?|71|71,69,70,73,33,70
CB|Rodrigo Ely|BRA|?|71|32,31,42,53,72,70
RB|Daijiro Chirino|CUW|?|70|86,55,62,71,63,81
CDM|Stefan Džodić|SRB|?|70|57,50,60,64,68,80
GK|Áron Yaakobishvili|HUN|?|70|69,69,68,70,35,68
CB|Nélson Monte|POR|?|70|58,37,60,59,70,78
RM|Álex Pozo|ESP|?|69|73,64,66,72,64,52
LW|Melamed|ESP|?|69|74,65,68,72,40,59
CB|Pulido|ESP|?|69|34,43,53,50,68,81
CDM|Gui Guedes|POR|?|68|72,59,66,69,63,70
GK|Fernando Martínez|ESP|?|68|68,63,68,68,48,70
ST|Thalys|BRA|?|66|71,66,57,66,38,74
CB|Chumi|ESP|?|66|53,36,52,51,65,64
CM|Quim Junyent|ESP|?|64|76,56,64,70,54,51
CB|Andrej Popović|SRB|?|63|52,40,55,58,63,64
GK|Jesús López|ESP|?|58|56,61,55,58,28,56
`,
  "esp-lpa": `
CDM|Kirian|ESP|?|74|53,75,74,74,70,73
CAM|Manu Fuster|ESP|?|74|74,73,77,75,58,59
GK|Dinko Horkaš|CRO|?|74|73,72,70,78,48,72
LM|Iván Jaime|ESP|?|74|74,74,71,76,45,63
RB|Viti Rozada|ESP|?|73|90,60,66,73,66,73
RW|Taisei Miyashiro|JPN|?|73|80,70,67,78,48,79
CM|Enzo Loiodice|FRA|?|73|64,64,71,75,69,69
RM|Sandro|ESP|?|73|79,77,71,74,31,69
LB|Clemente|ESP|?|72|83,70,67,72,69,75
ST|Jesé|ESP|?|72|76,72,67,73,25,74
ST|Jeremía Recoba|URU|?|71|77,69,70,72,59,76
ST|Jefté|ESP|?|71|68,70,62,70,32,77
CB|Juanma Herzog|ESP|?|71|74,35,54,54,71,75
LM|Ale García|ESP|?|70|85,71,61,71,50,69
CB|Álex Suárez|ESP|?|70|74,36,58,59,68,79
CDM|Sergio Ruiz|ESP|?|69|61,63,64,65,66,70
GK|Caro|ESP|?|69|70,68,67,70,38,68
RB|Marvin|ESP|?|68|91,54,65,69,59,64
CDM|Iñaki González|ESP|?|68|71,60,59,69,64,71
CB|Nicholas Opoku|GHA|?|68|59,37,47,52,67,79
CB|Giovanni Bonfanti|ITA|?|68|45,37,56,54,70,69
CDM|Edward Cedeño|PAN|?|66|67,56,57,64,64,77
CM|Aboubacar Bassinga|BFA|?|63|72,59,60,68,57,70
RB|Valentín Pezzolesi|ESP|?|63|78,54,60,66,57,67
RW|Adam Arvelo|ESP|?|61|79,58,56,63,40,43
GK|Adri Suárez|ESP|?|61|63,60,61,60,23,59
`,
};
