/**
 * Funkcijų sąrašas pagal tai, ką programa dabar tikrai daro (žr. docs/DARBUOTOJAS.md, docs/ADMINISTRATORIUS.md,
 * docs/MEDZIAGOS.md). Pridedant naują funkciją programoje, papildykite ir šį sąrašą.
 */
export type Feature = { title: string; text: string; tone: "blue" | "red" };

export const FEATURES: Feature[] = [
  {
    title: "Objektai ir darbai",
    text: "Biuras sukuria objektus ir darbus su užduočių sąrašu, paskiria darbuotoją ir datą. Darbuotojas telefone mato adresą su nuoroda į žemėlapį, užsakymo numerį ir atliktų punktų eigą.",
    tone: "blue",
  },
  {
    title: "Kalendorius",
    text: "Mėnesio ir savaitės vaizdas rodo, kiek darbų kiekvieną dieną. Darbą galima perkelti į kitą dieną, o darbai be datos laukia atskirame sąraše.",
    tone: "red",
  },
  {
    title: "Darbo laikas telefone",
    text: "Pradėti, pertrauka, tęsti, baigti. Laiką fiksuoja serveris, todėl dvigubas paspaudimas nieko nesugadina, o tas pats laikmatis matomas ir telefone, ir kompiuteryje. Nedirbama diena pažymima vienu paspaudimu.",
    tone: "blue",
  },
  {
    title: "Valandos ir atlyginimas",
    text: "Šiandien, savaitė ir mėnuo be pertraukų, mėnesių istorija ir atlyginimo skaičiuoklė pagal valandinį įkainį. Įkainis lieka tik darbuotojo įrenginyje.",
    tone: "red",
  },
  {
    title: "Medžiagų užsakymai",
    text: "Darbuotojas vienu prašymu surašo kelias medžiagas su kiekiu, vienetu ir objektu. Biuras mato bendrą sąrašą, filtruoja, taiso kiekius ir žymi „Nupirkta“, o istorija išlieka.",
    tone: "blue",
  },
  {
    title: "Pastaba biurui",
    text: "Darbuotojas parašo arba padiktuoja pastabą tiesiai prie darbo, o biuras nebeskambina ir nebeieško žinučių.",
    tone: "red",
  },
  {
    title: "Valdymas biure",
    text: "Administratorius tvarko objektus, kviečia darbuotojus, keičia vaidmenis ir pataiso darbo laiko įrašus, jei kas nors pamiršo paspausti „Baigti“.",
    tone: "blue",
  },
  {
    title: "Kiekvienos įmonės duomenys atskirti",
    text: "Įmonė mato tik savo objektus, darbus ir valandas. Duomenys saugomi serveryje, o ne tik telefono atmintyje.",
    tone: "red",
  },
];
