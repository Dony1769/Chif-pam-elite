/**
 * CP Ligue 2 2026-27 — notes et cartes officielles EA SPORTS FC 27
 * (pages « teams-ratings » d'ea.com, effectifs après le mercato d'été 2026).
 * Ligne : POSTE EA|Nom complet|NAT|année de naissance|note|6 cases de la carte
 * (gardien : PLO,PRI,PIE,RÉF,VIT,PLA). « ? » : année inconnue (reprise des
 * anciennes listes si le joueur y figure, sinon déduite à la génération).
 */
export const FC27_FRA2: Record<string, string> = {
  "fra-asn": `
GK|Enzo Basilio|FRA|?|69|69,67,68,72,46,70
LM|Nordine Kandil|MAR|?|69|75,56,69,73,42,48
CB|Nicolas Saint-Ruf|FRA|?|69|70,39,49,55,67,79
ST|Ilyes Housni|MAR|?|67|62,67,58,73,26,47
CM|Mamadou Fofana|FRA|?|66|85,52,62,68,63,74
GK|Geoffrey Lembet|CTA|?|66|66,63,62,71,37,65
LB|Logan Ndenbe|BEL|?|66|79,29,58,66,60,67
CDM|Jérémy Gélin|FRA|?|66|37,44,65,64,64,71
LM|Zakaria Fdaouch|FRA|?|66|76,64,64,65,28,44
CAM|Walid Bouabdeli|FRA|?|65|71,59,63,67,39,78
CB|Nehemiah Fernandez|FRA|?|65|56,36,51,53,64,73
RB|Thierno Baldé|FRA|?|64|72,48,57,63,59,63
RB|Enzo Tacafred|FRA|?|64|59,45,51,62,62,71
ST|Adrian Dabasse|FRA|?|64|50,68,51,61,28,71
CB|Elydjah Mendy|FRA|?|64|52,25,43,45,63,75
ST|Brandon Bokangu|COD|?|63|78,61,57,66,32,72
CM|Issam Bouaoune|ALG|?|63|66,46,61,64,56,66
CB|Yannis Nahounou|FRA|?|63|65,26,44,46,61,73
ST|Noam Obougou|FRA|?|62|75,60,45,63,26,62
CDM|Chafik El Hansar|FRA|?|61|66,53,56,62,57,63
CDM|Hugo Barbier|FRA|?|60|65,51,57,56,60,61
CDM|Kouroufia Kébé|FRA|?|60|67,36,53,56,58,65
GK|Yanis Kouini|MAR|?|58|59,60,57,60,34,57
`,
  "fra-ase": `
CAM|Jakob Breum|DEN|?|75|66,72,73,77,38,63
ST|Lucas Stassin|BEL|?|74|79,76,67,76,35,70
LM|Zuriko Davitashvili|GEO|?|74|90,64,68,77,25,62
GK|Gautier Larsonneur|FRA|?|73|71,72,72,75,52,73
CB|Julien Le Cardinal|FRA|?|73|73,31,63,65,73,77
RM|Irvin Cardona|MLT|?|72|89,71,64,71,30,74
RW|Augustine Boakye|GHA|?|72|88,64,62,74,30,61
LM|Thierno Ballo|AUT|?|71|88,64,64,74,50,49
CB|Chico Lamba|POR|?|71|78,43,53,65,69,83
CB|Sohaïb Naïr|ALG|?|70|65,28,49,56,70,74
CB|Mickaël Nadé|FRA|?|70|33,30,45,50,70,83
CB|Maxime Bernauer|FRA|?|70|66,53,72,68,69,78
CM|Pierre Ekwah|FRA|?|70|61,66,66,67,66,75
RB|João Ferreira|POR|?|70|79,41,60,65,67,76
CM|Áron Csongvai|HUN|?|70|61,63,69,63,67,77
CM|Aïmen Moueffek|MAR|?|69|70,56,66,71,64,70
GK|Mamour Ndiaye|SEN|?|68|70,66,67,67,41,66
LB|Ben Old|NZL|?|68|84,58,63,71,59,72
CM|Mahmoud Jaber|ISR|?|67|67,40,61,72,58,65
LB|Ebenezer Annan|GHA|?|66|72,27,53,57,65,70
CM|Igor Miladinović|SRB|?|65|77,57,64,72,47,36
RB|Kévin Pedro|FRA|?|65|69,28,50,60,64,68
ST|Joshua Duffus|ENG|?|63|79,62,53,67,38,65
GK|Lucas Lavallée|FRA|?|62|62,61,58,63,29,60
ST|Djylian N'Guessan|FRA|?|61|75,60,45,64,24,57
`,
  "fra-cf6": `
CB|Andy Pelmard|MAD|?|69|81,34,59,64,68,77
RB|Junior Sambia|FRA|?|68|66,66,69,68,66,60
CB|Yoann Salmier|FRA|?|68|31,40,55,50,67,77
LM|Maïdine Douane|ALG|?|67|70,58,62,69,29,61
LB|Vital Nsimba|COD|?|66|74,56,62,68,62,54
GK|Théo Guivarch|FRA|?|66|66,65,68,67,38,68
GK|Massamba N'Diaye|SEN|?|65|66,60,61,71,25,63
CB|Ivan M'Bahia|CIV|?|65|66,29,50,54,66,68
RB|Cheick Oumar Konaté|MLI|?|65|60,29,54,60,64,59
CM|Abdellah Baallal|MAR|?|64|73,58,59,66,57,64
LB|Kenji-Van Boto|MAD|?|64|72,49,54,60,59,73
CDM|Allan Ackra|FRA|?|64|68,43,54,60,60,71
ST|Adrien Hunou|FRA|?|63|53,63,66,64,51,64
RB|Ibrahim Coulibaly|FRA|?|63|72,26,52,61,58,71
RM|Mohamed-Amine Bouchenna|FRA|?|63|76,60,56,66,26,49
RM|Ousmane Diop|SEN|?|63|76,56,53,67,17,49
CB|Jean Grillot|FRA|?|62|53,29,46,59,64,64
ST|Christ Okou|FRA|?|61|61,62,45,59,30,68
RM|Enzo Cantero|FRA|?|61|83,49,55,66,28,36
LB|El Hadj Koné|FRA|?|60|66,45,54,63,55,54
ST|Arthur Saintorens|FRA|?|60|57,63,44,57,22,66
CB|Ethan Kena Kabeya|FRA|?|60|54,26,47,53,60,63
CAM|Yuliwes Bellache|ALG|?|60|71,54,55,69,20,33
CAM|Marouane Admar|FRA|?|59|73,50,56,63,46,42
CDM|Stan Berkani|ALG|?|59|62,39,56,62,55,50
`,
  "fra-eag": `
CB|Donatien Gomis|SEN|?|71|71,29,47,45,72,79
ST|Amine Hemia|FRA|?|69|76,71,70,70,59,68
CDM|Tom Ducrocq|FRA|?|69|76,63,64,69,68,73
CM|Dylan Louiserre|FRA|?|69|69,64,67,69,65,73
GK|Adrián Ortolá|ESP|?|68|69,68,71,68,50,65
RB|Erwin Koffi|CIV|?|67|85,55,62,62,60,73
CB|Albin Démouchy|FRA|?|66|39,32,52,53,66,69
GK|Teddy Bartouche-Selbonne|FRA|?|65|70,58,64,64,50,65
CM|Florent Sanchez|FRA|?|65|68,57,67,68,54,56
ST|Stanislas Kielt|FRA|?|64|68,62,50,65,21,61
CM|Darly N'Landu|FRA|?|63|76,57,60,68,58,67
RB|Jérémie Matumona|FRA|?|63|63,46,50,60,59,67
RM|Samir Ben Brahim|FRA|?|63|72,53,57,66,29,46
CDM|Tanguy Ahile|FRA|?|62|60,62,63,63,57,66
RM|Teddy Andami Averlant|GAB|?|62|69,56,59,61,26,57
LM|Gautier Ott|FRA|?|62|85,58,53,64,18,43
LM|Amadou Samoura|FRA|?|61|87,58,51,65,33,53
RM|Jasser Chamakh|FRA|?|61|79,61,51,66,33,44
LB|Vimoj Muntu|FRA|?|61|68,33,53,55,56,52
CM|Joël Matondo|COD|?|60|64,55,55,60,54,57
CB|Nathan Fondja|FRA|?|60|56,25,41,40,59,67
GK|Noah Marec|FRA|?|59|61,59,58,62,25,59
CB|Ibrahima Diakité|MLI|?|57|63,27,43,45,58,59
`,
  "fra-fca": `
RW|Antoine Larose|FRA|?|71|83,64,66,71,33,62
GK|Florian Escales|FRA|?|70|74,71,66,68,28,70
LM|Clément Billemaz|FRA|?|69|86,64,64,68,49,66
CM|Ahmed Kashi|ALG|?|69|45,52,67,67,60,78
CB|François Lajugie|FRA|?|68|65,37,58,57,68,75
ST|Moïse Sahi|CIV|?|68|74,68,59,69,28,61
ST|Thibault Rambaud|FRA|?|67|56,68,52,60,31,78
CB|Julien Kouadio|FRA|?|67|67,29,48,59,66,74
CB|Axel Drouhin|FRA|?|67|66,27,45,51,66,77
GK|Thomas Callens|FRA|?|65|68,65,58,66,17,65
ST|Ben Hamed Touré|CIV|?|65|59,64,54,66,26,64
CB|Thibault Delphis|FRA|?|64|68,39,55,52,63,72
ST|Zépiqueno Redmond|NED|?|64|79,62,52,67,21,54
LM|Kilyan Jusseron Veniere|FRA|?|63|75,55,60,63,44,68
CM|Alexis Casadei|FRA|?|63|49,49,61,63,62,68
CM|Paul Venot|FRA|?|62|63,48,63,60,53,64
LM|Kadan Young|ENG|?|61|83,54,54,63,35,53
CB|Mattéo Veillon|FRA|?|61|52,31,45,37,65,63
RB|Esteban Marre|FRA|?|60|67,29,52,58,55,58
CB|Sacha Lima|FRA|?|60|58,25,41,39,60,64
CDM|Nolan Ferro|FRA|?|59|56,50,58,60,52,63
CDM|Pascal Mozie|POL|?|57|66,45,51,55,56,58
GK|Matéo Gonzalez|FRA|?|57|57,55,54,60,25,53
ST|Adam Yahi|FRA|?|57|62,58,44,55,21,56
`,
  "fra-fcm": `
CAM|Téji Savanier|FRA|?|73|57,72,76,76,62,69
CDM|Jessy Deminguet|FRA|?|71|66,64,72,71,64,73
GK|Jonathan Fischer|DEN|?|71|71,69,70,72,44,70
CDM|Nampalys Mendy|SEN|?|71|55,55,68,72,71,67
ST|Habib Diallo|SEN|?|71|71,72,59,67,22,75
LB|Florian Miguel|FRA|?|69|65,53,61,67,67,78
LB|Maxime Colin|FRA|?|69|64,43,61,66,69,69
RB|Bouna Sarr|SEN|?|68|60,65,70,72,65,62
CB|Jean Ruiz|FRA|?|68|78,42,61,63,66,77
CDM|Alpha Touré|SEN|?|68|67,51,62,66,67,64
GK|Pape Sy|SEN|?|68|71,64,64,68,28,65
ST|Pape Moussa Fall|SEN|?|68|52,69,46,65,30,74
CB|Cristian Devenish|COL|?|68|50,36,45,48,67,74
LM|Giorgi Abuashvili|GEO|?|67|74,60,60,73,26,59
CB|Urie-Michel Mboula|GAB|?|67|61,24,41,50,69,69
LM|Morgan Bokele|CMR|?|66|77,59,59,70,27,55
LM|Nathan Mbala|COD|?|65|72,61,61,68,33,58
ST|Ibou Sané|SEN|?|65|76,64,52,65,22,56
GK|Ousmane Ba|SEN|?|63|65,62,64,67,29,59
CB|Idris Mohamed|COM|?|62|58,32,38,44,62,70
ST|Joseph Mangondo|FRA|?|60|77,59,49,61,23,60
CM|Jahyann Pandore|FRA|?|59|65,49,56,65,51,51
LB|Tahirys dos Santos|FRA|?|58|69,34,44,55,55,54
`,
  "fra-fcn": `
GK|Maxime Dupé|FRA|?|74|72,73,72,74,46,73
CDM|Ibrahima Sissoko|MLI|?|74|55,60,69,67,71,83
CM|Johann Lepenant|FRA|?|73|64,60,72,74,72,73
RB|Frédéric Guilbert|FRA|?|73|68,47,67,70,71,69
RB|Kelvin Amian|FRA|?|71|77,48,58,65,71,77
CM|Louis Leroux|FRA|?|71|65,62,68,72,65,63
LM|Mathieu Cafaro|FRA|?|71|73,67,70,73,47,64
ST|Ignatius Ganago|CMR|?|71|78,71,61,74,34,66
LM|Killian Corredor|FRA|?|71|79,69,67,72,27,66
ST|Mostafa Mohamed|EGY|?|71|66,71,58,64,38,76
LW|Bahereba Guirassy|FRA|?|71|87,62,64,71,29,49
CB|Tylel Tati|FRA|?|71|69,36,54,56,71,74
RB|Fabien Centonze|FRA|?|70|67,51,72,68,67,68
CB|Lucas Perrin|FRA|?|70|34,35,51,55,70,77
CM|Dehmaine Tabibou|FRA|?|69|65,56,71,74,54,60
CB|Saïdou Sow|GUI|?|69|58,41,53,60,68,74
RM|Yassine Benhattab|FRA|?|69|83,51,65,77,35,41
LM|Antoine Joujou|FRA|?|68|70,65,63,71,22,53
CM|Wilitty Younoussa|CMR|?|66|73,49,58,70,67,57
CDM|Lamine Diack|SEN|?|65|73,59,60,62,63,70
CDM|Bahmed Deuff|MTN|?|65|64,50,59,65,62,74
CB|Sékou Doucouré|FRA|?|64|60,24,43,49,65,63
RW|Moustapha Dabo|FRA|?|63|77,56,58,65,29,44
GK|Alexis Mirbach|FRA|?|60|67,58,58,63,37,56
`,
  "fra-fcs": `
GK|Alexandre Pierre|HAI|?|65|66,64,61,68,20,64
GK|Mehdi Jeannin|ALG|?|62|60,62,62,61,49,63
GK|Matthis Schübler-Lecart|FRA|?|57|54,56,59,62,24,57
CB|Saad Agouzoul|MAR|?|67|39,39,53,51,68,70
CB|Mathieu Peybernès|FRA|?|65|42,35,49,49,65,71
CB|Arthur Vitelli|FRA|?|64|54,26,43,40,65,69
CB|Dalangunypole Gomis|FRA|?|61|59,32,50,49,62,62
LB|Dylan Tavares|CPV|?|63|72,43,52,62,59,59
RB|Bendjaloud Youssouf|COM|?|63|71,54,57,59,57,68
RB|Élie N'Gatta|CIV|?|61|71,32,49,55,60,64
CDM|Julien Masson|FRA|?|65|64,53,58,61,62,72
CDM|Honoré Bayanginisa|COD|?|60|64,45,55,61,56,56
CM|Victor Lobry|FRA|?|67|74,63,68,68,54,68
CM|Jonathan Mexique|FRA|?|63|65,49,60,63,58,65
LM|Benjamin Gomel|FRA|?|66|68,61,61,67,45,60
LM|Landry Nomel|FRA|?|62|71,61,54,63,26,58
RM|Julien Vetro|FRA|?|60|73,55,54,62,22,52
RM|Ethan Cortes|FRA|?|59|75,56,54,58,30,48
ST|Mathis Clairicia|FRA|?|66|68,64,51,62,29,76
ST|Kapit Djoco|FRA|?|66|62,64,57,65,27,65
ST|Boubacar Fofana|FRA|?|62|81,60,55,68,29,56
ST|Samy Baghdadi|FRA|?|62|65,62,58,60,22,59
`,
  "fra-gf3": `
CM|Maël Corboz|USA|?|69|77,61,66,69,61,73
LB|Matthéo Xantippe|FRA|?|69|77,52,59,70,62,73
ST|Leonardo Cerri|ITA|?|69|51,68,49,60,32,73
CB|Clément Vidal|FRA|?|69|40,35,48,57,70,72
LM|Yadaly Diaby|GUI|?|68|80,69,63,70,36,74
GK|Alexandre Olliero|FRA|?|68|68,63,66,70,46,67
CDM|Yohann Magnin|FRA|?|67|65,57,59,64,65,68
CM|Lucas Bernadou|FRA|?|67|65,54,66,67,60,65
CB|Loris Mouyokolo|FRA|?|66|58,41,43,46,64,82
GK|Bobby Allain|FRA|?|65|63,65,67,64,38,66
ST|Ugo Bonnet|FRA|?|65|71,65,52,62,30,71
RM|Mamady Bangré|BFA|?|65|72,56,62,68,45,47
ST|Moussa Djitté|SEN|?|65|70,62,56,67,28,65
RM|Nesta Zahui|FRA|?|64|81,52,58,68,58,46
CAM|Baptiste Mouazan|FRA|?|64|57,54,62,68,59,58
CDM|Samba Lélé Diba|SEN|?|63|48,48,52,58,61,78
LM|Evans Maurin|FRA|?|63|73,63,55,66,20,61
CB|Allan Tchaptchet|FRA|?|63|38,36,46,41,61,75
CB|Efe Sarıkaya|TUR|?|62|72,32,47,54,60,74
ST|Arthur Lallias|FRA|?|62|64,58,48,65,25,65
LB|Mathieu Mion|FRA|?|62|68,29,47,56,62,59
RB|Ange-Loïc N'Gatta|CIV|?|61|56,35,51,62,61,66
GK|Théo Borne|FRA|?|60|58,63,52,64,31,56
RB|Sakhalou Niakaté|FRA|?|58|65,32,44,54,55,58
`,
  "fra-mhs": `
CB|Julien Laporte|FRA|?|73|53,29,46,49,73,79
GK|Simon Ngapandouetnbu|CMR|?|69|72,69,67,72,23,70
RB|Enzo Tchato|CMR|?|70|90,45,60,64,65,71
LB|Théo Sainte-Luce|FRA|?|70|77,47,59,69,65,65
CM|Florian Tardieu|FRA|?|70|34,59,70,68,66,74
CM|Khalil Fayad|MAR|?|69|66,59,68,75,63,46
RM|Nicolas Pays|FRA|?|68|91,55,64,67,39,68
CB|Daylam Meddah|FRA|?|67|70,51,62,66,65,73
ST|Mamadou Camara|MLI|?|67|78,65,58,66,27,68
GK|Mathieu Michel|FRA|?|66|67,65,65,68,49,62
CDM|Everson Junior|FRA|?|65|78,56,61,68,57,72
CDM|Théo Chennahi|FRA|?|65|66,56,64,65,59,71
LM|Yanis Issoufou|FRA|?|65|72,54,62,66,55,61
RB|Naoufel El Hannach|MAR|?|64|66,32,55,58,64,67
CB|Yaël Mouanga|FRA|?|64|49,26,44,58,64,67
RB|Wilfried Ndollo Bille|CMR|?|63|67,32,48,61,59,68
ST|Junior Ndiaye|UAE|?|62|67,61,51,63,20,64
CM|Noah Vidal-Cartoux|FRA|?|61|69,42,61,65,62,45
RM|Axel Gueguin|FRA|?|61|76,55,54,67,33,41
CM|Nabil Homssa|FRA|?|60|63,52,57,64,53,70
GK|Viktor Džodić|SRB|?|58|59,57,56,57,21,54
CM|Grégory Ayem|FRA|?|57|65,48,58,57,54,67
ST|Daryll Benlahlou|ALG|?|57|62,56,47,56,17,49
`,
  "fra-rsf": `
GK|Gaëtan Poussin|FRA|?|72|75,66,63,78,56,74
CB|Pierre Lemonnier|FRA|?|71|47,28,49,59,72,78
CB|Dylan Durivaux|FRA|?|70|84,59,63,64,70,81
ST|Damien Durand|FRA|?|70|72,74,71,71,37,61
LB|Leonardo Buta|POR|?|69|81,49,60,65,63,69
CDM|Balthazar Pierret|FRA|?|69|66,51,59,65,68,74
CB|Bradley Danger|FRA|?|68|73,63,63,68,66,75
CM|Ryad Hachem|FRA|?|67|72,61,65,69,64,71
ST|Kévin Cabral|FRA|?|66|84,63,58,68,45,60
CB|Matthieu Huard|FRA|?|66|69,40,57,67,65,76
CM|Saîf-Eddine Khaoui|TUN|?|66|51,60,68,69,49,64
LM|Kémo Cissé|FRA|?|66|87,59,60,69,23,47
CM|Samuel Renel|FRA|?|65|72,61,66,69,50,60
ST|Jovany Ikanga|FRA|?|65|77,65,59,64,20,69
RB|Théo Magnin|SUI|?|65|70,42,56,65,60,51
CB|Josué Escartin|FRA|?|65|62,30,46,45,63,70
CAM|Guillaume Trani|FRA|?|64|67,66,62,64,40,57
GK|Yanis Benchaouch|MAR|?|62|62,64,65,66,34,60
CB|Elyaz Zidane|FRA|?|62|60,45,54,57,63,62
LB|Sékou Guindo|MLI|?|59|74,43,44,59,53,51
CM|Cheick Konaté|CIV|?|58|71,42,55,61,51,53
CDM|Islamdine Halifa|FRA|?|58|59,41,55,55,55,59
`,
  "fra-sdr": `
GK|Tom Ritzy Hülsmann|GER|?|68|67,66,66,69,26,68
GK|Alexis Sauvage|FRA|?|66|69,67,63,66,44,63
GK|Soumaïla Sylla|GUI|?|60|61,58,60,59,49,58
CB|Joseph Okumu|KEN|?|71|78,41,56,62,69,78
CB|Samuel Kotto|CMR|?|67|71,35,53,57,63,81
CB|Elie N'Tamon|CIV|?|66|41,33,46,50,66,71
RB|Armel Zohouri|CIV|?|61|66,30,52,56,58,64
RB|Jean Mambuku|ITA|?|58|65,24,50,50,55,57
LB|Daouda Guindo|MLI|?|73|84,49,62,72,69,69
LB|Akieme|ESP|?|71|81,52,56,68,66,77
CDM|Mory Gbane|CIV|?|70|46,41,59,61,67,81
CM|Théo Leoni|BEL|?|73|70,67,72,72,69,70
CM|Yaya Fofana|CIV|?|67|72,54,62,71,62,62
CM|John Patrick|IRL|?|65|74,55,58,67,57,74
LM|Keito Nakamura|JPN|?|76|85,74,70,77,41,75
CAM|Reda Khadra|GER|?|71|85,65,67,77,49,67
CAM|Martial Tia|MLI|?|67|68,61,65,70,46,63
ST|Oumar Diakité|CIV|?|72|82,71,57,70,21,71
ST|Jordan Siebatcheu|USA|?|72|52,71,61,70,39,76
ST|Sambou Soumano|SEN|?|72|69,74,58,72,28,56
ST|Youssef El Kachati|MAR|?|70|89,72,59,70,30,61
ST|Mohamed Daramy|DEN|?|69|83,67,65,73,27,66
ST|Yohan Demoncy|FRA|?|66|65,61,66,68,57,76
ST|Amine Salama|FRA|?|66|85,64,56,65,24,58
`,
  "fra-usl": `
ST|Thomas Robinet|FRA|?|69|73,69,62,70,40,73
CB|Opa Sangante|GNB|?|69|46,51,58,59,69,80
CDM|Steven Nzonzi|FRA|?|69|32,56,65,63,69,71
LB|Lenny Vallier|FRA|?|67|75,60,65,66,63,69
GK|Maxence Prévot|FRA|?|66|64,67,66,63,36,67
RB|Allan Linguet|FRA|?|66|71,31,50,66,62,67
CAM|Adrien Lebeau|FRA|?|65|76,56,65,69,47,53
RW|Khalil Ayari|TUN|?|65|74,59,62,69,29,49
CB|Ousmane Touré|FRA|?|65|71,26,49,57,66,64
GK|Moha Ramos|ESP|?|64|64,63,66,63,28,64
CB|Bram Lagae|BEL|?|64|68,34,48,55,65,68
CB|Victor Mayela|FRA|?|64|54,39,50,54,63,65
LM|Egor Prutsev|RUS|?|63|74,53,61,62,42,45
ST|Enzo Mayilla|FRA|?|61|61,60,47,53,24,67
CDM|Théna Massock|FRA|?|61|49,38,53,54,58,60
LM|Alex Daho|FRA|?|60|64,66,58,63,43,54
LM|Souleymane Keita|FRA|?|60|79,54,52,64,30,57
LB|Maedine Makhloufi|ALG|?|60|63,42,53,57,56,58
CM|Jordan Morel|FRA|?|59|63,43,60,57,56,52
GK|Mouhamed Sissokho|SEN|?|59|60,57,57,60,29,61
CM|Marco Decherf|FRA|?|57|62,44,56,61,47,55
ST|Pape Malick Dieng|SEN|?|57|72,57,49,62,34,48
CDM|Franck Atoen|CMR|?|57|62,41,53,52,55,57
RB|Lenny Dziki|CGO|?|57|68,27,42,51,52,44
`,
};
