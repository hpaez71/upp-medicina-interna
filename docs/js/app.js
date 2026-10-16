import { Store } from "./store.js";
(function () {
"use strict";
const S = window.STATS, C = window.CHARTS;
const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const nf = C.nf;
const fp = p => p == null || !Number.isFinite(p) ? "—" : p < 0.001 ? "< 0,001" : nf(p, 3);
const pq = p => p == null || !Number.isFinite(p) ? "p = —" : p < 0.001 ? "p < 0,001" : "p = " + nf(p, 3);
const lcx = t => String(t).charAt(0).toLowerCase() + String(t).slice(1);
const pc = (x, d = 1) => x == null || !Number.isFinite(x) ? "—" : nf(x * 100, d) + " %";
const today = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
const nowIso = () => new Date().toISOString();
const ago = iso => { if (!iso) return "—"; const m = Math.round((Date.now() - Date.parse(iso)) / 6e4); if (m < 1) return "hace un momento"; if (m < 60) return `hace ${m} min`; const h = Math.round(m / 60); if (h < 24) return `hace ${h} h`; const d = Math.round(h / 24); return d < 30 ? `hace ${d} d` : iso.slice(0, 10); };
const clone = o => JSON.parse(JSON.stringify(o));

/* =================== ESQUEMA DEL INSTRUMENTO =================== */
const L = a => a.map((l, i) => [i + 1, l]);
const YN = [[1, "Sí"], [0, "No"]];
const PROC = [[1, "Sí"], [0, "No"], [9, "No registrado"]];
const LIK = [[1, "1"], [2, "2"], [3, "3"], [4, "4"], [5, "5"]];
const LIK_L = ["Totalmente en desacuerdo", "En desacuerdo", "Ni de acuerdo ni en desacuerdo", "De acuerdo", "Totalmente de acuerdo"];

const BRADEN = [
 { id: "b_sensorial", t: "Percepción sensorial", s: "Percepción", d: "Capacidad de responder de forma significativa a la molestia por presión", o: [
  ["Completamente limitada", "No responde a estímulos dolorosos, o percibe muy poco dolor en casi toda la superficie corporal."],
  ["Muy limitada", "Responde solo a estímulos dolorosos; comunica molestia solo con quejidos o inquietud."],
  ["Ligeramente limitada", "Responde a órdenes verbales, pero no siempre comunica la molestia o la necesidad de cambio."],
  ["Sin limitaciones", "Responde a órdenes verbales y comunica el dolor o la molestia; sin déficit sensitivo."]] },
 { id: "b_humedad", t: "Exposición a la humedad", s: "Humedad", d: "Grado en que la piel está expuesta a humedad", o: [
  ["Constantemente húmeda", "Piel mojada casi siempre por sudor u orina; se detecta en cada movilización."],
  ["A menudo húmeda", "Piel húmeda con frecuencia; la ropa de cama se cambia al menos una vez por turno."],
  ["Ocasionalmente húmeda", "Humedad ocasional; requiere un cambio adicional de ropa de cama al día."],
  ["Raramente húmeda", "Piel habitualmente seca; cambios de ropa de cama de rutina."]] },
 { id: "b_actividad", t: "Actividad", s: "Actividad", d: "Grado de actividad física", o: [
  ["Encamado", "Permanece en cama todo el tiempo."],
  ["En silla", "Capacidad de caminar muy limitada o nula; necesita ayuda para pasar a la silla."],
  ["Deambula ocasionalmente", "Camina distancias cortas con o sin ayuda; pasa la mayor parte del turno en cama o silla."],
  ["Deambula frecuentemente", "Camina fuera de la habitación al menos dos veces al día y dentro de ella cada pocas horas."]] },
 { id: "b_movilidad", t: "Movilidad", s: "Movilidad", d: "Capacidad de cambiar y controlar la posición del cuerpo", o: [
  ["Completamente inmóvil", "No hace ni pequeños cambios de posición del cuerpo o las extremidades sin ayuda."],
  ["Muy limitada", "Hace cambios leves y ocasionales, pero no cambios significativos por sí mismo."],
  ["Ligeramente limitada", "Hace por sí mismo cambios frecuentes, aunque leves, de posición."],
  ["Sin limitaciones", "Hace cambios importantes y frecuentes de posición sin ayuda."]] },
 { id: "b_nutricion", t: "Nutrición", s: "Nutrición", d: "Patrón habitual de ingesta de alimentos", o: [
  ["Muy pobre", "Nunca come una comida completa; ingiere un tercio o menos, ayuno o líquidos claros por más de 5 días."],
  ["Probablemente inadecuada", "Rara vez completa una comida; suele ingerir la mitad o recibe menos de lo óptimo por sonda."],
  ["Adecuada", "Come más de la mitad de la mayoría de las comidas o recibe soporte enteral o parenteral que cubre casi todo su requerimiento."],
  ["Excelente", "Come la mayor parte de cada comida y nunca la rechaza; no requiere suplementos."]] },
 { id: "b_friccion", t: "Fricción y deslizamiento", s: "Fricción", d: "Roce de la piel con superficies al moverse o al deslizarse", o: [
  ["Problema", "Requiere ayuda moderada a máxima para moverse; se desliza con frecuencia; espasticidad o agitación."],
  ["Problema potencial", "Se mueve débilmente o con ayuda mínima; la piel puede rozar las sábanas al moverse."],
  ["Sin problema aparente", "Se mueve en la cama y en la silla sin ayuda y mantiene una buena posición."]] }
];

const SECTIONS = [
 { k: "A", id: "ident", t: "Identificación y elegibilidad", p: "Sin datos que identifiquen a la persona. El registro solo se guarda con consentimiento informado.", f: [
  { id: "codigo", l: "Código del participante", type: "text", req: 1, ro: 1, hint: "Se asigna con su prefijo de recolector." },
  { id: "fecha_aplicacion", l: "Fecha de aplicación", type: "date", req: 1 },
  { id: "consentimiento", l: "Consentimiento informado firmado", type: "radio", o: YN, req: 1 },
  { id: "crit_edad", l: "Edad ≥ 18 años", type: "radio", o: YN },
  { id: "crit_estancia", l: "Hospitalizado ≥ 48 h en medicina interna", type: "radio", o: YN },
  { id: "fuente", l: "Fuentes de información", type: "multi", o: L(["Paciente", "Cuidador o familiar", "Historia clínica", "Observación directa"]), wide: 1 }
 ] },
 { k: "B", id: "socio", t: "Anamnesis sociodemográfica", p: "Pregunte al paciente o al cuidador; complete con la historia clínica.", f: [
  { id: "edad", l: "Edad", unit: "años", type: "num", min: 18, max: 110, req: 1 },
  { id: "sexo", l: "Sexo", type: "radio", o: L(["Hombre", "Mujer", "Intersexual"]), req: 1 },
  { id: "estado_civil", l: "Estado civil", type: "select", o: L(["Soltero(a)", "Casado(a)", "Unión libre", "Separado(a) o divorciado(a)", "Viudo(a)"]) },
  { id: "escolaridad", l: "Último nivel educativo", type: "select", o: L(["Ninguno", "Primaria", "Secundaria", "Técnico o tecnológico", "Universitario", "Posgrado"]) },
  { id: "estrato", l: "Estrato socioeconómico", type: "radio", o: [[1, "1"], [2, "2"], [3, "3"], [4, "4"], [5, "5"], [6, "6"]] },
  { id: "zona", l: "Zona de residencia", type: "radio", o: L(["Urbana", "Rural"]) },
  { id: "regimen", l: "Régimen de afiliación en salud", type: "select", o: L(["Contributivo", "Subsidiado", "Especial o de excepción", "No afiliado"]) },
  { id: "ocupacion", l: "Ocupación principal", type: "select", o: L(["Empleado", "Independiente", "Labores del hogar", "Pensionado", "Desempleado", "Estudiante"]) },
  { id: "etnia", l: "Pertenencia étnica", type: "select", o: L(["Ninguna", "Indígena", "Negro, afrocolombiano", "Raizal", "Palenquero", "Rrom"]) },
  { id: "convivencia", l: "Con quién vive", type: "select", o: L(["Solo(a)", "Pareja", "Familia", "Hogar geriátrico o institución"]) },
  { id: "cuidador", l: "Cuenta con cuidador durante la hospitalización", type: "radio", o: YN }
 ] },
 { k: "C", id: "clin", t: "Antecedentes y condición clínica", p: "Datos de la historia clínica al momento de la aplicación.", f: [
  { id: "fecha_ingreso", l: "Fecha de ingreso al servicio", type: "date" },
  { id: "dias_estancia", l: "Días de estancia", type: "calc", unit: "días" },
  { id: "dx_principal", l: "Diagnóstico principal", type: "text", hint: "Código CIE-10, por ejemplo J18.9." },
  { id: "peso_kg", l: "Peso", unit: "kg", type: "num", min: 20, max: 300, step: "0.1" },
  { id: "talla_cm", l: "Talla", unit: "cm", type: "num", min: 100, max: 220 },
  { id: "imc", l: "Índice de masa corporal", type: "calc", unit: "kg/m²" },
  { id: "albumina", l: "Albúmina sérica", unit: "g/dL", type: "num", min: 0.5, max: 6, step: "0.1" },
  { id: "hemoglobina", l: "Hemoglobina", unit: "g/dL", type: "num", min: 2, max: 22, step: "0.1" },
  { id: "incontinencia", l: "Incontinencia", type: "select", o: L(["Ninguna", "Urinaria", "Fecal", "Mixta"]) },
  { id: "sedacion", l: "Recibe sedantes u opioides", type: "radio", o: YN },
  { id: "comorb", l: "Comorbilidades", type: "multi", wide: 1, o: L(["Diabetes mellitus", "Hipertensión arterial", "Enfermedad renal crónica", "EPOC", "Insuficiencia cardíaca", "ACV o secuela neurológica", "Cáncer", "Deterioro cognitivo o demencia", "Enfermedad arterial periférica"]) },
  { id: "disp", l: "Dispositivos médicos", type: "multi", wide: 1, o: L(["Sonda vesical", "Sonda nasogástrica", "Oxígeno por cánula o máscara", "Ventilación no invasiva", "Catéter venoso", "Collar, férula o yeso"]) },
  { id: "upp_presente", l: "Presenta úlcera por presión al momento de la valoración", type: "radio", o: YN, wide: 1, req: 1 },
  { id: "upp_origen", l: "Origen de la lesión", type: "radio", o: L(["Presente al ingreso", "Adquirida en la hospitalización"]), dep: "upp" },
  { id: "upp_estadio", l: "Estadio más avanzado (NPIAP)", type: "select", o: L(["Estadio 1", "Estadio 2", "Estadio 3", "Estadio 4", "No estadificable", "Lesión de tejidos profundos", "Relacionada con dispositivo médico"]), dep: "upp" },
  { id: "upp_n", l: "Número de lesiones", type: "num", min: 1, max: 20, dep: "upp" },
  { id: "upp_loc", l: "Localización", type: "multi", wide: 1, dep: "upp", o: L(["Sacro o coxis", "Talones", "Trocánteres", "Isquion", "Occipital", "Codos", "Otra"]) }
 ] },
 { k: "D", id: "braden", t: "Escala de Braden", p: "Seleccione un nivel en cada una de las seis subescalas. El puntaje y el nivel de riesgo se calculan solos.", braden: 1 },
 { k: "E", id: "proc", t: "Procesos de atención para la prevención", p: "Verifique en la historia clínica y por observación durante las últimas 24 h. «No registrado» cuenta como no cumplido en el índice.", q: [
  ["p_valoracion", "Valoración del riesgo con Braden registrada en las primeras 24 h del ingreso", "Valoración Braden al ingreso"],
  ["p_revaloracion", "Revaloración del riesgo registrada en las últimas 72 h", "Revaloración en 72 h"],
  ["p_cambios", "Cambios de posición registrados cada 2 a 4 horas", "Cambios de posición"],
  ["p_superficie", "Superficie especial de manejo de presión (colchón de aire o espuma)", "Superficie especial"],
  ["p_inspeccion", "Inspección de la piel registrada en el turno", "Inspección de piel"],
  ["p_hidratacion", "Hidratación o protección de la piel (cremas barrera, ácidos grasos hiperoxigenados)", "Protección de la piel"],
  ["p_humedad", "Manejo de la humedad e incontinencia (cambio oportuno de pañal o ropa)", "Manejo de la humedad"],
  ["p_talones", "Alivio de presión en talones y prominencias óseas", "Alivio de talones"],
  ["p_cabecera", "Cabecera a 30° o menos cuando la condición clínica lo permite", "Cabecera ≤ 30°"],
  ["p_nutricion", "Valoración o soporte nutricional documentado", "Soporte nutricional"],
  ["p_educacion", "Educación al paciente o la familia sobre prevención de lesiones por presión", "Educación"]
 ], qopts: PROC, extra: [{ id: "idx_procesos", l: "Índice de cumplimiento de procesos", type: "calc", unit: "%" }] },
 { k: "F", id: "perc", t: "Percepción del paciente sobre el cuidado", p: "Lea cada afirmación. 1 = totalmente en desacuerdo, 5 = totalmente de acuerdo.", pre: [
  { id: "responde", l: "Quién responde", type: "radio", o: L(["Paciente", "Cuidador o familiar", "No es posible obtener respuesta"]), wide: 1 }
 ], q: [
  ["q1", "El personal me explicó el riesgo de lesiones en la piel por estar en cama.", "Me explicaron el riesgo"],
  ["q2", "Me ayudan a cambiar de posición con regularidad.", "Me cambian de posición"],
  ["q3", "Cuando pido ayuda para moverme, me atienden a tiempo.", "Atención oportuna"],
  ["q4", "Revisan mi piel (espalda, cadera, talones) durante la atención.", "Revisan mi piel"],
  ["q5", "Me mantienen limpio(a) y seco(a).", "Limpio y seco"],
  ["q6", "Me siento cómodo(a) con el colchón y la posición en la cama.", "Comodidad"],
  ["q7", "Me enseñaron a mí o a mi familia cómo prevenir estas lesiones.", "Educación recibida"],
  ["q8", "Estoy satisfecho(a) con los cuidados de enfermería que recibo.", "Satisfacción general"]
 ], qopts: LIK, likert: 1, extra: [
  { id: "dolor_apoyo", l: "Dolor o molestia en zonas de apoyo", unit: "0 a 10", type: "num", min: 0, max: 10 },
  { id: "percepcion_media", l: "Puntaje medio de percepción", type: "calc", unit: "1 a 5" }
 ] },
 { k: "G", id: "obs", t: "Observaciones", f: [{ id: "observaciones", l: "Notas del evaluador", type: "textarea", wide: 1 }] }
];
const RISK = [
 { max: 9, l: "Riesgo muy alto", s: "Muy alto", code: 1 }, { max: 12, l: "Riesgo alto", s: "Alto", code: 2 },
 { max: 14, l: "Riesgo moderado", s: "Moderado", code: 3 }, { max: 18, l: "Riesgo bajo", s: "Bajo", code: 4 }, { max: 23, l: "Sin riesgo", s: "Sin riesgo", code: 5 }
];
const riskOf = s => s == null ? null : RISK.find(r => s <= r.max);
const PROC_Q = SECTIONS.find(s => s.id === "proc").q, PERC_Q = SECTIONS.find(s => s.id === "perc").q;
const PROC_IDS = PROC_Q.map(q => q[0]), PERC_IDS = PERC_Q.map(q => q[0]);

function allFields() {
  const out = [];
  SECTIONS.forEach(s => {
    (s.f || []).forEach(f => out.push({ ...f, sec: s.k }));
    (s.pre || []).forEach(f => out.push({ ...f, sec: s.k }));
    if (s.braden) {
      BRADEN.forEach(b => out.push({ id: b.id, l: "Braden · " + b.t, type: "radio", o: b.o.map((x, i) => [i + 1, x[0]]), sec: s.k }));
      out.push({ id: "braden_total", l: "Braden · puntaje total", type: "calc", unit: "6 a 23", sec: s.k });
      out.push({ id: "braden_riesgo", l: "Braden · nivel de riesgo", type: "calc", o: RISK.map(r => [r.code, r.l]), sec: s.k });
    }
    (s.q || []).forEach(q => out.push({ id: q[0], l: q[1], short: q[2], type: "radio", o: s.qopts, sec: s.k }));
    (s.extra || []).forEach(f => out.push({ ...f, sec: s.k }));
  });
  return out;
}
const FIELDS = allFields();

/* Variables derivadas para el análisis */
const DERIVED = [
 { id: "grupo_edad", l: "Grupo de edad", o: L(["18 a 44 años", "45 a 64 años", "65 a 79 años", "80 años o más"]), ord: 1 },
 { id: "estancia_cat", l: "Estancia agrupada", o: L(["2 a 7 días", "8 a 14 días", "Más de 14 días"]), ord: 1 },
 { id: "imc_cat", l: "Estado nutricional (IMC, OMS)", o: L(["Bajo peso (< 18,5)", "Normal (18,5–24,9)", "Sobrepeso (25–29,9)", "Obesidad (≥ 30)"]), ord: 1 },
 { id: "hipoalb", l: "Hipoalbuminemia (< 3,5 g/dL)", o: YN },
 { id: "anemia", l: "Anemia (Hb < 12 mujeres, < 13 hombres)", o: YN },
 { id: "n_comorb", l: "Número de comorbilidades", num: 1 },
 { id: "n_disp", l: "Número de dispositivos médicos", num: 1 },
 { id: "riesgo3", l: "Riesgo Braden agrupado", o: L(["Alto o muy alto (≤ 12)", "Moderado (13–14)", "Bajo o sin riesgo (≥ 15)"]), ord: 1 },
 { id: "en_riesgo", l: "En riesgo según Braden (≤ 18)", o: YN },
 { id: "riesgo_alto", l: "Riesgo alto o muy alto (≤ 12)", o: YN },
 { id: "percep_cat", l: "Percepción categorizada", o: L(["Desfavorable (< 2,5)", "Intermedia (2,5–3,49)", "Favorable (≥ 3,5)"]), ord: 1 },
 { id: "proc_cat", l: "Cumplimiento de procesos", o: L(["Bajo (< 50 %)", "Medio (50–79 %)", "Alto (≥ 80 %)"]), ord: 1 },
 { id: "upp_hosp", l: "UPP adquirida en la hospitalización (excluye presentes al ingreso)", o: YN }
];
const ORD = new Set(["escolaridad", "estrato", "braden_riesgo", ...BRADEN.map(b => b.id), ...PERC_IDS]);
const SKIP = new Set(["consentimiento", "crit_edad", "crit_estancia", "responde", "upp_origen", "upp_estadio", "upp_n"]);
const VARS = {};
FIELDS.forEach(f => {
  if (["text", "date", "textarea"].includes(f.type)) return;
  if (f.type === "multi") { f.o.forEach(([c, l]) => VARS[`${f.id}_${c}`] = { id: `${f.id}_${c}`, l: `${f.l.replace("Fuentes de información", "Fuente")}: ${l}`, kind: "bin", o: YN, grp: f.id }); return; }
  let kind = f.o ? "cat" : "num";
  if (f.o && ORD.has(f.id)) kind = "ord";
  if (f.o && f.o.length === 2 && f.o.every(([v]) => v === 0 || v === 1)) kind = "bin";
  VARS[f.id] = { id: f.id, l: f.short ? `${f.id.toUpperCase()} ${f.short}` : f.l, kind, o: f.o, unit: f.unit, skip: SKIP.has(f.id) || f.id.startsWith("fuente") };
});
Object.keys(VARS).filter(k => k.startsWith("fuente_")).forEach(k => VARS[k].skip = true);
DERIVED.forEach(d => VARS[d.id] = { id: d.id, l: d.l, kind: d.num ? "num" : d.o.length === 2 ? "bin" : d.ord ? "ord" : "cat", o: d.o, derived: 1 });
const lab = (id, v) => { const V = VARS[id]; if (v == null) return "—"; if (!V || !V.o) return String(v); const o = V.o.find(o => o[0] === v); return o ? o[1] : String(v); };

/* =================== CÁLCULOS POR REGISTRO =================== */
const round = (x, d = 1) => x == null ? null : Math.round(x * 10 ** d) / 10 ** d;
function compute(v) {
  const out = {}; const bs = BRADEN.map(b => v[b.id]).filter(x => x != null);
  out.braden_total = bs.length === 6 ? S.sum(bs) : null;
  out.braden_riesgo = out.braden_total == null ? null : riskOf(out.braden_total).code;
  out._bp = S.sum(bs); out._bn = bs.length;
  out.imc = v.peso_kg && v.talla_cm ? round(v.peso_kg / (v.talla_cm / 100) ** 2, 1) : null;
  if (v.fecha_ingreso && v.fecha_aplicacion) { const d = (Date.parse(v.fecha_aplicacion) - Date.parse(v.fecha_ingreso)) / 864e5; out.dias_estancia = Number.isFinite(d) ? Math.round(d) : null; } else out.dias_estancia = null;
  const pr = PROC_IDS.map(id => v[id]).filter(x => x != null);
  out.idx_procesos = pr.length ? round(pr.filter(x => x === 1).length / pr.length * 100, 1) : null;
  const pcv = v.responde === 3 ? [] : PERC_IDS.map(id => v[id]).filter(x => x != null);
  out.percepcion_media = pcv.length ? round(S.mean(pcv), 2) : null;
  return out;
}
function derive(v) {
  const d = { ...v }; const multi = FIELDS.filter(f => f.type === "multi");
  multi.forEach(f => f.o.forEach(([c]) => d[`${f.id}_${c}`] = (v[f.id] || []).includes(c) ? 1 : 0));
  if (v.upp_presente !== 1) (FIELDS.find(f => f.id === "upp_loc").o).forEach(([c]) => d[`upp_loc_${c}`] = null);
  if (v.responde === 3) PERC_IDS.forEach(id => d[id] = null);
  const e = v.edad, bt = v.braden_total, pm = v.percepcion_media, ip = v.idx_procesos, ds = v.dias_estancia;
  d.grupo_edad = e == null ? null : e < 45 ? 1 : e < 65 ? 2 : e < 80 ? 3 : 4;
  d.estancia_cat = ds == null || ds < 0 ? null : ds <= 7 ? 1 : ds <= 14 ? 2 : 3;
  d.imc_cat = v.imc == null ? null : v.imc < 18.5 ? 1 : v.imc < 25 ? 2 : v.imc < 30 ? 3 : 4;
  d.hipoalb = v.albumina == null ? null : v.albumina < 3.5 ? 1 : 0;
  d.anemia = v.hemoglobina == null || v.sexo == null || v.sexo === 3 ? null : v.hemoglobina < (v.sexo === 1 ? 13 : 12) ? 1 : 0;
  d.n_comorb = (v.comorb || []).length; d.n_disp = (v.disp || []).length;
  d.riesgo3 = bt == null ? null : bt <= 12 ? 1 : bt <= 14 ? 2 : 3;
  d.en_riesgo = bt == null ? null : bt <= 18 ? 1 : 0; d.riesgo_alto = bt == null ? null : bt <= 12 ? 1 : 0;
  d.percep_cat = pm == null ? null : pm < 2.5 ? 1 : pm < 3.5 ? 2 : 3;
  d.proc_cat = ip == null ? null : ip < 50 ? 1 : ip < 80 ? 2 : 3;
  d.upp_hosp = v.upp_presente === 0 ? 0 : v.upp_presente === 1 && v.upp_origen === 2 ? 1 : null;
  return d;
}
function quality(v) {
  const a = [];
  if (v.crit_edad === 0 || v.crit_estancia === 0) a.push("No cumple un criterio de inclusión");
  if (v.edad != null && v.edad > 100) a.push(`Edad de ${v.edad} años`);
  if (v.imc != null && (v.imc < 13 || v.imc > 60)) a.push(`IMC de ${nf(v.imc)} fuera de rango; revise peso y talla`);
  if (v.albumina != null && (v.albumina < 1 || v.albumina > 5.5)) a.push(`Albúmina de ${nf(v.albumina)} g/dL`);
  if (v.hemoglobina != null && (v.hemoglobina < 4 || v.hemoglobina > 20)) a.push(`Hemoglobina de ${nf(v.hemoglobina)} g/dL`);
  if (v.dias_estancia != null && v.dias_estancia < 2) a.push(`Estancia de ${v.dias_estancia} día(s), menor de 48 h`);
  if (!v.fecha_ingreso) a.push("Sin fecha de ingreso");
  if (v.upp_presente === 1 && !v.upp_estadio) a.push("UPP sin estadio");
  if (v.upp_presente === 1 && !v.upp_origen) a.push("UPP sin origen (ingreso u hospitalización)");
  const mp = PROC_IDS.filter(id => v[id] == null).length; if (mp) a.push(`${mp} proceso(s) de atención sin responder`);
  if (v.responde == null) a.push("Sin indicar quién responde la percepción");
  else if (v.responde !== 3) { const mq = PERC_IDS.filter(id => v[id] == null).length; if (mq) a.push(`${mq} ítem(s) de percepción sin responder`); }
  return a;
}

/* =================== NOMBRES DEL EQUIPO =================== */
function fillNames(root) {
  root.querySelectorAll("[data-uid]").forEach(e => { const t = ST.team[e.dataset.uid]; e.textContent = (t && (t.nombre || t.email)) || e.dataset.fallback || "Integrante"; });
}

/* =================== ESTADO =================== */
const ST = { recs: new Map(), team: {}, cfg: {}, acceso: {}, view: "inicio", panel: "oe1", src: "real", inc: "all", fWho: "all", editing: null, loaded: false, reviewOpen: null, delOpen: null, expX: "riesgo3", expY: "upp_presente", logit: ["braden_total", "percepcion_media", "idx_procesos", "edad"], normGrp: "all", normVar: "braden_total" };
const isAsesor = () => !!(Store.access && Store.access.rol === "asesor");
const myPrefix = () => Store.access && Store.access.prefijo;
const canWrite = () => !!Store.access;
const prefixOf = r => r.prefijo || (r.id.split("-")[1] || "");

/* =================== FORMULARIO =================== */
function fieldHTML(f) {
  const labx = `${esc(f.l)}${f.unit ? ` <span class="unit">(${esc(f.unit)})</span>` : ""}`;
  const cls = `f${f.wide ? " wide" : ""}`, dep = f.dep ? ` data-dep="${f.dep}"` : "", rq = f.req ? " req" : "";
  if (f.type === "radio" || f.type === "multi") { const t = f.type === "radio" ? "radio" : "checkbox";
    return `<div class="${cls}"${dep} role="group" aria-labelledby="lb-${f.id}"><span class="lbl${rq}" id="lb-${f.id}">${labx}</span><div class="pills">${f.o.map(([v, l]) => `<label><input type="${t}" name="${f.id}" id="${f.id}-${v}" value="${v}"><span>${esc(l)}</span></label>`).join("")}</div></div>`; }
  if (f.type === "select") return `<div class="${cls}"${dep}><label class="${rq.trim()}" for="${f.id}">${labx}</label><select id="${f.id}" name="${f.id}"><option value="">Seleccione…</option>${f.o.map(([v, l]) => `<option value="${v}">${esc(l)}</option>`).join("")}</select></div>`;
  if (f.type === "calc") return `<div class="${cls}"${dep}><span class="lbl">${labx}</span><output class="calc" id="${f.id}">—</output></div>`;
  if (f.type === "textarea") return `<div class="${cls}"${dep}><label for="${f.id}">${labx}</label><textarea id="${f.id}" name="${f.id}"></textarea></div>`;
  const it = f.type === "num" ? "number" : f.type;
  const ex = f.type === "num" ? ` inputmode="decimal"${f.min != null ? ` min="${f.min}"` : ""}${f.max != null ? ` max="${f.max}"` : ""} step="${f.step || 1}"` : "";
  return `<div class="${cls}"${dep}><label class="${rq.trim()}" for="${f.id}">${labx}</label><input type="${it}" id="${f.id}" name="${f.id}"${ex}${f.ro ? " readonly" : ""} autocomplete="off">${f.hint ? `<span class="hint">${esc(f.hint)}</span>` : ""}</div>`;
}
function bradenHTML() {
  const ticks = [6, 10, 13, 15, 19, 23].map(n => `<span style="left:${(n - 6) / 17 * 100}%">${n}</span>`).join("");
  return `<div class="braden-head"><div class="score"><b id="bScore">—</b><span>/ 23<br><span id="bCount">0 de 6 subescalas</span></span></div>
    <span class="risk" id="bRisk"><i style="background:var(--line)"></i><span>Sin calcular</span></span>
    <div class="ruler" aria-hidden="true"><div class="mark"><i id="bMark" style="left:0;opacity:0"></i></div><div class="bar">${[1, 2, 3, 4, 5].map(k => `<div style="background:var(--rk${k})"></div>`).join("")}</div><div class="ticks">${ticks}</div></div></div>` +
    BRADEN.map((b, bi) => `<fieldset class="bsub"><legend class="legendcol">${esc(b.t)}</legend><h3><span>D${bi + 1}. ${esc(b.t)}</span><em>${esc(b.d)}</em></h3>
    <div class="bopts${b.o.length === 3 ? " three" : ""}">${b.o.map((o, i) => `<label class="bopt"><input type="radio" name="${b.id}" id="${b.id}-${i + 1}" value="${i + 1}"><span class="n">${i + 1}</span><span class="t"><b>${esc(o[0])}</b><small>${esc(o[1])}</small></span></label>`).join("")}</div></fieldset>`).join("");
}
function qHTML(s) {
  return `<div class="grid-q" id="q-${s.id}">${s.q.map(([id, t], i) => `<div class="qrow" role="group" aria-labelledby="lb-${id}"><div class="qt" id="lb-${id}"><small>${s.k}${i + 1}</small>${esc(t)}</div><div class="pills${s.likert ? " likert" : ""}">${s.qopts.map(([v, l]) => `<label><input type="radio" name="${id}" id="${id}-${v}" value="${v}"><span>${esc(l)}</span></label>`).join("")}</div></div>`).join("")}</div>`;
}
function renderForm() {
  $("sections").innerHTML = SECTIONS.map(s => {
    const body = s.braden ? bradenHTML() : `<div class="body">${(s.pre || []).map(fieldHTML).join("")}${(s.f || []).map(fieldHTML).join("")}${s.q ? qHTML(s) : ""}${(s.extra || []).map(fieldHTML).join("")}</div>`;
    return `<section class="blk" id="sec-${s.id}"><header><span class="letter">${s.k}</span><div><h2>${esc(s.t)}</h2>${s.p ? `<p>${esc(s.p)}</p>` : ""}</div></header>${body}</section>`;
  }).join("");
}
const frm = () => $("frm");
function collect() {
  const v = {}, F = frm();
  FIELDS.forEach(f => {
    if (f.type === "calc") return;
    if (f.type === "multi") { v[f.id] = [...F.querySelectorAll(`input[name="${f.id}"]:checked`)].map(x => +x.value); return; }
    if (f.type === "radio") { const x = F.querySelector(`input[name="${f.id}"]:checked`); v[f.id] = x ? +x.value : null; return; }
    const el = $(f.id); if (!el) return;
    if (f.type === "num") { const n = el.value === "" ? null : Number(el.value); v[f.id] = Number.isFinite(n) ? n : null; return; }
    if (f.type === "select") { v[f.id] = el.value === "" ? null : +el.value; return; }
    v[f.id] = el.value.trim();
  });
  Object.assign(v, compute(v)); return v;
}
function fill(v) {
  frm().reset();
  FIELDS.forEach(f => {
    if (f.type === "calc") return; const val = v[f.id];
    if (f.type === "multi") { (val || []).forEach(c => { const x = $(`${f.id}-${c}`); if (x) x.checked = true; }); return; }
    if (f.type === "radio") { if (val != null) { const x = $(`${f.id}-${val}`); if (x) x.checked = true; } return; }
    const el = $(f.id); if (el) el.value = val == null ? "" : val;
  });
  refreshForm();
}
function refreshForm() {
  const v = collect(), r = riskOf(v.braden_total);
  $("bScore").textContent = v.braden_total ?? (v._bn ? v._bp : "—");
  $("bCount").textContent = `${v._bn} de 6 subescalas`;
  const rk = $("bRisk"), mk = $("bMark"), lr = $("liveRisk");
  const sw = r ? `var(--rk${r.code})` : "var(--line)", txt = r ? r.l : v._bn ? "Faltan subescalas" : "Sin calcular";
  rk.innerHTML = `<i style="background:${sw}"></i><span>${esc(txt)}</span>`;
  lr.innerHTML = `<i style="background:${sw}"></i><span>Braden ${v.braden_total ?? "—"}/23${r ? " · " + esc(r.s) : ""}</span>`;
  if (r) { mk.style.left = ((v.braden_total - 6) / 17 * 100) + "%"; mk.style.opacity = 1; } else mk.style.opacity = 0;
  $("imc").textContent = nf(v.imc, 1); $("dias_estancia").textContent = v.dias_estancia == null ? "—" : String(v.dias_estancia);
  $("idx_procesos").textContent = v.idx_procesos == null ? "—" : nf(v.idx_procesos, 1) + " %";
  $("percepcion_media").textContent = nf(v.percepcion_media, 2);
  document.querySelectorAll('[data-dep="upp"]').forEach(el => el.classList.toggle("disabled", v.upp_presente !== 1));
  $("q-perc").classList.toggle("disabled", v.responde === 3);
}
function formMsg(text, kind, actions) {
  const m = $("formMsg"); m.hidden = !text; if (!text) return;
  m.innerHTML = `<div class="msg ${kind || ""}">${esc(text)}${actions ? `<div class="row" style="margin-top:8px">${actions}</div>` : ""}</div>`;
}
function nextCode() {
  const pre = myPrefix() || "XX"; let n = 0;
  ST.recs.forEach((r, id) => { const m = new RegExp(`^MI-${pre}-(\\d+)$`).exec(id); if (m) n = Math.max(n, +m[1]); });
  return `MI-${pre}-${String(n + 1).padStart(3, "0")}`;
}
function validate(v) {
  if (v.consentimiento !== 1) return "No se puede guardar sin consentimiento informado firmado (sección A).";
  if (v.edad != null && v.edad < 18) return "El participante debe tener 18 años o más.";
  if (v.dias_estancia != null && v.dias_estancia < 0) return "La fecha de ingreso es posterior a la fecha de aplicación. Corrija las fechas.";
  const errs = [];
  if (!v.codigo) errs.push("código");
  if (!v.fecha_aplicacion) errs.push("fecha de aplicación");
  if (v.edad == null) errs.push("edad"); if (v.sexo == null) errs.push("sexo");
  if (v.upp_presente == null) errs.push("presencia de UPP (sección C)");
  if (v._bn < 6) errs.push(`escala Braden (${6 - v._bn} subescala${6 - v._bn > 1 ? "s" : ""} sin responder)`);
  return errs.length ? "Falta completar: " + errs.join(", ") + "." : null;
}
const DRAFT = "upp-mi-borrador";
function saveDraft() { if (ST.editing) return; try { localStorage.setItem(DRAFT, JSON.stringify(collect())); } catch (e) { } }
function clearDraft() { try { localStorage.removeItem(DRAFT); } catch (e) { } }
async function onSave(e, force) {
  if (e) e.preventDefault();
  if (!canWrite()) return formMsg("Su cuenta no tiene acceso para guardar.", "bad");
  if (!myPrefix()) return formMsg("Su cuenta no tiene prefijo asignado. Pida a un asesor que lo revise en Equipo y accesos.", "bad");
  const v = collect(), err = validate(v); if (err) return formMsg(err, "bad");
  delete v._bp; delete v._bn;
  const btn = $("btnSave"); btn.disabled = true;
  try {
    if (ST.editing) {
      const cur = await Store.get(ST.editing.id);
      if (!cur) { formMsg("Este registro fue eliminado por otro integrante. Guárdelo como uno nuevo.", "bad"); return; }
      if (!force && (cur.rev || 1) !== ST.editing.rev) {
        formMsg(`Otra persona guardó cambios en ${ST.editing.id} ${ago(cur.mod)}. Si guarda ahora, reemplaza esa versión.`, "", `<button class="btn small" type="button" id="cfReload">Cargar la versión guardada</button><button class="btn small danger" type="button" id="cfForce">Guardar mis cambios de todos modos</button>`);
        $("cfReload").onclick = () => openRecord(ST.editing.id); $("cfForce").onclick = () => onSave(null, true); return;
      }
      const rev = cur.revision || { estado: "pendiente" };
      const body = { ...cur, v, mod: nowIso(), modPor: Store.uid, rev: (cur.rev || 1) + 1, revision: rev.estado === "corregir" && !isAsesor() ? { ...rev, estado: "pendiente", corregido: nowIso() } : rev };
      const res = await Store.put(ST.editing.id, body);
      formMsg(res && res.pending ? `Cambios de ${ST.editing.id} guardados en este equipo; se enviarán al recuperar la conexión.` : `Cambios de ${ST.editing.id} guardados.`, "ok"); ST.editing = { id: ST.editing.id, rev: body.rev };
    } else {
      let id = v.codigo; if (await Store.get(id)) { id = nextCode(); v.codigo = id; $("codigo").value = id; if (await Store.get(id)) { formMsg("El código ya existe. Pulse «Nuevo en blanco» e intente de nuevo.", "bad"); return; } }
      const res = await Store.put(id, { v, autor: Store.uid, prefijo: myPrefix(), creado: nowIso(), mod: nowIso(), modPor: Store.uid, rev: 1, revision: { estado: "pendiente" } });
      clearDraft(); const r = riskOf(v.braden_total); ST.recs.set(id, { id, v, prefijo: myPrefix() });
      newRecord(); formMsg(`Registro ${id} guardado${res && res.pending ? " en este equipo; se enviará a la base al recuperar la conexión" : ""}. Braden ${v.braden_total}/23, ${lcx(r.l)}. El formulario quedó listo para el siguiente paciente.`, "ok");
      window.scrollTo({ top: 0 });
    }
  } catch (er) {
    formMsg(er && er.code === "permission-denied" ? "Firebase rechazó el cambio: su rol no permite esta acción o el registro ya fue aprobado." : er && er.code === "resource-exhausted" ? "Se superó la cuota gratuita de Firebase de hoy. Intente mañana o avise a los asesores." : "No se pudo guardar. Revise la conexión e intente de nuevo.", "bad");
  } finally { btn.disabled = false; }
}
function newRecord() {
  ST.editing = null; frm().reset();
  let draft = null; try { draft = JSON.parse(localStorage.getItem(DRAFT) || "null"); } catch (e) { }
  if (draft && Object.values(draft).some(x => x != null && x !== "" && !(Array.isArray(x) && !x.length))) { fill(draft); formMsg("Se recuperó un borrador que no se había guardado.", ""); } else formMsg("");
  $("codigo").value = nextCode(); if (!$("fecha_aplicacion").value) $("fecha_aplicacion").value = today();
  $("editInfo").textContent = ""; $("btnSave").textContent = "Guardar registro"; refreshForm(); setFormEnabled(true);
}
function setFormEnabled(on) { frm().querySelectorAll("input,select,textarea").forEach(el => { if (el.id !== "codigo") el.disabled = !on; }); $("btnSave").disabled = !on; }
function openRecord(id) {
  const r = ST.recs.get(id); if (!r) return; ST.editing = { id, rev: r.rev || 1 }; fill(r.v); $("codigo").value = id;
  const mine = r.autor === Store.uid || isAsesor();
  $("editInfo").innerHTML = `Editando <b>${esc(id)}</b> · ${mine ? "" : "solo lectura · "}última edición ${esc(ago(r.mod))}`;
  $("btnSave").textContent = "Guardar cambios"; setFormEnabled(mine && canWrite()); formMsg(r.revision && r.revision.estado === "corregir" ? `Un asesor pidió corregir: ${r.revision.nota || "sin nota"}` : "", "");
  setView("registro"); window.scrollTo({ top: 0 });
}

/* =================== ACCESO Y EQUIPO =================== */
const PREFIXES = ["E1", "E2", "E3", "A1", "A2", "E4", "E5", "A3"];
function renderGate() {
  const g = $("gate"), app = $("appRoot"), sign = $("btnSignOut");
  sign.hidden = Store.mode !== "firebase" || !Store.uid;
  if (Store.mode === "firebase" && !Store.uid) {
    app.hidden = true; g.hidden = false;
    g.innerHTML = `<div class="card gatecard"><span class="eyebrow">Acceso del equipo de investigación</span><h2>Ingrese con su cuenta de Google</h2><p class="muted">Solo pueden entrar los correos que un asesor haya autorizado. Los datos de los pacientes se guardan codificados en la base del proyecto.</p><div class="row"><button class="btn primary" type="button" id="btnGoogle">Ingresar con Google</button></div><div id="gateMsg"></div></div>`;
    $("btnGoogle").onclick = async () => { try { await Store.signIn(); } catch (e) { $("gateMsg").innerHTML = `<div class="msg bad" style="margin-top:12px">${esc(e && e.code === "auth/popup-blocked" ? "El navegador bloqueó la ventana de Google. Permita ventanas emergentes para este sitio." : e && e.code === "auth/unauthorized-domain" ? "Este dominio no está autorizado en Firebase. Agréguelo en Authentication > Configuración > Dominios autorizados." : "No se pudo iniciar sesión. Intente de nuevo.")}</div>`; } };
    return false;
  }
  if (Store.mode === "firebase" && !Store.access) {
    app.hidden = true; g.hidden = false;
    g.innerHTML = `<div class="card gatecard"><span class="eyebrow">Acceso pendiente</span><h2>Su correo aún no está autorizado</h2><p>Ingresó como <b>${esc(Store.me.email)}</b>. Pida a un asesor del proyecto que agregue este correo en Seguimiento &gt; Equipo y accesos, y vuelva a ingresar.</p><div class="row"><button class="btn" type="button" id="btnRetry">Ya me agregaron, reintentar</button><button class="btn" type="button" id="btnOut2">Usar otra cuenta</button></div></div>`;
    $("btnRetry").onclick = () => location.reload(); $("btnOut2").onclick = () => Store.signOut();
    return false;
  }
  g.hidden = true; app.hidden = false; return true;
}
function renderWho() {
  const sy = $("sync"); sy.classList.toggle("local", Store.mode !== "firebase");
  $("syncTxt").textContent = Store.mode !== "firebase" ? "Modo local de prueba" : ST.sync === "pending" ? "Cambios por sincronizar" : ST.sync === "offline" ? "Sin conexión · guardando en este equipo" : "Sincronizado";
  sy.classList.toggle("pending", Store.mode === "firebase" && ST.sync !== "ok");
  if (!Store.me) { $("who").hidden = true; return; }
  $("who").hidden = false; const img = $("whoImg"); img.hidden = !Store.me.photo; if (Store.me.photo) img.src = Store.me.photo;
  $("whoName").textContent = Store.me.name || "Usted";
  $("whoRole").textContent = Store.access ? `${Store.access.rol === "asesor" ? "Asesor" : "Recolector"} ${Store.access.prefijo}` : "Sin acceso";
}
function renderAccess() {
  const box = $("access"); if (!box) return;
  const ad = isAsesor(), list = Object.entries(ST.acceso).sort((a, b) => String(a[1].prefijo).localeCompare(String(b[1].prefijo)));
  const used = list.map(([, x]) => x.prefijo);
  box.innerHTML = `${list.length ? `<div class="tw"><table><thead><tr><th>Prefijo</th><th>Correo</th><th>Rol</th>${ad ? "<th></th>" : ""}</tr></thead><tbody>${list.map(([em, x]) => `<tr><td class="mono">${esc(x.prefijo)}</td><td>${esc(em)}</td><td>${x.rol === "asesor" ? "Asesor" : "Recolector"}</td>${ad ? `<td>${em === (Store.me && Store.me.email) ? `<span class="muted" style="font-size:12px">usted</span>` : ST.accDel === em ? `<span class="row" style="display:inline-flex;gap:4px">¿Quitar acceso? <button class="btn small danger" type="button" data-accok="${esc(em)}">Sí</button><button class="btn small" type="button" data-accno>No</button></span>` : `<button class="btn small danger" type="button" data-accdel="${esc(em)}">Quitar</button>`}</td>` : ""}</tr>`).join("")}</tbody></table></div>` : `<div class="empty-state">Aún no hay correos autorizados${Store.mode === "local" ? " (en modo local no se necesitan)" : ""}.</div>`}
  ${ad ? `<div class="varpick" style="margin-top:14px"><label>Correo de Google<input class="inp" type="email" id="accEmail" placeholder="nombre@gmail.com" autocomplete="off"></label>
    <label>Rol<select class="inp" id="accRol"><option value="recolector">Recolector (estudiante)</option><option value="asesor">Asesor</option></select></label>
    <label>Prefijo de los códigos<select class="inp" id="accPre">${PREFIXES.map(p => `<option value="${p}" ${used.includes(p) ? "disabled" : ""}>${p}${used.includes(p) ? " · en uso" : ""}</option>`).join("")}</select></label></div>
    <div class="row" style="margin-top:10px"><button class="btn primary" type="button" id="accAdd">Autorizar correo</button><span class="muted" id="accMsg" style="font-size:13px"></span></div>` : `<p class="muted" style="font-size:13px;margin-top:10px">Solo los asesores pueden autorizar o quitar correos.</p>`}`;
  const add = $("accAdd"); if (add) add.onclick = async () => {
    const em = $("accEmail").value.trim().toLowerCase(), rol = $("accRol").value, pre = $("accPre").value;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) return $("accMsg").textContent = "Escriba un correo válido.";
    if (used.includes(pre)) return $("accMsg").textContent = "Ese prefijo ya está asignado.";
    add.disabled = true; try { await Store.putAccess(em, { rol, prefijo: pre, desde: nowIso(), por: Store.me ? Store.me.email : "" }); $("accMsg").textContent = `Autorizado. ${em} ya puede ingresar.`; } catch (e) { $("accMsg").textContent = "No se pudo guardar. ¿Tiene rol de asesor?"; add.disabled = false; }
  };
  box.querySelectorAll("[data-accdel]").forEach(b => b.onclick = () => { ST.accDel = b.dataset.accdel; renderAccess(); });
  box.querySelectorAll("[data-accno]").forEach(b => b.onclick = () => { ST.accDel = null; renderAccess(); });
  box.querySelectorAll("[data-accok]").forEach(b => b.onclick = async () => { try { await Store.delAccess(b.dataset.accok); } catch (e) { } ST.accDel = null; });
}

/* =================== SEGUIMIENTO =================== */
const isoWeek = d => { const t = new Date(d + "T12:00:00"); const day = (t.getDay() + 6) % 7; t.setDate(t.getDate() - day); return t.toISOString().slice(0, 10); };
function renderInicio() {
  renderAccess();
  const recs = [...ST.recs.values()], n = recs.length, cfg = ST.cfg;
  const by = st => recs.filter(r => (r.revision && r.revision.estado || "pendiente") === st).length;
  const upp = recs.filter(r => r.v.upp_presente === 1).length, w = S.wilson(upp, n), meta = +cfg.meta_n || 0;
  $("kpis").innerHTML = `
    <div class="kpi"><small>Registros</small><b>${n}${meta ? ` <span class="muted" style="font-size:14px">/ ${meta}</span>` : ""}</b>${meta ? `<div class="progress" title="${pc(n / meta)} de la meta"><div style="width:${Math.min(100, n / meta * 100)}%"></div></div><span>${pc(n / meta, 0)} de la meta</span>` : `<span>${isAsesor() ? "Fije la meta en Parámetros" : "Meta sin definir"}</span>`}</div>
    <div class="kpi"><small>Aprobados</small><b>${by("aprobado")}</b><span>${n ? pc(by("aprobado") / n, 0) : "—"} del total</span></div>
    <div class="kpi"><small>Pendientes</small><b>${by("pendiente")}</b><span>esperan revisión</span></div>
    <div class="kpi"><small>Por corregir</small><b>${by("corregir")}</b><span>devueltos al recolector</span></div>
    <div class="kpi"><small>Prevalencia de UPP</small><b>${n ? pc(w.p) : "—"}</b><span>${n ? `IC 95 % ${pc(w.lo)}–${pc(w.hi)}` : "sin registros"}</span></div>`;
  // semanas
  const wk = {}; recs.forEach(r => { if (r.v.fecha_aplicacion) { const k = isoWeek(r.v.fecha_aplicacion); wk[k] = (wk[k] || 0) + 1; } });
  const keys = Object.keys(wk).sort(); let items = [];
  if (keys.length) { const d0 = new Date(keys[0] + "T12:00:00"), d1 = new Date(keys[keys.length - 1] + "T12:00:00");
    for (let d = d0; d <= d1; d.setDate(d.getDate() + 7)) { const k = d.toISOString().slice(0, 10); items.push({ label: k.slice(8, 10) + "/" + k.slice(5, 7), value: wk[k] || 0, tip: `Semana del ${k}: ${wk[k] || 0} registros` }); }
    items = items.slice(-26); }
  const el = $("chWeek"); el.innerHTML = items.length ? C.vbar(el, items, { xLabel: "Semana (lunes)", label: "Registros por semana" }) : C.empty("Las barras aparecen con el primer registro.");
  // equipo
  const pref = {}; recs.forEach(r => { const p = prefixOf(r); (pref[p] = pref[p] || []).push(r); });
  const teamRows = Object.entries(ST.team).map(([u, t]) => ({ u, ...t }));
  Object.keys(pref).forEach(p => { if (!teamRows.some(t => t.prefijo === p)) teamRows.push({ u: null, prefijo: p, rol: "—" }); });
  teamRows.sort((a, b) => String(a.prefijo).localeCompare(String(b.prefijo)));
  $("tblTeam").innerHTML = teamRows.length ? `<table><thead><tr><th>Prefijo</th><th>Integrante</th><th>Rol</th><th class="n">Registros</th><th class="n">Aprobados</th><th class="n">Por corregir</th><th>Último</th></tr></thead><tbody>${teamRows.map(t => { const rs = pref[t.prefijo] || []; const last = rs.map(r => r.creado).sort().pop();
    return `<tr><td class="mono">${esc(t.prefijo)}</td><td>${t.u ? `<span data-uid="${esc(t.u)}" data-fallback="${t.u === Store.uid ? "Usted" : "Integrante"}">…</span>` : "—"}</td><td>${t.rol === "asesor" ? "Asesor" : t.rol === "recolector" ? "Recolector" : "—"}</td><td class="n">${rs.length}</td><td class="n">${rs.filter(r => r.revision && r.revision.estado === "aprobado").length}</td><td class="n">${rs.filter(r => r.revision && r.revision.estado === "corregir").length}</td><td class="nowrap">${esc(ago(last))}</td></tr>`; }).join("")}</tbody></table>
` : `<div class="empty-state">Nadie ha ingresado todavía.</div>`;
  fillNames($("tblTeam"));
  // cola de revisión
  const pend = recs.filter(r => !r.revision || r.revision.estado !== "aprobado").sort((a, b) => String(a.mod).localeCompare(String(b.mod)));
  $("queue").innerHTML = pend.length ? `<div class="tw"><table><thead><tr><th>Código</th><th>Estado</th><th>Actualizado</th><th></th></tr></thead><tbody>${pend.slice(0, 12).map(r => `<tr><td class="mono">${esc(r.id)}</td><td>${stateTag(r)}</td><td class="nowrap">${esc(ago(r.mod))}</td><td><button class="btn small" type="button" data-goto="${esc(r.id)}">${isAsesor() ? "Revisar" : "Ver"}</button></td></tr>`).join("")}</tbody></table></div>${pend.length > 12 ? `<p class="muted" style="font-size:13px;margin-top:8px">Y ${pend.length - 12} más en la pestaña Registros.</p>` : ""}` : `<div class="empty-state">${n ? "Todos los registros están aprobados." : "Sin registros todavía."}</div>`;
  $("queue").querySelectorAll("[data-goto]").forEach(b => b.onclick = () => { ST.reviewOpen = isAsesor() ? b.dataset.goto : null; $("fCode").value = b.dataset.goto; setView("registros"); });
  // alertas
  const al = recs.map(r => ({ r, a: quality(r.v) })).filter(x => x.a.length);
  $("alerts").innerHTML = al.length ? `<div class="tw"><table><thead><tr><th>Código</th><th>Alertas</th></tr></thead><tbody>${al.slice(0, 15).map(x => `<tr><td class="mono nowrap"><button class="btn small" type="button" data-open="${esc(x.r.id)}">${esc(x.r.id)}</button></td><td>${x.a.map(esc).join("<br>")}</td></tr>`).join("")}</tbody></table></div>${al.length > 15 ? `<p class="muted" style="font-size:13px;margin-top:8px">${al.length - 15} registros más con alertas.</p>` : ""}` : `<div class="empty-state">${n ? "Sin alertas." : "Las alertas aparecen al guardar registros."}</div>`;
  $("alerts").querySelectorAll("[data-open]").forEach(b => b.onclick = () => openRecord(b.dataset.open));
  renderConfig(); renderSsize();
}
function renderConfig() {
  const cfg = ST.cfg, ed = isAsesor() && canWrite();
  $("config").innerHTML = `<div class="varpick">
    <label>Meta de pacientes<input class="inp" type="number" id="cfMeta" min="0" value="${esc(cfg.meta_n || "")}" ${ed ? "" : "disabled"}></label>
    <label>Inicio de la recolección<input class="inp" type="date" id="cfIni" value="${esc(cfg.inicio || "")}" ${ed ? "" : "disabled"}></label>
    <label>Fin de la recolección<input class="inp" type="date" id="cfFin" value="${esc(cfg.fin || "")}" ${ed ? "" : "disabled"}></label></div>
    ${ed ? `<div class="row" style="margin-top:12px"><button class="btn primary" type="button" id="cfSave">Guardar parámetros</button><span class="muted" id="cfMsg" style="font-size:13px"></span></div>` : `<p class="muted" style="font-size:13px;margin-top:10px">Solo los asesores pueden cambiar estos parámetros.</p>`}`;
  const b = $("cfSave"); if (b) b.onclick = async () => { b.disabled = true; try { await Store.putCfg({ ...ST.cfg, meta_n: +$("cfMeta").value || 0, inicio: $("cfIni").value, fin: $("cfFin").value, mod: nowIso() }); $("cfMsg").textContent = "Guardado."; } catch (e) { $("cfMsg").textContent = "No se pudo guardar."; } b.disabled = false; };
}
function renderSsize() {
  const box = $("ssize"); if (!box.dataset.ready) {
    box.innerHTML = `<div class="varpick"><label>Población esperada en el periodo<input class="inp" type="number" id="ssN" min="0" placeholder="Pacientes hospitalizados" value="400"></label>
      <label>Prevalencia esperada de UPP (%)<input class="inp" type="number" id="ssP" min="1" max="99" value="15"></label>
      <label>Precisión absoluta (± puntos)<input class="inp" type="number" id="ssD" min="1" max="30" value="5"></label>
      <label>Pérdidas esperadas (%)<input class="inp" type="number" id="ssL" min="0" max="50" value="10"></label></div><div id="ssOut" class="narr"></div>`;
    box.dataset.ready = 1; box.querySelectorAll("input").forEach(i => i.oninput = renderSsize);
  }
  const N = +$("ssN").value || Infinity, p = (+$("ssP").value || 15) / 100, d = (+$("ssD").value || 5) / 100, lo = (+$("ssL").value || 0) / 100;
  const n = S.sampleSizeProportion(p, d, 0.95, N), nA = Math.ceil(n / (1 - lo));
  $("ssOut").innerHTML = `Con 95 % de confianza se necesitan <b>${n} pacientes</b>; ajustando por ${nf(lo * 100, 0)} % de pérdidas, <b>${nA}</b>. Fórmula: n = N·Z²·p·q / (d²·(N−1) + Z²·p·q).${isAsesor() && canWrite() ? ` <button class="btn small" type="button" id="ssUse">Usar ${nA} como meta</button>` : ""}`;
  const u = $("ssUse"); if (u) u.onclick = async () => { await Store.putCfg({ ...ST.cfg, meta_n: nA, mod: nowIso() }); };
}

/* =================== REGISTROS =================== */
function stateTag(r) { const e = (r.revision && r.revision.estado) || "pendiente"; return e === "aprobado" ? `<span class="tag ok">Aprobado</span>` : e === "corregir" ? `<span class="tag bad">Por corregir</span>` : `<span class="tag warn">Pendiente</span>`; }
function renderRegistros() {
  const fs = $("fState").value, fc = $("fCode").value.trim().toUpperCase();
  let list = [...ST.recs.values()];
  if (ST.fWho === "mine") list = list.filter(r => r.autor === Store.uid);
  if (fs) list = list.filter(r => ((r.revision && r.revision.estado) || "pendiente") === fs);
  if (fc) list = list.filter(r => r.id.toUpperCase().includes(fc));
  list.sort((a, b) => b.id.localeCompare(a.id));
  $("fCount").textContent = `${list.length} de ${ST.recs.size}`;
  const sx = ["", "H", "M", "I"], t = $("tblRec");
  if (!list.length) { t.innerHTML = `<tbody><tr><td><div class="empty-state">${ST.recs.size ? "Ningún registro coincide con los filtros." : "Aún no hay registros. Use la pestaña Nuevo registro."}</div></td></tr></tbody>`; return; }
  t.innerHTML = `<thead><tr><th>Código</th><th>Fecha</th><th>Registró</th><th class="n">Edad</th><th>Sexo</th><th class="n">Braden</th><th>Riesgo</th><th>UPP</th><th class="n">Procesos</th><th class="n">Percepción</th><th>Estado</th><th></th></tr></thead><tbody>${list.map(r => {
    const v = r.v, rk = riskOf(v.braden_total), own = r.autor === Store.uid, adv = isAsesor(), cw = canWrite();
    let act = `<button class="btn small" type="button" data-edit="${esc(r.id)}">${(own || adv) && cw ? "Editar" : "Ver"}</button>`;
    if (adv && cw) act += ` <button class="btn small" type="button" data-rev="${esc(r.id)}">Revisar</button>`;
    if ((own || adv) && cw) act += ST.delOpen === r.id ? ` <span class="row" style="display:inline-flex;gap:4px">¿Eliminar? <button class="btn small danger" type="button" data-delok="${esc(r.id)}">Sí</button><button class="btn small" type="button" data-delno>No</button></span>` : ` <button class="btn small danger" type="button" data-del="${esc(r.id)}">Eliminar</button>`;
    let row = `<tr><td class="mono nowrap">${esc(r.id)}</td><td class="nowrap mono">${esc(v.fecha_aplicacion || "—")}</td><td><span data-uid="${esc(r.autor || "")}" data-fallback="${esc(prefixOf(r))}">…</span></td><td class="n">${v.edad ?? "—"}</td><td>${sx[v.sexo] || "—"}</td><td class="n">${v.braden_total ?? "—"}</td>
      <td>${rk ? `<span class="tag"><i style="background:var(--rk${rk.code})"></i>${esc(rk.s)}</span>` : "—"}</td><td>${v.upp_presente === 1 ? "Sí" : v.upp_presente === 0 ? "No" : "—"}</td><td class="n">${v.idx_procesos == null ? "—" : nf(v.idx_procesos, 0) + " %"}</td><td class="n">${nf(v.percepcion_media, 2)}</td>
      <td>${stateTag(r)}${r.revision && r.revision.nota ? `<div class="muted" style="font-size:12px;max-width:200px;white-space:normal">${esc(r.revision.nota)}</div>` : ""}</td><td class="nowrap">${act}</td></tr>`;
    if (ST.reviewOpen === r.id && adv) {
      const e = (r.revision && r.revision.estado) || "pendiente", q = quality(v);
      row += `<tr class="sub"><td colspan="12"><div class="revbox"><b>Revisión de ${esc(r.id)}</b>${q.length ? `<div class="msg">Alertas: ${q.map(esc).join(" · ")}</div>` : `<span class="muted" style="font-size:13px">Sin alertas de calidad.</span>`}
        <div class="pills">${[["aprobado", "Aprobar"], ["corregir", "Devolver para corregir"], ["pendiente", "Dejar pendiente"]].map(([k, l]) => `<label><input type="radio" name="revst" value="${k}" ${k === e ? "checked" : ""}><span>${l}</span></label>`).join("")}</div>
        <textarea id="revNota" placeholder="Nota para el recolector (qué corregir)">${esc((r.revision && r.revision.nota) || "")}</textarea>
        <div class="row"><button class="btn primary small" type="button" data-revsave="${esc(r.id)}">Guardar revisión</button><button class="btn small" type="button" data-revcancel>Cerrar</button></div></div></td></tr>`;
    }
    return row; }).join("")}</tbody>`;
  fillNames(t);
}
$("tblRec").addEventListener("click", async e => {
  const b = e.target.closest("button"); if (!b) return; const d = b.dataset;
  if (d.edit) openRecord(d.edit);
  else if (d.rev) { ST.reviewOpen = ST.reviewOpen === d.rev ? null : d.rev; renderRegistros(); }
  else if ("revcancel" in d) { ST.reviewOpen = null; renderRegistros(); }
  else if (d.revsave) { const st = document.querySelector('input[name="revst"]:checked'); b.disabled = true;
    try { await Store.patch(d.revsave, { revision: { estado: st ? st.value : "pendiente", nota: $("revNota").value.trim(), por: Store.uid, fecha: nowIso() } }); ST.reviewOpen = null; } catch (er) { b.disabled = false; alertData("No se pudo guardar la revisión."); } }
  else if (d.del) { ST.delOpen = d.del; renderRegistros(); }
  else if ("delno" in d) { ST.delOpen = null; renderRegistros(); }
  else if (d.delok) { try { await Store.del(d.delok); } catch (er) { } ST.delOpen = null; if (ST.editing && ST.editing.id === d.delok) ST.editing = null; renderRegistros(); }
});
function alertData(t) { const m = $("fCount"); m.textContent = t; }

/* =================== DATOS SIMULADOS =================== */
let DEMO = null;
function demoRecords() {
  if (DEMO) return DEMO;
  let a = 20261016; const R = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const G = () => { let u = 0, v = 0; while (!u) u = R(); while (!v) v = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const pick = w => { const s = S.sum(w); let r = R() * s; for (let i = 0; i < w.length; i++) { r -= w[i]; if (r <= 0) return i + 1; } return w.length; };
  const cl = (x, lo, hi) => Math.max(lo, Math.min(hi, x)); const lg = x => 1 / (1 + Math.exp(-x)); const out = [];
  const base = Date.parse("2026-11-03T12:00:00");
  for (let i = 0; i < 150; i++) {
    const edad = cl(Math.round(64 + 16 * G()), 18, 97), sexo = R() < 0.48 ? 1 : 2, f = G() + (edad - 64) / 35;
    const q4 = (m) => cl(Math.round(m + 0.6 * G()), 1, 4), qz = G();
    const v = { consentimiento: 1, crit_edad: 1, crit_estancia: 1, fuente: [1, 3, 4], edad, sexo, estado_civil: pick([3, 4, 2, 1, 2]), escolaridad: pick([1, 5, 3, 1.2, .8, .1]), estrato: pick([3, 4, 2.2, .5, .2, .1]),
      zona: R() < 0.78 ? 1 : 2, regimen: pick([4, 5.5, .4, .1]), ocupacion: pick([2, 2, 3, 2.5, 1, .2]), etnia: pick([9, .2, .5, .05, .05, .05]), convivencia: pick([1.2, 3, 5, .4]), cuidador: R() < 0.72 ? 1 : 0,
      b_sensorial: q4(3.3 - 0.6 * f), b_humedad: q4(3.0 - 0.6 * f), b_actividad: q4(2.4 - 0.8 * f), b_movilidad: q4(2.7 - 0.7 * f), b_nutricion: q4(2.6 - 0.5 * f), b_friccion: cl(Math.round(2.2 - 0.5 * f + 0.5 * G()), 1, 3) };
    const dApp = new Date(base + Math.floor(R() * 200) * 864e5), stay = Math.round(Math.exp(1.9 + 0.6 * G())) + 2;
    v.fecha_aplicacion = dApp.toISOString().slice(0, 10); v.fecha_ingreso = new Date(dApp.getTime() - stay * 864e5).toISOString().slice(0, 10);
    v.dx_principal = ["J18.9", "N39.0", "I50.9", "E11.9", "J44.1", "A41.9"][Math.floor(R() * 6)];
    v.talla_cm = Math.round(160 + 8 * G()); v.peso_kg = round(cl(64 - 4 * f + 12 * G(), 35, 140), 1);
    v.albumina = round(cl(3.4 - 0.3 * f + 0.5 * G(), 1.5, 5), 1); v.hemoglobina = round(cl(11.5 + 1.8 * G(), 6, 17), 1);
    v.incontinencia = f > 0.8 ? pick([2, 2, 1, 2]) : pick([6, 1.5, .5, .5]); v.sedacion = R() < 0.18 ? 1 : 0;
    v.comorb = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((c, j) => R() < [0.32, 0.55, 0.18, 0.15, 0.2, 0.12, 0.1, 0.08 + 0.1 * (f > 1), 0.07][j]);
    v.disp = [1, 2, 3, 4, 5, 6].filter((c, j) => R() < [0.25 + 0.2 * (f > 0.5), 0.1 + 0.1 * (f > 1), 0.35, 0.05, 0.9, 0.04][j]);
    PROC_IDS.forEach((id, j) => { const p = lg(0.3 + 0.9 * qz + [0.6, -0.3, 0, -0.4, 0.5, 0.2, 0.4, -0.2, 0.3, -0.5, -0.8][j]); v[id] = R() < p ? 1 : R() < 0.35 ? 9 : 0; });
    v.responde = pick([85, 10, 5]);
    if (v.responde !== 3) PERC_IDS.forEach((id, j) => v[id] = cl(Math.round(3.4 + 0.7 * qz + 0.12 * (v.b_movilidad - 2.7) + [0, -.2, -.1, -.3, .3, -.2, -.6, .4][j] + 0.8 * G()), 1, 5));
    v.dolor_apoyo = cl(Math.round(3 + 1.5 * f + 2 * G()), 0, 10);
    Object.assign(v, compute(v)); delete v._bp; delete v._bn;
    const pu = lg(-1.6 - 0.38 * (v.braden_total - 15) - 0.025 * (v.idx_procesos - 60) - 0.35 * ((v.percepcion_media || 3.3) - 3.3));
    v.upp_presente = R() < pu ? 1 : 0;
    if (v.upp_presente) { v.upp_origen = R() < 0.6 ? 2 : 1; v.upp_estadio = pick([4, 4, 1.5, .6, .6, .8, .8]); v.upp_n = R() < 0.75 ? 1 : 2; v.upp_loc = R() < 0.7 ? [1] : R() < 0.6 ? [2] : [1, 2]; }
    const pre = ["E1", "E2", "E3"][i % 3], id = `MI-${pre}-${String(Math.floor(i / 3) + 1).padStart(3, "0")}`; v.codigo = id;
    out.push({ id, v, autor: "demo-" + pre, prefijo: pre, creado: v.fecha_aplicacion, mod: v.fecha_aplicacion, rev: 1, revision: { estado: R() < 0.72 ? "aprobado" : R() < 0.7 ? "pendiente" : "corregir" } });
  }
  return DEMO = out;
}

/* =================== ANÁLISIS: utilidades =================== */
let CHQ = [], LAST = [];
const ch = (fn) => { const id = "ch" + Math.random().toString(36).slice(2, 9); CHQ.push({ id, fn }); return `<div class="chart-box" id="${id}"></div>`; };
function flushCharts(list) { list.forEach(c => { const el = $(c.id); if (el) el.innerHTML = c.fn(el); }); }
function dataset() {
  let recs = ST.src === "demo" ? demoRecords() : [...ST.recs.values()];
  if (ST.inc === "ok") recs = recs.filter(r => r.revision && r.revision.estado === "aprobado");
  return recs.filter(r => r.v && r.v.consentimiento === 1).map(r => ({ ...derive(r.v), _id: r.id }));
}
const colv = (rows, id) => rows.map(r => r[id]).filter(x => x != null && Number.isFinite(x));
const has = (rows, id) => rows.filter(r => r[id] != null && Number.isFinite(r[id]));
function descNum(vals) { const d = S.describe(vals), nm = S.normality(vals); const normal = nm.normal === true;
  return { d, nm, normal, txt: d.n ? (normal ? `${nf(d.mean)} ± ${nf(d.sd)}` : `${nf(d.median)} (${nf(d.q1)}–${nf(d.q3)})`) : "—", how: normal ? "media ± DE" : "mediana (RIC)", np: nm.main === "ks" ? nm.ks && nm.ks.p : nm.sw && nm.sw.p, test: nm.main === "ks" ? "K-S Lilliefors" : "Shapiro-Wilk" }; }
function freq(rows, id) { const V = VARS[id]; const vals = rows.map(r => r[id]).filter(x => x != null); const n = vals.length;
  return { n, items: V.o.map(([c, l]) => { const k = vals.filter(x => x === c).length, w = S.wilson(k, n); return { c, l, k, p: w.p, lo: w.lo, hi: w.hi }; }) }; }
const rhoWord = r => { const a = Math.abs(r); return (a < 0.1 ? "nula o despreciable" : a < 0.3 ? "débil" : a < 0.5 ? "moderada" : "fuerte"); };
const sigw = p => p < 0.05 ? "estadísticamente significativa" : "no estadísticamente significativa";
const vWord = v => v < 0.1 ? "muy débil" : v < 0.3 ? "débil" : v < 0.5 ? "moderada" : "fuerte";
const aucWord = a => a < 0.6 ? "nula" : a < 0.7 ? "pobre" : a < 0.8 ? "aceptable" : a < 0.9 ? "buena" : "excelente";
const alphaWord = a => a < 0.5 ? "inaceptable" : a < 0.6 ? "pobre" : a < 0.7 ? "cuestionable" : a < 0.8 ? "aceptable" : a < 0.9 ? "buena" : "excelente";
const pTag = p => p == null || !Number.isFinite(p) ? "—" : `<span class="${p < 0.05 ? "sig" : ""}">${fp(p)}</span>`;
const card = (title, sub, body) => `<div class="card"><header><h3>${title}</h3>${sub ? `<p>${sub}</p>` : ""}</header>${body}</div>`;
const objective = (eyebrow, text, note) => `<div class="objective"><span class="eyebrow">${eyebrow}</span><h2>${text}</h2>${note ? `<p>${note}</p>` : ""}</div>`;
const kpi = (l, v, s) => `<div class="kpi"><small>${l}</small><b>${v}</b>${s ? `<span>${s}</span>` : ""}</div>`;
const minN = (rows, n, what) => rows.length < n ? `<div class="banner">Con ${rows.length} registro(s) ${what || "los resultados no son interpretables"}. Se necesitan al menos ${n}.</div>` : "";

/* ---------- asociación automática entre dos variables ---------- */
function assoc(rows, xid, yid) {
  const X = VARS[xid], Y = VARS[yid]; const q = v => v.kind === "num" || v.kind === "ord";
  const both = rows.filter(r => r[xid] != null && r[yid] != null);
  if (both.length < 5) return { html: `<div class="chart-empty">Hay ${both.length} casos con ambas variables. Se necesitan al menos 5.</div>`, p: null };
  let mode;
  if (!q(X) && !q(Y)) mode = "chi"; else if (q(X) && q(Y)) mode = (X.kind === "ord" && Y.kind === "ord" && X.o.length <= 5 && Y.o.length <= 5) ? "chi" : "cor"; else mode = "grp";
  if (mode === "chi") return chiBlock(both, xid, yid);
  if (mode === "cor") return corBlock(both, xid, yid);
  const [gid, vid] = q(X) ? [yid, xid] : [xid, yid]; return grpBlock(both, gid, vid);
}
function chiBlock(rows, rid, cid) {
  const R = VARS[rid], Cv = VARS[cid]; const rl = R.o.filter(([c]) => rows.some(r => r[rid] === c)), cl = Cv.o.filter(([c]) => rows.some(r => r[cid] === c));
  const tab = rl.map(([a]) => cl.map(([b]) => rows.filter(r => r[rid] === a && r[cid] === b).length));
  if (rl.length < 2 || cl.length < 2) return { html: `<div class="chart-empty">Una de las variables tiene una sola categoría con datos; no hay asociación que probar.</div>`, p: null };
  const t = S.chisq(tab); const is22 = t.r === 2 && t.c === 2; const useF = is22 && t.minE < 5; const p = useF ? t.fisher : t.p;
  let html = `<div class="tw"><table><thead><tr><th>${esc(R.l)}</th>${cl.map(([, l]) => `<th class="n">${esc(l)}</th>`).join("")}<th class="n">Total</th></tr></thead><tbody>${rl.map(([, l], i) => { const tot = S.sum(tab[i]); return `<tr><td>${esc(l)}</td>${tab[i].map(k => `<td class="n">${k} <span class="muted">(${pc(tot ? k / tot : NaN, 0)})</span></td>`).join("")}<td class="n">${tot}</td></tr>`; }).join("")}</tbody></table></div>`;
  html += `<p class="muted" style="font-size:12px;margin-top:6px">Porcentajes por fila. Frecuencia esperada mínima ${nf(t.minE, 1)}; ${pc(t.pctLow, 0)} de las celdas esperadas son menores de 5.</p>`;
  let rows2 = [`<tr><td>Chi cuadrado de Pearson</td><td class="n">χ² = ${nf(t.chi2, 2)}; gl = ${t.df}</td><td class="n">${pTag(t.p)}</td></tr>`];
  if (is22) rows2.push(`<tr><td>Prueba exacta de Fisher</td><td class="n">—</td><td class="n">${pTag(t.fisher)}</td></tr>`, `<tr><td>Chi cuadrado con corrección de Yates</td><td class="n">χ² = ${nf(t.yates.chi2, 2)}</td><td class="n">${pTag(t.yates.p)}</td></tr>`);
  if (t.trend) rows2.push(`<tr><td>Chi cuadrado de tendencia lineal</td><td class="n">χ² = ${nf(t.trend.chi2, 2)}; gl = 1</td><td class="n">${pTag(t.trend.p)}</td></tr>`);
  rows2.push(`<tr><td>V de Cramér</td><td class="n">${nf(t.V, 3)}</td><td class="n">${vWord(t.V)}</td></tr>`);
  let orTxt = "";
  if (is22) { /* evento = columna con código 1 si existe */
    const ci = cl.findIndex(([c]) => c === 1), ri = rl.findIndex(([c]) => c === 1);
    if (ci >= 0) { const ex = ri >= 0 ? ri : 0, ne = 1 - ex, ce = ci, cn = 1 - ci; const o = S.or2x2(tab[ex][ce], tab[ex][cn], tab[ne][ce], tab[ne][cn]);
      rows2.push(`<tr><td>Odds ratio (${esc(rl[ex][1])} frente a ${esc(rl[ne][1])})</td><td class="n">${nf(o.or, 2)} (IC 95 % ${nf(o.lo, 2)}–${nf(o.hi, 2)})</td><td class="n">${o.corrected ? "con corrección de 0,5" : ""}</td></tr>`);
      if (Number.isFinite(o.rp)) rows2.push(`<tr><td>Razón de prevalencias</td><td class="n">${nf(o.rp, 2)} (IC 95 % ${nf(o.rpLo, 2)}–${nf(o.rpHi, 2)})</td><td class="n">${pc(o.p1)} frente a ${pc(o.p0)}</td></tr>`);
      orTxt = ` La proporción de «${cl[ce][1].toLowerCase()}» fue ${pc(o.p1)} en «${rl[ex][1]}» y ${pc(o.p0)} en «${rl[ne][1]}» (OR = ${nf(o.or, 2)}; IC 95 % ${nf(o.lo, 2)}–${nf(o.hi, 2)}).`; }
  }
  html += `<div class="tw" style="margin-top:10px"><table><thead><tr><th>Prueba</th><th class="n">Estadístico</th><th class="n">p</th></tr></thead><tbody>${rows2.join("")}</tbody></table></div>`;
  const warn = !is22 && t.pctLow > 0.2 ? " Más del 20 % de las frecuencias esperadas son menores de 5: el chi cuadrado es poco fiable; agrupe categorías." : "";
  const testName = useF ? "la prueba exacta de Fisher (hay frecuencias esperadas menores de 5)" : t.trend ? "el chi cuadrado de tendencia lineal" : "el chi cuadrado de Pearson";
  const pMain = t.trend && !useF ? t.trend.p : p;
  html += `<div class="narr">Según ${testName}, la asociación entre <b>${esc(lcx(R.l))}</b> y <b>${esc(lcx(Cv.l))}</b> fue ${sigw(pMain)} (${pq(pMain)}; V de Cramér = ${nf(t.V, 2)}, ${vWord(t.V)}).${orTxt}${warn}</div>`;
  const pal = cl.length === 2 && cl.some(([c]) => c === 1) ? (c => c === 1 ? "--c-upp" : "--c-no") : ((c, j) => `--rk${Math.min(5, j + 1)}`);
  const chart = ch(el => C.stack(el, rl.map(([, l], i) => ({ label: l, parts: cl.map(([c, cl2], j) => ({ v: tab[i][j], color: pal(c, j), name: cl2, ink: pal(c, j) === "--c-no" || pal(c, j) === "--rk1" || pal(c, j) === "--rk2" ? "--on-dark" : "--ink" })) })), { label: "Distribución por fila" }));
  return { html: C.legend(cl.map(([c, l], j) => ({ color: pal(c, j), label: l }))) + chart + html, p: pMain, test: useF ? "Fisher" : t.trend ? "χ² tendencia" : "χ²", eff: `V = ${nf(t.V, 2)}` };
}
function grpBlock(rows, gid, vid) {
  const G = VARS[gid], V = VARS[vid]; const levels = G.o.filter(([c]) => rows.some(r => r[gid] === c));
  const groups = levels.map(([c]) => rows.filter(r => r[gid] === c).map(r => r[vid]));
  if (levels.length < 2) return { html: `<div class="chart-empty">Solo hay un grupo con datos.</div>`, p: null };
  const norms = groups.map(g => S.normality(g)); const allNormal = V.kind === "num" && groups.every(g => g.length >= 3) && norms.every(n => n.normal === true);
  let rowsT = levels.map(([, l], i) => { const d = S.describe(groups[i]); const nm = norms[i]; const np = nm.main === "ks" ? nm.ks && nm.ks.p : nm.sw && nm.sw.p;
    return `<tr><td>${esc(l)}</td><td class="n">${d.n}</td><td class="n">${nf(d.mean, 2)} ± ${nf(d.sd, 2)}</td><td class="n">${nf(d.median, 1)} (${nf(d.q1, 1)}–${nf(d.q3, 1)})</td><td class="n">${fp(np)}</td></tr>`; }).join("");
  let html = `<div class="tw"><table><thead><tr><th>${esc(G.l)}</th><th class="n">n</th><th class="n">Media ± DE</th><th class="n">Mediana (RIC)</th><th class="n">p normalidad</th></tr></thead><tbody>${rowsT}</tbody></table></div>`;
  let tests = [], narr, p, test, eff;
  if (levels.length === 2) {
    const mw = S.mannWhitney(groups[0], groups[1]), we = S.welch(groups[0], groups[1]);
    tests.push(`<tr><td>U de Mann-Whitney</td><td class="n">U = ${nf(mw.U, 1)}; Z = ${nf(mw.z, 2)}</td><td class="n">${pTag(mw.p)}</td><td class="n">r = ${nf(mw.r, 2)}</td></tr>`);
    if (we) tests.push(`<tr><td>t de Welch</td><td class="n">t = ${nf(we.t, 2)}; gl = ${nf(we.df, 1)}</td><td class="n">${pTag(we.p)}</td><td class="n">d = ${nf(we.d, 2)}</td></tr>`);
    if (allNormal && we) { p = we.p; test = "t de Welch"; eff = `d = ${nf(we.d, 2)}`; narr = `Las dos distribuciones son normales, por lo que se usó la t de Welch. La media de ${esc(lcx(V.l))} fue ${nf(we.m1, 2)} en «${levels[0][1]}» y ${nf(we.m2, 2)} en «${levels[1][1]}» (diferencia ${nf(we.diff, 2)}; IC 95 % ${nf(we.lo, 2)} a ${nf(we.hi, 2)}; ${pq(we.p)}), diferencia ${sigw(we.p)}.`; }
    else { p = mw.p; test = "Mann-Whitney"; eff = `r = ${nf(mw.r, 2)}`; narr = `${V.kind === "ord" ? "La variable es ordinal" : "Al menos un grupo no sigue una distribución normal"}, por lo que se usó la U de Mann-Whitney. La mediana de ${esc(lcx(V.l))} fue ${nf(mw.md1, 1)} en «${levels[0][1]}» y ${nf(mw.md2, 1)} en «${levels[1][1]}»; la diferencia fue ${sigw(mw.p)} (U = ${nf(mw.U, 1)}; ${pq(mw.p)}; r = ${nf(mw.r, 2)}).`; }
  } else {
    const kw = S.kruskal(groups), an = S.anova(groups), lev = S.levene(groups);
    tests.push(`<tr><td>H de Kruskal-Wallis</td><td class="n">H = ${nf(kw.H, 2)}; gl = ${kw.df}</td><td class="n">${pTag(kw.p)}</td><td class="n">ε² = ${nf(kw.eps2, 3)}</td></tr>`);
    if (an) tests.push(`<tr><td>ANOVA de un factor</td><td class="n">F = ${nf(an.F, 2)}; gl = ${an.df1}, ${an.df2}</td><td class="n">${pTag(an.p)}</td><td class="n">η² = ${nf(an.eta2, 3)}</td></tr>`);
    if (lev) tests.push(`<tr><td>Levene (Brown-Forsythe)</td><td class="n">F = ${nf(lev.F, 2)}</td><td class="n">${pTag(lev.p)}</td><td class="n">homogeneidad de varianzas</td></tr>`);
    let posthoc = "";
    if (allNormal && an) { p = an.p; test = "ANOVA"; eff = `η² = ${nf(an.eta2, 2)}`; narr = `Todos los grupos son normales, por lo que se usó ANOVA. Las medias de ${esc(lcx(V.l))} difieren de forma ${sigw(an.p)} entre los niveles de ${esc(lcx(G.l))} (F = ${nf(an.F, 2)}; ${pq(an.p)}; η² = ${nf(an.eta2, 2)}).`; }
    else { p = kw.p; test = "Kruskal-Wallis"; eff = `ε² = ${nf(kw.eps2, 2)}`; narr = `Se usó Kruskal-Wallis porque ${V.kind === "ord" ? "la variable es ordinal" : "no todos los grupos son normales"}. La distribución de ${esc(lcx(V.l))} difiere de forma ${sigw(kw.p)} entre los niveles de ${esc(lcx(G.l))} (H = ${nf(kw.H, 2)}; gl = ${kw.df}; ${pq(kw.p)}; ε² = ${nf(kw.eps2, 2)}).`; }
    if (p < 0.05) { const dn = S.dunn(groups); posthoc = `<div class="tw" style="margin-top:10px"><table><thead><tr><th>Comparación por pares (Dunn, Bonferroni)</th><th class="n">Z</th><th class="n">p ajustado</th></tr></thead><tbody>${dn.map(x => `<tr><td>${esc(levels[x.i][1])} frente a ${esc(levels[x.j][1])}</td><td class="n">${nf(x.z, 2)}</td><td class="n">${pTag(x.padj)}</td></tr>`).join("")}</tbody></table></div>`; }
    html += `<div class="tw" style="margin-top:10px"><table><thead><tr><th>Prueba</th><th class="n">Estadístico</th><th class="n">p</th><th class="n">Efecto</th></tr></thead><tbody>${tests.join("")}</tbody></table></div>` + posthoc;
    tests = null;
  }
  if (tests) html += `<div class="tw" style="margin-top:10px"><table><thead><tr><th>Prueba</th><th class="n">Estadístico</th><th class="n">p</th><th class="n">Efecto</th></tr></thead><tbody>${tests.join("")}</tbody></table></div>`;
  html += `<div class="narr">${narr}</div>`;
  const colFor = (c, i) => levels.length === 2 && levels.some(([k]) => k === 1) ? (c === 1 ? "--c-upp" : "--c-no") : `--rk${Math.min(5, i + 1)}`;
  const chart = ch(el => C.box(el, levels.map(([c, l], i) => ({ label: l.length > 22 ? l.slice(0, 21) + "…" : l, values: groups[i], color: colFor(c, i) })), { yLabel: V.l.length > 40 ? V.l.slice(0, 39) + "…" : V.l, label: "Diagrama de caja" }));
  return { html: chart + html, p, test, eff };
}
function corBlock(rows, xid, yid) {
  const X = VARS[xid], Y = VARS[yid], x = rows.map(r => r[xid]), y = rows.map(r => r[yid]);
  const sp = S.spearman(x, y), pe = S.pearson(x, y); if (!sp) return { html: `<div class="chart-empty">Sin variación suficiente para correlacionar.</div>`, p: null };
  const nx = S.normality(x), ny = S.normality(y); const useP = X.kind === "num" && Y.kind === "num" && nx.normal && ny.normal;
  const main = useP ? pe : sp, name = useP ? "r de Pearson" : "rho de Spearman";
  const html = `<div class="tw"><table><thead><tr><th>Coeficiente</th><th class="n">Valor</th><th class="n">IC 95 %</th><th class="n">p</th><th class="n">n</th></tr></thead><tbody>
    <tr><td>Rho de Spearman</td><td class="n">${nf(sp.r, 3)}</td><td class="n">${nf(sp.lo, 2)} a ${nf(sp.hi, 2)}</td><td class="n">${pTag(sp.p)}</td><td class="n">${sp.n}</td></tr>
    ${pe ? `<tr><td>r de Pearson</td><td class="n">${nf(pe.r, 3)}</td><td class="n">${nf(pe.lo, 2)} a ${nf(pe.hi, 2)}</td><td class="n">${pTag(pe.p)}</td><td class="n">${pe.n}</td></tr>` : ""}</tbody></table></div>
    <div class="narr">Se usó ${useP ? "la r de Pearson porque ambas variables son normales" : `la rho de Spearman porque ${X.kind === "ord" || Y.kind === "ord" ? "al menos una variable es ordinal" : "al menos una variable no es normal"}`}. La correlación entre <b>${esc(lcx(X.l))}</b> y <b>${esc(lcx(Y.l))}</b> fue ${main.r >= 0 ? "positiva" : "negativa"}, ${rhoWord(main.r)} y ${sigw(main.p)} (${name} = ${nf(main.r, 2)}; IC 95 % ${nf(main.lo, 2)} a ${nf(main.hi, 2)}; ${pq(main.p)}; n = ${main.n}).</div>`;
  const ln = S.ols(x, y);
  const chart = ch(el => C.scatter(el, rows.map(r => ({ x: r[xid], y: r[yid], tip: `${r._id}: ${nf(r[xid], 1)}; ${nf(r[yid], 2)}`, color: r.upp_presente === 1 ? "--c-upp" : "--c-no" })), { line: ln, jitterX: X.kind === "ord" || Number.isInteger(x[0]) ? 0.35 : 0, jitterY: Y.kind === "ord" ? 0.3 : 0, xLabel: X.l, yLabel: Y.l, label: "Dispersión" }));
  return { html: C.legend([{ color: "--c-upp", label: "Con UPP" }, { color: "--c-no", label: "Sin UPP" }]) + chart + html, p: main.p, test: useP ? "Pearson" : "Spearman", eff: `${useP ? "r" : "rho"} = ${nf(main.r, 2)}` };
}

/* =================== PANELES =================== */
function panelOE1(rows) {
  const socio = ["edad", "grupo_edad", "sexo", "estado_civil", "escolaridad", "estrato", "zona", "regimen", "ocupacion", "etnia", "convivencia", "cuidador"];
  const clin = ["dias_estancia", "estancia_cat", "imc", "imc_cat", "albumina", "hipoalb", "hemoglobina", "anemia", "incontinencia", "sedacion", "n_comorb", ...VARS_OF("comorb"), "n_disp", ...VARS_OF("disp"), "dolor_apoyo"];
  const tbl = list => list.map(id => { const V = VARS[id];
    if (V.kind === "num") { const dn = descNum(colv(rows, id)); return `<tr><td>${esc(V.l)}${V.unit ? ` (${esc(V.unit)})` : ""}, ${dn.how}</td><td class="n">${dn.d.n}</td><td class="n" colspan="2">${dn.txt}</td><td class="n">${dn.test}: ${fp(dn.np)}</td></tr>`; }
    if (V.kind === "bin" && V.grp) { const fr = freq(rows, id), it = fr.items[0]; return `<tr><td style="padding-left:24px">${esc(V.l.split(": ")[1])}</td><td class="n">${it.k}</td><td class="n">${pc(it.p)}</td><td class="n">${pc(it.lo)}–${pc(it.hi)}</td><td></td></tr>`; }
    const fr = freq(rows, id); return `<tr><td class="grp" colspan="5">${esc(V.l)} <span class="muted" style="font-weight:400">(n = ${fr.n})</span></td></tr>` + fr.items.map(it => `<tr><td style="padding-left:24px">${esc(it.l)}</td><td class="n">${it.k}</td><td class="n">${pc(it.p)}</td><td class="n">${pc(it.lo)}–${pc(it.hi)}</td><td></td></tr>`).join(""); }).join("")
    .replace(/(<tr><td style="padding-left:24px">[^<]*<\/td>[\s\S]*?<\/tr>)/, "$1");
  const head = `<thead><tr><th>Variable</th><th class="n">n</th><th class="n">%  o  valor</th><th class="n">IC 95 %</th><th class="n">Normalidad (p)</th></tr></thead>`;
  const groupHdr = (t, ids) => `<tr><td class="grp" colspan="5">${t}</td></tr>`;
  const hb = (id, o = {}) => { const fr = freq(rows, id); let items = fr.items.map((it, i) => ({ label: it.l, value: it.p * 100, n: it.k, tip: `${it.l}: ${it.k} (${pc(it.p)}; IC 95 % ${pc(it.lo)}–${pc(it.hi)})`, color: o.color || "--c1" })); if (o.sort) items.sort((a, b) => b.value - a.value); return ch(el => C.hbar(el, items, { label: VARS[id].l })); };
  const multi = (grp) => { const ids = VARS_OF(grp); const items = ids.map(id => { const fr = freq(rows, id), it = fr.items[0]; return { label: VARS[id].l.split(": ")[1], value: it.p * 100, n: it.k }; }).sort((a, b) => b.value - a.value); return ch(el => C.hbar(el, items, { label: grp })); };
  const edad = colv(rows, "edad"), de = S.describe(edad), dn = descNum(edad);
  return `${objective("Objetivo específico 1", "Caracterizar las condiciones sociodemográficas y clínicas de los pacientes", "Frecuencias con IC 95 % de Wilson. Las variables cuantitativas se resumen con media ± DE si son normales, o con mediana (RIC) si no lo son.")}
  ${minN(rows, 10, "la caracterización es preliminar")}
  <div class="kpis">${kpi("Pacientes", rows.length)}${kpi("Edad", dn.txt, dn.how + " (años)")}${kpi("Mujeres", pc(freq(rows, "sexo").items[1].p), `${freq(rows, "sexo").items[1].k} pacientes`)}${kpi("Estancia", descNum(colv(rows, "dias_estancia")).txt, "días, " + descNum(colv(rows, "dias_estancia")).how)}${kpi("Con 2 o más comorbilidades", pc(rows.filter(r => r.n_comorb >= 2).length / (rows.length || 1)))}</div>
  <div class="grid2">${card("Edad", `Histograma con curva normal. ${dn.test}: ${pq(dn.np)}.`, ch(el => C.hist(el, edad, { normal: de.n > 2 ? { mean: de.mean, sd: de.sd } : null, xLabel: "Edad (años)", xName: "Edad", label: "Edad" })))}
    ${card("Grupo de edad", "", hb("grupo_edad"))}</div>
  <div class="grid2">${card("Sexo", "", hb("sexo"))}${card("Estrato socioeconómico", "", hb("estrato"))}</div>
  <div class="grid2">${card("Régimen de afiliación", "", hb("regimen", { sort: 1 }))}${card("Nivel educativo", "", hb("escolaridad"))}</div>
  <div class="grid2">${card("Comorbilidades", "Porcentaje de pacientes con cada condición (un paciente puede tener varias).", multi("comorb"))}${card("Dispositivos médicos", "Porcentaje de pacientes con cada dispositivo.", multi("disp"))}</div>
  <div class="grid2">${card("Estado nutricional por IMC", "", hb("imc_cat"))}${card("Incontinencia", "", hb("incontinencia"))}</div>
  ${card("Tabla 1. Características sociodemográficas y clínicas", "Copie esta tabla al informe. Los porcentajes se calculan sobre los casos con dato.", `<div class="tw"><table>${head}<tbody>${groupHdr("Sociodemográficas")}${tbl(socio)}${groupHdr("Clínicas")}${tbl(clin)}</tbody></table></div>`)}`;
}
function VARS_OF(grp) { return Object.values(VARS).filter(v => v.grp === grp).map(v => v.id); }

function panelOE2(rows) {
  const br = has(rows, "braden_total"), bt = colv(br, "braden_total"), d = S.describe(bt), dn = descNum(bt), n = br.length;
  const enR = S.wilson(br.filter(r => r.en_riesgo === 1).length, n), alto = S.wilson(br.filter(r => r.riesgo_alto === 1).length, n);
  const up = has(rows, "upp_presente"), kU = up.filter(r => r.upp_presente === 1).length, prev = S.wilson(kU, up.length);
  const hosp = rows.filter(r => r.upp_presente === 1 && r.upp_origen === 2).length;
  const rk = freq(br, "braden_riesgo");
  /* subescalas */
  const subRows = BRADEN.map(b => { const v = colv(br, b.id), mw = S.mannWhitney(br.filter(r => r.upp_presente === 1).map(r => r[b.id]), br.filter(r => r.upp_presente === 0).map(r => r[b.id]));
    const comp = v.filter(x => x <= 2).length; return { b, d: S.describe(v), comp, pcomp: v.length ? comp / v.length : NaN, mw }; });
  const subTbl = `<div class="tw"><table><thead><tr><th>Subescala</th><th class="n">Media ± DE</th><th class="n">Mediana (RIC)</th><th class="n">Puntaje ≤ 2</th><th class="n">Mediana con UPP</th><th class="n">Mediana sin UPP</th><th class="n">p (Mann-Whitney)</th><th class="n">r</th></tr></thead><tbody>${subRows.map(s => `<tr><td>${esc(s.b.t)}</td><td class="n">${nf(s.d.mean, 2)} ± ${nf(s.d.sd, 2)}</td><td class="n">${nf(s.d.median, 0)} (${nf(s.d.q1, 0)}–${nf(s.d.q3, 0)})</td><td class="n">${s.comp} (${pc(s.pcomp)})</td><td class="n">${s.mw ? nf(s.mw.md1, 1) : "—"}</td><td class="n">${s.mw ? nf(s.mw.md2, 1) : "—"}</td><td class="n">${s.mw ? pTag(s.mw.p) : "—"}</td><td class="n">${s.mw ? nf(s.mw.r, 2) : "—"}</td></tr>`).join("")}</tbody></table></div>`;
  const sigSub = subRows.filter(s => s.mw && s.mw.p < 0.05).map(s => s.b.t.toLowerCase());
  const worst = [...subRows].sort((a, b) => b.pcomp - a.pcomp)[0];
  /* riesgo × UPP */
  const rxu = chiBlock(up.filter(r => r.braden_riesgo != null), "braden_riesgo", "upp_presente");
  const r3 = chiBlock(up.filter(r => r.riesgo_alto != null), "riesgo_alto", "upp_presente");
  /* ROC */
  const roc = S.roc(br.map(r => r.braden_total), br.map(r => r.upp_presente), true);
  let rocHtml = C.empty("La curva ROC necesita pacientes con y sin UPP.");
  if (roc) {
    const cuts = [12, 14, 16, 18].map(c => { const p = roc.pts.find(x => x.cut === c) || (() => { const pos = br.filter(r => r.upp_presente === 1), neg = br.filter(r => r.upp_presente === 0); const tp = pos.filter(r => r.braden_total <= c).length, fp_ = neg.filter(r => r.braden_total <= c).length; return { sens: tp / pos.length, spec: 1 - fp_ / neg.length, ppv: tp + fp_ ? tp / (tp + fp_) : NaN, npv: (neg.length - fp_) / ((neg.length - fp_) + (pos.length - tp)) }; })(); return { c, ...p }; });
    rocHtml = ch(el => C.lines(el, [{ pts: roc.pts.map(p => ({ x: p.fpr, y: p.tpr, tip: p.cut == null ? "" : `Corte ≤ ${p.cut}: sensibilidad ${pc(p.sens)}, especificidad ${pc(p.spec)}` })), color: "--c1", path: 1 }], { diag: 1, xmin: 0, xmax: 1, ymin: 0, ymax: 1, maxW: 520, h: 300, xLabel: "1 − especificidad", yLabel: "Sensibilidad", mark: roc.best ? { x: 1 - roc.best.spec, y: roc.best.sens, label: `≤ ${roc.best.cut}` } : null, label: "Curva ROC" })) +
      `<div class="tw" style="margin-top:10px"><table><thead><tr><th>Punto de corte Braden</th><th class="n">Sensibilidad</th><th class="n">Especificidad</th><th class="n">VPP</th><th class="n">VPN</th></tr></thead><tbody>${cuts.map(c => `<tr><td>≤ ${c.c}${roc.best && roc.best.cut === c.c ? " (Youden)" : ""}</td><td class="n">${pc(c.sens)}</td><td class="n">${pc(c.spec)}</td><td class="n">${pc(c.ppv)}</td><td class="n">${pc(c.npv)}</td></tr>`).join("")}${roc.best && ![12, 14, 16, 18].includes(roc.best.cut) ? (() => { const b = roc.pts.find(x => x.cut === roc.best.cut); return `<tr><td>≤ ${roc.best.cut} (Youden)</td><td class="n">${pc(b.sens)}</td><td class="n">${pc(b.spec)}</td><td class="n">${pc(b.ppv)}</td><td class="n">${pc(b.npv)}</td></tr>`; })() : ""}</tbody></table></div>
      <div class="narr">El área bajo la curva fue <b>${nf(roc.auc, 3)}</b> (IC 95 % ${nf(roc.lo, 3)}–${nf(roc.hi, 3)}; ${pq(roc.p)}): capacidad discriminante ${aucWord(roc.auc)} del puntaje Braden para identificar pacientes con UPP. El índice de Youden propone el corte ≤ ${roc.best.cut} (sensibilidad ${pc(roc.best.sens)}, especificidad ${pc(roc.best.spec)}). Basado en ${roc.n1} casos con UPP y ${roc.n0} sin UPP.</div>`;
  }
  const narr = n ? `El puntaje Braden tuvo ${dn.how} de <b>${dn.txt}</b> (rango ${d.min}–${d.max}). El <b>${pc(enR.p)}</b> de los pacientes estaba en riesgo (≤ 18; IC 95 % ${pc(enR.lo)}–${pc(enR.hi)}) y el <b>${pc(alto.p)}</b> en riesgo alto o muy alto (≤ 12). La subescala más comprometida fue ${worst ? `<b>${esc(worst.b.t.toLowerCase())}</b> (${pc(worst.pcomp)} con puntaje ≤ 2)` : "—"}. ${sigSub.length ? `Las subescalas con diferencia significativa entre pacientes con y sin UPP fueron: ${esc(sigSub.join(", "))}.` : "Ninguna subescala difirió de forma significativa entre pacientes con y sin UPP."}` : "";
  return `${objective("Objetivo específico 2", "Identificar los factores de riesgo para úlceras por presión mediante la escala de Braden", "Distribución del puntaje y de los niveles de riesgo, subescalas comprometidas y su relación con la presencia de UPP.")}
  ${minN(br, 20, "con Braden completo, la estimación es imprecisa")}
  <div class="kpis">${kpi("Braden", dn.txt, dn.how)}${kpi("En riesgo (≤ 18)", pc(enR.p), `IC 95 % ${pc(enR.lo)}–${pc(enR.hi)}`)}${kpi("Riesgo alto o muy alto", pc(alto.p), `IC 95 % ${pc(alto.lo)}–${pc(alto.hi)}`)}${kpi("Prevalencia de UPP", pc(prev.p), `${kU} de ${up.length}; IC 95 % ${pc(prev.lo)}–${pc(prev.hi)}`)}${kpi("Adquiridas en hospitalización", kU ? pc(hosp / kU) : "—", `${hosp} de ${kU} UPP`)}</div>
  ${n ? `<div class="narr">${narr}</div>` : ""}
  <div class="grid2">${card("Distribución del puntaje Braden", "Cada barra es un puntaje; el color indica el nivel de riesgo.", ch(el => C.hist(el, bt, { integer: 1, min: 6, max: 23, colorFn: m => `--rk${riskOf(Math.round(m)).code}`, xLabel: "Puntaje Braden (6–23)", xName: "Braden", label: "Puntaje Braden" })) + C.legend(RISK.map(r => ({ color: `--rk${r.code}`, label: r.s }))))}
    ${card("Nivel de riesgo", "", ch(el => C.hbar(el, rk.items.map(it => ({ label: it.l, value: it.p * 100, n: it.k, color: `--rk${it.c}`, tip: `${it.l}: ${it.k} (${pc(it.p)}; IC 95 % ${pc(it.lo)}–${pc(it.hi)})` })), { label: "Nivel de riesgo" })))}</div>
  ${card("Subescalas de Braden", "Puntaje ≤ 2 indica compromiso de la dimensión (en fricción, ≤ 2 incluye problema y problema potencial). La comparación con y sin UPP usa Mann-Whitney porque las subescalas son ordinales.", ch(el => C.hbar(el, subRows.map(s => ({ label: s.b.t, value: s.pcomp * 100, n: s.comp })), { label: "Subescalas comprometidas" })) + subTbl)}
  <div class="grid2">${card("Nivel de riesgo y presencia de UPP", "Distribución de UPP en cada nivel de riesgo, con chi cuadrado de tendencia.", rxu.html)}${card("Riesgo alto (≤ 12) y presencia de UPP", "Tabla 2 × 2 con odds ratio y razón de prevalencias.", r3.html)}</div>
  ${card("Capacidad del Braden para identificar pacientes con UPP", "Curva ROC del puntaje (a menor puntaje, mayor riesgo), con sensibilidad y especificidad de los cortes clásicos.", rocHtml)}`;
}

function panelOE3(rows) {
  const resp = rows.filter(r => r.responde != null && r.responde !== 3), fr = freq(rows, "responde");
  const items = PERC_Q.map(([id, t, s]) => { const v = colv(resp, id); const cnt = [1, 2, 3, 4, 5].map(k => v.filter(x => x === k).length); return { id, t, s, v, cnt, d: S.describe(v) }; });
  const parts = it => it.cnt.map((k, j) => ({ v: k, color: `--lk${j + 1}`, name: LIK_L[j], ink: j === 0 || j === 4 ? "--on-dark" : "--ink" }));
  const alpha = S.cronbach(resp.map(r => PERC_IDS.map(id => r[id])));
  const pm = colv(rows, "percepcion_media"), dpm = descNum(pm), pcat = freq(rows, "percep_cat");
  const procItems = PROC_Q.map(([id, t, s]) => { const v = rows.map(r => r[id]).filter(x => x != null); return { id, s, n: v.length, si: v.filter(x => x === 1).length, no: v.filter(x => x === 0).length, nr: v.filter(x => x === 9).length }; });
  const ip = colv(rows, "idx_procesos"), dip = descNum(ip);
  const best = [...items].filter(i => i.v.length).sort((a, b) => b.d.mean - a.d.mean), worst = best[best.length - 1];
  const narr = resp.length ? `Respondieron ${resp.length} personas (${fr.items[0].k} pacientes y ${fr.items[1].k} cuidadores); en ${fr.items[2].k} casos no fue posible obtener respuesta. La percepción media fue <b>${dpm.txt}</b> (${dpm.how}, escala 1–5) y fue favorable (≥ 3,5) en el <b>${pc(pcat.items[2].p)}</b>. El aspecto mejor valorado fue «${esc(best[0].s.toLowerCase())}» (media ${nf(best[0].d.mean, 2)}) y el peor, «${esc(worst.s.toLowerCase())}» (media ${nf(worst.d.mean, 2)}).${alpha ? ` La consistencia interna de la escala fue ${alphaWord(alpha.alpha)} (α de Cronbach = ${nf(alpha.alpha, 3)}; ${alpha.n} casos completos).` : ""}` : "";
  return `${objective("Objetivo específico 3", "Describir la percepción de los pacientes sobre los procesos de atención para prevenir las UPP", "Respuestas Likert por ítem, puntaje medio, confiabilidad de la escala y cumplimiento de las acciones preventivas verificadas en la historia clínica.")}
  ${minN(resp, 20, "con respuesta de percepción, la descripción es preliminar")}
  <div class="kpis">${kpi("Respondieron", resp.length, `${fr.items[2].k} sin respuesta posible`)}${kpi("Percepción media", dpm.txt, dpm.how + " (1–5)")}${kpi("Percepción favorable", pc(pcat.items[2].p), `IC 95 % ${pc(pcat.items[2].lo)}–${pc(pcat.items[2].hi)}`)}${kpi("α de Cronbach", alpha ? nf(alpha.alpha, 3) : "—", alpha ? alphaWord(alpha.alpha) : "faltan casos completos")}${kpi("Cumplimiento de procesos", dip.txt, dip.how + " (%)")}</div>
  ${narr ? `<div class="narr">${narr}</div>` : ""}
  ${card("Respuesta por ítem", "Barras divergentes centradas en la opción neutra: a la izquierda desacuerdo, a la derecha acuerdo. Los números son porcentajes.", C.legend(LIK_L.map((l, j) => ({ color: `--lk${j + 1}`, label: `${j + 1} ${l}` }))) + ch(el => C.stack(el, items.map(it => ({ label: `${it.id.toUpperCase()} ${it.s}`, parts: parts(it) })), { diverging: 1, label: "Escala Likert" })))}
  <div class="grid2">${card("Resumen por ítem", "", `<div class="tw"><table><thead><tr><th>Ítem</th><th class="n">n</th><th class="n">Media ± DE</th><th class="n">Mediana</th><th class="n">De acuerdo (4–5)</th><th class="n">En desacuerdo (1–2)</th></tr></thead><tbody>${items.map(it => `<tr><td>${it.id.toUpperCase()} ${esc(it.s)}</td><td class="n">${it.d.n || 0}</td><td class="n">${nf(it.d.mean, 2)} ± ${nf(it.d.sd, 2)}</td><td class="n">${nf(it.d.median, 0)}</td><td class="n">${pc(it.v.length ? (it.cnt[3] + it.cnt[4]) / it.v.length : NaN)}</td><td class="n">${pc(it.v.length ? (it.cnt[0] + it.cnt[1]) / it.v.length : NaN)}</td></tr>`).join("")}</tbody></table></div>`)}
    ${card("Confiabilidad de la escala", "Alfa de Cronbach con la correlación ítem-total corregida y el alfa si se elimina el ítem. Se espera α ≥ 0,70 y correlaciones ítem-total ≥ 0,30.", alpha ? `<div class="tw"><table><thead><tr><th>Ítem</th><th class="n">r ítem-total</th><th class="n">α si se elimina</th></tr></thead><tbody>${alpha.items.map((it, j) => `<tr><td>${PERC_IDS[j].toUpperCase()} ${esc(PERC_Q[j][2])}</td><td class="n${it.rit < 0.3 ? " sig" : ""}">${nf(it.rit, 3)}</td><td class="n${it.alphaDel > alpha.alpha ? " sig" : ""}">${nf(it.alphaDel, 3)}</td></tr>`).join("")}</tbody></table></div><div class="narr">α = ${nf(alpha.alpha, 3)} con ${alpha.k} ítems y ${alpha.n} casos completos: consistencia ${alphaWord(alpha.alpha)}. ${alpha.items.some(it => it.alphaDel > alpha.alpha) ? "Algún ítem resaltado sube el alfa al eliminarlo; revise su redacción en la prueba piloto." : "Ningún ítem mejora el alfa al eliminarlo."}</div>` : C.empty("Se necesitan al menos 3 casos con los 8 ítems respondidos."))}</div>
  <div class="grid2">${card("Puntaje medio de percepción", "", ch(el => C.hist(el, pm, { min: 1, max: 5, bins: 8, normal: pm.length > 2 ? { mean: S.mean(pm), sd: S.sd(pm) } : null, xLabel: "Percepción media (1–5)", xName: "Percepción", label: "Percepción media" })))}
    ${card("Percepción categorizada", "", ch(el => C.hbar(el, pcat.items.map((it, j) => ({ label: it.l, value: it.p * 100, n: it.k, color: ["--lk1", "--lk3", "--lk5"][j] })), { label: "Percepción categorizada" })))}</div>
  ${card("Cumplimiento de los procesos de atención", "Porcentaje de pacientes con cada acción preventiva verificada (Sí). «No registrado» se cuenta como no cumplido.", ch(el => C.stack(el, procItems.map(p => ({ label: p.s, parts: [{ v: p.si, color: "--c1", name: "Sí", ink: "--on-dark" }, { v: p.no, color: "--lk2", name: "No", ink: "--ink" }, { v: p.nr, color: "--lk3", name: "No registrado", ink: "--ink" }] })), { label: "Procesos de atención" })) + C.legend([{ color: "--c1", label: "Sí" }, { color: "--lk2", label: "No" }, { color: "--lk3", label: "No registrado" }]))}`;
}

function panelOE4(rows) {
  const main = assoc(rows, "braden_total", "percepcion_media"), proc = assoc(rows, "braden_total", "idx_procesos");
  const kw = grpBlock(rows.filter(r => r.riesgo3 != null && r.percepcion_media != null), "riesgo3", "percepcion_media");
  const chi = chiBlock(rows.filter(r => r.riesgo3 != null && r.percep_cat != null), "riesgo3", "percep_cat");
  const rowsV = [...BRADEN.map(b => b.id), "braden_total"], colsV = [...PERC_IDS, "percepcion_media", "idx_procesos"];
  const M = rowsV.map(a => colsV.map(b => { const s = S.spearman(rows.map(r => r[a]), rows.map(r => r[b])); return s ? s.r : null; }));
  const P = rowsV.map(a => colsV.map(b => { const s = S.spearman(rows.map(r => r[a]), rows.map(r => r[b])); return s ? s.p : null; }));
  const rl = [...BRADEN.map(b => b.s), "Braden total"], cl = [...PERC_IDS.map((id, j) => `${id.toUpperCase()} ${PERC_Q[j][2]}`), "Percepción media", "Índice de procesos"];
  const nsig = P.flat().filter(p => p != null && p < 0.05).length;
  return `${objective("Objetivo específico 4", "Analizar la asociación entre el riesgo según Braden y la percepción del paciente sobre los procesos de atención", "Prueba principal: rho de Spearman entre el puntaje Braden total y la percepción media, porque ambas son ordinales. Se complementa con la comparación por nivel de riesgo y la matriz por subescala e ítem.")}
  ${minN(rows, 30, "la potencia para detectar correlaciones moderadas es baja")}
  <div class="grid2">${card("Braden total × percepción media", "Prueba principal del objetivo. Puntos coloreados según la presencia de UPP.", main.html)}${card("Braden total × índice de cumplimiento de procesos", "Contrasta el riesgo con lo registrado en la historia clínica.", proc.html)}</div>
  ${card("Matriz de correlaciones de Spearman", `Filas: subescalas de Braden; columnas: ítems de percepción e índices. * p < 0,05. ${nsig} de ${P.flat().length} correlaciones son significativas; con tantas pruebas, algunas pueden serlo por azar (con α = 0,05 se esperan unas ${Math.round(P.flat().length * 0.05)}).`, ch(el => C.heat(el, rl, cl, M, P, { label: "Matriz de correlaciones" })) + C.legend([{ color: "--dn3", label: "Negativa" }, { color: "--dp0", label: "Cercana a 0" }, { color: "--dp3", label: "Positiva" }]))}
  <div class="grid2">${card("Percepción media según nivel de riesgo", "Comparación entre los tres niveles de riesgo agrupados.", kw.html)}${card("Nivel de riesgo × percepción categorizada", "", chi.html)}</div>`;
}

function panelOG(rows) {
  const up = has(rows, "upp_presente"), kU = up.filter(r => r.upp_presente === 1).length, prev = S.wilson(kU, up.length);
  const hb = has(rows, "upp_hosp"), kH = hb.filter(r => r.upp_hosp === 1).length, ph = S.wilson(kH, hb.length);
  const cand = ["edad", "grupo_edad", "sexo", "estrato", "regimen", "cuidador", "dias_estancia", "estancia_cat", "imc", "imc_cat", "albumina", "hipoalb", "hemoglobina", "anemia", "incontinencia", "sedacion", "n_comorb", ...VARS_OF("comorb"), "n_disp", ...VARS_OF("disp"), "braden_total", ...BRADEN.map(b => b.id), "riesgo3", "riesgo_alto", "idx_procesos", "proc_cat", ...PROC_IDS, "percepcion_media", "percep_cat", "dolor_apoyo"];
  const res = cand.map(id => { const r = up.filter(x => x[id] != null); const k = r.filter(x => x.upp_presente === 1).length;
    if (r.length < 5 || k === 0 || k === r.length) return { id, p: null, n: r.length };
    let out; const V = VARS[id];
    if (V.kind === "num" || V.kind === "ord") out = grpBlock(r, "upp_presente", id); else out = chiBlock(r, id, "upp_presente");
    let extra = "";
    if (V.kind === "num" || V.kind === "ord") { const a = colv(r.filter(x => x.upp_presente === 1), id), b = colv(r.filter(x => x.upp_presente === 0), id); extra = `${nf(S.median(a), 1)} frente a ${nf(S.median(b), 1)}`; }
    else if (V.kind === "bin") { const t = [[1, 1], [1, 0], [0, 1], [0, 0]].map(([e, o]) => r.filter(x => x[id] === e && x.upp_presente === o).length); const o = S.or2x2(...t); extra = `OR ${nf(o.or, 2)} (${nf(o.lo, 2)}–${nf(o.hi, 2)})`; }
    else extra = out.eff || "";
    return { id, p: out.p, test: out.test, extra, n: r.length };
  }).sort((a, b) => (a.p ?? 2) - (b.p ?? 2));
  const tbl = `<div class="tw"><table><thead><tr><th>Factor</th><th class="n">n</th><th>Prueba</th><th class="n">Con UPP frente a sin UPP</th><th class="n">p</th><th></th></tr></thead><tbody>${res.map(r => `<tr><td>${esc(VARS[r.id].l)}</td><td class="n">${r.n}</td><td>${r.test || "—"}</td><td class="n">${r.extra || "—"}</td><td class="n">${pTag(r.p)}</td><td>${r.p != null && r.p < 0.2 ? `<span class="tag">candidato</span>` : ""}</td></tr>`).join("")}</tbody></table></div>`;
  /* modelo logístico */
  const pool = [...new Set(["braden_total", "percepcion_media", "idx_procesos", "edad", "dias_estancia", "albumina", "hemoglobina", "imc", "n_comorb", "n_disp", "dolor_apoyo", ...BRADEN.map(b => b.id), "sexo_bin", "riesgo_alto", "hipoalb", "anemia", "sedacion", "cuidador", ...VARS_OF("comorb"), ...VARS_OF("disp")])].filter(id => VARS[id] || id === "sexo_bin");
  const sel = ST.logit.filter(id => pool.includes(id));
  const lr = up.map(r => ({ ...r, sexo_bin: r.sexo === 2 ? 1 : r.sexo === 1 ? 0 : null }));
  const cc = lr.filter(r => sel.every(id => r[id] != null && Number.isFinite(r[id])));
  const nameOf = id => id === "sexo_bin" ? "Sexo: mujer" : VARS[id].l;
  let model = C.empty("Elija al menos un predictor.");
  if (sel.length) { const m = cc.length > sel.length + 5 ? S.logistic(cc.map(r => sel.map(id => r[id])), cc.map(r => r.upp_presente), sel.map(nameOf)) : { error: `Hay ${cc.length} casos completos para ${sel.length} predictores; se necesitan más.` };
    if (m.error) model = `<div class="msg">${esc(m.error)}</div>`;
    else { const co = m.coef.slice(1);
      model = `${m.epv < 10 ? `<div class="msg">Hay ${m.events < m.n - m.events ? m.events + " casos con UPP" : (m.n - m.events) + " casos sin UPP"} para ${m.df} predictores (${nf(m.epv, 1)} eventos por variable). Se recomiendan al menos 10; reduzca predictores o amplíe la muestra antes de interpretar.</div>` : ""}${m.separation ? `<div class="msg bad">Hay separación casi completa: algún predictor predice el desenlace casi sin error y los OR no son fiables. Quite ese predictor o agrupe categorías.</div>` : ""}
      ${ch(el => C.forest(el, co.map(c => ({ label: c.name.length > 30 ? c.name.slice(0, 29) + "…" : c.name, or: c.or, lo: c.lo, hi: c.hi, p: c.p })), { label: "OR ajustados" }))}
      <div class="tw" style="margin-top:10px"><table><thead><tr><th>Predictor</th><th class="n">B</th><th class="n">EE</th><th class="n">OR ajustado</th><th class="n">IC 95 %</th><th class="n">p (Wald)</th></tr></thead><tbody>${m.coef.map(c => `<tr><td>${esc(c.name)}</td><td class="n">${nf(c.b, 3)}</td><td class="n">${nf(c.se, 3)}</td><td class="n">${c.name === "Constante" ? "—" : nf(c.or, 3)}</td><td class="n">${c.name === "Constante" ? "—" : `${nf(c.lo, 3)}–${nf(c.hi, 3)}`}</td><td class="n">${pTag(c.p)}</td></tr>`).join("")}</tbody></table></div>
      <div class="tw" style="margin-top:10px"><table><tbody><tr><td>Casos completos / con UPP</td><td class="n">${m.n} / ${m.events}</td></tr><tr><td>Prueba de razón de verosimilitud del modelo</td><td class="n">χ² = ${nf(m.LR, 2)}; gl = ${m.df}; ${pq(m.pLR)}</td></tr><tr><td>R² de Nagelkerke / Cox y Snell</td><td class="n">${nf(m.nagelkerke, 3)} / ${nf(m.coxSnell, 3)}</td></tr><tr><td>Clasificación correcta (corte 0,5)</td><td class="n">${pc(m.accuracy)}</td></tr><tr><td>Convergencia</td><td class="n">${m.converged ? `sí, ${m.iterations} iteraciones` : "no"}</td></tr></tbody></table></div>
      <div class="narr">El modelo ${m.pLR < 0.05 ? "fue significativo" : "no fue significativo"} en conjunto (χ² = ${nf(m.LR, 2)}; gl = ${m.df}; ${pq(m.pLR)}; R² de Nagelkerke = ${nf(m.nagelkerke, 2)}). ${co.filter(c => c.p < 0.05).map(c => `Por cada unidad adicional de <b>${esc(c.name.toLowerCase())}</b>, la odds de presentar UPP se multiplica por ${nf(c.or, 2)} (IC 95 % ${nf(c.lo, 2)}–${nf(c.hi, 2)}; ${pq(c.p)}), ajustando por las demás variables.`).join(" ") || "Ningún predictor fue significativo al ajustar por los demás."} Para el puntaje Braden, un OR menor de 1 indica que a mayor puntaje (menor riesgo) disminuye la probabilidad de UPP.</div>`; } }
  const box = (id, l) => ch(el => C.box(el, [{ label: "Con UPP", values: colv(up.filter(r => r.upp_presente === 1), id), color: "--c-upp" }, { label: "Sin UPP", values: colv(up.filter(r => r.upp_presente === 0), id), color: "--c-no" }], { yLabel: l, h: 220, label: l }));
  return `${objective("Objetivo general", "Asociación de los factores de riesgo de Braden, los procesos de atención y la percepción del cuidado con la ocurrencia de UPP", "Prevalencia, análisis bivariado de cada factor frente a la UPP y modelo de regresión logística con OR ajustados.")}
  ${minN(up, 50, "y pocos casos con UPP, el modelo multivariable no es estable")}
  <div class="kpis">${kpi("Prevalencia de UPP", pc(prev.p), `${kU} de ${up.length}; IC 95 % ${pc(prev.lo)}–${pc(prev.hi)}`)}${kpi("UPP adquirida en hospitalización", pc(ph.p), `${kH} de ${hb.length}; excluye las presentes al ingreso`)}${kpi("Factores con p < 0,05", res.filter(r => r.p != null && r.p < 0.05).length, `de ${res.filter(r => r.p != null).length} evaluados`)}</div>
  <div class="grid2">${card("Braden según UPP", "", box("braden_total", "Puntaje Braden"))}${card("Percepción según UPP", "", box("percepcion_media", "Percepción media"))}</div>
  <div class="grid2">${card("Cumplimiento de procesos según UPP", "", box("idx_procesos", "Índice de procesos (%)"))}${card("Días de estancia según UPP", "", box("dias_estancia", "Días de estancia"))}</div>
  ${card("Análisis bivariado: cada factor frente a la presencia de UPP", "Ordenado por valor p. La prueba se elige sola según el tipo de variable y la normalidad. Los factores con p < 0,20 son candidatos al modelo multivariable.", tbl)}
  ${card("Regresión logística binaria", "Desenlace: UPP (sí = 1). Elija los predictores; se usan los casos con todos los datos. Para variables binarias, el OR compara la presencia frente a la ausencia del factor.", `<div class="checks" id="lgPick">${pool.map(id => `<label><input type="checkbox" value="${id}" ${sel.includes(id) ? "checked" : ""}>${esc(nameOf(id).length > 38 ? nameOf(id).slice(0, 37) + "…" : nameOf(id))}</label>`).join("")}</div><div style="margin-top:14px">${model}</div>`)}`;
}

function panelNorm(rows) {
  const vars = ["edad", "dias_estancia", "imc", "albumina", "hemoglobina", "braden_total", "idx_procesos", "percepcion_media", "dolor_apoyo", "n_comorb"];
  const grps = ST.normGrp === "upp" ? [["Con UPP", rows.filter(r => r.upp_presente === 1)], ["Sin UPP", rows.filter(r => r.upp_presente === 0)]] : [["Todos", rows]];
  const trs = vars.flatMap(id => grps.map(([g, rs]) => { const v = colv(rs, id), d = S.describe(v), nm = S.normality(v);
    const dec = nm.normal == null ? "—" : nm.normal ? `<span class="tag ok">Normal</span>` : `<span class="tag warn">No normal</span>`;
    return `<tr><td>${esc(VARS[id].l)}${grps.length > 1 ? ` · ${g}` : ""}</td><td class="n">${d.n || 0}</td><td class="n">${nf(d.mean, 2)} ± ${nf(d.sd, 2)}</td><td class="n">${nf(d.median, 1)} (${nf(d.q1, 1)}–${nf(d.q3, 1)})</td><td class="n">${nf(d.skew, 2)}</td><td class="n">${nf(d.kurt, 2)}</td><td class="n">${nm.sw ? `${nf(nm.sw.W, 3)}; ${pTag(nm.sw.p)}` : "—"}</td><td class="n">${nm.ks ? `${nf(nm.ks.D, 3)}; ${pTag(nm.ks.p)}` : "—"}</td><td>${dec}${nm.normal != null ? `<div class="muted" style="font-size:11px">según ${nm.main === "ks" ? "K-S" : "S-W"}</div>` : ""}</td></tr>`; })).join("");
  const v = colv(rows, ST.normVar), d = S.describe(v), qq = v.length > 2 ? S.qqPoints(v) : [];
  return `${objective("Supuestos", "Pruebas de normalidad", "Shapiro-Wilk se informa como prueba principal con 50 casos o menos; K-S con corrección de Lilliefors con más de 50. Normal si p ≥ 0,05. Con muestras grandes, revise también el Q-Q y la asimetría.")}
  <div class="card"><div class="row"><span class="muted" style="font-size:13px">Calcular para</span><div class="seg" id="normGrp"><button type="button" data-v="all" aria-pressed="${ST.normGrp === "all"}">Toda la muestra</button><button type="button" data-v="upp" aria-pressed="${ST.normGrp === "upp"}">Por grupo de UPP</button></div><span class="muted" style="font-size:13px">Para elegir entre t de Welch y Mann-Whitney, la normalidad se evalúa en cada grupo.</span></div></div>
  ${card("Resumen de normalidad", "Asimetría y curtosis tipo SPSS (curtosis en exceso: 0 en la normal).", `<div class="tw"><table><thead><tr><th>Variable</th><th class="n">n</th><th class="n">Media ± DE</th><th class="n">Mediana (RIC)</th><th class="n">Asimetría</th><th class="n">Curtosis</th><th class="n">Shapiro-Wilk W; p</th><th class="n">K-S Lilliefors D; p</th><th>Decisión</th></tr></thead><tbody>${trs}</tbody></table></div>`)}
  <div class="card"><header><h3>Gráficos de una variable</h3><select class="inp" id="normVar" aria-label="Variable">${vars.map(id => `<option value="${id}" ${id === ST.normVar ? "selected" : ""}>${esc(VARS[id].l)}</option>`).join("")}</select></header>
  <div class="grid2"><div>${ch(el => C.hist(el, v, { normal: d.n > 2 ? { mean: d.mean, sd: d.sd } : null, integer: ST.normVar === "braden_total" || ST.normVar === "n_comorb" || ST.normVar === "dolor_apoyo", xLabel: VARS[ST.normVar].l, xName: VARS[ST.normVar].l, label: "Histograma" }))}</div>
  <div>${ch(el => C.lines(el, [{ pts: qq.map(p => ({ x: p.t, y: p.z, tip: `Valor ${nf(p.v, 2)}` })), color: "--c1", r: 3 }], { diag: 1, xLabel: "Cuantil teórico normal", yLabel: "Valor estandarizado", label: "Gráfico Q-Q", empty: "Faltan datos." }))}</div></div></div>`;
}

function panelExp(rows) {
  const opts = Object.values(VARS).filter(v => !v.skip).sort((a, b) => a.l.localeCompare(b.l, "es"));
  const sel = (id, val) => `<select class="inp" id="${id}">${opts.map(v => `<option value="${v.id}" ${v.id === val ? "selected" : ""}>${esc(v.l)} · ${({ num: "cuantitativa", ord: "ordinal", cat: "nominal", bin: "dicotómica" })[v.kind]}</option>`).join("")}</select>`;
  const r = ST.expX === ST.expY ? { html: C.empty("Elija dos variables distintas.") } : assoc(rows, ST.expX, ST.expY);
  return `${objective("Explorador", "Asociación entre dos variables cualesquiera", "La app elige la prueba según el tipo de variable y la normalidad, y explica por qué. Use este explorador para hipótesis secundarias; las principales están en las pestañas de cada objetivo.")}
  <div class="card"><div class="varpick"><label>Variable 1${sel("expX", ST.expX)}</label><label>Variable 2${sel("expY", ST.expY)}</label></div></div>
  ${card("Resultado", "", r.html)}`;
}

/* =================== RENDER DEL ANÁLISIS =================== */
const PANELS = { oe1: panelOE1, oe2: panelOE2, oe3: panelOE3, oe4: panelOE4, og: panelOG, norm: panelNorm, exp: panelExp };
function renderAnalysis() {
  const rows = dataset(); const real = ST.recs.size;
  $("anN").textContent = `n = ${rows.length}`;
  $("anBanner").innerHTML = ST.src === "demo" ? `<div class="banner demo">Está viendo <b>datos simulados</b> de 150 pacientes para conocer el análisis. No los use en el informe. Cambie a «Registros del proyecto» para ver los datos reales.</div>`
    : !real ? `<div class="banner">Todavía no hay registros. Mientras tanto puede ver cómo se verá el análisis con <button class="btn small" type="button" id="goDemo">datos simulados</button>.</div>` : "";
  const g = $("goDemo"); if (g) g.onclick = () => { ST.src = "demo"; syncSeg(); renderAnalysis(); };
  CHQ = []; $("anBody").innerHTML = rows.length ? PANELS[ST.panel](rows) : `<div class="card empty-state">No hay registros con los filtros elegidos.</div>`;
  LAST = CHQ; flushCharts(LAST); bindAnalysis();
}
function bindAnalysis() {
  const lp = $("lgPick"); if (lp) lp.onchange = () => { ST.logit = [...lp.querySelectorAll("input:checked")].map(i => i.value); renderAnalysis(); };
  const ng = $("normGrp"); if (ng) ng.onclick = e => { const b = e.target.closest("button"); if (b) { ST.normGrp = b.dataset.v; renderAnalysis(); } };
  const nv = $("normVar"); if (nv) nv.onchange = () => { ST.normVar = nv.value; renderAnalysis(); };
  const ex = $("expX"), ey = $("expY"); if (ex) { ex.onchange = () => { ST.expX = ex.value; renderAnalysis(); }; ey.onchange = () => { ST.expY = ey.value; renderAnalysis(); }; }
}
function syncSeg() {
  document.querySelectorAll("#anSrc button").forEach(b => b.setAttribute("aria-pressed", b.dataset.v === ST.src));
  document.querySelectorAll("#anInc button").forEach(b => b.setAttribute("aria-pressed", b.dataset.v === ST.inc));
  document.querySelectorAll("#anNav button").forEach(b => b.setAttribute("aria-pressed", b.dataset.p === ST.panel));
  document.querySelectorAll("#fWho button").forEach(b => b.setAttribute("aria-pressed", b.dataset.v === ST.fWho));
}

/* =================== EXPORTACIONES =================== */
function columns() {
  const cols = [{ id: "codigo", get: r => r.id }, { id: "recolector", get: r => prefixOf(r) }, { id: "estado_revision", get: r => (r.revision && r.revision.estado) || "pendiente" }, { id: "creado", get: r => r.creado }, { id: "modificado", get: r => r.mod }];
  FIELDS.forEach(f => { if (f.id === "codigo") return; if (f.type === "multi") f.o.forEach(([c]) => cols.push({ id: `${f.id}_${c}`, get: r => (r.v[f.id] || []).includes(c) ? 1 : 0, f: null })); else cols.push({ id: f.id, get: r => r.v[f.id], f }); });
  DERIVED.forEach(d => cols.push({ id: d.id, get: r => derive(r.v)[d.id], f: { o: d.o } }));
  return cols;
}
const csvCell = x => { if (x == null || x === "") return ""; let s = typeof x === "number" ? String(x).replace(".", ",") : String(x); return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
function buildCSV(mode) { const cols = columns(), recs = [...ST.recs.values()].sort((a, b) => a.id.localeCompare(b.id));
  return "﻿" + [cols.map(c => c.id).join(";"), ...recs.map(r => cols.map(c => { let x = c.get(r); if (mode === "label" && c.f && c.f.o && x != null) { const o = c.f.o.find(o => o[0] === x); if (o) x = o[1]; } return csvCell(x); }).join(";"))].join("\r\n"); }
function dictRows() {
  const tipo = { text: "Texto", date: "Fecha (AAAA-MM-DD)", num: "Numérica", radio: "Categórica", select: "Categórica", calc: "Calculada", textarea: "Texto" };
  const rows = [["codigo", "A", "Código del participante", "Texto", "", ""], ["recolector", "—", "Prefijo de quien registró", "Texto", "", "E1, E2, E3, A1, A2"], ["estado_revision", "—", "Estado de revisión", "Texto", "", "pendiente; corregir; aprobado"], ["creado", "—", "Fecha y hora de creación (UTC)", "Fecha", "", ""], ["modificado", "—", "Última modificación (UTC)", "Fecha", "", ""]];
  FIELDS.forEach(f => { if (f.id === "codigo") return; if (f.type === "multi") f.o.forEach(([c, l]) => rows.push([`${f.id}_${c}`, f.sec, `${f.l}: ${l}`, "Binaria (0/1)", "", "1 = presente; 0 = ausente"]));
    else rows.push([f.id, f.sec, f.l, f.type === "calc" && f.o ? "Calculada · categórica" : tipo[f.type], f.unit || "", f.o ? f.o.map(([v, l]) => `${v} = ${l}`).join("; ") : ""]); });
  DERIVED.forEach(d => rows.push([d.id, "Derivada", d.l, d.num ? "Numérica" : "Categórica", "", d.o ? d.o.map(([v, l]) => `${v} = ${l}`).join("; ") : ""]));
  return rows;
}
function renderDict() { $("dict").innerHTML = `<table><thead><tr><th>Variable</th><th>Sección</th><th>Descripción</th><th>Tipo</th><th>Unidad</th><th>Códigos</th></tr></thead><tbody>${dictRows().map(r => `<tr><td class="mono">${esc(r[0])}</td><td>${esc(r[1])}</td><td style="min-width:240px">${esc(r[2])}</td><td>${esc(r[3])}</td><td>${esc(r[4])}</td><td style="min-width:220px;font-size:12px">${esc(r[5])}</td></tr>`).join("")}</tbody></table>`; }
function dmsg(t, k) { $("dataMsg").innerHTML = t ? `<div class="msg ${k || ""}">${esc(t)}</div>` : ""; }
function offer(filename, data) {
  const type = filename.endsWith(".csv") ? "text/csv;charset=utf-8" : filename.endsWith(".json") ? "application/json" : "text/html;charset=utf-8";
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([data], { type })); a.download = filename;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); dmsg(`Archivo ${filename} descargado.`, "ok");
}
const stamp = () => today().replace(/-/g, "");
$("btnCsv").onclick = () => { if (!ST.recs.size) return dmsg("No hay registros para exportar."); offer(`upp_medicina_interna_${stamp()}.csv`, buildCSV($("csvMode").value)); };
$("btnDict").onclick = () => offer("diccionario_variables_upp.csv", "﻿" + ["variable;seccion;descripcion;tipo;unidad;codigos", ...dictRows().map(r => r.map(csvCell).join(";"))].join("\r\n"));
$("btnBackup").onclick = () => offer(`respaldo_upp_${stamp()}.json`, JSON.stringify({ app: "UPP-MI-2027", version: 2, exportado: nowIso(), registros: [...ST.recs.values()], config: ST.cfg }, null, 1));
$("btnReport").onclick = () => {
  const rows = dataset(); if (!rows.length) return dmsg("No hay datos para el informe con los filtros de la pestaña Análisis.");
  const css = document.querySelector("style").textContent; let body = "";
  ["oe1", "oe2", "oe3", "oe4", "og", "norm"].forEach(p => { CHQ = []; let h = PANELS[p](rows); CHQ.forEach(c => { h = h.replace(`<div class="chart-box" id="${c.id}"></div>`, `<div class="chart-box">${c.fn(null)}</div>`); }); body += `<section class="view" style="margin-bottom:40px">${h}</section>`; });
  CHQ = [];
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Informe UPP Medicina Interna</title><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Literata:opsz,wght@7..72,500;7..72,650&family=Public+Sans:wght@400;600;700&family=JetBrains+Mono&display=swap"><style>${css} body{margin:0} #lgPick,.seg,select{display:none}</style></head><body><header class="band"><div class="wrap"><div class="row1"><div class="seal">UMB</div><div class="title"><b>Informe de resultados · UPP Medicina Interna</b><span>Generado el ${today()} · n = ${rows.length} · ${ST.src === "demo" ? "DATOS SIMULADOS" : ST.inc === "ok" ? "solo registros aprobados" : "todos los registros"}</span></div></div></div></header><main class="wrap">${body}</main></body></html>`;
  offer(`informe_upp_${stamp()}.html`, html);
};
$("restoreFile").onchange = e => {
  const file = e.target.files[0]; if (!file) return; const rd = new FileReader();
  rd.onload = async () => { try {
    if (!canWrite() || !myPrefix()) throw new Error("rol");
    const d = JSON.parse(rd.result); const arr = Array.isArray(d) ? d : d.registros; if (!Array.isArray(arr)) throw 0;
    let add = 0, skip = 0;
    for (const r of arr) { if (!r || !r.v || r.ej) { skip++; continue; }
      let id = d.version === 2 ? r.id : null; const v = { ...r.v, ...compute(r.v) }; delete v._bp; delete v._bn;
      if (!id) { id = nextCode(); v.codigo = id; }
      if (ST.recs.has(id) || await Store.get(id)) { skip++; continue; }
      const body = d.version === 2 ? { ...r } : { v, autor: Store.uid, prefijo: myPrefix(), creado: r.creado || nowIso(), mod: nowIso(), modPor: Store.uid, rev: 1, revision: { estado: "pendiente" } };
      delete body.id; body.v = v; await Store.put(id, body); ST.recs.set(id, { id, ...body }); add++; }
    dmsg(`Importados ${add} registro(s); ${skip} omitidos (ejemplos o códigos repetidos).`, "ok");
  } catch (er) { dmsg(er && er.message === "rol" ? "Para importar necesita una cuenta autorizada con prefijo." : "El archivo no es un respaldo válido de este instrumento.", "bad"); } e.target.value = ""; };
  rd.readAsText(file);
};

/* =================== NAVEGACIÓN =================== */
function setView(name) {
  ST.view = name;
  ["inicio", "registro", "registros", "analisis", "metodos", "datos"].forEach(k => { $("view-" + k).hidden = k !== name; $("tab-" + k).setAttribute("aria-selected", k === name); });
  $("formbar").hidden = name !== "registro";
  renderCurrent();
}
function renderCurrent() {
  if (ST.view === "inicio") renderInicio();
  else if (ST.view === "registro") { $("regGate").innerHTML = myPrefix() ? "" : `<div class="banner">Su cuenta no tiene prefijo asignado; no podrá guardar.</div>`; }
  else if (ST.view === "registros") renderRegistros();
  else if (ST.view === "analisis") renderAnalysis();
}
document.querySelectorAll("nav.tabs button").forEach(b => b.onclick = () => setView(b.dataset.view));
$("anNav").onclick = e => { const b = e.target.closest("button"); if (!b) return; ST.panel = b.dataset.p; syncSeg(); renderAnalysis(); };
$("anSrc").onclick = e => { const b = e.target.closest("button"); if (!b) return; ST.src = b.dataset.v; syncSeg(); renderAnalysis(); };
$("anInc").onclick = e => { const b = e.target.closest("button"); if (!b) return; ST.inc = b.dataset.v; syncSeg(); renderAnalysis(); };
$("fWho").onclick = e => { const b = e.target.closest("button"); if (!b) return; ST.fWho = b.dataset.v; syncSeg(); renderRegistros(); };
$("fState").onchange = renderRegistros; $("fCode").oninput = renderRegistros;
let rt = null; window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { if (ST.view === "analisis") flushCharts(LAST); else if (ST.view === "inicio") renderInicio(); }, 200); });

