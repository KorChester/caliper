import React, { useState, useMemo, useEffect } from "react";
import {
  User, Users, Info, RotateCcw, TrendingUp, Activity, Zap, CheckCircle2,
  FileDown, BarChart3, ArrowLeftRight, Ruler, ChevronDown, ChevronUp, Eye
} from "lucide-react";

// ============================================================================
//  APP META
// ============================================================================

const APP_VERSION = "1.3.0";
const APP_AUTHOR  = "Chang";
const APP_URL     = "http://www.physiques-unlimited.de";

// ============================================================================
//  HELPER: Dezimal-Parser (akzeptiert Komma UND Punkt)
// ============================================================================

// Deutsche User tippen oft "10,5" statt "10.5". Diese Helper-Funktion wandelt
// das um und macht die Eingaben tolerant gegenüber Whitespace.
const num = (v) => {
  if (v === null || v === undefined) return NaN;
  const s = String(v).replace(",", ".").trim();
  if (s === "") return NaN;
  return Number(s);
};

// ============================================================================
//  FORMELN
// ============================================================================

// Siri-Formel: Körperdichte → Körperfettanteil
const siri = (bd) => (495 / bd) - 450;

// ---- Jackson & Pollock 3-Falten ----
const jp3 = (sum, age, gender) => {
  const bd = gender === "male"
    ? 1.10938 - 0.0008267 * sum + 0.0000016 * sum * sum - 0.0002574 * age
    : 1.0994921 - 0.0009929 * sum + 0.0000023 * sum * sum - 0.0001392 * age;
  return siri(bd);
};

// ---- Jackson & Pollock 7-Falten ----
const jp7 = (sum, age, gender) => {
  const bd = gender === "male"
    ? 1.112 - 0.00043499 * sum + 0.00000055 * sum * sum - 0.00028826 * age
    : 1.097 - 0.00046971 * sum + 0.00000056 * sum * sum - 0.00012828 * age;
  return siri(bd);
};

// ---- Durnin & Womersley 4-Falten ----
const dwCoeffs = {
  male: [
    { min: 17, max: 19, c: 1.1620, m: 0.0630 },
    { min: 20, max: 29, c: 1.1631, m: 0.0632 },
    { min: 30, max: 39, c: 1.1422, m: 0.0544 },
    { min: 40, max: 49, c: 1.1620, m: 0.0700 },
    { min: 50, max: 120, c: 1.1715, m: 0.0779 },
  ],
  female: [
    { min: 16, max: 19, c: 1.1549, m: 0.0678 },
    { min: 20, max: 29, c: 1.1599, m: 0.0717 },
    { min: 30, max: 39, c: 1.1423, m: 0.0632 },
    { min: 40, max: 49, c: 1.1333, m: 0.0612 },
    { min: 50, max: 120, c: 1.1339, m: 0.0645 },
  ],
};
const durninWomersley = (sum, age, gender) => {
  if (sum <= 0) return NaN;
  const bands = dwCoeffs[gender];
  // WICHTIG: Dezimal-Alter (z.B. 29.5) würde sonst in Lücken zwischen den Bändern
  // fallen und fälschlich das 50+ Band nehmen. Math.floor löst das:
  // 29.5 → 29 → findet korrekt Band 20-29
  const ageInt = Math.floor(Number(age));
  let row = bands.find(r => ageInt >= r.min && ageInt <= r.max);
  if (!row) {
    row = ageInt < bands[0].min ? bands[0] : bands[bands.length - 1];
  }
  const bd = row.c - row.m * Math.log10(sum);
  return siri(bd);
};

// ---- Parrillo 9-Falten ----
const parrillo = (sum, weightKg) => {
  if (!weightKg || weightKg <= 0) return NaN;
  const weightLb = weightKg * 2.2046226;
  return (sum * 27) / weightLb;
};

// ---- FFMI (Fat-Free-Mass-Index) ----
const calcFFMI = (leanKg, heightCm) => {
  if (!leanKg || !heightCm) return null;
  const h = heightCm / 100;
  const raw = leanKg / (h * h);
  const normalized = raw + 6.1 * (1.8 - h);
  return { raw, normalized };
};

// FFMI-Einstufung
const FFMI_CATEGORIES = {
  male: [
    { max: 18, label: "Schlank",          color: "#60a5fa" },
    { max: 20, label: "Durchschnitt",     color: "#eab308" },
    { max: 22, label: "Gut",              color: "#22c55e" },
    { max: 24, label: "Athletisch",       color: "#10b981" },
    { max: 25, label: "Sehr muskulös",    color: "#f97316" },
    { max: 28, label: "Außergewöhnlich",  color: "#ef4444" },
    { max: 100,label: "Natural-Grenze +", color: "#dc2626" },
  ],
  female: [
    { max: 14, label: "Schlank",          color: "#60a5fa" },
    { max: 16, label: "Durchschnitt",     color: "#eab308" },
    { max: 18, label: "Gut",              color: "#22c55e" },
    { max: 20, label: "Athletisch",       color: "#10b981" },
    { max: 22, label: "Sehr muskulös",    color: "#f97316" },
    { max: 100,label: "Außergewöhnlich",  color: "#ef4444" },
  ],
};
const getFFMICategory = (ffmi, gender) => {
  if (!Number.isFinite(ffmi)) return null;
  return FFMI_CATEGORIES[gender].find(c => ffmi < c.max);
};

// ============================================================================
//  FORMEL-DEFINITIONEN
// ============================================================================

const FORMULAS = {
  jp3: {
    id: "jp3",
    name: "Jackson & Pollock",
    subtitle: "3 Falten",
    description: "Schnelle, verlässliche Standard-Methode. Altersadjustiert.",
    badge: "Beliebt",
    sites: {
      male: ["chest", "abdomen", "thigh"],
      female: ["triceps", "suprailiac", "thigh"],
    },
    needsAge: true,
    needsWeight: false,
    compute: (vals, sites, age, gender) => {
      const sum = sites.reduce((s, k) => s + (num(vals[k]) || 0), 0);
      return { bf: jp3(sum, age, gender), sum };
    },
  },
  jp7: {
    id: "jp7",
    name: "Jackson & Pollock",
    subtitle: "7 Falten",
    description: "Höchste Genauigkeit durch 7 Messpunkte. Goldstandard in der Forschung.",
    badge: "Präzise",
    sites: {
      male:   ["chest", "midaxillary", "triceps", "subscapular", "abdomen", "suprailiac", "thigh"],
      female: ["chest", "midaxillary", "triceps", "subscapular", "abdomen", "suprailiac", "thigh"],
    },
    needsAge: true,
    needsWeight: false,
    compute: (vals, sites, age, gender) => {
      const sum = sites.reduce((s, k) => s + (num(vals[k]) || 0), 0);
      return { bf: jp7(sum, age, gender), sum };
    },
  },
  dw: {
    id: "dw",
    name: "Durnin & Womersley",
    subtitle: "4 Falten",
    description: "Wissenschaftliche Formel mit altersgestuften Koeffizienten.",
    badge: "Wissenschaftlich",
    sites: {
      male:   ["biceps", "triceps", "subscapular", "suprailiac"],
      female: ["biceps", "triceps", "subscapular", "suprailiac"],
    },
    needsAge: true,
    needsWeight: false,
    compute: (vals, sites, age, gender) => {
      const sum = sites.reduce((s, k) => s + (num(vals[k]) || 0), 0);
      return { bf: durninWomersley(sum, age, gender), sum };
    },
  },
  parrillo: {
    id: "parrillo",
    name: "Parrillo",
    subtitle: "9 Falten",
    description: "Bodybuilder-Formel. Benötigt das Körpergewicht zur Berechnung.",
    badge: "Bodybuilding",
    sites: {
      male:   ["chest", "subscapular", "midaxillary", "biceps", "triceps", "abdomen", "suprailiac", "thigh", "calf"],
      female: ["chest", "subscapular", "midaxillary", "biceps", "triceps", "abdomen", "suprailiac", "thigh", "calf"],
    },
    needsAge: false,
    needsWeight: true,
    compute: (vals, sites, age, gender, weightKg) => {
      const sum = sites.reduce((s, k) => s + (num(vals[k]) || 0), 0);
      return { bf: parrillo(sum, weightKg), sum };
    },
  },
};

// ============================================================================
//  MESSPUNKT-METADATEN (ausführliche Anleitung)
// ============================================================================

