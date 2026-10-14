document.addEventListener('DOMContentLoaded', function() {
    const btnPerfil = document.getElementById('btn-menu-perfil');
    const menuPerfil = document.getElementById('menu-desplegable-perfil');

    if (btnPerfil && menuPerfil) {
        // Mostrar/Ocultar el menú al hacer click en la píldora
        btnPerfil.addEventListener('click', function(e) {
            e.stopPropagation();
            menuPerfil.classList.toggle('mostrar');
        });

        // Cerrar el menú al hacer click en cualquier otra parte de la página
        document.addEventListener('click', function(e) {
            if (!menuPerfil.contains(e.target) && !btnPerfil.contains(e.target)) {
                menuPerfil.classList.remove('mostrar');
            }
        });
    }
});