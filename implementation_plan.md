# Plan de Implementación — Registro Inicial de Bienes de Soporte TI (Wayra)

Este plan detalla la implementación del nuevo módulo **"📥 Registro de Bienes"** en la aplicación, enfocado en optimizar el registro inicial y veloz de activos TI de soporte en la empresa **Wayra**. 

*Nota: A solicitud del usuario, la impresión de etiquetas físicas no formará parte de las responsabilidades del sistema. Nos enfocaremos en la velocidad de ingreso, la estructuración de categorías y la captura de fotos.*

---

## 🚀 Estrategia para Maximizar la Velocidad de Ingreso

Para resolver la falta de inventario inicial de forma rápida, la interfaz se diseñará con los siguientes pilares de eficiencia:

1.  **Navegación 100% por Teclado:** Orden de tabulación (`tabindex`) estricto y envío del formulario con la tecla `Enter` desde cualquier campo de texto.
2.  **Autofoco Inteligente:** Al cambiar de categoría o guardar un registro, el cursor se enfocará automáticamente en el primer campo relevante del siguiente bien.
3.  **Botones de Atajo (Quick Presets):** 
    *   Para cables y periféricos, habrá botones de un solo clic para autocompletar modelos comunes (ej: "HDMI 1.8m", "DisplayPort 1.8m", "Teclado USB", "Mouse USB").
    *   Para computadoras, botones de pre-llenado de RAM ("8 GB", "16 GB") y Discos ("256 GB SSD", "512 GB SSD").
4.  **Generación y Carga en Segundo Plano:** El código único se genera instantáneamente en pantalla y se guarda localmente en IndexedDB usando la cola offline del `SyncEngine`, permitiendo registrar decenas de equipos de forma consecutiva sin esperar las confirmaciones HTTP del Sheets API.

---

## 📂 Clasificación de Categorías TI y Campos Dinámicos

El formulario adaptará dinámicamente sus campos y atajos rápidos según la categoría elegida:

| Categoría TI | Campos Específicos | Atajos de Pre-llenado (Presets) |
| :--- | :--- | :--- |
| **💻 Laptops / PCs** | Marca, Modelo, Serie, Procesador, RAM, Disco (HD/SSD), Foto | RAM (8GB/16GB), Disco (256GB SSD/512GB SSD), CPU (Core i5/Core i7) |
| **🖥️ Monitores** | Marca, Modelo, Serie, Pulgadas, Foto | Pulgadas (19", 20", 21.5", 22", 24", 27") |
| **🔌 Cables / Adaptadores** | Tipo de Cable, Descripción/Medida, Cantidad, Foto (opcional) | "HDMI 1.8m", "DisplayPort 1.8m", "Cable de Poder C13", "Patch Cord Cat6 2m" |
| **⌨️ Periféricos** | Tipo (Teclado/Mouse/Cámara), Marca, Modelo, Serie, Foto | "Teclado USB Standar", "Mouse USB Óptico", "Cámara Web USB 1080p" |
| **🌐 Redes y Comunicaciones**| Tipo (Switch/Router/AP), Marca, Modelo, Serie, Puertos, Foto | Puertos (5 Puertos, 8 Puertos, 24 Puertos, 48 Puertos) |
| **📦 Repuestos / Componentes**| Tipo (Disco/RAM/Batería), Modelo, PN (opcional), Especificación, Foto | "Memoria RAM DDR4 8GB Sodimm", "Disco SSD 480GB SATA3" |
| **🛠️ Otros Activos TI** | Descripción General, Marca, Modelo, Serie, Observación, Foto | — |

---

## 🧠 Prompt para la IA Ejecutora: Creatividad y Mejoras de UX Premium

> [!TIP]
> **Instrucciones para el Agente de IA que implemente el código:**
> Al programar `registro-bienes.view.js`, implementa las siguientes mejoras creativas de UX para lograr un sistema premium, veloz e interactivo:
>
> 1. **Predicciones Inteligentes en Tiempo Real (Autofill):**
>    - **De Marca según Modelo:** Si el usuario escribe en Modelo palabras como *"Latitude"*, *"Optiplex"* o *"Inspiron"*, rellena Marca automáticamente con `"DELL"`. Si escribe *"ProBook"*, *"EliteBook"* o *"ZBook"*, rellena con `"HP"`. Si escribe *"ThinkPad"*, *"ThinkCentre"* o *"IdeaPad"*, rellena con `"LENOVO"`.
>    - **De Categoría según Descripción:** Si el usuario escribe en descripción palabras como *"cargador"*, *"cable"*, *"hdmi"* o *"displayport"*, sugiere sutilmente cambiar a la categoría *"Cables / Adaptadores"*.
> 
> 2. **Previsualización de Tarjeta de Activo en Vivo:**
>    - Diseña una sección lateral de "Previsualización del Bien" que muestre en tiempo real una tarjeta con el aspecto que tendrá el activo en la base de datos (con su badge de categoría, foto miniatura, especificaciones formateadas y código de barras/QR simulado). Esto le da feedback instantáneo al usuario.
> 
> 3. **Captura Directa desde Cámara Web (Webcam Snapshot):**
>    - Además de poder seleccionar un archivo de imagen, añade un botón de "Tomar Foto" que abra un stream de cámara en un pequeño contenedor flotante usando `navigator.mediaDevices.getUserMedia` para capturar la evidencia directamente desde la webcam en 1 clic.
> 
> 4. **Micro-interacciones y Animaciones de Confirmación:**
>    - Cuando el usuario guarda con éxito, la tarjeta de previsualización debe realizar un efecto de "vuelo/desplazamiento" (un slide descendente) hacia la lista de registros recientes, y el botón de guardar debe mostrar un spinner de éxito verde con un icono de verificación `check`.
> 
> 5. **Modo Ráfaga (Bulk Mode):**
>    - Añade un interruptor ("Switch") de "Modo Continuo / Ráfaga". Si está activo, tras guardar un registro, la aplicación no borra campos comunes (como Marca o Procesador) y se enfoca directamente en el campo `Serie` del siguiente equipo, permitiendo registrar lotes enteros de computadoras idénticas en segundos cambiando solo la serie.

