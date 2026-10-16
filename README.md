# Instrumento UPP · Medicina Interna (UMB)

App web para recolectar y analizar los datos del proyecto «Asociación entre los factores de riesgo de Braden, los procesos de atención y la percepción del cuidado con la ocurrencia de úlceras por presión en medicina interna (2026–2027)».

- **Recolección**: anamnesis sociodemográfica y clínica, escala de Braden, procesos de atención y percepción del paciente. Cálculos automáticos de Braden, riesgo, IMC, estancia, índice de procesos y percepción media.
- **Equipo**: 3 recolectores y 2 asesores trabajando al mismo tiempo. Cada persona tiene un prefijo (MI-E1-001, MI-A1-001…). Los asesores aprueban o devuelven registros.
- **Sin conexión**: Firestore guarda los cambios en el equipo y los envía al volver la conexión.
- **Análisis en vivo** por objetivo: caracterización, Braden, percepción, Braden × percepción, modelo para UPP, normalidad y explorador bivariado.
- **Exportación**: CSV para SPSS, R o Jamovi; diccionario de variables; informe HTML; respaldo JSON.

## Estructura

```
public/                 ← lo que se publica
  index.html
  firebase-config.js    ← pegar aquí la configuración de su proyecto Firebase
  js/app.js             ← interfaz, formulario, seguimiento y paneles de análisis
  js/store.js           ← Firebase (Auth + Firestore) o modo local
  js/stats.js           ← motor estadístico (sin dependencias)
  js/charts.js          ← gráficas SVG
firestore.rules         ← reglas de seguridad por rol
firebase.json, .firebaserc, firestore.indexes.json
```

## Puesta en marcha

1. **Crear el proyecto** en https://console.firebase.google.com (el plan gratuito Spark alcanza).
2. **Authentication** > Comenzar > Proveedor **Google** > Habilitar. En *Configuración > Dominios autorizados*, agregue el dominio donde publique (por ejemplo `usuario.github.io` o `proyecto.web.app`).
3. **Firestore Database** > Crear base de datos > modo producción. Elija la ubicación más cercana, por ejemplo `southamerica-east1`.
4. **Reglas**: copie el contenido de `firestore.rules` en *Firestore > Reglas* y publíquelas, o use `firebase deploy --only firestore:rules`.
5. **Primer asesor** (una sola vez, a mano): en *Firestore > Datos* cree la colección `acceso` con un documento cuyo ID sea **su correo de Google en minúsculas** y con los campos:
   - `rol` (string) = `asesor`
   - `prefijo` (string) = `A1`
6. **Configuración web**: en *Configuración del proyecto > General > Tus apps*, registre una app web y copie el objeto `firebaseConfig` en `public/firebase-config.js`. Ponga también el ID del proyecto en `.firebaserc`.
7. **Publicar** la carpeta `public/`:
   - Firebase Hosting: `firebase deploy --only hosting`.
   - GitHub Pages: publique el contenido de `public/` (por ejemplo, en una rama `gh-pages` o en `/docs`).
8. Ingrese con Google. En **Seguimiento > Equipo y accesos**, autorice los correos de los demás integrantes con su rol y prefijo (E1, E2, E3 para estudiantes; A2 para el segundo asesor).

## Probar en el computador antes de subir

Los módulos de JavaScript no funcionan al abrir el archivo con doble clic; se necesita un servidor local:

```
cd public
python -m http.server 8000      # o: npx serve .
```

Abra http://localhost:8000. Mientras `firebase-config.js` diga `PEGAR_AQUI`, la app funciona en **modo local**: los datos quedan solo en ese navegador y usted tiene rol de asesor para probarlo todo. En la pestaña Análisis, la opción «Simulados (n = 150)» muestra todos los paneles con datos ficticios.

## Qué protegen las reglas

| Acción | Recolector | Asesor |
|---|---|---|
| Ingresar y leer los datos | Solo si su correo está en `acceso` | Sí |
| Crear registros | Solo con su prefijo, con consentimiento y en estado pendiente | Sí |
| Editar | Solo sus registros, sin aprobarlos (de «por corregir» puede pasar a «pendiente») | Todos |
| Aprobar o devolver | No | Sí |
| Borrar | Sus registros no aprobados | Todos |
| Autorizar correos y fijar la meta | No | Sí (no puede quitarse a sí mismo) |

Las reglas no se pudieron ejecutar en el emulador de Firestore durante el desarrollo. Antes de recolectar, haga una prueba con una cuenta de recolector: crear, editar, intentar aprobar (debe fallar) y borrar uno propio.

## Validación del motor estadístico

`js/stats.js` se comparó con SciPy 1.18 y statsmodels 0.15 en 300 conjuntos de datos simulados. Las pruebas comparadas fueron Shapiro-Wilk, Lilliefors, Mann-Whitney, Kruskal-Wallis, ANOVA, Welch, Spearman, Pearson, chi cuadrado, Fisher, regresión logística, AUC, asimetría y curtosis. La diferencia máxima fue menor de 10⁻⁷. El detalle está en la pestaña Métodos de la app. Para el informe final, replique los resultados principales en SPSS, R o Jamovi con el CSV exportado.

## Datos personales

Solo se registran códigos de participante, nunca nombres, documentos ni números de historia clínica (Ley 1581 de 2012; Resolución 8430 de 1993). Del equipo se guardan el nombre y la foto de su cuenta de Google para mostrar quién registró cada caso.
