import {childrenService} from './therapy-catalog.mjs';

const appointmentConcerns=[{title:'Kiefer',titleEn:'Jaw'},{title:'Kopf & Migräne',titleEn:'Headaches & migraine'},{title:'Tinnitus',titleEn:'Tinnitus'},{title:'Schwindel',titleEn:'Dizziness'},{title:'Unfall & OP',titleEn:'Injury & surgery'},{title:'Kindergesundheit',titleEn:"Children's health"},{title:'Logopädie',titleEn:'Speech therapy'},{title:'Andere Beschwerden',titleEn:'Other concern',custom:true}];
const priceList=[
  {id:'physio-ersttermin-casny',category:'Physiotherapie',categoryEn:'Physiotherapy',title:'Einzel-, Sport-, Faszien- oder Kieferphysiotherapie CRAFTA®',titleEn:'Individual, sports, fascial or jaw physiotherapy CRAFTA®',duration:'Ersttermin Isabella Casny',durationEn:'First appointment with Isabella Casny',amount:160,order:10},
  {id:'physio-kinder-casny',category:'Physiotherapie',categoryEn:'Physiotherapy',title:'Einzel-, Sport-, Faszien- oder Kieferphysiotherapie CRAFTA®',titleEn:'Individual, sports, fascial or jaw physiotherapy CRAFTA®',duration:'Ersttermin Kinder · Isabella Casny',durationEn:'First appointment for children · Isabella Casny',amount:130,order:20},
  {id:'physio-ersttermin-team',category:'Physiotherapie',categoryEn:'Physiotherapy',title:'Einzel-, Sport-, Faszien- oder Kieferphysiotherapie CRAFTA®',titleEn:'Individual, sports, fascial or jaw physiotherapy CRAFTA®',duration:'Ersttermin Team · 60 Min.',durationEn:'First appointment with the team · 60 min.',amount:130,order:30},
  {id:'physio-folge-45',category:'Physiotherapie',categoryEn:'Physiotherapy',title:'Folgebehandlung',titleEn:'Follow-up treatment',duration:'45 Min.',durationEn:'45 min.',amount:110,order:40},
  {id:'physio-folge-30',category:'Physiotherapie',categoryEn:'Physiotherapy',title:'Folgebehandlung',titleEn:'Follow-up treatment',duration:'30 Min.',durationEn:'30 min.',amount:75,order:50},
  {id:'physio-hausbesuch',category:'Physiotherapie',categoryEn:'Physiotherapy',title:'Physiotherapie mit Hausbesuch',titleEn:'Physiotherapy home visit',duration:'Auf Anfrage',durationEn:'On request',amount:125,details:'In den Bezirken 1–3 möglich',detailsEn:'Available in districts 1–3',order:60},
  {id:'osteo-ersttermin-casny',category:'Osteopathie',categoryEn:'Osteopathy',title:'Osteopathische Behandlung',titleEn:'Osteopathic treatment',duration:'Ersttermin Isabella Casny',durationEn:'First appointment with Isabella Casny',amount:160,details:'Craniale, viszerale und strukturelle Therapie',detailsEn:'Cranial, visceral and structural therapy',order:70},
  {id:'osteo-ersttermin-team',category:'Osteopathie',categoryEn:'Osteopathy',title:'Osteopathische Behandlung',titleEn:'Osteopathic treatment',duration:'Ersttermin Team',durationEn:'First appointment with the team',amount:130,order:80},
  {id:'osteo-folge',category:'Osteopathie',categoryEn:'Osteopathy',title:'Osteopathische Behandlung',titleEn:'Osteopathic treatment',duration:'Folgebehandlung',durationEn:'Follow-up treatment',amount:110,order:90},
  {id:'logo-ersttermin',category:'Logopädie',categoryEn:'Speech therapy',title:'Logopädische Behandlung',titleEn:'Speech and language therapy',duration:'Ersttermin',durationEn:'First appointment',amount:120,details:'Inklusive Vor- und Nachbereitung',detailsEn:'Includes preparation and follow-up',order:100},
  {id:'logo-folge',category:'Logopädie',categoryEn:'Speech therapy',title:'Logopädische Behandlung',titleEn:'Speech and language therapy',duration:'Folgetermin',durationEn:'Follow-up appointment',amount:110,order:110},
  {id:'logo-30',category:'Logopädie',categoryEn:'Speech therapy',title:'Logopädische Behandlung',titleEn:'Speech and language therapy',duration:'30 Min.',durationEn:'30 min.',amount:75,order:120},
  {id:'massage-klassisch-60',category:'Klassische Massagen',categoryEn:'Classic massages',title:'Klassische Massage',titleEn:'Classic massage',duration:'60 Min.',durationEn:'60 min.',amount:90,details:'Teil- oder Ganzkörpermassage',detailsEn:'Partial or full-body massage',order:130},
  {id:'massage-klassisch-45',category:'Klassische Massagen',categoryEn:'Classic massages',title:'Klassische Massage',titleEn:'Classic massage',duration:'45 Min.',durationEn:'45 min.',amount:80,order:140},
  {id:'massage-klassisch-30',category:'Klassische Massagen',categoryEn:'Classic massages',title:'Klassische Massage',titleEn:'Classic massage',duration:'30 Min.',durationEn:'30 min.',amount:60,order:150},
  {id:'lymph-60',category:'Klassische Massagen',categoryEn:'Classic massages',title:'Manuelle Lymphdrainage',titleEn:'Manual lymphatic drainage',duration:'60 Min.',durationEn:'60 min.',amount:90,details:'Auch Gesicht, Mund (intraoral) oder gesamter Körper',detailsEn:'Also face, mouth (intraoral) or whole body',order:160},
  {id:'lymph-45',category:'Klassische Massagen',categoryEn:'Classic massages',title:'Manuelle Lymphdrainage',titleEn:'Manual lymphatic drainage',duration:'45 Min.',durationEn:'45 min.',amount:80,order:170},
  {id:'lymph-30',category:'Klassische Massagen',categoryEn:'Classic massages',title:'Manuelle Lymphdrainage',titleEn:'Manual lymphatic drainage',duration:'30 Min.',durationEn:'30 min.',amount:60,order:180},
  {id:'massage-spezial-60',category:'Klassische Massagen',categoryEn:'Classic massages',title:'Fußreflexzonen-, Faszien-, Akupunkt- oder Triggerpunktmassage',titleEn:'Reflexology, fascial, acupuncture or trigger point massage',duration:'60 Min.',durationEn:'60 min.',amount:90,order:190},
  {id:'massage-spezial-45',category:'Klassische Massagen',categoryEn:'Classic massages',title:'Fußreflexzonen-, Faszien-, Akupunkt- oder Triggerpunktmassage',titleEn:'Reflexology, fascial, acupuncture or trigger point massage',duration:'45 Min.',durationEn:'45 min.',amount:80,order:200},
  {id:'massage-spezial-30',category:'Klassische Massagen',categoryEn:'Classic massages',title:'Fußreflexzonen-, Faszien-, Akupunkt- oder Triggerpunktmassage',titleEn:'Reflexology, fascial, acupuncture or trigger point massage',duration:'30 Min.',durationEn:'30 min.',amount:60,order:210},
  {id:'craniosacral-60',category:'Klassische Massagen',categoryEn:'Classic massages',title:'Craniosacrale Therapie',titleEn:'Craniosacral therapy',duration:'60 Min.',durationEn:'60 min.',amount:90,details:'Keine Osteopathie, reine Wellness-Massage',detailsEn:'Not osteopathy; wellness massage only',order:220},
  {id:'craniosacral-45',category:'Klassische Massagen',categoryEn:'Classic massages',title:'Craniosacrale Therapie',titleEn:'Craniosacral therapy',duration:'45 Min.',durationEn:'45 min.',amount:80,details:'Keine Osteopathie, reine Wellness-Massage',detailsEn:'Not osteopathy; wellness massage only',order:230},
  {id:'gutschein',category:'Gutscheine & Aktionen',categoryEn:'Vouchers & promotions',title:'Gutscheine',titleEn:'Gift vouchers',duration:'Behandlung oder Wunschbetrag',durationEn:'Treatment or chosen amount',details:'Anfrage per E-Mail an info@citypraxis.wien',detailsEn:'Request by email at info@citypraxis.wien',amount:'',order:240},
  {id:'geburtstag',category:'Gutscheine & Aktionen',categoryEn:'Vouchers & promotions',title:'Geburtstagsaktion',titleEn:'Birthday promotion',duration:'–15 %',durationEn:'–15%',details:'Auf eine Behandlung ab 80 € am Geburtstag',detailsEn:'On one treatment priced at €80 or more on your birthday',amount:'',order:250}
];
const imprintDe=`## Diensteanbieterin und Medieninhaberin
Isabella Casny
Citypraxis – Praxis für Physiotherapie & Osteopathie
Stubenbastei 12/11
1010 Wien, Österreich

Telefon: +43 699 12682157
E-Mail: info@citypraxis.wien
Website: https://www.citypraxis.wien

## Berufsrechtliche Angaben
Berufsbezeichnung: Physiotherapeutin
Verleihungsstaat: Österreich
Freiberufliche Berufsausübung: Bescheid der MA 15 aus dem Jahr 2012
Eintragung: Gesundheitsberuferegister
Zuständige Registrierungsbehörde: Gesundheit Österreich GmbH
Zuständige Aufsichtsbehörde: MA 15 – Gesundheitsdienst der Stadt Wien
Freiwillige Berufsvertretung: Physio Austria – Bundesverband der Physiotherapeut*innen Österreichs, Lange Gasse 30/1, 1080 Wien, https://www.physioaustria.at

Berufsrechtliche Vorschriften: MTD-Gesetz 2024 (MTDG), BGBl. I Nr. 100/2024, abrufbar über https://www.ris.bka.gv.at

## Offenlegung gemäß § 25 Mediengesetz
Medieninhaberin und Herausgeberin: Isabella Casny, Stubenbastei 12/11, 1010 Wien.

Grundlegende Richtung: Information über die Citypraxis, die angebotenen Therapie- und Gesundheitsleistungen, organisatorische Abläufe sowie Kontaktmöglichkeiten.

Für den Inhalt verantwortlich: Isabella Casny.

## Haftung für Inhalte und Links
Die Inhalte dieser Website werden mit Sorgfalt erstellt und regelmäßig geprüft. Sie dienen der allgemeinen Information und ersetzen keine individuelle medizinische Beratung, Untersuchung oder Behandlung. Für Inhalte externer Websites, auf die verlinkt wird, sind ausschließlich deren Betreiber verantwortlich. Rechtswidrige Inhalte waren zum Zeitpunkt der Verlinkung nicht erkennbar. Hinweise auf problematische Links richten Sie bitte an info@citypraxis.wien.

## Urheberrecht
Texte, Gestaltung, Fotos und sonstige Inhalte dieser Website sind urheberrechtlich geschützt, soweit nicht anders gekennzeichnet. Eine Verwendung außerhalb der gesetzlichen Grenzen bedarf der vorherigen Zustimmung der jeweiligen Rechteinhaberin oder des jeweiligen Rechteinhabers.

## Gestaltung und Umsetzung
Konzept und Inhalte: Isabella Casny`;
const imprintEn=`## Service provider and media owner
Isabella Casny
Citypraxis – Practice for Physiotherapy & Osteopathy
Stubenbastei 12/11
1010 Vienna, Austria

Phone: +43 699 12682157
Email: info@citypraxis.wien
Website: https://www.citypraxis.wien

## Professional information
Professional title: Physiotherapist
Country in which the title was awarded: Austria
Independent professional practice: MA 15 decision issued in 2012
Registration: Austrian Health Professions Register
Competent registration authority: Gesundheit Österreich GmbH
Competent supervisory authority: MA 15 – Public Health Services of the City of Vienna
Voluntary professional association: Physio Austria – Austrian Association of Physiotherapists, Lange Gasse 30/1, 1080 Vienna, https://www.physioaustria.at

Applicable professional law: MTD Act 2024 (MTDG), Federal Law Gazette I No. 100/2024, available at https://www.ris.bka.gv.at

## Disclosure under section 25 of the Austrian Media Act
Media owner and publisher: Isabella Casny, Stubenbastei 12/11, 1010 Vienna.

Editorial purpose: Information about Citypraxis, its therapy and healthcare services, organisational procedures and contact options.

Responsible for content: Isabella Casny.

## Content and external links
The content of this website is prepared with care and reviewed regularly. It provides general information and does not replace individual medical advice, examination or treatment. The operators of linked external websites are solely responsible for their content. No unlawful content was apparent when a link was added. Please report problematic links to info@citypraxis.wien.

## Copyright
Texts, design, photographs and other content on this website are protected by copyright unless stated otherwise. Use beyond statutory limits requires the prior consent of the respective rights holder.

## Design and implementation
Concept and content: Isabella Casny`;
const privacyDe=`## Verantwortliche
Isabella Casny
Citypraxis – Praxis für Physiotherapie & Osteopathie
Stubenbastei 12/11, 1010 Wien, Österreich
Telefon: +43 699 12682157
E-Mail: info@citypraxis.wien

## Welche Daten wir verarbeiten
Beim Besuch der Website verarbeitet unser Hostinganbieter technisch notwendige Verbindungsdaten, insbesondere IP-Adresse, Datum und Uhrzeit, aufgerufene Adresse, übertragene Datenmenge, Browser und Betriebssystem. Diese Serverprotokolle dienen der sicheren und stabilen Bereitstellung der Website sowie der Fehleranalyse. Rechtsgrundlage ist unser berechtigtes Interesse an einem sicheren Webauftritt gemäß Art. 6 Abs. 1 lit. f DSGVO.

## Terminanfragen
Wenn Sie das Terminanfrageformular verwenden, verarbeiten wir Ihren Namen, Ihre E-Mail-Adresse, optional Ihre Telefonnummer, Ihre bevorzugte Kontaktzeit, die ausgewählte Anliegen-Kategorie, eine freiwillige Kurzbeschreibung und die Angabe, ob Sie einen Akuttermin wünschen. Diese Daten verwenden wir ausschließlich, um Ihre Anfrage zu beantworten und einen Termin vorzubereiten. Rechtsgrundlage für Kontakt- und Termindaten ist Art. 6 Abs. 1 lit. b DSGVO. Soweit Ihre freiwilligen Angaben Gesundheitsdaten erkennen lassen, verarbeiten wir diese aufgrund Ihrer ausdrücklichen Einwilligung gemäß Art. 9 Abs. 2 lit. a DSGVO. Sie können diese Einwilligung jederzeit mit Wirkung für die Zukunft widerrufen.

Bitte übermitteln Sie über das Formular keine Befunde, Diagnosen oder ausführlichen Krankengeschichten. Eine Anfrage ist noch keine Terminbestätigung.

## Speicherung und Empfänger
Die Website wird bei Render Services, Inc. betrieben. Inhalte, Benutzerkonten und Terminanfragen werden über Supabase verarbeitet und gespeichert. Diese Anbieter handeln als technische Dienstleister in unserem Auftrag. Soweit Daten außerhalb des Europäischen Wirtschaftsraums verarbeitet werden, werden die nach der DSGVO vorgesehenen Garantien, insbesondere Standardvertragsklauseln, eingesetzt. Weitere Empfänger erhalten Ihre Daten nur, wenn dies gesetzlich erforderlich ist oder Sie eingewilligt haben.

Terminanfragen speichern wir nur so lange, wie dies zur Bearbeitung, Terminorganisation und zur Abwehr oder Geltendmachung möglicher Ansprüche erforderlich ist. Gesetzliche Aufbewahrungspflichten bleiben unberührt. Administrationskonten bleiben bis zu ihrer Deaktivierung gespeichert. Technische Protokolle werden nur für den zur Sicherheit und Fehleranalyse erforderlichen Zeitraum vorgehalten.

## Cookies und lokale Speicherung
Diese Website verwendet keine Analyse- oder Marketing-Cookies. Technisch notwendige Speicherungen werden für die gewählte Sprache, die sichere Anmeldung im internen Verwaltungsbereich, den Schutz vor unbefugten Anfragen und das Merken dieses Datenschutzhinweises eingesetzt. Sie sind für die von Ihnen angeforderte Funktion erforderlich. Die Rechtsgrundlage ist § 165 Abs. 3 TKG 2021; die anschließende Verarbeitung erfolgt gemäß Art. 6 Abs. 1 lit. f DSGVO beziehungsweise bei der Anmeldung zur Vertragserfüllung.

## Google Maps
Auf der Kontaktseite ist eine Karte von Google Maps eingebunden. Beim Öffnen dieser Seite wird eine Verbindung zu Google hergestellt. Dabei können insbesondere Ihre IP-Adresse, Geräte- und Browserinformationen sowie die aufgerufene Seite an Google übermittelt und von Google verarbeitet werden. Google kann dabei eigene Cookies oder vergleichbare Technologien verwenden. Anbieter ist Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland; eine Verarbeitung in den USA kann nicht ausgeschlossen werden. Weitere Informationen finden Sie unter https://policies.google.com/privacy.

Die Kartenansicht dient dazu, den Praxisstandort leicht auffindbar zu machen. Wenn Sie eine Übermittlung an Google vermeiden möchten, öffnen Sie die Kontaktseite bitte nicht und verwenden Sie stattdessen die im Impressum angegebene Adresse.

## Kontakt per E-Mail oder Telefon
Wenn Sie uns per E-Mail oder Telefon kontaktieren, verarbeiten wir die von Ihnen mitgeteilten Daten zur Bearbeitung Ihrer Anfrage. Rechtsgrundlage ist je nach Inhalt Art. 6 Abs. 1 lit. b oder lit. f DSGVO; Gesundheitsdaten verarbeiten wir nur auf einer dafür zulässigen Grundlage.

## Ihre Rechte
Sie haben im Rahmen der gesetzlichen Voraussetzungen das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch. Eine erteilte Einwilligung können Sie jederzeit für die Zukunft widerrufen. Wenden Sie sich dazu an info@citypraxis.wien.

Sie können außerdem Beschwerde bei der Österreichischen Datenschutzbehörde erheben: Barichgasse 40–42, 1030 Wien, https://www.dsb.gv.at.

## Datensicherheit und Aktualität
Wir treffen angemessene technische und organisatorische Maßnahmen zum Schutz Ihrer Daten. Diese Datenschutzerklärung wird angepasst, wenn sich Funktionen, Anbieter oder rechtliche Anforderungen ändern.

Stand: 22. September 2026`;
const privacyEn=`## Controller
Isabella Casny
Citypraxis – Practice for Physiotherapy & Osteopathy
Stubenbastei 12/11, 1010 Vienna, Austria
Phone: +43 699 12682157
Email: info@citypraxis.wien

## Data processed when you visit
When you access the website, our hosting provider processes technically necessary connection data, including your IP address, date and time, requested address, amount of data transferred, browser and operating system. These server logs support secure and stable delivery and error analysis. The legal basis is our legitimate interest in a secure website under Article 6(1)(f) GDPR.

## Appointment requests
When you use the appointment form, we process your name, email address, optional telephone number, preferred contact time, selected concern category, voluntary short description and whether you request an urgent appointment. We use this information solely to respond and prepare an appointment. The legal basis for contact and scheduling data is Article 6(1)(b) GDPR. Where voluntary information reveals health data, we process it on the basis of your explicit consent under Article 9(2)(a) GDPR. You may withdraw consent at any time for the future.

Please do not submit medical reports, diagnoses or detailed medical histories through the form. A request is not yet an appointment confirmation.

## Storage and recipients
The website is hosted by Render Services, Inc. Content, user accounts and appointment requests are processed and stored using Supabase. These providers act as technical service providers on our behalf. Where data is processed outside the European Economic Area, the safeguards required by the GDPR, in particular standard contractual clauses, are used. Data is disclosed to other recipients only where required by law or with your consent.

We keep appointment requests only as long as needed to handle the request, organise an appointment and establish, exercise or defend possible legal claims. Statutory retention obligations remain unaffected. Administrative accounts remain stored until deactivated. Technical logs are retained only for the period needed for security and error analysis.

## Cookies and local storage
This website does not use analytics or marketing cookies. Technically necessary storage is used for the selected language, secure sign-in to the internal administration area, protection against unauthorised requests and to remember this privacy notice. It is required for the function you request. The legal basis is section 165(3) of the Austrian Telecommunications Act 2021; subsequent processing is based on Article 6(1)(f) GDPR or, for sign-in, performance of a contract.

## Google Maps
The contact page embeds a Google Maps map. Opening that page establishes a connection to Google. In particular, your IP address, device and browser information and the page visited may be sent to and processed by Google. Google may use its own cookies or similar technologies. The provider is Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Ireland; processing in the United States cannot be ruled out. For more information, see https://policies.google.com/privacy.

The map helps visitors find the practice. If you wish to avoid transmitting data to Google, please do not open the contact page and use the address listed in the legal notice instead.

## Contact by email or telephone
If you contact us by email or telephone, we process the information you provide to handle your request. Depending on its content, the legal basis is Article 6(1)(b) or (f) GDPR; we process health data only where a suitable legal basis applies.

## Your rights
Subject to the statutory requirements, you have rights of access, rectification, erasure, restriction, data portability and objection. You may withdraw consent at any time for the future. Contact info@citypraxis.wien to exercise these rights.

You may also lodge a complaint with the Austrian Data Protection Authority: Barichgasse 40–42, 1030 Vienna, https://www.dsb.gv.at.

## Security and updates
We use appropriate technical and organisational measures to protect your data. This notice is updated when functions, providers or legal requirements change.

Last updated: 22 September 2026`;

