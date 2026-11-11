# Objekto kortelė, failai ir valandų patvirtinimas

## Objekto kortelė (Valdymas → Objektai → „Atidaryti kortelę“)
Vienoje vietoje: adresas (nuoroda į žemėlapį), užsakymo nr., pastabos, **klientas** (vardas, telefonas, el. paštas su skambinimo ir rašymo nuorodomis), **failai ir nuotraukos**, objekto darbai, medžiagos ir išdirbtos valandos (šį mėnesį, iš viso, pagal darbuotoją). Kliento duomenis redaguoja administratorius.

**Kas mato kliento duomenis:** administratoriai ir darbuotojai, kuriems paskirtas darbas tame objekte (kaip ir adresą), nes jiems reikia paskambinti klientui. Darbuotojo darbo kortelėje rodomas kliento vardas ir telefonas su skambinimo nuoroda.

## Failai
- Leidžiama: nuotraukos (JPG, PNG, WebP, HEIC), PDF, Word (.doc, .docx), Excel (.xls, .xlsx). Iki 25 MB. Didelės telefono nuotraukos prieš įkeliant sumažinamos (iki 2000 px).
- Failai saugomi privačioje Supabase saugykloje (`attachments`), atidaromi per laikinas (1 val.) nuorodas. Įkėlimas vyksta tiesiai iš naršyklės.
- **Administratorius** objekto kortelėje įkelia ir ištrina failus. **Darbuotojas** prie savo darbo gali pridėti nuotraukų (jas mato jis ir kiti to darbo vykdytojai bei administratoriai); trinti negali.
- Apribojimas: jei įkėlimas nutrūksta po to, kai failas jau nusiųstas, saugykloje gali likti nesusietas failas. Tokie failai matomi tik administratoriui Supabase Storage.

## Valandų patvirtinimas
Valdymas → Ataskaita: praėjusio mėnesio valandas administratorius patvirtina atskirai kiekvienam darbuotojui arba visiems iš karto.
- Patvirtinti galima tik **pasibaigusį mėnesį** ir tik jei nėra neuždarytų įrašų. Duomenų bazė patikrina, kad patvirtinamos valandos sutampa su faktinėmis.
- Patvirtinus užfiksuojamos (užšaldomos) valandos, įkainis ir suma. Vėlesni įkainių pakeitimai patvirtinto mėnesio sumų nekeičia.
- Patvirtinto mėnesio laiko įrašų ir pertraukų **negalima keisti, pridėti ar trinti**, net administratoriui, kol patvirtinimas neatšauktas (mygtukas „Atšaukti“ ataskaitoje arba nuoroda Valdymas → Laikas).
- Darbuotojas Valandų puslapyje prie mėnesio mato ženklą „Patvirtinta“. Įkainių ir sumų jis nemato.
- Atšaukimai nelaikomi žurnale: lieka tik aktyvūs patvirtinimai.

Migracijos: `0012_time_approvals.sql`, `0013_project_card.sql`.
