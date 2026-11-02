(() => {
    'use strict';
    const constructor = document.getElementById('constructor-3d');
    const abrir = document.getElementById('btn-tutorial');
    if (!constructor || !abrir) return;
    const usuario = constructor.dataset.tutorialUsuario;
    const clave = `housecount:tutorial:v1:${usuario}`;
    const leer = () => { try { return localStorage.getItem(clave); } catch { return null; } };
    const guardar = estado => { try { localStorage.setItem(clave, estado); } catch { /* Puede estar desactivado. */ } };
    const pasos = [
        ['.panel-instrucciones', 'Primero, los atajos', 'Haz clic para construir y Shift + clic para borrar. Mantén Alt para el modo libre. Usa R para girar la pieza y las teclas + y − para ajustar su tamaño.'],
        ['#zona-menu-inferior', 'Elige qué construir', 'Explora las categorías y selecciona un material o un módulo prehecho del catálogo. Después podrás colocarlo en la escena.'],
        ['#canvas-3d-container', 'Tu espacio de construcción', 'Coloca las piezas sobre la cuadrícula para crear tu proyecto. Arrastra para explorar la vista y usa la rueda del ratón para acercarte o alejarte.'],
        ['#tab-dimensiones', 'Revisa las dimensiones', 'Consulta aquí el área y el perímetro de tu construcción a medida que desarrollas el proyecto.', 'tab-dimensiones'],
        ['#tab-detalle', 'Consulta los materiales', 'Detalle muestra los materiales que has añadido y sus cantidades para ayudarte a revisar lo que necesitas.', 'tab-detalle'],
        ['#tab-modulos', 'Revisa los módulos', 'Consulta los módulos utilizados en tu diseño desde esta pestaña.', 'tab-modulos'],
        ['.presupuesto-total', 'Controla el presupuesto', 'El costo total se actualiza con los elementos del proyecto y se muestra en pesos chilenos (CLP).'],
        ['#btn-descargar-informe', 'Lleva contigo el informe', 'Abre las opciones para descargar el informe web o imprimir el resumen de dimensiones, materiales y presupuesto.'],
        ['#contenedor-acciones-superiores', 'Acciones del proyecto', usuario === 'visitante'
            ? 'La papelera permite vaciar la escena y la luna cambia el tema visual. Inicia sesión para guardar diseños y volver a abrirlos. El botón ? permite repetir este tutorial.'
            : 'La papelera permite vaciar la escena y la luna cambia el tema visual. Usa el disquete para guardar tu diseño y la carpeta para abrir tus proyectos. El botón ? permite repetir este tutorial.'],
    ];
    let capa, cuadro, foco, sombras, indice = 0, anterior, tabOriginal;
    const rect = (el, x, y, w, h) => Object.assign(el.style, {left: `${x}px`, top: `${y}px`, width: `${Math.max(0, w)}px`, height: `${Math.max(0, h)}px`});
    function posicionar() {
        if (!capa) return;
        const objetivo = document.querySelector(pasos[indice][0]);
        const r = objetivo.getBoundingClientRect();
        const w = innerWidth, h = innerHeight;
        // El lienzo llena la pantalla: enfocar solo su zona central deja sitio a la explicación.
        const escena = pasos[indice][0] === '#canvas-3d-container';
        const x = Math.max(8, escena ? r.left + r.width * .42 : r.left - 6);
        const y = Math.max(8, escena ? r.top + r.height * .25 : r.top - 6);
        const derecha = Math.min(w - 8, escena ? x + r.width * .35 : r.right + 6);
        const abajo = Math.min(h - 8, escena ? y + r.height * .35 : r.bottom + 6);
        rect(foco, x, y, derecha - x, abajo - y);
        rect(sombras[0], 0, 0, w, y);
        rect(sombras[1], 0, y, x, abajo - y);
        rect(sombras[2], derecha, y, w - derecha, abajo - y);
        rect(sombras[3], 0, abajo, w, h - abajo);
        const cw = cuadro.offsetWidth, ch = cuadro.offsetHeight;
        let cx = (w - cw) / 2, cy = abajo + 18;
        if (cy + ch > h - 16) cy = y - ch - 18;
        if (cy < 16) { cx = derecha + 18; cy = (h - ch) / 2; }
        if (cx + cw > w - 16) cx = x - cw - 18;
        cuadro.style.left = `${Math.max(16, Math.min(w - cw - 16, cx))}px`;
        cuadro.style.top = `${Math.max(16, Math.min(h - ch - 16, cy))}px`;
    }
    function seleccionarTab(id) {
        const boton = [...document.querySelectorAll('.btn-tab')].find(b => b.getAttribute('onclick')?.includes(`'${id}'`));
        // Cambiar la vista sin ejecutar las acciones del clic (Dimensiones abre un aviso).
        document.querySelectorAll('.contenido-tab').forEach(tab => {
            tab.style.display = tab.id === id ? 'block' : 'none';
        });
        document.querySelectorAll('.btn-tab').forEach(tab => {
            tab.classList.toggle('activo', tab === boton);
        });
    }
    function mostrar() {
        const paso = pasos[indice];
        if (paso[3]) seleccionarTab(paso[3]);
        cuadro.querySelector('.tutorial-progreso').textContent = `Guía del simulador · ${indice + 1} de ${pasos.length}`;
        cuadro.querySelector('h2').textContent = paso[1];
        cuadro.querySelector('.tutorial-texto').textContent = paso[2];
        cuadro.querySelector('.tutorial-siguiente').textContent = indice === pasos.length - 1 ? 'Finalizar' : 'Siguiente';
        posicionar();
        cuadro.querySelector('.tutorial-siguiente').focus();
    }
    async function terminar(estado) {
        const botones = cuadro.querySelectorAll('button');
        botones.forEach(b => b.disabled = true);
        if (usuario !== 'visitante') {
            try {
                const csrf = document.cookie.split('; ').find(c => c.startsWith('csrftoken='))?.split('=')[1];
                const respuesta = await fetch(constructor.dataset.tutorialUrl, {
                    method: 'POST', headers: {'Content-Type': 'application/json', 'X-CSRFToken': decodeURIComponent(csrf || '')},
                    body: JSON.stringify({estado}),
                });
                if (!respuesta.ok) throw new Error('No se pudo guardar');
            } catch {
                cuadro.querySelector('.tutorial-error').textContent = 'No se pudo guardar tu elección. Comprueba la conexión y vuelve a pulsar el botón.';
                botones.forEach(b => b.disabled = false);
                posicionar();
                return;
            }
        }
        guardar(estado);
        capa.remove(); capa = null;
        window.removeEventListener('resize', posicionar);
        document.removeEventListener('keydown', teclado, true);
        if (tabOriginal) seleccionarTab(tabOriginal);
        if (anterior?.isConnected) anterior.focus();
    }
    function teclado(e) {
        if (!capa) return;
        // Evitar que las teclas de la guía modifiquen la escena 3D.
        e.stopImmediatePropagation();
        if (e.key === 'Escape') { e.preventDefault(); terminar('omitido'); }
        if (e.key === 'Tab') {
            e.preventDefault();
            const botones = [...cuadro.querySelectorAll('button')];
            const actual = botones.indexOf(document.activeElement);
            botones[(actual + (e.shiftKey ? -1 : 1) + botones.length) % botones.length].focus();
        }
    }
    function iniciar() {
        if (capa) return;
        anterior = document.activeElement;
        tabOriginal = document.querySelector('.contenido-tab[style*="block"]')?.id;
        indice = 0;
        capa = document.createElement('div');
        capa.className = 'tutorial-capa';
        capa.innerHTML = `<div class="tutorial-sombra"></div><div class="tutorial-sombra"></div><div class="tutorial-sombra"></div><div class="tutorial-sombra"></div>
            <div class="tutorial-foco"></div><div class="tutorial-cuadro" role="dialog" aria-modal="true" aria-labelledby="tutorial-titulo" aria-describedby="tutorial-texto">
            <div class="tutorial-progreso" aria-live="polite"></div><h2 id="tutorial-titulo"></h2><p id="tutorial-texto" class="tutorial-texto"></p>
            <div class="tutorial-botones"><button type="button" class="tutorial-omitir">Omitir tutorial</button><button type="button" class="tutorial-siguiente">Siguiente</button></div>
            <p class="tutorial-error" role="status"></p></div>`;
        document.body.append(capa);
        cuadro = capa.querySelector('.tutorial-cuadro');
        foco = capa.querySelector('.tutorial-foco');
        sombras = capa.querySelectorAll('.tutorial-sombra');
        capa.addEventListener('pointerdown', e => e.stopPropagation());
        capa.addEventListener('click', e => e.stopPropagation());
        cuadro.querySelector('.tutorial-omitir').onclick = () => terminar('omitido');
        cuadro.querySelector('.tutorial-siguiente').onclick = () => {
            if (indice === pasos.length - 1) terminar('completado');
            else { indice++; mostrar(); }
        };
        document.addEventListener('keydown', teclado, true);
        window.addEventListener('resize', posicionar);
        mostrar();
    }
    abrir.addEventListener('click', iniciar);
    if (constructor.dataset.tutorialVisto !== 'true' && !leer()) iniciar();
})();
