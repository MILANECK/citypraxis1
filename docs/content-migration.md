# Original content migration and brand update

Source fetched: https://citypraxis.wien/ on 15 September 2026. Source snapshot: `source-site.html`; extracted paragraphs, lists and image references: `source-content.json`. The extraction and mapping scripts are reproducible. These files are migration evidence, not public assets.

## Coverage

| Original material | New destination |
| --- | --- |
| Physiotherapy purpose, effects, applications and method list | `/leistungen/physiotherapie` |
| Fascia explanation, FDM, FM and complaint lists | `/leistungen/faszienbehandlungen` |
| CRAFTA explanation and all seven application groups | `/leistungen/crafta` |
| CMD explanation and applications | `/leistungen/cmd` |
| Rückenfit course, requirements, symptoms, €250 course cost and SVS paragraph | `/leistungen/rueckenfit` |
| Osteopathy training, whole-body explanation, first/subsequent treatment and prescription text | `/leistungen/osteopathie` |
| Massage overview, classical/medical massage, foot reflexology heading and original hospitality text, APM, craniosacral therapy, lymphatic drainage | `/leistungen/heilmassage` |
| Logopaedics scope, interdisciplinary approach, CRAFTA and complete focus list | `/leistungen/logopaedie` |
| Team of 12, qualifications, specializations and practice aim | `/ueber-uns` |
| Wahltherapie, prescription, approval, preparation, payment and cancellation terms | `/ablauf-wahltherapie` |
| Reimbursement table and course price | `/preise` |

Clinical descriptions are preserved from the source. Edits are principally joining layout-fragmented lines, removing invisible formatting characters, normalizing headings and placing lists in readable markup. The duplicated Rückenfit price appears once. Long method explanations have dedicated pages linked from Physiotherapie. The original claim wording is preserved; this migration is not a new clinical endorsement.

The reimbursement table is explicitly labelled **04/2023**, including its original ÖGKK heading. It is separate from practice prices. No prices for individual therapy appointments were located on the source. The source's insurance approval and SVS paragraphs are preserved with a clear note to check current requirements, not presented as newly verified rules.

## Team placeholders

The original source has a team overview but no named roster. At the user's request, 12 editable cards were created. Anna Katharina Plank, BSc, her role and contact details are supplied by `F:/ISA2/overview_01.png`. The email on that card is `amandavoeltl@citypraxis.wien`; this differs from the displayed name and should be confirmed before publication. Eleven remaining names are fictional and labelled as such. Four reusable sample portraits from Random User are placeholder imagery, not photographs of the named staff. Sources are recorded in `team-placeholder-sources.json`.

Admin → Team supports adding, deleting, ordering, editing contact details, changing or clearing photos, uploading new photos, and changing fictional/profile-photo labels. Normal draft/publish behavior applies.

## Exact brand values

The existing site's inline styles contain: primary blue `#0085AC`, magenta `#951B81`, dark blue `#222344`, light blue `#E6F3F7` and `#99CEDE`, beige `#F6F4F1`, muted taupe `#BBA7A9`, dark berry `#400C37`. These are source values; the attached palette image was a visual approximation. The user subsequently selected predominantly white/light-grey surfaces, occasional beige cards, and restrained blue/magenta accents.

## Hero and media

The supplied `Cityp Web-1.mp4` is 37.233 seconds, 1920×1080 H.264, originally 120 fps with audio. The local hero asset is 30 fps, silent, fast-start MP4, approximately 12.7 MB. Its source file remains unchanged. A still frame is used as the loading/failure/reduced-motion fallback. Hero video is muted, inline and looped; visitors can pause it. Reduced-motion and data-saving preferences suppress automatic playback.

Admin → Startbild & Video supports switching photo/video, direct uploads, library selection, poster photo, desktop/mobile crop positions, height, overlay darkness and text. MP4 uploads are limited to 60 MB, images to 10 MB. File signatures, authentication and CSRF checks precede saving. The server supports streamed range requests for playback and seeking.