const SITES = {
  chest: {
    label: "Brust",
    direction: "diagonal",
    hint: "Diagonale Falte zwischen Achsel und Brustwarze",
    detail: "Männer: Auf halbem Weg zwischen vorderer Achselfalte und Brustwarze greifen. Frauen: Auf 1/3 der Strecke (näher an der Achsel). Die Falte verläuft diagonal, folgt dem natürlichen Verlauf der Brustmuskel-Fasern.",
  },
  abdomen: {
    label: "Bauch",
    direction: "vertikal",
    hint: "Vertikale Falte, 2 cm neben dem Bauchnabel",
    detail: "Vertikale Falte greifen, ca. 2 cm seitlich (rechts) des Bauchnabels. Bauch entspannt lassen, keine Luft anhalten. Nur Haut und Unterhautfett greifen – nicht in den Bauchmuskel drücken.",
  },
  thigh: {
    label: "Oberschenkel",
    direction: "vertikal",
    hint: "Vertikale Falte, Mitte Leiste–Kniescheibe",
    detail: "Auf der Vorderseite des Oberschenkels, mittig zwischen Leistenbeuge und Oberkante der Kniescheibe. Gewicht auf das andere Bein verlagern, Oberschenkel locker. Vertikal greifen.",
  },
  triceps: {
    label: "Trizeps",
    direction: "vertikal",
    hint: "Rückseite Oberarm, mittig Schulter–Ellenbogen",
    detail: "Auf der Rückseite des Oberarms, genau mittig zwischen Schulterspitze (Akromion) und Ellenbogenspitze. Arm locker herunterhängen lassen, Handfläche zeigt zum Oberschenkel. Vertikale Greifrichtung.",
  },
  biceps: {
    label: "Bizeps",
    direction: "vertikal",
    hint: "Vorderseite Oberarm, Höhe wie Trizeps",
    detail: "Auf der Vorderseite des Oberarms, auf gleicher Höhe wie der Trizeps-Punkt. Arm locker hängen lassen, Handfläche nach vorne gedreht. Vertikal greifen.",
  },
  subscapular: {
    label: "Subscapular",
    direction: "diagonal",
    hint: "1–2 cm unter dem unteren Schulterblatt-Winkel",
    detail: "Unterhalb des unteren Winkels des Schulterblatts (tastbar beim Heben des Arms). Die Falte verläuft diagonal (ca. 45° nach außen-unten), folgt der natürlichen Hautlinie. Person steht entspannt, Arme hängen locker.",
  },
  suprailiac: {
    label: "Hüfte (Suprailiac)",
    direction: "diagonal",
    hint: "Direkt über dem Beckenkamm, schräg",
    detail: "Oberhalb des Beckenkamms, in der vorderen Achsellinie (leicht schräg vorne, nicht seitlich hinten). Folgt der natürlichen Hautfalte in ca. 45°-Winkel. Person steht aufrecht, entspannt.",
  },
  midaxillary: {
    label: "Achsel (Midaxillary)",
    direction: "vertikal",
    hint: "Mittlere Achsellinie, auf Höhe Brustbein-Ende",
    detail: "In der mittleren Achsellinie (senkrechte Linie von der Mitte der Achselhöhle nach unten), auf Höhe des Processus xiphoideus (unteres Ende des Brustbeins). Arm leicht anheben zum Fassen, dann wieder senken.",
  },
  calf: {
    label: "Wade",
    direction: "vertikal",
    hint: "Innenseite Wade, dickste Stelle",
    detail: "An der medialen (inneren) Seite der Wade, an der dicksten Stelle des Wadenumfangs. Knie leicht beugen, Bein entspannt, Fuß flach auf dem Boden. Vertikale Greifrichtung.",
  },
};

// Positionen auf der SVG-Silhouette (viewBox 0 0 340 720)
const MARKERS = {
  chest:        { x: 130, y: 172, view: "front" },
  abdomen:      { x: 158, y: 266, view: "front" },
  thigh:        { x: 144, y: 440, view: "front" },
  biceps:       { x:  90, y: 225, view: "front" },
  suprailiac:   { x: 128, y: 338, view: "front" },
  midaxillary:  { x: 110, y: 232, view: "front" },
  triceps:      { x: 258, y: 225, view: "back"  },
  subscapular:  { x: 210, y: 232, view: "back"  },
  calf:         { x: 186, y: 570, view: "back"  },
};

// ============================================================================
//  KFA-EINSTUFUNGS-TABELLEN
// ============================================================================

const CATEGORIES = {
  male: [
    { max: 5,  label: "Essenziell",   color: "#60a5fa" },
    { max: 13, label: "Athletisch",   color: "#10b981" },
    { max: 17, label: "Fitness",      color: "#22c55e" },
    { max: 24, label: "Durchschnitt", color: "#eab308" },
    { max: 100,label: "Erhöht",       color: "#ef4444" },
  ],
  female: [
    { max: 13, label: "Essenziell",   color: "#60a5fa" },
    { max: 20, label: "Athletisch",   color: "#10b981" },
    { max: 24, label: "Fitness",      color: "#22c55e" },
    { max: 31, label: "Durchschnitt", color: "#eab308" },
    { max: 100,label: "Erhöht",       color: "#ef4444" },
  ],
};

const getCategory = (bf, gender) => {
  if (!Number.isFinite(bf)) return null;
  return CATEGORIES[gender].find(c => bf < c.max) ?? CATEGORIES[gender][CATEGORIES[gender].length - 1];
};

// ============================================================================
//  KÖRPER-SILHOUETTEN
// ============================================================================

function BodyFront() {
  return (
    <g>
      {/* Kopf */}
      <ellipse cx="170" cy="82" rx="30" ry="36" fill="url(#bodyGradient)" stroke="#3f3f46" strokeWidth="1"/>
      {/* Hals */}
      <path d="M 156 116 L 154 138 L 186 138 L 184 116 Z"
            fill="url(#bodyGradient)" stroke="#3f3f46" strokeWidth="1"/>
      {/* Rumpf + Beine */}
      <path d="
        M 130 138 Q 148 143 170 143 Q 192 143 210 138 L 232 148 Q 248 155 254 168
        Q 252 195 246 225 Q 238 265 230 305 Q 225 330 222 345 L 228 360 L 226 380
        L 228 420 Q 230 460 224 500 Q 220 520 218 540 Q 222 580 218 620
        Q 212 650 208 672 Q 220 684 206 688 L 178 688 L 178 676 L 182 640
        Q 184 580 180 540 Q 178 510 176 490 Q 174 455 172 410 L 172 395 L 170 370
        L 168 395 L 168 410 Q 166 455 164 490 Q 162 510 160 540 Q 156 580 158 640
        L 162 676 L 162 688 L 134 688 Q 120 684 132 672 Q 128 650 122 620
        Q 118 580 122 540 Q 120 520 116 500 Q 110 460 112 420 L 114 380
        L 112 360 L 118 345 Q 115 330 110 305 Q 102 265 94 225 Q 88 195 86 168
        Q 92 155 108 148 Z"
        fill="url(#bodyGradient)" stroke="#3f3f46" strokeWidth="1"/>
      {/* Linker Arm */}
      <path d="M 108 148 Q 90 155 80 170 Q 70 190 66 220 Q 64 250 70 285 L 76 310
               Q 72 335 78 375 Q 80 395 84 412 Q 82 432 92 438 Q 104 440 110 432
               Q 116 420 114 402 Q 118 375 114 348 Q 112 325 110 305 L 106 285
               Q 100 255 100 215 Q 100 180 106 155 Z"
            fill="url(#bodyGradient)" stroke="#3f3f46" strokeWidth="1"/>
      {/* Rechter Arm */}
      <path d="M 232 148 Q 250 155 260 170 Q 270 190 274 220 Q 276 250 270 285 L 264 310
               Q 268 335 262 375 Q 260 395 256 412 Q 258 432 248 438 Q 236 440 230 432
               Q 224 420 226 402 Q 222 375 226 348 Q 228 325 230 305 L 234 285
               Q 240 255 240 215 Q 240 180 234 155 Z"
            fill="url(#bodyGradient)" stroke="#3f3f46" strokeWidth="1"/>
    </g>
  );
}

