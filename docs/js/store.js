// Capa de datos: Firebase (Firestore + Authentication con Google) o modo local de prueba.
import { firebaseConfig } from "../firebase-config.js";

const SDK = "https://www.gstatic.com/firebasejs/10.12.2/";
const clone = o => JSON.parse(JSON.stringify(o));
const LKEY = "upp-mi-local-v2";
// Espera la confirmación del servidor hasta 5 s; si no llega, el cambio queda en la cola sin conexión de Firestore.
const settle = p => Promise.race([p.then(() => ({ pending: false })), new Promise(r => setTimeout(() => r({ pending: true }), 5000))]);

export const Store = {
  mode: "local", uid: null, me: null, access: null, ready: false, fb: null,

  async init() {
    if (!firebaseConfig.apiKey || firebaseConfig.apiKey.includes("PEGAR")) return this.initLocal();
    const [{ initializeApp }, A, F] = await Promise.all([
      import(SDK + "firebase-app.js"), import(SDK + "firebase-auth.js"), import(SDK + "firebase-firestore.js")]);
    const app = initializeApp(firebaseConfig);
    const auth = A.getAuth(app); auth.languageCode = "es";
    let db;
    try { db = F.initializeFirestore(app, { localCache: F.persistentLocalCache({ tabManager: F.persistentMultipleTabManager() }) }); }
    catch (e) { db = F.getFirestore(app); }
    this.fb = { A, F, auth, db }; this.mode = "firebase";
    return new Promise(resolve => {
      A.onAuthStateChanged(auth, async u => {
        if (!u) { this.uid = null; this.me = null; this.access = null; this.ready = true; resolve(); this.onAuth && this.onAuth(); return; }
        this.uid = u.uid; this.me = { name: u.displayName || u.email, email: (u.email || "").toLowerCase(), photo: u.photoURL || "" };
        try { const s = await F.getDoc(F.doc(db, "acceso", this.me.email)); this.access = s.exists() ? s.data() : null; }
        catch (e) { this.access = null; }
        if (this.access) {
          F.setDoc(F.doc(db, "equipo", this.uid), { nombre: this.me.name, email: this.me.email, foto: this.me.photo, prefijo: this.access.prefijo, rol: this.access.rol, visto: new Date().toISOString() }).catch(() => { });
        }
        this.ready = true; resolve(); this.onAuth && this.onAuth();
      });
    });
  },
  initLocal() {
    this.mode = "local"; this.uid = "local"; this.me = { name: "Usted (modo local)", email: "", photo: "" };
    try { this.local = JSON.parse(localStorage.getItem(LKEY) || "null"); } catch (e) { }
    if (!this.local) this.local = { registros: {}, equipo: {}, config: {}, acceso: {} };
    this.access = { rol: "asesor", prefijo: "A1" }; this.local.equipo.local = { nombre: "Usted", prefijo: "A1", rol: "asesor" };
    this.ready = true;
  },
  async signIn() { const { A, auth } = this.fb; const p = new A.GoogleAuthProvider(); p.setCustomParameters({ prompt: "select_account" }); return A.signInWithPopup(auth, p); },
  async signOut() { if (this.fb) { this.unsub(); return this.fb.A.signOut(this.fb.auth); } },

  subs: [],
  unsub() { this.subs.forEach(u => { try { u(); } catch (e) { } }); this.subs = []; },
  watch(h) { // h: {recs, team, cfg, access, sync, err}
    this.unsub();
    if (this.mode === "local") { this.h = h; this.emitLocal(); h.sync && h.sync({ local: true }); return; }
    const { F, db } = this.fb;
    const err = e => h.err && h.err(e);
    this.subs.push(F.onSnapshot(F.collection(db, "registros"), { includeMetadataChanges: true }, s => {
      h.recs(s.docs.map(d => ({ id: d.id, ...d.data(), _pending: d.metadata.hasPendingWrites })));
      h.sync && h.sync({ pending: s.metadata.hasPendingWrites, cache: s.metadata.fromCache });
    }, err));
    this.subs.push(F.onSnapshot(F.collection(db, "equipo"), s => h.team(Object.fromEntries(s.docs.map(d => [d.id, d.data()]))), err));
    this.subs.push(F.onSnapshot(F.doc(db, "config", "proyecto"), s => h.cfg(s.exists() ? s.data() : {}), err));
    this.subs.push(F.onSnapshot(F.collection(db, "acceso"), s => {
      const m = Object.fromEntries(s.docs.map(d => [d.id, d.data()])); if (m[this.me.email]) this.access = m[this.me.email]; h.access(m);
    }, err));
  },
  emitLocal() { const h = this.h, L = this.local; if (!h) return; h.recs(Object.entries(L.registros).map(([id, b]) => ({ id, ...clone(b) }))); h.team(clone(L.equipo)); h.cfg(clone(L.config)); h.access(clone(L.acceso)); },
  persist() { try { localStorage.setItem(LKEY, JSON.stringify(this.local)); } catch (e) { } this.emitLocal(); },

  async get(id) {
    if (this.mode === "local") return this.local.registros[id] ? clone(this.local.registros[id]) : null;
    const { F, db } = this.fb; const s = await F.getDoc(F.doc(db, "registros", id)); return s.exists() ? s.data() : null;
  },
  async put(id, body) {
    if (this.mode === "local") { this.local.registros[id] = clone(body); this.persist(); return { pending: false }; }
    const { F, db } = this.fb; return settle(F.setDoc(F.doc(db, "registros", id), body));
  },
  async patch(id, part) {
    if (this.mode === "local") { Object.assign(this.local.registros[id], clone(part)); this.persist(); return { pending: false }; }
    const { F, db } = this.fb; return settle(F.updateDoc(F.doc(db, "registros", id), part));
  },
  async del(id) {
    if (this.mode === "local") { delete this.local.registros[id]; this.persist(); return; }
    const { F, db } = this.fb; return settle(F.deleteDoc(F.doc(db, "registros", id)));
  },
  async putCfg(body) {
    if (this.mode === "local") { this.local.config = clone(body); this.persist(); return; }
    const { F, db } = this.fb; return settle(F.setDoc(F.doc(db, "config", "proyecto"), body));
  },
  async putAccess(email, data) {
    email = email.trim().toLowerCase();
    if (this.mode === "local") { this.local.acceso[email] = data; this.persist(); return; }
    const { F, db } = this.fb; return F.setDoc(F.doc(db, "acceso", email), data);
  },
  async delAccess(email) {
    if (this.mode === "local") { delete this.local.acceso[email]; this.persist(); return; }
    const { F, db } = this.fb; return F.deleteDoc(F.doc(db, "acceso", email));
  }
};
