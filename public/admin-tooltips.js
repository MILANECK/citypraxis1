// Explanations are attached after each admin view or dialog is rendered, including dynamic controls.
const help={
  de:{
    overview:'Übersicht über Anfragen, Inhalte und Speicherplatz öffnen.',hero:'Startbild und Hintergrundvideo der Website bearbeiten.',requests:'Terminanfragen prüfen, zuweisen und abschließen.',pages:'Texte und Bilder der einzelnen Seiten bearbeiten.',symptoms:'Schwerpunktseiten bearbeiten.',services:'Therapieangebote bearbeiten.',team:'Teamprofile und deren Reihenfolge bearbeiten.',reviews:'Freigegebene Bewertungen bearbeiten.',faqs:'Fragen und Antworten bearbeiten.',prices:'Praxispreise bearbeiten.',reimbursements:'Rückerstattungsangaben bearbeiten.',settings:'Kontaktdaten und Einstellungen der Praxis bearbeiten.',social:'Links zu Instagram und Facebook bearbeiten.',media:'Hochgeladene Bilder und Videos verwalten.',users:'Zugänge und Rollen des Teams verwalten.',audit:'Letzte Änderungen in der Verwaltung ansehen.',account:'Ihr eigenes Passwort ändern.',
    logout:'Von der Verwaltung abmelden.',newContent:'Neuen Eintrag in diesem Bereich anlegen.',edit:'Diesen Eintrag im Editor öffnen.',deleteContent:'Diesen Eintrag nach Bestätigung löschen.',pageOverview:'Diese Seite mit Live-Vorschau im Editor öffnen.',editHero:'Startbereich der Website bearbeiten.',
    draft:'Änderungen nur intern speichern. Die öffentliche Seite bleibt unverändert.',publish:'Änderungen speichern und auf der öffentlichen Website anzeigen.',close:'Editor ohne Speichern schließen.',previewToggle:'Live-Vorschau neben den Bearbeitungsfeldern ein- oder ausblenden.',previewDraft:'Gespeicherten Entwurf in einem neuen Tab ansehen; er ist noch nicht öffentlich.',unpublish:'Öffentliche Version entfernen; der Entwurf bleibt gespeichert.',versions:'Frühere gespeicherte Textstände anzeigen. Es werden die neuesten 30 geladen.',restore:'Diese Version nur in die Bearbeitungsfelder laden. Erst Speichern oder Veröffentlichen übernimmt sie.',heroSettings:'Optionale Einstellungen für Höhe, Bildausschnitt und Textabdunklung öffnen.',
    statusFilter:'Anfragen nach Bearbeitungsstatus filtern.',sortRequests:'Anfragen nach Datum oder Name sortieren.',sourceFilter:'Anfragen nach Herkunft filtern.',requestDetails:'Details dieser Terminanfrage öffnen oder schließen.',requestStatus:'Bearbeitungsstatus der Anfrage auswählen.',requestAssignee:'Zuständige Person für diese Anfrage auswählen.',requestSave:'Status und Zuständigkeit dieser Anfrage speichern.',requestDelete:'Diese Anfrage und ihre Kontaktdaten nach Bestätigung endgültig löschen.',retryNotification:'E-Mail-Benachrichtigung für diese Anfrage erneut versuchen.',csv:'Nur die aktuell gefilterten Anfragen als CSV herunterladen.',
    moveTeam:'Dieses Teamprofil um eine Position verschieben; die Reihenfolge wird sofort gespeichert.',dragTeam:'Teamprofil ziehen, um die Reihenfolge zu ändern.',upload:'Ausgewählte Datei in die Mediathek hochladen.',download:'Diese Originaldatei herunterladen.',deleteMedia:'Dieses ungenutzte Medium nach Bestätigung löschen.',mediaSelect:'Bereits hochgeladenes Medium auswählen. Die Änderung wird erst beim Speichern übernommen.',mediaUpload:'Neue Datei hochladen und für dieses Feld auswählen.',
    addConcern:'Neue Auswahlkategorie für das Terminanfrageformular hinzufügen.',removeConcern:'Diese Auswahlkategorie aus dem Formular entfernen.',addSocial:'Instagram oder Facebook hinzufügen.',removeSocial:'Diesen Social-Media-Link entfernen.',rating:'Diese Anzahl Sterne für die Bewertung auswählen.',clearRating:'Sterne dieser Bewertung ausblenden.',saveSocial:'Social-Media-Links speichern und im Footer veröffentlichen.',
    userRole:'Zugriffsrolle für den neuen Benutzer wählen.',toggleUser:'Zugang dieses Benutzers aktivieren oder deaktivieren.',createUser:'Neues Administrationskonto mit der gewählten Rolle anlegen.',savePassword:'Neues Passwort für Ihr Konto speichern.',
    login:'Mit Ihrem Admin-Konto anmelden.',recovery:'Einen Link zum Zurücksetzen des Passworts anfordern.',language:'Sprache der Verwaltung wechseln.',website:'Öffentliche Website in einem neuen Tab öffnen.',cancel:'Aktion abbrechen, ohne Änderungen zu speichern.',confirmDelete:'Löschen nach Bestätigung endgültig ausführen.',genericButton:'Diese Aktion ausführen.',genericSelect:'Eine Option auswählen.',genericField:'Dieses Feld bearbeiten.',genericLink:'Diesen Link öffnen.'
  },
  en:{
    overview:'Open the summary of requests, content and storage.',hero:'Edit the website hero image and video.',requests:'Review, assign and close booking requests.',pages:'Edit the text and images on each page.',symptoms:'Edit specialization pages.',services:'Edit therapy services.',team:'Edit team profiles and their order.',reviews:'Edit approved reviews.',faqs:'Edit questions and answers.',prices:'Edit practice prices.',reimbursements:'Edit reimbursement information.',settings:'Edit practice contact details and settings.',social:'Edit Instagram and Facebook links.',media:'Manage uploaded images and videos.',users:'Manage staff accounts and roles.',audit:'View recent admin changes.',account:'Change your own password.',
    logout:'Sign out of the admin.',newContent:'Create a new entry in this section.',edit:'Open this entry in the editor.',deleteContent:'Delete this entry after confirmation.',pageOverview:'Open this page in the editor with a live preview.',editHero:'Edit the website hero section.',
    draft:'Save changes privately. The public page stays unchanged.',publish:'Save changes and show them on the public website.',close:'Close the editor without saving.',previewToggle:'Show or hide the live preview beside the fields.',previewDraft:'Open the saved draft in a new tab; it is not public yet.',unpublish:'Remove the public version while keeping the draft.',versions:'Show earlier saved text versions. The newest 30 are loaded.',restore:'Load this version into the fields only. Save or publish to apply it.',heroSettings:'Open optional height, image position and overlay settings.',
    statusFilter:'Filter requests by processing status.',sortRequests:'Sort requests by date or name.',sourceFilter:'Filter requests by their source.',requestDetails:'Open or close the details of this booking request.',requestStatus:'Choose the processing status of this request.',requestAssignee:'Choose the person responsible for this request.',requestSave:'Save this request’s status and assignee.',requestDelete:'Permanently delete this request and contact details after confirmation.',retryNotification:'Retry the email notification for this request.',csv:'Download only the currently filtered requests as CSV.',
    moveTeam:'Move this team profile one place; the order saves immediately.',dragTeam:'Drag this team profile to change its order.',upload:'Upload the selected file to the media library.',download:'Download this original file.',deleteMedia:'Delete this unused media file after confirmation.',mediaSelect:'Choose an uploaded file. Save the entry to apply the change.',mediaUpload:'Upload a new file and select it for this field.',
    addConcern:'Add a choice to the booking request form.',removeConcern:'Remove this choice from the form.',addSocial:'Add Instagram or Facebook.',removeSocial:'Remove this social media link.',rating:'Choose the number of stars shown for this review.',clearRating:'Hide the stars for this review.',saveSocial:'Save social links and publish them in the footer.',
    userRole:'Choose the new user’s access role.',toggleUser:'Enable or disable this user’s access.',createUser:'Create a new admin account with the selected role.',savePassword:'Save a new password for your account.',
    login:'Sign in with your admin account.',recovery:'Request a password reset link.',language:'Change the admin language.',website:'Open the public website in a new tab.',cancel:'Cancel without saving changes.',confirmDelete:'Permanently delete after confirmation.',genericButton:'Run this action.',genericSelect:'Choose an option.',genericField:'Edit this field.',genericLink:'Open this link.'
  }
};