export const seed = {
  settings: [{ id: 'practice', title: 'Praxisinformationen', email: 'info@citypraxis.wien', phone: '+43 699 12682157', address: 'Stubenbastei 12/11', city: '1010 Wien', hours: 'Termine nach Vereinbarung', saturday: 'Samstag 08:30–12:30 Uhr', payment: 'Bitte bezahlen Sie Ihre Behandlung vor Ort in bar.', acute: 'Akuttermin benötigt? Rufen Sie uns an.', acuteAvailable: false, appointmentConcerns }],
  pages: [
    { id: 'home', title: 'Wo andere aufhören,', subtitle: 'fangen wir erst an.', intro: 'Spezialisierte Therapie für Kiefer, Kopf und Bewegungsapparat. Mit Zeit, Erfahrung und einem gemeinsamen Blick auf das, was Sie bewegt.', eyebrow: 'IHRE GESUNDHEIT. UNSER ZUSAMMENSPIEL.', image: '/assets/hero.jpg' },
    { id: 'about', title: 'Viele Perspektiven. Ein gemeinsames Ziel.', intro: 'Wir verbinden Physiotherapie, Osteopathie, Logopädie und Heilmassage. Für eine Behandlung, die den Menschen als Ganzes sieht.', body: 'Komplexe Beschwerden brauchen einen aufmerksamen Blick. In der Citypraxis arbeiten unterschiedliche Fachrichtungen zusammen und stimmen die nächsten Schritte individuell mit Ihnen ab.\n\nUnser Schwerpunkt liegt auf Beschwerden im Kiefer-, Kopf- und Nackenbereich. Ebenso begleiten wir Sie bei orthopädischen Beschwerden und auf Ihrem Weg zurück in den Alltag nach einer Operation oder Verletzung.' },
    { id: 'impressum', title: 'Impressum', titleEn: 'Legal notice', intro: 'Informationen gemäß § 5 ECG und Offenlegung gemäß § 25 Mediengesetz.', introEn: 'Information under section 5 of the Austrian E-Commerce Act and section 25 of the Austrian Media Act.', body: imprintDe, bodyEn: imprintEn },
    { id: 'datenschutz', title: 'Datenschutz', titleEn: 'Privacy', intro: 'Hier erfahren Sie, welche Daten wir verarbeiten, wofür wir sie benötigen und welche Rechte Sie haben.', introEn: 'This notice explains which data we process, why we need it and which rights you have.', body: privacyDe, bodyEn: privacyEn }
  ],
  symptoms: [
    { id: 'kiefer', title: 'Kiefer', subtitle: 'Wenn sich Anspannung festsetzt.', intro: 'Kieferknacken, Zähneknirschen oder Beschwerden beim Öffnen des Mundes? Wir betrachten das Zusammenspiel von Kiefer, Kopf und Nacken.', body: 'Am Anfang stehen ein Gespräch und eine individuelle Untersuchung. Gemeinsam besprechen wir, welche therapeutischen Schritte zu Ihrer Situation passen.\n\nUnsere Schwerpunkte umfassen craniomandibuläre und craniofaziale Beschwerden. Je nach Befund verbinden wir physiotherapeutische und logopädische Perspektiven.', service: 'physiotherapie', icon: 'jaw' },
    { id: 'kopfschmerzen', title: 'Kopf & Migräne', subtitle: 'Raum für einen klareren Kopf.', intro: 'Wiederkehrende Kopf- und Nackenbeschwerden können den Alltag stark beeinflussen. Wir nehmen uns Zeit für Ihre Geschichte.', body: 'Wir untersuchen mögliche Zusammenhänge im Bereich von Nacken, Kiefer und Bewegung. Auf Basis Ihres Befundes und Ihrer ärztlichen Abklärung planen wir gemeinsam die Therapie.\n\nNicht jeder Kopfschmerz hat dieselbe Ursache. Die Behandlung wird deshalb an Ihre individuelle Situation angepasst.', service: 'physiotherapie', icon: 'head' },
    { id: 'tinnitus', title: 'Tinnitus', subtitle: 'Zusammenhänge verstehen.', intro: 'Bei Ohrgeräuschen kann es sinnvoll sein, auch Kiefer und Halswirbelsäule in die Untersuchung einzubeziehen.', body: 'Nach ärztlicher Abklärung betrachten wir mögliche funktionelle Zusammenhänge. Die Auswahl der therapeutischen Maßnahmen richtet sich nach Ihrem individuellen Befund.\n\nEine Behandlung ist keine Garantie dafür, dass Ohrgeräusche verschwinden. Wir besprechen Möglichkeiten und Ziele offen mit Ihnen.', service: 'physiotherapie', icon: 'ear' },
    { id: 'schwindel', title: 'Schwindel', subtitle: 'Wieder mehr Sicherheit finden.', intro: 'Wir begleiten Sie bei ärztlich abgeklärten Schwindelbeschwerden mit einem individuell abgestimmten Therapieansatz.', body: 'Schwindel kann unterschiedliche Ursachen haben. Deshalb sind die ärztliche Abklärung und eine sorgfältige Untersuchung wichtige Grundlagen.\n\nGemeinsam arbeiten wir an den für Sie relevanten Bewegungen und Alltagssituationen.', service: 'physiotherapie', icon: 'balance' },
    { id: 'unfall-operation', title: 'Unfall & OP', subtitle: 'Schritt für Schritt zurück.', intro: 'Nach einer Verletzung oder Operation unterstützen wir Sie dabei, Bewegung und Vertrauen in Ihren Körper zurückzugewinnen.', body: 'Wir stimmen die Therapie auf den Heilungsverlauf, ärztliche Vorgaben und Ihre persönlichen Ziele ab.\n\nBeweglichkeit, Kraft und die Anforderungen Ihres Alltags bilden dabei den Ausgangspunkt für einen gemeinsamen Plan.', service: 'physiotherapie', icon: 'movement' },
    { id: 'hirnnervenprobleme', title: 'Hirnnervenprobleme', titleEn: 'Cranial Nerve Disorders', subtitle: '', intro: '', body: '', service: 'physiotherapie', icon: 'head' }
  ],
  services: [
    { id: 'physiotherapie', title: 'Physiotherapie', tag: 'BEWEGUNG MIT PERSPEKTIVE', intro: 'Bewegung wieder möglich machen. Wir begleiten Sie bei akuten und anhaltenden Beschwerden – individuell, aufmerksam und mit einem klaren Plan.', body: 'Im Mittelpunkt stehen Ihre Beweglichkeit, Belastbarkeit und persönlichen Ziele. Aus Gespräch und Untersuchung entsteht ein Behandlungsplan, den wir gemeinsam weiterentwickeln.', methods: 'CRAFTA® & CMD|Ein Schwerpunkt auf dem Zusammenspiel von Kiefer, Gesicht, Kopf und Halswirbelsäule.\nManuelle Therapie|Individuell ausgewählte Untersuchung und Behandlung des Bewegungsapparats.\nFDM & Faszienbehandlung|Faszienbezogene Ansätze werden abhängig vom Befund und in Absprache mit Ihnen eingesetzt.' },
    { id: 'osteopathie', title: 'Osteopathie', tag: 'DEN MENSCHEN ALS GANZES SEHEN', intro: 'Ein aufmerksamer Blick auf Zusammenhänge. Wir betrachten Ihre Beschwerden im Kontext des gesamten Bewegungsapparats.', body: 'Ein ausführliches Gespräch und eine individuelle Untersuchung bilden die Grundlage. Die Behandlung und weitere Schritte werden mit Ihnen abgestimmt.', methods: 'Individuelle Untersuchung|Wir nehmen uns Zeit für Ihre Vorgeschichte und Ihre aktuellen Beschwerden.\nGemeinsame Therapieplanung|Wir erklären den Befund und besprechen realistische nächste Schritte.' },
    { id: 'logopaedie', title: 'Logopädie', tag: 'KOMMUNIKATION & LEBENSQUALITÄT', intro: 'Sprechen, Stimme und Schlucken gehören zu unserem Alltag. Wir unterstützen Sie, wenn diese Fähigkeiten eingeschränkt sind.', body: 'Die Logopädie beschäftigt sich mit Sprache, Sprechen, Stimme und Schlucken. In der Citypraxis verbinden wir diese Perspektive mit dem Wissen weiterer Fachrichtungen.', methods: 'Stimme & Sprechen|Therapieziele orientieren sich an Ihren persönlichen Anforderungen.\nOrofaziale Funktionen|Wir betrachten das Zusammenspiel von Muskeln und Bewegungen im Mund- und Gesichtsbereich.' },
    childrenService,
    { id: 'heilmassage', title: 'Massage', titleEn: 'Massage', tag: 'ZEIT ZUM LOSLASSEN', intro: 'Gezielte Berührung, bewusst Zeit für Ihren Körper. Die Behandlung wird auf Ihre Bedürfnisse und den Befund abgestimmt.', body: 'Wir besprechen vorab, welche Massageform für Sie geeignet ist. Bitte klären Sie die erforderliche Verordnung vor Ihrem ersten Termin.', methods: 'Klassische Heilmassage|Individuell abgestimmte Behandlung von Muskelregionen.\nManuelle Lymphdrainage|Eine sanfte Behandlungsmethode nach entsprechender Abklärung und Verordnung.' }
  ],
  faqs: [
    { id: 'verordnung', title: 'Brauche ich eine ärztliche Verordnung?', body: 'Bitte klären Sie die erforderliche ärztliche Verordnung vor Therapiebeginn. Wenn Sie unsicher sind, welche Unterlagen Sie mitbringen sollen, kontaktieren Sie uns.' },
    { id: 'ersttermin', title: 'Was bringe ich zum ersten Termin mit?', body: 'Bringen Sie Ihre Verordnung und vorhandene relevante Befunde mit. Bequeme Kleidung ist hilfreich. Ihre Fragen und persönlichen Ziele besprechen wir gemeinsam.' },
    { id: 'erstattung', title: 'Wie funktioniert die Rückerstattung?', body: 'Sie bezahlen die Behandlung zunächst selbst und können die Unterlagen bei Ihrer Versicherung einreichen. Ob und in welcher Höhe eine Erstattung möglich ist, hängt von der Behandlung und Ihrer Versicherung ab.' },
    { id: 'zahlung', title: 'Wie kann ich bezahlen?', body: 'Bitte bezahlen Sie Ihre Behandlung direkt vor Ort in bar. Sie erhalten eine Rechnung.' },
    { id: 'absage', title: 'Wie kann ich einen Termin absagen?', body: 'Informieren Sie Ihre Therapeutin oder Ihren Therapeuten möglichst frühzeitig oder schreiben Sie an info@citypraxis.wien. Bitte beachten Sie die bei der Terminvereinbarung mitgeteilten Stornobedingungen.' }
  ],
  team: [], reviews: [], prices: priceList, reimbursements: []
};
