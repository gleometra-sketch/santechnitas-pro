# Užduočių sąrašų šablonai

> **Būsena:** duomenų bazės dalis (`0014_checklist_templates.sql`) yra, bet šablonų puslapio ir komponentų kodo projekte šiuo metu nėra (laikinai išimta). Žemiau aprašyta, kaip funkcija veikė; sugrąžinus kodą dokumentas vėl galios.

**Valdymas → Šablonai.** Šablonas yra paruoštas darbo užduočių sąrašas. Kuriant darbą (Valdymas → Darbai → Naujas darbas) pasirenkamas šablonas, jo punktai įrašomi į darbą, o prieš kuriant juos galima keisti.

## Paruošti šablonai
Santechnikas, Elektrikas, Plytelių klojėjas, Stogdengys, Vidaus apdaila, Demontavimas ir Bendras. Kiekvienas turi tris etapus: **Prieš darbą**, **Darbo metu**, **Pabaiga ir perdavimas**. Tai bendro pobūdžio pagalbiniai sąrašai: pritaikykite juos prie savo darbų, gamintojų reikalavimų ir galiojančių taisyklių. Paruoštą šabloną galima nukopijuoti („Kopijuoti ir pritaikyti“) ir pakeisti.
Paruoštų šablonų tekstai yra `src/lib/templates/library.ts`.

## Savo šablonai
Administratorius gali kurti, redaguoti ir trinti savo šablonus. Trynimas jau sukurtų darbų nekeičia (darbo sąrašas yra kopija).

## Punktų savybės
- **Etapas** – darbuotojo kortelėje punktai rodomi pagal etapus.
- **Privaloma** – darbuotojas negali užbaigti darbo, kol punkto nepažymi. Administratorius gali užbaigti bet kada.
- **Reikia nuotraukos** – užbaigiant darbą turi būti bent viena prie darbo pridėta nuotrauka.
Taisyklės tikrinamos duomenų bazėje, todėl jų neapeina ir tiesioginė užklausa. Darbuotojas negali pakeisti punkto etapo ar nuimti „Privaloma“.

Migracija: `0014_checklist_templates.sql`.