function keyFor(el){
  if(el.matches('[data-view]'))return el.dataset.view;
  if(el.matches('#logout'))return 'logout';
  if(el.matches('#new-content'))return 'newContent';
  if(el.matches('[data-edit]'))return 'edit';
  if(el.matches('[data-remove],#delete-content'))return 'deleteContent';
  if(el.matches('.page-overview-button'))return 'pageOverview';
  if(el.matches('#edit-hero'))return 'editHero';
  if(el.matches('#content-form button[value="draft"]'))return 'draft';
  if(el.matches('#content-form button[value="publish"]'))return 'publish';
  if(el.matches('.close-dialog'))return 'close';
  if(el.matches('.editor-preview-toggle'))return 'previewToggle';
  if(el.matches('a[href*="preview=1"]'))return 'previewDraft';
  if(el.matches('#unpublish'))return 'unpublish';
  if(el.matches('#revisions>summary'))return 'versions';
  if(el.matches('[data-restore]'))return 'restore';
  if(el.matches('.hero-advanced-settings>summary'))return 'heroSettings';
  if(el.matches('#request-filter'))return 'statusFilter';
  if(el.matches('#request-sort'))return 'sortRequests';
  if(el.matches('[data-source-filter]'))return 'sourceFilter';
  if(el.matches('.request-disclosure>summary'))return 'requestDetails';
  if(el.matches('[data-request] select[name="status"]'))return 'requestStatus';
  if(el.matches('[data-request] select[name="assignee"]'))return 'requestAssignee';
  if(el.matches('[data-request] button[type="submit"],[data-request] button:not([type])'))return 'requestSave';
  if(el.matches('[data-delete-request]'))return 'requestDelete';
  if(el.matches('[data-retry-notification]'))return 'retryNotification';
  if(el.matches('.request-toolbar-controls button'))return 'csv';
  if(el.matches('[data-team-shift]'))return 'moveTeam';
  if(el.matches('.team-drag-handle'))return 'dragTeam';
  if(el.matches('#upload-form button'))return 'upload';
  if(el.matches('.media-card-actions a'))return 'download';
  if(el.matches('[data-delete-media]'))return 'deleteMedia';
  if(el.matches('[data-media-select]'))return 'mediaSelect';
  if(el.matches('[data-upload-target]'))return 'mediaUpload';
  if(el.matches('.add-concern'))return 'addConcern';
  if(el.matches('.remove-concern'))return 'removeConcern';
  if(el.matches('.add-social'))return 'addSocial';
  if(el.matches('.remove-social'))return 'removeSocial';
  if(el.matches('[data-rating]:not([data-rating="0"])'))return 'rating';
  if(el.matches('[data-rating="0"]'))return 'clearRating';
  if(el.matches('#social-form button[type="submit"]'))return 'saveSocial';
  if(el.matches('#user-form select[name="role"]'))return 'userRole';
  if(el.matches('[data-user]'))return 'toggleUser';
  if(el.matches('#user-form button'))return 'createUser';
  if(el.matches('#password-form button'))return 'savePassword';
  if(el.matches('#login-form button[type="submit"],#login-form button:not([type])'))return 'login';
  if(el.matches('#forgot-password,#recovery-request-form button[type="submit"]'))return 'recovery';
  if(el.matches('.language-toggle,.language-switch,[data-lang]'))return 'language';
  if(el.matches('.sidebar-site,.welcome-panel a.button'))return 'website';
  if(el.matches('[data-cancel]'))return 'cancel';
  if(el.matches('[data-confirm]'))return 'confirmDelete';
  return '';
}

