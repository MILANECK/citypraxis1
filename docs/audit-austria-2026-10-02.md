# CityPraxis: predbežný právny a dátový audit (2. 10. 2026)

Rozsah: aktuálny kód verejného webu, administrácie a chatbota; seedované texty, prevádzková dokumentácia a čítanie publikovaného obsahu. Toto nie je právne stanovisko. **Requires confirmation by Austrian legal/GDPR counsel** pri označených otázkach. Publikovaný obsah v administrácii sa môže od seedovaných textov líšiť; pred spustením treba skontrolovať práve publikovanú DE verziu.

## A. Kritické pred spustením

1. **Ukážkové hodnotenia.** V publikovaných dátach boli tri hodnotenia s menami a hviezdičkami; vlastník potvrdil, že ide o placeholdery. Nemajú sa prezentovať ako skúsenosti pacientov. Verejná stránka po technickej úprave ukáže iba záznam s výslovným potvrdením pravosti v administrácii. Terajšie tri záznamy potvrdenie nemajú. Budúce recenzie sa budú kopírovať ručne z Google, bez živej integrácie. Pred zaškrtnutím treba porovnať meno, hviezdičky aj celý text s originálom a uložiť jeho odkaz. Právne podmienky reprodukcie textu, meno pacienta a prípadné oprávnenie na zverejnenie: **Requires confirmation by Austrian legal/GDPR counsel**.
2. **Publikovaná Datenschutzerklärung je miestami nepresná.** Telefón v termínovom formulári je povinný, zatiaľ čo publikovaný text ho označuje ako voliteľný. Text tvrdí existenciu SCC pre presuny mimo EHP, no z projektu nevieme overiť konkrétne podpísané zmluvy/nastavenia. Oba výroky treba opraviť až po overení reálnej konfigurácie; nevyhlasovať neoverené záruky. Právny základ spracovania údajov o zdraví a rozsah informovania podľa čl. 13 GDPR: **Requires confirmation by Austrian legal/GDPR counsel**.
3. **Identita prevádzkovateľa a profesijné údaje v Impressume.** Návrh obsahuje meno, adresu a kontakty, ale musí sa potvrdiť presná právna forma, zodpovedný poskytovateľ, relevantné profesijné označenia/autorita, prípadne UID a zápis v registri. Nedomýšľať. [WKO k § 5 ECG](https://www.wko.at/internetrecht/informationspflichten-nach-dem-e-commerce-gesetz--dem-unte). **Requires confirmation by Austrian legal/GDPR counsel**.
4. **Citlivé zdravotné údaje v chate a e-maile.** Voľný text môže obsahovať symptómy, diagnózy a operácie. Chat po odoslaní ukladá celý prepis do Supabase; recepčný e-mail a kópia pacientovi obsahujú údaje o ťažkostiach. Posúdiť nevyhnutnosť celého prepisu a e-mailovej kópie, bezpečnosť schránky, prístupy a vhodný právny základ podľa čl. 9 GDPR. [GDPR](https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng). **Requires confirmation by Austrian legal/GDPR counsel**.
5. **Zmluvy so spracovateľmi a prenosy.** Nestačí, že poskytovatelia ponúkajú DPA. Treba preveriť skutočné účty, podpísané AVV/DPA, regióny, subdodávateľov, prenosy mimo EHP a relevantné opatrenia. Tabuľka nižšie. **Requires confirmation by Austrian legal/GDPR counsel**.

## B. Odporúčané pred spustením

1. **Marketingové tvrdenia:** nižšie uvedené formulácie by mal schváliť odborný garant a právnik. Návrhy sa automaticky neprepisovali.
2. **Termínové podmienky:** formulár správne oznamuje, že odoslanie nie je potvrdením termínu. Pred odoslaním však nie sú spolu viditeľné cena/súkromná terapia, možné refundácie a pravidlá storna. Starší obsah uvádza 24 pracovných hodín a poplatok za nevyužitý termín; aktuálnosť a výška musia byť potvrdené pred zverejnením v kroku odoslania. **Requires confirmation by Austrian legal/GDPR counsel**.
3. **Retencia:** proces v `docs/data-protection-operations.md` určuje 30-minútový neodoslaný chat, manuálne zmazanie webovej žiadosti a vlastných e-mailov po dohodnutí termínu a presune potrebných údajov do oddeleného systému; nevyriešené žiadosti sa preverujú najmenej mesačne a približne po mesiaci bez ďalšieho kontaktu manuálne mažú. Nie je nastavená automatická retencia odoslaných žiadostí. Treba určiť majiteľa procesu a doklad o vykonaní; preveriť zálohy, provider logy a e-mailové kópie u pacientov. Klinická dokumentácia je oddelená; zákonnú lehotu posudzovať osobitne podľa [MTD-Gesetz § 34](https://ris.bka.gv.at/eli/bgbl/i/2024/100/P34/NOR40264039).
4. **Prístupnosť:** formuláre majú menovky a stavy chýb, chat je prístupný klávesnicou v základnom toku, nová mapa má tlačidlo a viditeľný focus. Stále treba manuálne prejsť všetky modaly, mobilnú klávesnicu, alt texty nahratých médií, kontrast a čítačku obrazovky v DE. Formálny WCAG audit sa nevykonal.
5. **Technické logy a zálohy:** potvrdiť retention pre Render, Supabase, OpenAI a Resend; oddeliť ho od prevádzkového pravidla žiadostí. Neuvádzať jedinú spoločnú dobu vymazania. Preskúmať záznamy serverových chýb, aby neobsahovali zbytočné zdravotné údaje.

## C. Užitočné doplnenia

- Interný zoznam schválených recenzií: URL originálu, dátum prevzatia, kto porovnal meno/hviezdičky/text, či sa originál zmenil alebo zmizol. Web nemusí zobrazovať tento interný záznam.
- Kontrolný postup pre zmazanie žiadosti aj príslušných správ zo schránky, a pravidelná kontrola rolí administrácie.
- Pravidelný obsahový a technický regresný test nemeckého chatu, bezpečnostného eskalovania, prístupnosti a externých požiadaviek pred každým nasadením.

## D. Údaje potrebné od CityPraxis

- Presná identita a právna forma prevádzkovateľa; príslušné profesijné orgány, registračné údaje/UID ak existujú; kto je kontaktný bod pre GDPR.
- Podpisy a konfigurácia DPA/AVV, regióny a subdodávatelia každého poskytovateľa; retention logov a záloh; vlastníctvo a zabezpečenie recepčnej schránky.
- Potvrdené aktuálne ceny, refundácie, stornovacia lehota a účtovaná suma; presný okamih vzniku záväznej rezervácie.
- Schválenie medicínskych tvrdení odborným garantom; prípadné dôkazy pre výsledkové či porovnávacie tvrdenia.
- Pre každú reálnu recenziu odkaz na originál a rozhodnutie o reprodukcii mena/textu; kontrola, či neobsahuje citlivé údaje pacienta.

## Zistenia po oblastiach

| Oblasť | Stav a hranica záveru |
| --- | --- |
| Impressum | Stránka existuje; identita a profesijné náležitosti nie sú nezávisle overené. |
| GDPR | Formulár, chat, priame e-maily, admin, logy a externí spracovatelia sú zdokumentovaní; publikovaná politika vyžaduje zosúladenie s povinným telefónom, mapou a preukázanými prenosmi. |
| AI transparentnosť | Úvod chatu je po úprave výslovne označený ako KI/AI asistent ešte pred začiatkom. [AI Act čl. 50](https://eur-lex.europa.eu/eli/reg/2024/1689/2026-07-27/eng). |
| Medicínska bezpečnosť | Prompt a pravidlá zakazujú diagnostiku, chat oznamuje, že neposkytuje medicínsku radu, pri rozpoznanej naliehavosti smeruje na 144/112. Heuristiky nepokrývajú všetky formulácie; potrebné sú reálne DE testy a odborná revízia. |
| Minimalizácia | Formulár má voliteľné kategórie ťažkostí a krátky voľný text; kontakt vyžaduje meno, e-mail aj telefón. Posúdiť, či sú oba kontaktné kanály nevyhnutné a či musí zostať celý chatový prepis. |
| Oddelenie záznamov | Žiadosti/chat sú v tabuľke žiadostí, nie v klinickej dokumentácii. Následný prenos do praxového systému vykonáva recepcia manuálne. |
| Booking | Zobrazuje „Anfrage, noch keine Terminbestätigung“; podmienky ceny/refundácie/storna treba potvrdiť a sprístupniť v kontexte formulára. |
| Recenzie | Aktuálne tri sú podľa vlastníka placeholdery; po úprave sa bez potvrdenia pravosti na webe nezobrazia. |
| Cookies/tracking | Nenašli sa analytické ani reklamné skripty. Lokálna pamäť uchováva jazyk, informáciu o súkromí a neodoslaný chat. Google Maps sa po úprave načíta až po kliknutí; informáciu o cookies treba zosúladiť s finálnymi poskytovateľmi. [DSB FAQ](https://dsb.gv.at/faqs/datenschutz-cookies), [TKG § 165](https://www.ris.bka.gv.at/NormDokument.wxe?Abfrage=Bundesnormen&Gesetzesnummer=20011678&Paragraf=165). |
| Bezpečnosť | Server overuje admin oprávnenia; Supabase RLS je zapnuté a žiadosti nie sú verejne dostupné. Pri kontrole frontendového kódu sa nenašiel vystavený serverový kľúč. Toto nenahrádza penetračný test ani kontrolu reálnych cloudových nastavení. |

## Medicínske a reklamné formulácie na rozhodnutie

Texty nižšie sú v importovanom/publikovanom nemeckom obsahu; skontrolovať presné znenie v aktuálnej verzii administrácie. Nejde o konečný právny záver. **Requires confirmation by Austrian legal/GDPR counsel**.

| Umiestnenie | Potenciálne problematická formulácia | Vecná alternatíva |
| --- | --- | --- |
| Domov, nadpis | „Wo andere aufhören, fangen wir erst an.“ | „Therapieangebote für unterschiedliche Anliegen.“ |
| O nás | „Wir möchten Ihnen eine erfolgreiche Therapie bieten ...“ | „Wir möchten Sie mit einer auf Ihr Anliegen abgestimmten Therapie begleiten.“ |
| O nás | „... auf den Weg zu ... Schmerzfreiheit ...“ | „... bei Ihren Zielen für Beweglichkeit und Wohlbefinden ...“ |
| Osteopathie | „... körpereigene Selbstheilungsprozesse und Heilung ... anzuregen und zu fördern.“ | „Die Behandlung orientiert sich an Anamnese und individueller Untersuchung.“ |
| Osteopathie | „Die Stärke der Osteopathie ... im Gegensatz zu ... Symptombehandlung.“ | „Die osteopathische Behandlung betrachtet mehrere körperliche Zusammenhänge.“ |
| Logopädie | „Um den größtmöglichen Erfolg einer Therapie zu erzielen ...“ | „Bei Bedarf arbeiten verschiedene Berufsgruppen zusammen.“ |
| Heilmassage/APM | „... Fehlfunktionen des Energiekreislaufes ... wieder in ein Fließen ...“ | „APM nach Penzel ist eine manuelle Methode; ob sie für Ihr Anliegen geeignet ist, wird individuell besprochen.“ |
| Faszien/FDM | „... rasch wirkende, sowie effektive Therapiemaßnahme ...“ | „FDM ist eine intensive manuelle Behandlungsmethode.“ |
| Faszien/FDM | „... optimalen Wirkeffekt wiederherzustellen.“ | „... das betroffene Gewebe durch manuelle Techniken zu behandeln.“ |
| Faszien/FM | „... sehr effektive Behandlung bei vielfältigen Beschwerden.“ | „FM ist eine manuelle Behandlungsmethode für ausgewählte Beschwerden.“ |

## Spracovatelia / AVV-DPA kontrola

| Služba | Údaje a účel | Čo potvrdiť |
| --- | --- | --- |
| Render | Webové požiadavky, IP/technické logy; hostovanie servera a dočasný chat v pamäti. | [DPA](https://render.com/dpa), región, subdodávatelia, log retention a prenosy. |
| Supabase | Účty admina, obsah, žiadosti vrátane dobrovoľných zdravotných údajov a uložený chat; databáza a médiá. | [DPA](https://supabase.com/legal/customer-resources/data-processing-addendum), región, zálohy, RLS, prístupy, subdodávatelia, prenosy. |
| OpenAI API | Správa, kontext, prípadne dobrovoľné údaje o zdraví; tvorba odpovede asistenta. | [DPA](https://openai.com/policies/data-processing-addendum/), nastavenia retention, región/spracovanie, prenosy, rozsah maskovania. `store:false` nie je záruka nulovej retention. |
| Resend | Recepčné oznámenie a voliteľná kópia pacientovi s kontaktom a obsahom žiadosti; doručenie e-mailu. | [DPA](https://resend.com/legal/dpa), región, logy, prenosy, príjemcovia a bezpečnosť e-mailových schránok. |
| Google Maps | IP, technické údaje a potenciálne cookies po vedomom otvorení mapy. | Podmienky Google, mechanizmus prenosu a presný text upozornenia; [Google security information](https://developers.google.com/maps/security/compliance/security-compliance). |

Ďalšie externé prepojenia (napr. sociálne siete či „Route planen“) sa otvárajú až po kliknutí; konkrétne služby a účty treba skontrolovať pred spustením. Táto tabuľka nepreukazuje, že konkrétna DPA už bola podpísaná.