function BodyFrontDetails() {
  return (
    <>
      {/* Schattierungen (Tiefe in Muskelrinnen) */}
      <g fill="#0a0a0b" opacity="0.55">
        <path d="M 167 155 Q 170 180 167 208 Q 170 210 173 208 Q 170 180 173 155 Z"/>
        <path d="M 132 195 Q 150 212 170 208 Q 190 212 208 195 Q 205 198 170 212 Q 135 198 132 195 Z"/>
        <path d="M 168 215 L 172 215 L 172 325 L 168 325 Z"/>
        <path d="M 84 168 Q 88 178 84 195 Q 80 180 84 168 Z"/>
        <path d="M 256 168 Q 252 178 256 195 Q 260 180 256 168 Z"/>
        <path d="M 143 400 Q 141 460 144 500 Q 146 460 145 400 Z"/>
        <path d="M 197 400 Q 199 460 196 500 Q 194 460 195 400 Z"/>
      </g>

      {/* Highlights (Muskelwölbungen) */}
      <g fill="#4a4a52" opacity="0.25">
        <ellipse cx="148" cy="178" rx="16" ry="18"/>
        <ellipse cx="192" cy="178" rx="16" ry="18"/>
        <ellipse cx="90" cy="218" rx="10" ry="28"/>
        <ellipse cx="250" cy="218" rx="10" ry="28"/>
        <ellipse cx="100" cy="165" rx="12" ry="14"/>
        <ellipse cx="240" cy="165" rx="12" ry="14"/>
        <ellipse cx="132" cy="440" rx="12" ry="38"/>
        <ellipse cx="208" cy="440" rx="12" ry="38"/>
        <ellipse cx="152" cy="498" rx="9" ry="14"/>
        <ellipse cx="188" cy="498" rx="9" ry="14"/>
        <ellipse cx="128" cy="570" rx="8" ry="22"/>
        <ellipse cx="212" cy="570" rx="8" ry="22"/>
      </g>

      {/* Muskellinien */}
      <g stroke="#3f3f46" fill="none">
        {/* Schlüsselbeine */}
        <path d="M 135 148 Q 150 143 168 148" strokeWidth="1"/>
        <path d="M 172 148 Q 190 143 205 148" strokeWidth="1"/>
        <circle cx="170" cy="148" r="1.5" fill="#3f3f46"/>
        {/* Pectoralis unterer Rand */}
        <path d="M 128 168 Q 148 205 170 208" strokeWidth="1.1"/>
        <path d="M 212 168 Q 192 205 170 208" strokeWidth="1.1"/>
        <path d="M 150 152 Q 145 180 140 200" strokeWidth="0.5" opacity="0.6"/>
        <path d="M 190 152 Q 195 180 200 200" strokeWidth="0.5" opacity="0.6"/>
        <path d="M 120 150 Q 118 165 128 178" strokeWidth="0.8"/>
        <path d="M 220 150 Q 222 165 212 178" strokeWidth="0.8"/>
        <line x1="170" y1="152" x2="170" y2="210" strokeWidth="0.8"/>
        {/* Serratus anterior */}
        <path d="M 113 198 L 118 204 L 115 210 L 120 216 L 117 222" strokeWidth="0.7"/>
        <path d="M 227 198 L 222 204 L 225 210 L 220 216 L 223 222" strokeWidth="0.7"/>
        {/* Rectus abdominis - 8-Pack */}
        <line x1="170" y1="210" x2="170" y2="325" strokeWidth="1.2"/>
        <path d="M 147 228 Q 170 232 193 228" strokeWidth="0.9"/>
        <path d="M 145 252 Q 170 257 195 252" strokeWidth="0.9"/>
        <path d="M 143 278 Q 170 283 197 278" strokeWidth="0.9"/>
        <path d="M 142 305 Q 170 310 198 305" strokeWidth="0.9"/>
        {/* External Obliques */}
        <path d="M 125 220 Q 130 260 135 295" strokeWidth="0.7"/>
        <path d="M 215 220 Q 210 260 205 295" strokeWidth="0.7"/>
        <path d="M 138 270 L 128 290" strokeWidth="0.5" opacity="0.6"/>
        <path d="M 138 295 L 128 315" strokeWidth="0.5" opacity="0.6"/>
        <path d="M 202 270 L 212 290" strokeWidth="0.5" opacity="0.6"/>
        <path d="M 202 295 L 212 315" strokeWidth="0.5" opacity="0.6"/>
        {/* V-Linien (Adonis-Gürtel) */}
        <path d="M 128 330 Q 145 350 170 368" strokeWidth="1"/>
        <path d="M 212 330 Q 195 350 170 368" strokeWidth="1"/>
        <path d="M 122 330 Q 135 325 150 328" strokeWidth="0.7"/>
        <path d="M 218 330 Q 205 325 190 328" strokeWidth="0.7"/>
        {/* Deltoid */}
        <path d="M 108 148 Q 98 160 92 182" strokeWidth="1"/>
        <path d="M 232 148 Q 242 160 248 182" strokeWidth="1"/>
        <path d="M 98 160 Q 95 175 96 190" strokeWidth="0.5" opacity="0.6"/>
        <path d="M 242 160 Q 245 175 244 190" strokeWidth="0.5" opacity="0.6"/>
        {/* Bizeps */}
        <path d="M 82 200 Q 74 225 82 270" strokeWidth="0.8"/>
        <path d="M 100 200 Q 106 225 100 270" strokeWidth="0.8"/>
        <path d="M 74 215 Q 70 240 74 275" strokeWidth="0.5" opacity="0.6"/>
        <path d="M 258 200 Q 266 225 258 270" strokeWidth="0.8"/>
        <path d="M 240 200 Q 234 225 240 270" strokeWidth="0.8"/>
        <path d="M 266 215 Q 270 240 266 275" strokeWidth="0.5" opacity="0.6"/>
        {/* Unterarm */}
        <path d="M 78 290 Q 70 320 82 370" strokeWidth="0.7"/>
        <path d="M 102 290 Q 108 320 102 370" strokeWidth="0.7"/>
        <path d="M 90 300 Q 88 335 92 370" strokeWidth="0.4" opacity="0.5"/>
        <path d="M 262 290 Q 270 320 258 370" strokeWidth="0.7"/>
        <path d="M 238 290 Q 232 320 238 370" strokeWidth="0.7"/>
        <path d="M 250 300 Q 252 335 248 370" strokeWidth="0.4" opacity="0.5"/>
        {/* Handgelenk */}
        <line x1="80" y1="388" x2="110" y2="388" strokeWidth="0.5" opacity="0.6"/>
        <line x1="80" y1="395" x2="110" y2="395" strokeWidth="0.5" opacity="0.6"/>
        <line x1="230" y1="388" x2="260" y2="388" strokeWidth="0.5" opacity="0.6"/>
        <line x1="230" y1="395" x2="260" y2="395" strokeWidth="0.5" opacity="0.6"/>
        {/* Quadriceps */}
        <path d="M 148 378 Q 142 440 148 498" strokeWidth="0.9"/>
        <path d="M 158 378 Q 160 440 158 498" strokeWidth="0.7"/>
        <path d="M 130 390 Q 126 450 132 500" strokeWidth="0.7"/>
        <path d="M 148 480 Q 152 492 158 498 Q 162 490 160 480" strokeWidth="0.9"/>
        <path d="M 120 380 Q 140 460 158 498" strokeWidth="0.4" opacity="0.5"/>
        <path d="M 192 378 Q 198 440 192 498" strokeWidth="0.9"/>
        <path d="M 182 378 Q 180 440 182 498" strokeWidth="0.7"/>
        <path d="M 210 390 Q 214 450 208 500" strokeWidth="0.7"/>
        <path d="M 192 480 Q 188 492 182 498 Q 178 490 180 480" strokeWidth="0.9"/>
        <path d="M 220 380 Q 200 460 182 498" strokeWidth="0.4" opacity="0.5"/>
        <path d="M 120 360 L 124 490" strokeWidth="0.4" opacity="0.5"/>
        <path d="M 220 360 L 216 490" strokeWidth="0.4" opacity="0.5"/>
        {/* Patella */}
        <ellipse cx="153" cy="515" rx="10" ry="7" strokeWidth="0.8"/>
        <ellipse cx="187" cy="515" rx="10" ry="7" strokeWidth="0.8"/>
        {/* Schienbein + Wade */}
        <path d="M 150 535 Q 144 580 148 640" strokeWidth="0.7"/>
        <path d="M 158 535 Q 158 580 156 640" strokeWidth="0.5" opacity="0.6"/>
        <path d="M 132 540 Q 124 580 132 630" strokeWidth="0.6"/>
        <path d="M 138 545 Q 130 585 136 625" strokeWidth="0.4" opacity="0.5"/>
        <path d="M 190 535 Q 196 580 192 640" strokeWidth="0.7"/>
        <path d="M 182 535 Q 182 580 184 640" strokeWidth="0.5" opacity="0.6"/>
        <path d="M 208 540 Q 216 580 208 630" strokeWidth="0.6"/>
        <path d="M 202 545 Q 210 585 204 625" strokeWidth="0.4" opacity="0.5"/>
        {/* Knöchel */}
        <circle cx="144" cy="645" r="2.5" strokeWidth="0.6" fill="#3f3f46" opacity="0.6"/>
        <circle cx="196" cy="645" r="2.5" strokeWidth="0.6" fill="#3f3f46" opacity="0.6"/>
      </g>
    </>
  );
}

