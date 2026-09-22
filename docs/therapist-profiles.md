# Therapist profiles

Each Team entry owns a public page at `/team/<URL-Kürzel>`. The compact directory
card links to that page. Profiles use the website's German/English toggle.

In **Admin → Team → Edit**, edit the name, profession, qualifications, personal
introduction, treatment focus, methods, career, contact details and portrait.
Start list items with `- `. English fields are alongside the German originals.
The existing draft, preview, publish, unpublish and delete controls apply.
Preview opens the individual profile. Portrait uploads use the existing media
library and Supabase Storage. No new database schema is required.

An appointment link carries `?therapist=<id>`. The form shows that person's photo,
name and profession. Changing the selection updates the photo and language-toggle
links without clearing other form fields. The server verifies that the selected
ID belongs to a published Team entry. It stores the verified name as the first
line of the request notes (`WunschtherapeutIn: …`), followed by the concern and
contact-time preference. The name snapshot survives profile renaming or deletion.
Combined notes must fit the existing 300-character database limit; longer notes
produce a validation message instead of being silently truncated.

## Initial PDF import

`src/therapist-profiles.mjs` contains the initial 11 profiles, condensed and
translated from the supplied *Citypraxis Website_Home.pdf*. These are initial
values, not runtime overrides of Admin content. All supplied images were
extracted to WebP; three are generic image placeholders from the PDF.
Training-in-progress qualifications are retained. Inconsistent early dates in
Margareta's CV were omitted from the concise timeline; Monika's ambiguous named
fascial method is presented as general fascial therapy.

SQLite applies the import once in migration 9. Supabase uses a one-time import:

```powershell
node scripts/import-therapist-profiles.mjs
node scripts/import-therapist-profiles.mjs --apply
```

Deploy the code and portrait assets before applying the Supabase import. The first
command is a dry run. The import preserves existing new profiles and any edited
legacy samples; it replaces only exact matches for the original sample records.
It backs up Team data under the ignored `backups/` folder and saves revisions
before replacing original samples. It updates the original Team introduction
only if it still matches the old wording with its fixed team count.
An audit marker prevents future runs from undoing Admin edits or deletions.

## Checks

Run `node --test tests/*.test.mjs`. The profile tests cover import preservation,
portrait files, German/English content, both booking backends, forged therapist
names, unpublished and missing profiles, and oversized notes. Browser QA covers
the desktop/mobile directory, profile navigation, the selected portrait, changing
therapists, language switching, submission, and Admin editing/publication.