/* =================== INICIO =================== */
let deb = null; const schedule = () => { clearTimeout(deb); deb = setTimeout(() => {
  const pend = [...ST.recs.values()].filter(r => !r.revision || r.revision.estado !== "aprobado").length;
  const bp = $("badgePend"); bp.hidden = !pend || !isAsesor(); bp.textContent = pend;
  renderWho();
  if (ST.view === "analisis" && ST.src === "demo") return; renderCurrent();
  if (ST.view === "registro" && !ST.editing && $("codigo").value.indexOf("XX") >= 0 && myPrefix()) $("codigo").value = nextCode();
}, 120); };
let started = false;
async function boot() {
  C.installTooltip(); renderForm(); renderDict(); syncSeg();
  frm().addEventListener("input", () => { refreshForm(); saveDraft(); });
  frm().addEventListener("change", () => { refreshForm(); saveDraft(); });
  frm().addEventListener("submit", onSave);
  $("btnNew").onclick = () => { clearDraft(); newRecord(); };
  $("btnSignOut").onclick = () => Store.signOut();
  Store.onAuth = () => start();
  try { await Store.init(); } catch (e) { $("syncTxt").textContent = "No se pudo cargar Firebase"; }
  start();
}
function start() {
  renderWho(); if (!renderGate()) { started = false; ST.recs = new Map(); return; }
  if (started) return; started = true;
  window.addEventListener("online", () => { ST.sync = "pending"; renderWho(); }); window.addEventListener("offline", () => { ST.sync = "offline"; renderWho(); });
  Store.watch({
    recs: list => { ST.recs = new Map(list.map(r => [r.id, r])); ST.loaded = true; schedule(); },
    team: t => { ST.team = t; schedule(); }, cfg: c => { ST.cfg = c; schedule(); }, access: m => { ST.acceso = m; schedule(); },
    sync: s => { ST.sync = s.local ? "ok" : !navigator.onLine ? "offline" : s.pending ? "pending" : "ok"; renderWho(); },
    err: e => { $("syncTxt").textContent = e && e.code === "permission-denied" ? "Sin permiso para leer la base" : "Error de conexión con Firebase"; }
  });
  newRecord(); renderCurrent();
  if (location.hash === "#analisis") setView("analisis");
}
boot();
})();