function BodyBack() {
  return (
    <g>
      {/* Kopf */}
      <ellipse cx="170" cy="82" rx="30" ry="36" fill="url(#bodyGradient)" stroke="#3f3f46" strokeWidth="1"/>
      {/* Hals */}
      <path d="M 156 116 L 154 138 L 186 138 L 184 116 Z"
            fill="url(#bodyGradient)" stroke="#3f3f46" strokeWidth="1"/>
      {/* Rumpf + Beine */}
      <path d="
        M 130 138 Q 148 143 170 143 Q 192 143 210 138 L 232 148 Q 248 155 254 168
        Q 252 195 246 225 Q 238 265 230 305 Q 225 330 222 345 L 228 360 L 226 380
        L 228 420 Q 230 460 224 500 Q 220 520 218 540 Q 222 580 218 620
        Q 212 650 208 672 Q 220 684 206 688 L 178 688 L 178 676 L 182 640
        Q 184 580 180 540 Q 178 510 176 490 Q 174 455 172 410 L 172 395 L 170 370
        L 168 395 L 168 410 Q 166 455 164 490 Q 162 510 160 540 Q 156 580 158 640
        L 162 676 L 162 688 L 134 688 Q 120 684 132 672 Q 128 650 122 620
        Q 118 580 122 540 Q 120 520 116 500 Q 110 460 112 420 L 114 380
        L 112 360 L 118 345 Q 115 330 110 305 Q 102 265 94 225 Q 88 195 86 168
        Q 92 155 108 148 Z"
        fill="url(#bodyGradient)" stroke="#3f3f46" strokeWidth="1"/>
      {/* Linker Arm */}
      <path d="M 108 148 Q 90 155 80 170 Q 70 190 66 220 Q 64 250 70 285 L 76 310
               Q 72 335 78 375 Q 80 395 84 412 Q 82 432 92 438 Q 104 440 110 432
               Q 116 420 114 402 Q 118 375 114 348 Q 112 325 110 305 L 106 285
               Q 100 255 100 215 Q 100 180 106 155 Z"
            fill="url(#bodyGradient)" stroke="#3f3f46" strokeWidth="1"/>
      {/* Rechter Arm */}
      <path d="M 232 148 Q 250 155 260 170 Q 270 190 274 220 Q 276 250 270 285 L 264 310
               Q 268 335 262 375 Q 260 395 256 412 Q 258 432 248 438 Q 236 440 230 432
               Q 224 420 226 402 Q 222 375 226 348 Q 228 325 230 305 L 234 285
               Q 240 255 240 215 Q 240 180 234 155 Z"
            fill="url(#bodyGradient)" stroke="#3f3f46" strokeWidth="1"/>
    </g>
  );
}

function BodyBackDetails() {
  return (
    <>
      {/* Schattierungen */}
      <g fill="#0a0a0b" opacity="0.55">
        <path d="M 168 155 Q 170 280 168 360 Q 172 280 172 155 Z"/>
        <path d="M 160 170 Q 170 200 160 230 Q 158 200 160 170 Z"/>
        <path d="M 180 170 Q 170 200 180 230 Q 182 200 180 170 Z"/>
        <path d="M 130 175 Q 135 195 150 215 Q 138 220 126 200 Z"/>
        <path d="M 210 175 Q 205 195 190 215 Q 202 220 214 200 Z"/>
        <path d="M 168 355 L 172 355 L 172 400 L 168 400 Z"/>
        <path d="M 146 420 Q 145 460 148 495 Q 152 460 150 420 Z"/>
        <path d="M 194 420 Q 195 460 192 495 Q 188 460 190 420 Z"/>
        <path d="M 76 175 Q 70 220 74 265 Q 80 220 80 175 Z"/>
        <path d="M 264 175 Q 270 220 266 265 Q 260 220 260 175 Z"/>
      </g>

      {/* Highlights */}
      <g fill="#4a4a52" opacity="0.22">
        <ellipse cx="150" cy="158" rx="16" ry="8"/>
        <ellipse cx="190" cy="158" rx="16" ry="8"/>
        <ellipse cx="138" cy="230" rx="14" ry="40"/>
        <ellipse cx="202" cy="230" rx="14" ry="40"/>
        <ellipse cx="160" cy="300" rx="7" ry="35"/>
        <ellipse cx="180" cy="300" rx="7" ry="35"/>
        <ellipse cx="150" cy="380" rx="18" ry="20"/>
        <ellipse cx="190" cy="380" rx="18" ry="20"/>
        <ellipse cx="90" cy="220" rx="10" ry="32"/>
        <ellipse cx="250" cy="220" rx="10" ry="32"/>
        <ellipse cx="138" cy="450" rx="13" ry="38"/>
        <ellipse cx="202" cy="450" rx="13" ry="38"/>
        <ellipse cx="145" cy="560" rx="9" ry="22"/>
        <ellipse cx="195" cy="560" rx="9" ry="22"/>
      </g>

      {/* Muskellinien */}
      <g stroke="#3f3f46" fill="none">
        {/* Trapezius */}
        <path d="M 156 135 Q 170 120 184 135" strokeWidth="0.9"/>
        <path d="M 138 138 Q 155 145 170 155" strokeWidth="0.8"/>
        <path d="M 202 138 Q 185 145 170 155" strokeWidth="0.8"/>
        <path d="M 132 148 Q 150 175 160 210" strokeWidth="0.7"/>
        <path d="M 208 148 Q 190 175 180 210" strokeWidth="0.7"/>
        <path d="M 150 220 L 170 240" strokeWidth="0.7"/>
        <path d="M 190 220 L 170 240" strokeWidth="0.7"/>
        {/* Wirbelsäule */}
        <line x1="170" y1="120" x2="170" y2="365" strokeWidth="0.6" strokeDasharray="2,2"/>
        <circle cx="170" cy="150" r="1.2" fill="#52525b"/>
        <circle cx="170" cy="175" r="1.2" fill="#52525b"/>
        <circle cx="170" cy="200" r="1.2" fill="#52525b"/>
        <circle cx="170" cy="225" r="1.2" fill="#52525b"/>
        <circle cx="170" cy="250" r="1.2" fill="#52525b"/>
        <circle cx="170" cy="275" r="1.2" fill="#52525b"/>
        <circle cx="170" cy="300" r="1.2" fill="#52525b"/>
        <circle cx="170" cy="325" r="1.2" fill="#52525b"/>
        {/* Schulterblätter */}
        <path d="M 210 160 Q 200 185 190 220 L 220 218 Q 218 190 220 162 Z" strokeWidth="0.9"/>
        <path d="M 208 178 L 222 178" strokeWidth="0.6"/>
        <path d="M 130 160 Q 140 185 150 220 L 120 218 Q 122 190 120 162 Z" strokeWidth="0.9"/>
        <path d="M 118 178 L 132 178" strokeWidth="0.6"/>
        {/* Infraspinatus + Teres */}
        <path d="M 120 220 Q 132 230 148 232" strokeWidth="0.5" opacity="0.6"/>
        <path d="M 220 220 Q 208 230 192 232" strokeWidth="0.5" opacity="0.6"/>
        {/* Latissimus V */}
        <path d="M 92 185 Q 132 240 170 285" strokeWidth="1.1"/>
        <path d="M 248 185 Q 208 240 170 285" strokeWidth="1.1"/>
        <path d="M 124 270 Q 150 295 168 300" strokeWidth="0.6"/>
        <path d="M 216 270 Q 190 295 172 300" strokeWidth="0.6"/>
        {/* Erector spinae */}
        <path d="M 158 240 L 157 340" strokeWidth="0.9"/>
        <path d="M 182 240 L 183 340" strokeWidth="0.9"/>
        <path d="M 162 250 L 162 335" strokeWidth="0.4" opacity="0.5"/>
        <path d="M 178 250 L 178 335" strokeWidth="0.4" opacity="0.5"/>
        {/* Deltoid posterior */}
        <path d="M 108 148 Q 95 165 88 185" strokeWidth="0.9"/>
        <path d="M 232 148 Q 245 165 252 185" strokeWidth="0.9"/>
        <path d="M 90 185 Q 85 210 84 230" strokeWidth="0.7"/>
        <path d="M 250 185 Q 255 210 256 230" strokeWidth="0.7"/>
        {/* Trizeps 3 Köpfe */}
        <path d="M 78 195 Q 72 225 78 260" strokeWidth="0.8"/>
        <path d="M 98 195 Q 106 225 100 265" strokeWidth="0.7"/>
        <path d="M 84 265 Q 90 275 96 265" strokeWidth="0.5" opacity="0.6"/>
        <path d="M 88 210 Q 86 240 86 265" strokeWidth="0.4" opacity="0.5"/>
        <path d="M 262 195 Q 268 225 262 260" strokeWidth="0.8"/>
        <path d="M 242 195 Q 234 225 240 265" strokeWidth="0.7"/>
        <path d="M 256 265 Q 250 275 244 265" strokeWidth="0.5" opacity="0.6"/>
        <path d="M 252 210 Q 254 240 254 265" strokeWidth="0.4" opacity="0.5"/>
        {/* Unterarm-Extensoren */}
        <path d="M 78 290 Q 70 330 80 375" strokeWidth="0.6"/>
        <path d="M 100 290 Q 106 330 102 375" strokeWidth="0.6"/>
        <path d="M 88 300 Q 88 335 90 370" strokeWidth="0.4" opacity="0.5"/>
        <path d="M 262 290 Q 270 330 260 375" strokeWidth="0.6"/>
        <path d="M 240 290 Q 234 330 238 375" strokeWidth="0.6"/>
        <path d="M 252 300 Q 252 335 250 370" strokeWidth="0.4" opacity="0.5"/>
        {/* Gluteus */}
        <path d="M 130 350 Q 148 390 170 390" strokeWidth="1.1"/>
        <path d="M 210 350 Q 192 390 170 390" strokeWidth="1.1"/>
        <path d="M 135 402 Q 150 407 168 405" strokeWidth="0.9"/>
        <path d="M 205 402 Q 190 407 172 405" strokeWidth="0.9"/>
        <path d="M 122 345 Q 128 360 140 368" strokeWidth="0.5" opacity="0.6"/>
        <path d="M 218 345 Q 212 360 200 368" strokeWidth="0.5" opacity="0.6"/>
        {/* Hamstrings */}
        <path d="M 130 420 Q 128 470 132 500" strokeWidth="0.9"/>
        <path d="M 150 420 Q 148 470 150 500" strokeWidth="0.7"/>
        <path d="M 140 430 Q 140 465 140 498" strokeWidth="0.4" opacity="0.5"/>
        <path d="M 210 420 Q 212 470 208 500" strokeWidth="0.9"/>
        <path d="M 190 420 Q 192 470 190 500" strokeWidth="0.7"/>
        <path d="M 200 430 Q 200 465 200 498" strokeWidth="0.4" opacity="0.5"/>
        {/* Kniekehle */}
        <path d="M 134 510 Q 150 518 164 510" strokeWidth="0.9"/>
        <path d="M 176 510 Q 190 518 206 510" strokeWidth="0.9"/>
        <path d="M 138 505 L 150 518 L 162 505" strokeWidth="0.4" opacity="0.5"/>
        <path d="M 178 505 L 190 518 L 202 505" strokeWidth="0.4" opacity="0.5"/>
        {/* Wade 2-köpfig + Soleus + Achilles */}
        <path d="M 154 530 Q 148 560 154 600" strokeWidth="0.9"/>
        <path d="M 138 530 Q 132 560 140 600" strokeWidth="0.8"/>
        <path d="M 146 545 L 146 595" strokeWidth="0.5" opacity="0.6"/>
        <path d="M 136 605 Q 140 625 148 640" strokeWidth="0.6"/>
        <line x1="148" y1="640" x2="150" y2="675" strokeWidth="0.7"/>
        <path d="M 186 530 Q 192 560 186 600" strokeWidth="0.9"/>
        <path d="M 202 530 Q 208 560 200 600" strokeWidth="0.8"/>
        <path d="M 194 545 L 194 595" strokeWidth="0.5" opacity="0.6"/>
        <path d="M 204 605 Q 200 625 192 640" strokeWidth="0.6"/>
        <line x1="192" y1="640" x2="190" y2="675" strokeWidth="0.7"/>
        <circle cx="144" cy="648" r="2.5" fill="#3f3f46" opacity="0.5"/>
        <circle cx="196" cy="648" r="2.5" fill="#3f3f46" opacity="0.5"/>
      </g>
    </>
  );
}

