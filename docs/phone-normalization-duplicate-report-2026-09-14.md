# Rapport des doublons de telephone

Genere le 2026-09-14 depuis la base Supabase, avant toute ecriture.

Regle simulee : suppression des caracteres non numeriques, ajout de `509` pour 8 chiffres, conservation de `509XXXXXXXX` pour 11 chiffres.

## Resume

- Comptes inspectes : 529
- Numeros normalisables : 522
- Numeros invalides ou etrangers : 7
- Numeros normalises distincts : 518
- Groupes en conflit : 4
- Comptes conserves inchanges pour revue admin : 8

## Conflits

| Numero normalise | Compte | Numero original | Cree le | Role | CP | HTG |
| --- | --- | --- | --- | --- | ---: | ---: |
| +50940404791 | `03f8f6b9-e0fc-40de-a9d9-fe8486269881` | `40404791` | 2026-07-28T11:15:51Z | client | 0 | 0 |
| +50940404791 | `270bc5be-8e73-42ec-b437-e6ccdfdcd7f9` | `+50940404791` | 2026-07-28T12:44:52Z | client | 0 | 0 |
| +50941989121 | `269639ee-2f32-40ba-9f01-3ea1277636aa` | `+50941989121` | 2026-02-16T20:45:36Z | client | 5 | 0 |
| +50941989121 | `3e014395-2f39-4a65-aa81-c979f8be0184` | `41989121` | 2026-09-09T04:11:32Z | client | 0 | 0 |
| +50947424857 | `f63e53a4-353e-4497-9b0f-7f8b6654e0ec` | `+50947424857` | 2026-02-14T18:19:24Z | client | 0 | 0 |
| +50947424857 | `b6041114-608e-41d0-87ed-9baf29171fa6` | `47424857` | 2026-02-14T18:21:28Z | client | 0 | 0 |
| +50955220092 | `9f8eb8e3-fc77-4358-bc43-88c1e732919f` | `55220092` | 2026-01-21T12:58:28Z | client | 0 | 0 |
| +50955220092 | `703f104f-083f-4161-931f-24de680b87ef` | `50955220092` | 2026-01-22T02:48:31Z | client | 0 | 0 |

## Comptes non normalisables

Ces comptes ne sont pas modifies automatiquement car ils ne correspondent pas au format haitien attendu ou sont invalides :

- `0b861a5c-9ea5-4e92-9926-38913d0bd3d2` : `+16193410217`
- `88b44897-edd7-4e1c-9200-0e52391d4b0f` : `2393979834`
- `ccc9ee61-f909-48cc-a2be-e32f277e032c` : `Beauvois`
- `278cb694-a5c9-4161-8e01-cc2d58ef4b37` : `8298416668`
- `b7b82583-b893-48b6-ba4b-7f52b3e08471` : `362799926`
- `1d822629-c98b-47bc-9c01-37592140e119` : `+261325598089`
- `09b8e5eb-5194-40a9-864e-ad066a5bb78b` : `405592911`

Aucune fusion, suppression ou modification de solde n'a ete effectuee.
