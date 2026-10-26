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


// logica para modal de edición de usuario dentro del header base realizado
document.addEventListener('DOMContentLoaded', function() {
    // Referencias al DOM para el modal de perfil
    const btnEditarPerfil = document.getElementById('btn-editar-perfil');
    const modalPerfil = document.getElementById('modal-editar-perfil');
    const btnCerrarPerfil = document.getElementById('cerrar-modal-perfil');
    const inputAvatar = document.getElementById('input-avatar');
    const previewImagen = document.getElementById('preview-imagen');
    const fileNameText = document.getElementById('file-name-text');
    const formPerfil = document.getElementById('form-editar-perfil');
    const modalConfirmacion = document.getElementById('modal-confirmacion-perfil');
    const btnConfirmar = document.getElementById('btn-confirmar-cambios');
    const btnCancelar = document.getElementById('btn-cancelar-cambios');

    // 1. Abrir el modal
    if (btnEditarPerfil && modalPerfil) {
        btnEditarPerfil.addEventListener('click', function(e) {
            e.preventDefault(); // Evita que salte hacia arriba si el href es "#"
            modalPerfil.style.display = 'flex';
        });
    }

    // 2. Cerrar el modal con la X
    if (btnCerrarPerfil && modalPerfil) {
        btnCerrarPerfil.addEventListener('click', function() {
            modalPerfil.style.display = 'none';
        });

        // 3. Cerrar el modal haciendo clic afuera de la caja blanca
        window.addEventListener('click', function(e) {
            if (e.target === modalPerfil) {
                modalPerfil.style.display = 'none';
            }
        });
    }
    if (inputAvatar && previewImagen) {
        inputAvatar.addEventListener('change', function(evento) {
            const archivo = evento.target.files[0];
            if (archivo) {
                // Cambia el texto inferior por el nombre del archivo
                fileNameText.textContent = archivo.name;
                
                // Lee la imagen y la muestra en el círculo
                const lector = new FileReader();
                lector.onload = function(e) {
                    previewImagen.src = e.target.result;
                }
                lector.readAsDataURL(archivo);
            }
        });
    }
    if (formPerfil && modalConfirmacion) {
        // 1. Interceptar el envío
        formPerfil.addEventListener('submit', function(e) {
            e.preventDefault(); // Detiene el envío automático
            modalConfirmacion.style.display = 'flex'; // Muestra nuestro modal
        });

        // 2. Si el usuario cancela
        if (btnCancelar) {
            btnCancelar.addEventListener('click', function() {
                modalConfirmacion.style.display = 'none'; // Oculta el cuadro de confirmación
            });
        }

        // 3. Si el usuario confirma
        if (btnConfirmar) {
            btnConfirmar.addEventListener('click', function() {
                formPerfil.submit(); // Ejecuta el envío real a Django
            });
        }
    }

});

