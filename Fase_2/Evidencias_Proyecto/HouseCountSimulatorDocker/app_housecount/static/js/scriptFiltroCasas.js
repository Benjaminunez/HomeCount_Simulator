document.addEventListener("DOMContentLoaded", function() {
    // 1. Mostrar / Ocultar todo el panel lateral con el botón "Ordenar y filtrar"
    const btnToggle = document.getElementById("btn-toggle-filtros");
    const panelFiltros = document.getElementById("panel-filtros");

    if (btnToggle && panelFiltros) {
        // Mantener abierto el panel si el usuario ya aplicó un filtro (parámetros en la URL)
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.toString().length > 0) {
            panelFiltros.style.display = "block";
        }

        btnToggle.addEventListener("click", function() {
            if (panelFiltros.style.display === "none" || panelFiltros.style.display === "") {
                panelFiltros.style.display = "block";
            } else {
                panelFiltros.style.display = "none";
            }
        });
    }

    // 2. Acordeón para retraer y contraer cada sección (Especificaciones, Habitaciones, Baños)
    const titulosSeccion = document.querySelectorAll(".sidebar-titulo");

    titulosSeccion.forEach(function(titulo) {
        titulo.addEventListener("click", function() {
            // Encuentra la sección contenedora
            const seccion = this.closest(".sidebar-seccion");
            // Alterna la clase 'colapsado'
            seccion.classList.toggle("colapsado");
        });
    });
});