function BodySilhouette({ activeSites, focusedSite, onSelectSite, view }) {
  const visibleMarkers = activeSites.filter(k => MARKERS[k].view === view);
  const viewLabel = view === "front" ? "Vorderansicht" : "Rückansicht";

  return (
    <svg viewBox="0 0 340 720" className="w-full h-full" xmlns="http://www.w3.org/2000/svg"
         role="img" aria-labelledby="silhouette-title silhouette-desc">
      <title id="silhouette-title">Körper-Silhouette, {viewLabel}</title>
      <desc id="silhouette-desc">
        Anatomische Darstellung einer menschlichen Figur mit {visibleMarkers.length} Messpunkten
        zum Antippen. Auswählen zeigt die Mess-Anleitung für den jeweiligen Punkt.
      </desc>
      <defs>
        <radialGradient id="bodyGradient" cx="50%" cy="30%" r="70%">
          <stop offset="0%"  stopColor="#27272a" />
          <stop offset="100%" stopColor="#18181b" />
        </radialGradient>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {view === "front" ? <BodyFront /> : <BodyBack />}
      {view === "front" ? <BodyFrontDetails /> : <BodyBackDetails />}

      {visibleMarkers.map(key => {
        const pos = MARKERS[key];
        const isFocused = focusedSite === key;
        return (
          <g key={key} transform={`translate(${pos.x} ${pos.y})`}
             className="cursor-pointer" onClick={() => onSelectSite(key)}
             role="button" tabIndex="0"
             aria-label={`Messpunkt ${SITES[key].label}`}
             onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelectSite(key); } }}>
            {/* Unsichtbare Hit-Area für bequemeres Touch-Targeting (44x44 CSS-px) */}
            <circle r="22" fill="transparent" />
            {isFocused && (
              <circle r="16" fill="none" stroke="#f97316" strokeWidth="2" opacity="0.4">
                <animate attributeName="r" from="10" to="22" dur="1.5s" repeatCount="indefinite" />
                <animate attributeName="opacity" from="0.6" to="0" dur="1.5s" repeatCount="indefinite" />
              </circle>
            )}
            <circle r="10" fill="#f97316" opacity="0.2" />
            <circle r="6" fill={isFocused ? "#fb923c" : "#f97316"}
                    stroke="#fff7ed" strokeWidth="1.5"
                    filter={isFocused ? "url(#glow)" : undefined} />
            <circle r="2" fill="#18181b" />
          </g>
        );
      })}
    </svg>
  );
}

// ============================================================================
//  RICHTUNGS-ICON
// ============================================================================

