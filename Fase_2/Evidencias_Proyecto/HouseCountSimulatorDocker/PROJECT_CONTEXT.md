# 🏠 HomeCount Simulator - Contexto del Proyecto y Reglas para el Asistente AI

> **Instrucción de inicio para nuevos chats:**  
> Copia y pega el contenido de este archivo al iniciar una nueva conversación para que el asistente tenga el contexto exacto del proyecto, su arquitectura y las reglas de desarrollo sin consumir tokens innecesarios recordando sesiones pasadas.

---

## 1. 📋 Resumen del Proyecto

**HomeCount Simulator** es una plataforma web interactiva construida en **Django (Python)** y **Three.js (JavaScript)** que permite a los usuarios diseñar planos y casas en 3D (bloque a bloque o mediante módulos prehechos habitacionales), calculando en tiempo real:
- Presupuesto y costos de materiales (en pesos chilenos - CLP).
- Perímetro exterior envolvente (en metros lineales).
- Área total construida (en m²).
- Desglose de materiales y módulos.
- Generación de informes técnicos de obra descargables (PDF, HTML e Impresión).

---

## 2. 📁 Ubicaciones y Archivos Clave

- **Ruta principal del proyecto:**  
  `D:\Users\milio\PROJ\HomeCount_Simulator\Fase_2\Evidencias_Proyecto\HouseCountSimulatorDocker\`
- **Aplicación Django:**  
  `app_housecount\` dentro del proyecto.
- **Ramas Git habituales:**  
  `dimensiones` (rama actual de trabajo), `panel-tabs-ui`, `main`.

### Archivos Principales:
1. **Lógica 3D y UI interactiva:**  
   `app_housecount/static/js/script_casas1.js`  
   *(Contiene Three.js, colocación de bloques, cálculo de dimensiones, eventos de tabs y descarga de informe).*
2. **Persistencia en Base de Datos:**  
   `app_housecount/static/js/guardado_db.js`  
   *(Maneja el guardado/carga de proyectos hacia el backend Django).*
3. **Hoja de Estilos:**  
   `app_housecount/static/css/Style5.css`  
   *(Estilos del constructor, catálogo inferior, tabs derecho, modal de informe y modo oscuro).*
4. **Plantilla HTML principal:**  
   `app_housecount/templates/casas_modelo_1.html`  
   *(Estructura del editor 3D, canvas, panel derecho, catálogo inferior y modal de informe).*
5. **Backend Django:**  
   `app_housecount/views.py` *(API `/api/materiales-3d/`, autenticación y vistas)*  
   `app_housecount/models.py` *(Modelos `Material`, `Habitacion`, `Proyecto3D`, `CategoriaMaterial`)*  
   `db.sqlite3` *(Base de datos local)*

---

## 3. 📐 Arquitectura 3D y Dimensiones (Three.js)

- **Escala del Mundo 3D:**  
  **`50 unidades Three.js = 1 metro real`** (1 celda de la cuadrícula = $1\,\text{m} \times 1\,\text{m}$).
- **Bloques individuales de material:**  
  `BoxGeometry(50, 50, 50)` $\rightarrow$ $1\,\text{m} \times 1\,\text{m} \times 1\,\text{m}$.
- **Módulos prehechos (Habitaciones):**  
  `BoxGeometry(200, 100, 200)` $\rightarrow$ $4\,\text{m} \times 4\,\text{m}$ de base ($4 \times 4$ celdas) por $2\,\text{m}$ de altura.
- **Estructura de la escena:**  
  - `objetosInteractuables[0]` $\rightarrow$ Plano invisible base del suelo (nunca se borra ni cuenta en cálculos).  
  - `objetosInteractuables[1..n]` $\rightarrow$ Elementos construidos por el usuario.
- **Metadatos del objeto (`userData`):**  
  ```javascript
  obj.userData = {
      precio: Number,
      tipo: 'material' | 'habitacion',
      url3D: String | null,
      textura: String,
      nombre: String,
      categoria: String // 'Estructura', 'modulo_prehecho', 'Baño', etc.
  };
  ```

---

## 4. ⚙️ Lógica de Negocio y Funcionalidades Implementadas

### A. Cálculo de Perímetro y Área Exterior:
- **Solo computan:** Elementos de la categoría **`Estructura`** y módulos prehechos (**`habitacion`** / **`modulo_prehecho`**).  
- **Se ignoran:** Sillas, camas, plantas, adornos y muebles.
- **Algoritmo:** Marching perimeter sobre grilla 2D proyectada en plano $(X, Z)$. Se cuentan las caras de celdas ocupadas que **no tienen vecino contiguo**, dando el perímetro exterior exacto de la envolvente sin duplicar paredes internas.
- **Funciones:** `obtenerCalculoDimensiones()`, `calcularYMostrarPerimetro()`, `mostrarResultadoDimensiones(perimetro, area)`.

### B. Paneles y Pestañas:
- **Panel Derecho (3 pestañas):**
  1. `tab-dimensiones`: Perímetro exterior y área total con tarjetas de métricas.
  2. `tab-detalle`: Lista de materiales desglosados con cantidades y subtotales.
  3. `tab-modulos`: Lista de módulos prehechos utilizados con cantidades y subtotales.
- **Catálogo Inferior (filtros):**  
  Pestañas dinámicas (`Todos`, `Estructura`, `Baño`, `Cocina`, ..., `Módulos Prehechos`). Al cambiar de pestaña, se selecciona automáticamente el primer elemento de dicha categoría.

### C. Generador de Informe Técnico de Construcción:
- **Botón `📥 Descargar Informe`** en el panel superior derecho.
- **Modal interactivo** con resumen rápido y 3 vías de salida:
  1. **PDF:** Generado al vuelo mediante `html2pdf.js` con formato formal (Folio `HC-YYYY-XXXX`, fecha, métricas, tabla de artículos, observaciones y líneas de firma).
  2. **HTML:** Archivo `.html` auto-contenido descargable para abrir en navegador/celular.
  3. **Impresión:** Diálogo directo del navegador (`window.print()`).

---

## 5. 🛡️ Reglas Obligatorias para el Asistente AI

1. **Respetar el trabajo del equipo (NO romper código ajeno):**  
   Este proyecto es un trabajo colaborativo en equipo universitario/profesional. Nunca sobrescribas ni alteres estilos generales, nombres de clases preexistentes ni lógica ajena. Siempre aísla nuevas funcionalidades con nombres de clase o IDs propios específicos.
2. **Preservar los metadatos en `userData`:**  
   Siempre que se agregue, clone, guarde o cargue un objeto (vía `localStorage` o `guardado_db.js`), asegúrate de propagar y restaurar todos sus campos, especialmente `categoria`, `nombre`, `precio` y `tipo`.
3. **Mantener la reactividad en tiempo real:**  
   Cualquier evento que altere la escena (construir con clic, borrar con `Shift + clic`, borrar todo o cargar nube/local) debe invocar de forma sincronizada:
   - `actualizarPresupuesto(valor)`
   - `actualizarListaUI()`
   - `calcularYMostrarPerimetro()`
4. **Soporte de Tema Oscuro (`body.tema-oscuro`):**  
   Toda nueva interfaz o componente HTML/CSS debe incluir sus reglas equivalentes dentro de `body.tema-oscuro` en `Style5.css`.
5. **Ruta y entorno de ejecución:**  
   Los cambios de código se aplican en `D:\Users\milio\PROJ\HomeCount_Simulator\Fase_2\Evidencias_Proyecto\HouseCountSimulatorDocker\app_housecount\`. Respeta siempre la rama Git en la que esté trabajando Milo.