function explain(el,copy){
  const key=keyFor(el);
  if(key)return copy[key];
  const label=el.closest('label');
  const labelText=label?[...label.childNodes].filter(node=>node.nodeType===Node.TEXT_NODE).map(node=>node.textContent).join(' ').trim():'';
  if(el.matches('select'))return labelText?`${copy.genericSelect} ${labelText}`:copy.genericSelect;
  if(el.matches('input,textarea'))return labelText?`${copy.genericField} ${labelText}`:copy.genericField;
  if(el.matches('summary'))return `${el.textContent.trim()} – ${copy.genericButton}`;
  if(el.matches('button'))return `${el.getAttribute('aria-label')||el.textContent.trim()||copy.genericButton} – ${copy.genericButton}`;
  if(el.matches('a'))return `${el.textContent.trim()||copy.genericLink} – ${copy.genericLink}`;
  return '';
}

export function installAdminTooltips(){
  let queued=false;
  const apply=()=>{
    queued=false;
    const copy=help[window.I18n?.language==='en'?'en':'de'];
    document.querySelectorAll('button,a,summary,select,input:not([type="hidden"]),textarea,.team-drag-handle').forEach(el=>{
      if(el.dataset.adminTooltipLanguage===window.I18n?.language)return;
      const description=explain(el,copy);
      if(!description)return;
      el.title=description;
      el.setAttribute('aria-description',description);
      el.dataset.adminTooltipLanguage=window.I18n?.language||'de';
    });
  };
  const queue=()=>{if(!queued){queued=true;queueMicrotask(apply);}};
  new MutationObserver(queue).observe(document.body,{childList:true,subtree:true});
  apply();
}