function DirectionIcon({ direction }) {
  const stroke = "#fb923c";
  if (direction === "vertikal") {
    return (
      <svg viewBox="0 0 40 40" className="w-full h-full">
        <line x1="20" y1="6" x2="20" y2="34" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
        <polygon points="20,4 16,10 24,10" fill={stroke} />
        <polygon points="20,36 16,30 24,30" fill={stroke} />
      </svg>
    );
  }
  if (direction === "horizontal") {
    return (
      <svg viewBox="0 0 40 40" className="w-full h-full">
        <line x1="6" y1="20" x2="34" y2="20" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
        <polygon points="4,20 10,16 10,24" fill={stroke} />
        <polygon points="36,20 30,16 30,24" fill={stroke} />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 40 40" className="w-full h-full">
      <line x1="8" y1="32" x2="32" y2="8" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
      <polygon points="6,34 14,32 8,26" fill={stroke} />
      <polygon points="34,6 26,8 32,14" fill={stroke} />
    </svg>
  );
}

// ============================================================================
//  HAUPT-KOMPONENTE
// ============================================================================

export default function CaliperApp() {
  const [gender, setGender] = useState("male");
  const [age, setAge] = useState(30);
  const [height, setHeight] = useState(180);
  const [weight, setWeight] = useState(80);
  const [clientName, setClientName] = useState("");
  const [formulaId, setFormulaId] = useState("jp3");
  const [values, setValues] = useState({});
  const [focusedSite, setFocusedSite] = useState(null);
  const [bodyView, setBodyView] = useState("front");
  const [showCompare, setShowCompare] = useState(false);

  const formula = FORMULAS[formulaId];
  const activeSites = formula.sites[gender];

  // Wenn focus auf einem Punkt liegt, der nach Formel-/Gender-Wechsel nicht mehr
  // aktiv ist, räumen wir ihn auf, damit das Tutorial-Panel keine falsche Info zeigt
  useEffect(() => {
    if (focusedSite && !activeSites.includes(focusedSite)) {
      setFocusedSite(null);
    }
  }, [activeSites, focusedSite]);

  const handleFocusSite = (key) => {
    setFocusedSite(key);
    const needed = MARKERS[key].view;
    if (needed !== bodyView) setBodyView(needed);
  };

  const result = useMemo(() => {
    const hasAll = activeSites.every(s => num(values[s]) > 0);
    if (!hasAll) return null;
    const ageNum = num(age);
    const weightNum = num(weight);
    if (formula.needsAge && (!Number.isFinite(ageNum) || ageNum < 10 || ageNum > 100)) return null;
    if (formula.needsWeight && (!Number.isFinite(weightNum) || weightNum < 20)) return null;
    const { bf, sum } = formula.compute(values, activeSites, ageNum, gender, weightNum);
    if (!Number.isFinite(bf) || bf < 0 || bf > 80) return null;
    return { bf, sum, category: getCategory(bf, gender) };
  }, [values, activeSites, formula, age, gender, weight]);

  const fatMass  = result && num(weight) > 0 ? (result.bf / 100) * num(weight) : null;
  const leanMass = result && num(weight) > 0 ? num(weight) - fatMass : null;

  const ffmi = useMemo(() => {
    const h = num(height);
    if (!leanMass || !Number.isFinite(h) || h < 100 || h > 230) return null;
    const f = calcFFMI(leanMass, h);
    if (!f) return null;
    return { ...f, category: getFFMICategory(f.normalized, gender) };
  }, [leanMass, height, gender]);

  const comparison = useMemo(() => {
    const ageNum = num(age);
    const weightNum = num(weight);
    const rows = {};
    for (const [key, f] of Object.entries(FORMULAS)) {
      const sites = f.sites[gender];
      const missingCount = sites.filter(s => !(num(values[s]) > 0)).length;
      if (missingCount > 0) {
        rows[key] = { status: "incomplete", missing: missingCount, total: sites.length };
        continue;
      }
      if (f.needsAge && (!Number.isFinite(ageNum) || ageNum < 10 || ageNum > 100)) {
        rows[key] = { status: "needs-age" };
        continue;
      }
      if (f.needsWeight && (!Number.isFinite(weightNum) || weightNum < 20)) {
        rows[key] = { status: "needs-weight" };
        continue;
      }
      const { bf } = f.compute(values, sites, ageNum, gender, weightNum);
      if (!Number.isFinite(bf) || bf < 0 || bf > 80) {
        rows[key] = { status: "error" };
        continue;
      }
      rows[key] = { status: "ok", bf };
    }
    const okValues = Object.values(rows).filter(r => r.status === "ok").map(r => r.bf);
    const avg = okValues.length > 0 ? okValues.reduce((a, b) => a + b, 0) / okValues.length : null;
    return { rows, avg, count: okValues.length };
  }, [values, gender, age, weight]);

  const progress = activeSites.filter(s => num(values[s]) > 0).length / activeSites.length;

  const handleReset = () => {
    setValues({});
    setFocusedSite(null);
  };

  const handlePrint = () => window.print();

  const today = new Date().toLocaleDateString("de-DE", {
    day: "2-digit", month: "2-digit", year: "numeric"
  });

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap');
        .font-display { font-family: 'Outfit', system-ui, sans-serif; letter-spacing: -0.02em; }
        .font-mono    { font-family: 'JetBrains Mono', ui-monospace, monospace; }
        body { font-family: 'Outfit', system-ui, sans-serif; }

        /* ======= MOBILE UX ======= */
        /* Blauer Tap-Highlight-Flash auf iOS/Android entfernen */
        * { -webkit-tap-highlight-color: transparent; }
        /* Text-Selection auf Tap-Elementen verhindern (Long-Press-Selection) */
        button, [role="button"], label, .no-select { user-select: none; -webkit-user-select: none; }
        /* Flüssigere Tap-Reaktion, keine Doppel-Tap-Zoom-Verzögerung auf iOS */
        button, [role="button"], a { touch-action: manipulation; }
        /* Keyboard-Fokus sichtbar machen (A11y), aber Maus-Fokus nicht */
        button:focus-visible, [role="button"]:focus-visible, input:focus-visible, a:focus-visible {
          outline: 2px solid #f97316;
          outline-offset: 2px;
          border-radius: 8px;
        }
        /* SVG-Marker: Gesten-Konflikte vermeiden */
        svg [role="button"], svg g.cursor-pointer { touch-action: manipulation; }

        .grain::before {
          content: ''; position: absolute; inset: 0;
          background-image: radial-gradient(circle at 1px 1px, rgba(255,255,255,0.015) 1px, transparent 0);
          background-size: 3px 3px; pointer-events: none;
        }
        @keyframes slideIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .animate-slide-in { animation: slideIn 0.3s ease-out; }
        input[type=number]::-webkit-outer-spin-button,
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }

        /* Nutzer mit Vestibular-Disorders → keine Animationen erzwingen */
        @media (prefers-reduced-motion: reduce) {
          .animate-slide-in { animation: none; }
          svg animate { display: none; }
          * { transition-duration: 0.01ms !important; }
        }

        .print-only { display: none; }
        @media print {
          @page { size: A4; margin: 16mm; }
          body { background: white !important; color: black !important; }
          .screen-only { display: none !important; }
          .print-only  { display: block !important; }
          .print-only * { color: #111 !important; border-color: #ccc !important; }
          .print-only h1, .print-only h2, .print-only h3 { color: #111 !important; }
        }
      `}</style>

      {/* PRINT-LAYOUT */}
      <div className="print-only p-6 text-sm">
        <div className="flex items-start justify-between border-b-2 border-black pb-3 mb-5">
          <div>
            <h1 className="text-2xl font-bold">Caliper-Messprotokoll</h1>
            <div className="text-xs mt-1">Physiques Unlimited · made by {APP_AUTHOR}</div>
          </div>
          <div className="text-right text-xs">
            <div><strong>Datum:</strong> {today}</div>
            <div><strong>Version:</strong> v{APP_VERSION}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-1 mb-5">
          {clientName && <div><strong>Name:</strong> {clientName}</div>}
          <div><strong>Geschlecht:</strong> {gender === "male" ? "Mann" : "Frau"}</div>
          {num(age) > 0 && <div><strong>Alter:</strong> {age} Jahre</div>}
          {num(height) > 0 && <div><strong>Körpergröße:</strong> {height} cm</div>}
          {num(weight) > 0 && <div><strong>Körpergewicht:</strong> {weight} kg</div>}
          <div><strong>Methode:</strong> {formula.name} · {formula.subtitle}</div>
        </div>

        <h2 className="text-base font-bold mb-2 border-b border-black">Einzelmesswerte</h2>
        <table className="w-full mb-5 text-sm">
          <thead>
            <tr className="border-b border-gray-400">
              <th className="text-left py-1">Messstelle</th>
              <th className="text-left py-1">Richtung</th>
              <th className="text-right py-1">Wert (mm)</th>
            </tr>
          </thead>
          <tbody>
            {activeSites.map(s => (
              <tr key={s} className="border-b border-gray-200">
                <td className="py-1">{SITES[s].label}</td>
                <td className="py-1 text-xs">{SITES[s].direction}</td>
                <td className="py-1 text-right font-mono">{values[s] || "–"}</td>
              </tr>
            ))}
            {result && (
              <tr className="border-t-2 border-black font-bold">
                <td className="py-1" colSpan={2}>Summe</td>
                <td className="py-1 text-right font-mono">{result.sum.toFixed(1)} mm</td>
              </tr>
            )}
          </tbody>
        </table>

        {result && (
          <>
            <h2 className="text-base font-bold mb-2 border-b border-black">Ergebnis</h2>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 mb-5">
              <div><strong>Körperfettanteil:</strong> {result.bf.toFixed(1)} %</div>
              <div><strong>Einstufung:</strong> {result.category?.label}</div>
              {fatMass && <div><strong>Fettmasse:</strong> {fatMass.toFixed(1)} kg</div>}
              {leanMass && <div><strong>Magermasse:</strong> {leanMass.toFixed(1)} kg</div>}
              {ffmi && <div><strong>FFMI:</strong> {ffmi.raw.toFixed(1)}</div>}
              {ffmi && <div><strong>FFMI (normalisiert):</strong> {ffmi.normalized.toFixed(1)} – {ffmi.category?.label}</div>}
            </div>
          </>
        )}

        {comparison.count >= 2 && (
          <>
            <h2 className="text-base font-bold mb-2 border-b border-black">Formel-Vergleich</h2>
            <table className="w-full mb-5 text-sm">
              <thead>
                <tr className="border-b border-gray-400">
                  <th className="text-left py-1">Methode</th>
                  <th className="text-right py-1">KFA (%)</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(comparison.rows).map(([k, r]) => (
                  <tr key={k} className="border-b border-gray-200">
                    <td className="py-1">{FORMULAS[k].name} ({FORMULAS[k].subtitle})</td>
                    <td className="py-1 text-right font-mono">
                      {r.status === "ok" ? r.bf.toFixed(1) : "–"}
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-black font-bold">
                  <td className="py-1">Mittelwert ({comparison.count} Methoden)</td>
                  <td className="py-1 text-right font-mono">{comparison.avg?.toFixed(1)}</td>
                </tr>
              </tbody>
            </table>
          </>
        )}

        <div className="mt-8 pt-3 border-t border-gray-400 text-xs text-gray-600">
          Berechnung Siri (1961): BF% = (495 / Körperdichte) − 450.
          Generiert mit Caliper v{APP_VERSION} · {APP_URL}
        </div>
      </div>

      {/* BILDSCHIRM */}
      <div className="screen-only relative grain">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">

          <header className="mb-8 sm:mb-10">
            <div className="flex items-center gap-3 mb-3 flex-wrap">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
                <Activity className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
              <span className="font-mono text-xs uppercase tracking-widest text-zinc-400">
                Caliper · Körperfett-Rechner
              </span>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-500">
                v{APP_VERSION}
              </span>
            </div>
            <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold leading-none">
              Hautfaltenmessung,
              <span className="block text-orange-500">präzise und visuell.</span>
            </h1>
            <p className="mt-4 text-zinc-400 max-w-2xl">
              Vier wissenschaftliche Formeln, eine klare Bedienung. Messpunkte werden direkt auf dem Körper markiert –
              inkl. Rückansicht, FFMI und PDF-Export.
            </p>
          </header>

          {/* PERSÖNLICHE DATEN */}
          <section className="mb-6 p-4 sm:p-5 bg-zinc-900/60 border border-zinc-800 rounded-2xl backdrop-blur">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-zinc-500 mb-2">
                  Geschlecht
                </label>
                <div className="grid grid-cols-2 gap-2" role="group" aria-label="Geschlecht wählen">
                  <button onClick={() => setGender("male")}
                    aria-pressed={gender === "male"}
                    className={`flex items-center justify-center gap-2 min-h-[44px] py-2.5 rounded-xl border transition-all ${
                      gender === "male"
                        ? "bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/20"
                        : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                    }`}>
                    <User className="w-4 h-4" /> Mann
                  </button>
                  <button onClick={() => setGender("female")}
                    aria-pressed={gender === "female"}
                    className={`flex items-center justify-center gap-2 min-h-[44px] py-2.5 rounded-xl border transition-all ${
                      gender === "female"
                        ? "bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/20"
                        : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                    }`}>
                    <Users className="w-4 h-4" /> Frau
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-zinc-500 mb-2">
                  Name <span className="text-zinc-600 normal-case">(optional, für PDF)</span>
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="z. B. Max Mustermann"
                  autoComplete="off"
                  className="w-full py-2.5 px-3 bg-zinc-950 border border-zinc-800 rounded-xl text-base focus:outline-none focus:border-orange-500 transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-zinc-500 mb-2">
                  Alter <span className="text-zinc-600">Jahre</span>
                </label>
                <input type="number" inputMode="numeric" autoComplete="off"
                  value={age} onChange={(e) => setAge(e.target.value)}
                  className="w-full py-2.5 px-3 bg-zinc-950 border border-zinc-800 rounded-xl text-lg font-mono focus:outline-none focus:border-orange-500 transition" />
              </div>
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-zinc-500 mb-2">
                  Größe <span className="text-zinc-600">cm</span>
                </label>
                <input type="number" inputMode="numeric" autoComplete="off"
                  value={height} onChange={(e) => setHeight(e.target.value)}
                  className="w-full py-2.5 px-3 bg-zinc-950 border border-zinc-800 rounded-xl text-lg font-mono focus:outline-none focus:border-orange-500 transition" />
              </div>
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-zinc-500 mb-2">
                  Gewicht <span className="text-zinc-600">kg</span>
                </label>
                <input type="number" inputMode="decimal" autoComplete="off"
                  value={weight} onChange={(e) => setWeight(e.target.value)}
                  className="w-full py-2.5 px-3 bg-zinc-950 border border-zinc-800 rounded-xl text-lg font-mono focus:outline-none focus:border-orange-500 transition" />
              </div>
            </div>
          </section>

          {/* FORMEL-AUSWAHL */}
          <section className="mb-6">
            <h2 className="font-mono text-xs uppercase tracking-widest text-zinc-500 mb-3">
              Berechnungsmethode
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3" role="group" aria-label="Berechnungsmethode wählen">
              {Object.values(FORMULAS).map(f => (
                <button key={f.id}
                  onClick={() => { setFormulaId(f.id); setFocusedSite(null); }}
                  aria-pressed={formulaId === f.id}
                  className={`relative text-left p-3 sm:p-4 rounded-2xl border transition-all ${
                    formulaId === f.id
                      ? "bg-zinc-900 border-orange-500/60 shadow-lg shadow-orange-500/5"
                      : "bg-zinc-900/40 border-zinc-800 hover:border-zinc-700"
                  }`}>
                  {formulaId === f.id && (
                    <div className="absolute top-2 right-2">
                      <CheckCircle2 className="w-4 h-4 text-orange-500" />
                    </div>
                  )}
                  <div className="font-mono text-[10px] uppercase tracking-wider text-orange-500/80 mb-1">
                    {f.badge}
                  </div>
                  <div className="font-display font-semibold text-sm sm:text-base text-zinc-100 leading-tight">
                    {f.name}
                  </div>
                  <div className="text-xs text-zinc-500 mt-0.5">{f.subtitle}</div>
                </button>
              ))}
            </div>
            <p className="mt-3 text-sm text-zinc-500 flex items-start gap-2">
              <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-zinc-600" />
              <span>{formula.description}</span>
            </p>
          </section>

          {/* KÖRPER + INPUTS */}
          <div className="grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-6 mb-6">

            <section className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden backdrop-blur">
              <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-zinc-800">
                <div className="flex bg-zinc-950 border border-zinc-800 rounded-lg p-0.5" role="group" aria-label="Körperansicht wechseln">
                  <button onClick={() => {
                    setBodyView("front");
                    if (focusedSite && MARKERS[focusedSite].view !== "front") setFocusedSite(null);
                  }}
                    aria-pressed={bodyView === "front"}
                    className={`px-4 min-h-[36px] text-xs rounded-md transition ${
                      bodyView === "front" ? "bg-orange-500 text-white" : "text-zinc-400 hover:text-zinc-200"
                    }`}>Vorne</button>
                  <button onClick={() => {
                    setBodyView("back");
                    if (focusedSite && MARKERS[focusedSite].view !== "back") setFocusedSite(null);
                  }}
                    aria-pressed={bodyView === "back"}
                    className={`px-4 min-h-[36px] text-xs rounded-md transition ${
                      bodyView === "back" ? "bg-orange-500 text-white" : "text-zinc-400 hover:text-zinc-200"
                    }`}>Hinten</button>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-orange-500 to-orange-400 transition-all duration-300"
                         style={{ width: `${progress * 100}%` }} />
                  </div>
                  <span className="font-mono text-xs text-zinc-500 tabular-nums">
                    {Math.round(progress * 100)}%
                  </span>
                </div>
              </div>
              <div className="p-3 sm:p-5 max-w-sm mx-auto">
                <BodySilhouette activeSites={activeSites} focusedSite={focusedSite}
                  onSelectSite={handleFocusSite} view={bodyView} />
              </div>

              {activeSites.filter(k => MARKERS[k].view === bodyView).length === 0 && (
                <div className="mx-3 sm:mx-5 mb-4 p-3 bg-zinc-950/60 border border-zinc-800 rounded-xl text-xs text-zinc-400 flex items-center gap-2">
                  <Eye className="w-4 h-4 text-zinc-600" />
                  Alle Messpunkte dieser Methode liegen auf der {bodyView === "front" ? "Rück" : "Vorder"}ansicht.
                </div>
              )}

              {focusedSite && (
                <div className="mx-3 sm:mx-5 mb-4 p-4 bg-orange-500/5 border border-orange-500/20 rounded-xl animate-slide-in">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-zinc-950 border border-zinc-800 p-2 flex-shrink-0">
                      <DirectionIcon direction={SITES[focusedSite].direction} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-display font-semibold text-orange-400">
                          {SITES[focusedSite].label}
                        </span>
                        <span className="font-mono text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-zinc-400">
                          {SITES[focusedSite].direction}
                        </span>
                        <span className="font-mono text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-zinc-400">
                          {MARKERS[focusedSite].view === "front" ? "Vorderseite" : "Rückseite"}
                        </span>
                      </div>
                      <div className="text-xs text-zinc-400 mt-2 leading-relaxed">
                        {SITES[focusedSite].detail}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </section>

            <section className="bg-zinc-900/60 border border-zinc-800 rounded-2xl backdrop-blur">
              <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-zinc-800">
                <span className="font-mono text-xs uppercase tracking-widest text-zinc-400">
                  Hautfalten · mm
                </span>
                <button onClick={handleReset}
                  aria-label="Alle Messwerte zurücksetzen"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 min-h-[32px] rounded-lg text-xs text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition">
                  <RotateCcw className="w-3.5 h-3.5" /> Zurücksetzen
                </button>
              </div>
              <div className="p-3 sm:p-4 space-y-2">
                {activeSites.map(key => (
                  <div key={key}
                    className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all cursor-pointer ${
                      focusedSite === key
                        ? "bg-orange-500/5 border-orange-500/40"
                        : "bg-zinc-950/50 border-zinc-800/80 hover:border-zinc-700"
                    }`}
                    onClick={() => handleFocusSite(key)}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      num(values[key]) > 0 ? "bg-orange-500" : "bg-zinc-800"
                    }`}>
                      {num(values[key]) > 0 ? (
                        <CheckCircle2 className="w-4 h-4 text-white" />
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-zinc-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-display font-medium text-sm text-zinc-200 truncate flex items-center gap-1.5">
                        {SITES[key].label}
                        <span className="font-mono text-[9px] uppercase tracking-wider text-zinc-500">
                          · {MARKERS[key].view === "front" ? "vorne" : "hinten"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <input type="number" step="0.5" min="0" max="80" placeholder="0"
                        inputMode="decimal"
                        value={values[key] ?? ""}
                        onFocus={() => handleFocusSite(key)}
                        onChange={(e) => setValues(v => ({ ...v, [key]: e.target.value }))}
                        className="w-20 py-1.5 px-2 bg-zinc-900 border border-zinc-700 rounded-lg text-right font-mono text-lg focus:outline-none focus:border-orange-500 transition" />
                      <span className="font-mono text-xs text-zinc-600 w-6">mm</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* ERGEBNIS */}
          <section className={`rounded-2xl border transition-all ${
            result
              ? "bg-gradient-to-br from-zinc-900 via-zinc-900 to-orange-950/20 border-orange-500/30 shadow-2xl shadow-orange-500/5"
              : "bg-zinc-900/60 border-zinc-800"
          }`}>
            {result ? (
              <div className="p-5 sm:p-8 animate-slide-in">
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <Zap className="w-4 h-4 text-orange-500" />
                      <span className="font-mono text-xs uppercase tracking-widest text-zinc-400">
                        Körperfettanteil
                      </span>
                    </div>
                    <div className="flex items-baseline gap-3">
                      <span className="font-display font-bold text-7xl sm:text-8xl text-white leading-none tabular-nums">
                        {result.bf.toFixed(1)}
                      </span>
                      <span className="font-mono text-2xl text-orange-500">%</span>
                    </div>
                    {result.category && (
                      <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-950/60 border border-zinc-800">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: result.category.color }} />
                        <span className="font-mono text-sm text-zinc-300">{result.category.label}</span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-3 lg:w-[420px]">
                    <StatCard label="Fettmasse" value={fatMass ? fatMass.toFixed(1) : "–"} unit="kg" />
                    <StatCard label="Magermasse" value={leanMass ? leanMass.toFixed(1) : "–"} unit="kg" />
                    <StatCard label="∑ Falten" value={result.sum.toFixed(1)} unit="mm" />
                  </div>
                </div>

                <div className="mt-8">
                  <div className="flex justify-between font-mono text-[10px] uppercase tracking-wider text-zinc-500 mb-2">
                    {CATEGORIES[gender].map((c, i) => (
                      <span key={i}>{c.label}</span>
                    ))}
                  </div>
                  <div className="relative h-2 rounded-full overflow-hidden bg-zinc-800">
                    <div className="absolute inset-0 flex">
                      {CATEGORIES[gender].map((c, i, arr) => {
                        const prev = i === 0 ? 0 : arr[i - 1].max;
                        const max = c.max === 100 ? (gender === "male" ? 35 : 40) : c.max;
                        const width = ((max - prev) / (gender === "male" ? 35 : 40)) * 100;
                        return (
                          <div key={i} style={{ width: `${width}%`, backgroundColor: c.color, opacity: 0.4 }} />
                        );
                      })}
                    </div>
                    <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 shadow-lg"
                      style={{
                        left: `${Math.min(100, (result.bf / (gender === "male" ? 35 : 40)) * 100)}%`,
                        borderColor: result.category.color,
                        transform: "translate(-50%, -50%)",
                      }} />
                  </div>
                </div>

                {/* FFMI */}
                {ffmi && (
                  <div className="mt-8 pt-6 border-t border-zinc-800">
                    <div className="flex items-center gap-2 mb-3">
                      <Ruler className="w-4 h-4 text-orange-500" />
                      <span className="font-mono text-xs uppercase tracking-widest text-zinc-400">
                        FFMI · Fat-Free-Mass-Index
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <StatCard label="FFMI (roh)" value={ffmi.raw.toFixed(1)} unit="" />
                      <StatCard label="FFMI (norm.)" value={ffmi.normalized.toFixed(1)} unit="" />
                      <div className="bg-zinc-950/50 border border-zinc-800 rounded-xl p-3 col-span-2 sm:col-span-1">
                        <div className="font-mono text-[10px] uppercase tracking-wider text-zinc-500 mb-1">
                          Einstufung
                        </div>
                        {ffmi.category && (
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: ffmi.category.color }} />
                            <span className="font-display font-semibold text-sm text-zinc-100">
                              {ffmi.category.label}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-zinc-500 mt-3 leading-relaxed">
                      Der FFMI zeigt deine Muskelmasse relativ zu deiner Körpergröße – aussagekräftiger als BMI.
                      Die normalisierte Version gleicht Größenunterschiede aus.
                    </p>
                  </div>
                )}

                {/* Formel-Vergleich */}
                <div className="mt-8 pt-6 border-t border-zinc-800">
                  <button onClick={() => setShowCompare(v => !v)}
                    className="flex items-center justify-between w-full group">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-orange-500" />
                      <span className="font-mono text-xs uppercase tracking-widest text-zinc-400 group-hover:text-zinc-200">
                        Formel-Vergleich
                      </span>
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
                        {comparison.count}/4 berechenbar
                      </span>
                    </div>
                    {showCompare ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
                  </button>

                  {showCompare && (
                    <div className="mt-4 space-y-2 animate-slide-in">
                      {Object.entries(comparison.rows).map(([k, r]) => {
                        const f = FORMULAS[k];
                        const isCurrent = k === formulaId;
                        return (
                          <div key={k} className={`flex items-center gap-3 p-3 rounded-xl border ${
                            isCurrent ? "bg-orange-500/5 border-orange-500/30" : "bg-zinc-950/50 border-zinc-800"
                          }`}>
                            <div className="flex-1 min-w-0">
                              <div className="font-display font-semibold text-sm text-zinc-200">
                                {f.name} <span className="text-zinc-500 font-normal">· {f.subtitle}</span>
                                {isCurrent && (
                                  <span className="ml-2 font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400">
                                    aktiv
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              {r.status === "ok" ? (
                                <span className="font-display font-bold text-xl text-zinc-100 tabular-nums">
                                  {r.bf.toFixed(1)} <span className="text-sm text-orange-500 font-mono">%</span>
                                </span>
                              ) : r.status === "incomplete" ? (
                                <span className="text-xs text-zinc-500 font-mono">
                                  {r.total - r.missing}/{r.total} Werte
                                </span>
                              ) : r.status === "needs-weight" ? (
                                <span className="text-xs text-zinc-500 font-mono">Gewicht fehlt</span>
                              ) : r.status === "needs-age" ? (
                                <span className="text-xs text-zinc-500 font-mono">Alter fehlt</span>
                              ) : (
                                <span className="text-xs text-zinc-500 font-mono">–</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {comparison.avg && comparison.count >= 2 && (
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 mt-3">
                          <div className="flex-1 min-w-0">
                            <div className="font-display font-semibold text-sm text-emerald-300 flex items-center gap-2">
                              <ArrowLeftRight className="w-3.5 h-3.5" /> Mittelwert
                            </div>
                            <div className="text-xs text-zinc-500">
                              aus {comparison.count} berechneten Methoden
                            </div>
                          </div>
                          <span className="font-display font-bold text-xl text-emerald-300 tabular-nums">
                            {comparison.avg.toFixed(1)} <span className="text-sm text-emerald-500 font-mono">%</span>
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* PDF-Export */}
                <div className="mt-8 pt-6 border-t border-zinc-800 flex flex-col sm:flex-row gap-3">
                  <button onClick={handlePrint}
                    className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold transition shadow-lg shadow-orange-500/20">
                    <FileDown className="w-4 h-4" />
                    Als PDF speichern
                  </button>
                  <div className="text-xs text-zinc-500 flex items-center">
                    Öffnet den Druck-Dialog → dort <strong className="text-zinc-300 mx-1">„Als PDF speichern"</strong> wählen.
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 sm:p-12 text-center">
                <TrendingUp className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
                <div className="font-display text-zinc-400">
                  Gib alle {activeSites.length} Messwerte ein, um dein Ergebnis zu sehen.
                </div>
                <div className="text-xs text-zinc-600 mt-1 font-mono">
                  {activeSites.filter(s => num(values[s]) > 0).length} / {activeSites.length} erfasst
                </div>
              </div>
            )}
          </section>

          <footer className="mt-10 pt-6 border-t border-zinc-900 text-xs text-zinc-600 font-mono">
            <div className="flex flex-col sm:flex-row justify-between gap-2">
              <span>Umrechnung Dichte → KFA nach Siri (1961)</span>
              <span>Mittelwert aus 3 Messungen pro Falte empfohlen</span>
            </div>
            <div className="mt-4 pt-4 border-t border-zinc-900 flex flex-col sm:flex-row items-center justify-between gap-2">
              <span className="text-zinc-700">Version {APP_VERSION}</span>
              <span className="flex items-center gap-1.5">
                <span className="text-zinc-600">made by</span>
                <span className="text-orange-500 font-semibold">{APP_AUTHOR}</span>
                <span className="text-zinc-700">·</span>
                <a href={APP_URL} target="_blank" rel="noopener noreferrer"
                  className="text-zinc-400 hover:text-orange-400 transition underline-offset-2 hover:underline">
                  physiques-unlimited.de
                </a>
              </span>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, unit }) {
  return (
    <div className="bg-zinc-950/50 border border-zinc-800 rounded-xl p-3">
      <div className="font-mono text-[10px] uppercase tracking-wider text-zinc-500 mb-1">
        {label}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="font-display font-bold text-2xl text-zinc-100 tabular-nums">{value}</span>
        {unit && <span className="font-mono text-xs text-zinc-500">{unit}</span>}
      </div>
    </div>
  );
}