---

## 🛠️ Proposed Changes & Architecture Map References

El desarrollo se integrará con las siguientes capas del [ARCHITECTURE_MAP.md](file:///c:/Users/Admin/Desktop/testa/ARCHITECTURE_MAP.md):

### 1. Interfaz Principal (App Shell)

#### [MODIFY] [index.html](file:///c:/Users/Admin/Desktop/testa/index.html)
*   **Referencia en Map:** `Entrypoint principal (líneas 27-125)`.
*   **Cambio:**
    *   Insertar la opción de menú al inicio del menú lateral (sidebar) arriba de `nav-ingreso`:
        ```html
        <a class="nav-item" id="nav-registro-bienes" onclick="Views.go('registro-bienes')">
          <span class="nav-icon">📥</span> Registro de Bienes
        </a>
        ```
    *   Insertar la vista en el contenedor principal: `<div class="view" id="view-registro-bienes"></div>`.
    *   Cargar el nuevo módulo: `<script src="modulo-registro-bienes/registro-bienes.view.js"></script>` justo antes de `core-config/app.js`.

#### [MODIFY] [core-config/app.js](file:///c:/Users/Admin/Desktop/testa/core-config/app.js)
*   **Referencia en Map:** Namespace `Views` (Líneas 5-86) y Bootstrap del ciclo de vida (Línea 123).
*   **Cambio:**
    *   Añadir `'registro-bienes'` a la constante `VIEWS` redirigiendo a `RegistroBienesView.render()`.

---

### 2. Lógica del Módulo de Registro de Bienes

#### [NEW] [registro-bienes.view.js](file:///c:/Users/Admin/Desktop/testa/modulo-registro-bienes/registro-bienes.view.js)
*   **Estructura interna de `RegistroBienesView`:**
    *   **`render()`**: Dibuja el panel y el selector de categorías. Al elegir una categoría, re-renderiza o alterna secciones del formulario y carga sus respectivos botones de presets rápidos.
    *   **`_generarSiguienteCodigo()`**: Busca en IndexedDB (a través de `SheetsAPI.fetchAll()`) los códigos existentes con patrón `WYR-\d+` y calcula el correlativo siguiente (inicia en `WYR-10001` si no existen). Muestra el código de forma destacada en la parte superior del formulario.
    *   **`_inyectarPreset(campoId, valor)`**: Función helper que inserta el texto del atajo presionado en su respectivo input y transfiere el cursor al siguiente campo para no interrumpir el flujo de escritura.
    *   **`_manejarFoto(input)`**: Comprime el archivo usando `ImageUtils.compressToBase64` y renderiza un thumbnail de previsualización en el formulario.
    *   **`async guardar()`**:
        *   Si hay foto seleccionada, la sube a Drive llamando asíncronamente a `DriveUpload.uploadFileWithMeta`.
        *   Prepara el arreglo con las 19 columnas reglamentarias del Google Sheet (`VentasDetallado`), asignando la fecha actual a `FEC_COMPRA` y la URL de la foto en `DOC_COMPRA`.
        *   Inserta el registro localmente en IndexedDB (`LocalCache.put('equipos', bien)`) para que sea buscable y legible inmediatamente por el lector de código de barras del sistema.
        *   Encola la escritura en Google Sheets mediante el motor offline `SyncEngine.syncWrite` para no bloquear al usuario.
        *   Muestra una alerta/toast y reinicia el formulario generando el código consecutivo automáticamente y enfocando el primer input.

---

### 3. Estilos de Interfaz

#### [MODIFY] [core-theme/styles.css](file:///c:/Users/Admin/Desktop/testa/core-theme/styles.css)
*   **Referencia en Map:** `core-theme/styles.css` (Tokens y componentes CSS globales).
*   **Cambio:**
    *   Añadir estilos para botones de presets rápidos (chips redondeados, sutil animación hover, colores HSL armonizados con el tema oscuro/claro).
    *   Añadir la cuadrícula adaptativa para los campos del formulario de registro rápido.

---

## 🧪 Verification Plan

### Manual Verification
1.  **Atajos Rápidos (Presets):** Seleccionar la categoría *Cables*, hacer clic en el botón preset "HDMI 1.8m" y validar que el campo se rellene automáticamente y se auto-enfoque el siguiente input.
2.  **Velocidad de Escritura (Teclado):** Llenar el formulario usando solo `Tab` para cambiar de campo y pulsar `Enter` en el último input. Validar que el bien se registre y el foco regrese al primer campo relevante con el código consecutivo ya incrementado.
3.  **Búsqueda Inmediata:** Registrar un periférico (ej: `WYR-10001`), cambiar a la pestaña **"Búsqueda por Escáner"**, buscar `WYR-10001` y validar que aparezcan todos sus datos y su foto de inmediato.
