// ============================================
// SCRIPT PRINCIPAL - Modelo 1
// ============================================

// --- FUNCIONALIDAD 1: Presupuesto Dinámico Vinculado ---
const barra = document.getElementById('barra-presupuesto');
const valorPantalla = document.getElementById('valor-pantalla');
const presupuestoVinculado = document.getElementById('presupuesto-vinculado');
const presupuestoGuardado = localStorage.getItem('presupuesto');

function actualizarPresupuesto(valor) {
    const valorFormateado = new Intl.NumberFormat('es-CL').format(valor);

    if (valorPantalla) {
        valorPantalla.textContent = valorFormateado;
    }

    if (presupuestoVinculado) {
        presupuestoVinculado.textContent = valorFormateado;
    }
}

if (barra) {
    if (presupuestoGuardado) {
        barra.value = presupuestoGuardado;
    }

    actualizarPresupuesto(barra.value);

    barra.addEventListener('input', function() {
        localStorage.setItem('presupuesto', this.value);
        actualizarPresupuesto(this.value);
    });
} else {
    actualizarPresupuesto(presupuestoGuardado || '500000');
}

// --- FUNCIONALIDAD 2: Galería de Imágenes con Modal ---
const modal = document.getElementById('modal-imagen');
const imagenAmpliada = document.getElementById('imagen-ampliada');
const botonCerrar = document.querySelector('.cerrar-modal');
const espaciosImagen = document.querySelectorAll('.espacio-imagen');

// Abrir modal al hacer clic en una imagen
espaciosImagen.forEach(espacio => {
    espacio.addEventListener('click', function() {
        const img = this.querySelector('.imagen-galeria');
        
        if (img.getAttribute('src') && img.getAttribute('src') !== "") {
            modal.style.display = "flex";
            imagenAmpliada.src = img.src;
        }
    });
});

// Cerrar modal al hacer clic en la "X"
if (botonCerrar && modal) {
    botonCerrar.addEventListener('click', function() {
        modal.style.display = "none";
    });

    // Cerrar modal al hacer clic fuera del recuadro
    modal.addEventListener('click', function(evento) {
        if (evento.target === modal) {
            modal.style.display = "none";
        }
    });
}

// --- FUNCIONALIDAD 3: API de Correo (EmailJS) ---
const formulario = document.getElementById('formulario-contacto');
const mensajeEstado = document.getElementById('mensaje-estado');

if (formulario && typeof emailjs !== 'undefined') {
    emailjs.init("RPP6ZVaRqZIgtCPjZ");

    formulario.addEventListener('submit', function(evento) {
        evento.preventDefault(); 
        
        const boton = formulario.querySelector('button');
        boton.textContent = "Enviando...";

        // Usamos explícitamente la variable 'formulario' (no 'this')
        emailjs.sendForm('service_njorcvc', 'template_ox65m79', formulario)
            .then(function() {
                mensajeEstado.textContent = "¡Mensaje enviado con éxito! Te contactaremos pronto.";
                mensajeEstado.style.color = "green";
                formulario.reset(); 
                boton.textContent = "Enviar Mensaje";
            }, function(error) {
                mensajeEstado.textContent = "Hubo un error. Revisa la consola.";
                mensajeEstado.style.color = "red";
                boton.textContent = "Enviar Mensaje";
                console.log("Error detallado de EmailJS:", error);
            });
    });
}
// --- FUNCIONALIDAD 4: Calculadora de Materiales desde Cero ---
const inputMetros = document.getElementById('metros-cuadrados');
const contenedorResultado = document.getElementById('resultado-presupuesto');
const listaMateriales = document.getElementById('lista-materiales');
const costoTotalCalc = document.getElementById('costo-total-calc');
const mensajeDiferencia = document.getElementById('mensaje-diferencia');

function calcularMateriales() {
    // Si no hay metros cuadrados o es menor a 20, ocultar la lista
    const metros = parseFloat(inputMetros?.value);
    if (!metros || metros < 20) {
        if(contenedorResultado) contenedorResultado.style.display = "none";
        return;
    }

    // Precios referenciales por cada 1 metro cuadrado
    const costoPorM2 = {
        'Cemento, arena y gravilla (Cimientos)': 45000,
        'Estructura principal (Vigas, pilares)': 110000,
        'Tejas, zinc y cerchas (Techumbre)': 65000,
        'Clavos, tornillos y fijaciones': 12000,
        'Aislantes (Lana mineral, fieltro)': 25000,
        'Terminaciones (Pisos y revestimientos)': 90000
    };

    let totalEstimado = 0;
    listaMateriales.innerHTML = ""; // Limpiar lista anterior

    // Generar la lista dinámica
    for (const [material, precioUnitario] of Object.entries(costoPorM2)) {
        const costoItem = precioUnitario * metros;
        totalEstimado += costoItem;
        
        const li = document.createElement('li');
        li.innerHTML = `<span>${material}</span> <strong>$${new Intl.NumberFormat('es-CL').format(costoItem)}</strong>`;
        listaMateriales.appendChild(li);
    }

    costoTotalCalc.textContent = `$${new Intl.NumberFormat('es-CL').format(totalEstimado)}`;
    
    // CORRECCIÓN: Qué hacer si la barra está en otra página
    let presupuestoActual = 0;
    if (typeof barra !== 'undefined' && barra) {
        presupuestoActual = parseFloat(barra.value);
    } else {
        // Si no encuentra la barra, usamos el presupuesto base de 500.000
        presupuestoActual = 500000;
    }

    const diferencia = presupuestoActual - totalEstimado;

    // Generar el mensaje de alerta
    if (diferencia >= 0) {
        mensajeDiferencia.className = "alerta-presupuesto exito";
        mensajeDiferencia.innerHTML = `✅ ¡Excelente! Tu presupuesto cubre los materiales. Tienes un margen a favor de <strong>$${new Intl.NumberFormat('es-CL').format(diferencia)}</strong>.`;
    } else {
        mensajeDiferencia.className = "alerta-presupuesto error";
        mensajeDiferencia.innerHTML = `⚠️ Tu presupuesto es insuficiente. Te faltan <strong>$${new Intl.NumberFormat('es-CL').format(Math.abs(diferencia))}</strong> para cubrir los materiales base.`;
    }

    contenedorResultado.style.display = "block";
}

// Escuchar los eventos de forma segura
if (inputMetros) {
    inputMetros.addEventListener('input', calcularMateriales);
}
if (typeof barra !== 'undefined' && barra) {
    barra.addEventListener('input', calcularMateriales);
}

