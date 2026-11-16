document.addEventListener('DOMContentLoaded', () => {
    // Selecciona todas las alertas modernas
    const mensajes = document.querySelectorAll('.alerta-moderna');
    
    if (mensajes.length > 0) {
        // Esperar 2.5 segundos (2500 milisegundos) antes de ocultarlos
        setTimeout(() => {
            mensajes.forEach(mensaje => {
                // Animación de desvanecimiento
                mensaje.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
                mensaje.style.opacity = '0';
                mensaje.style.transform = 'translateY(-10px)';
                
                // Eliminar el elemento padre (el contenedor) después de que termine la animación
                setTimeout(() => {
                    const contenedor = mensaje.closest('.contenedor-alertas');
                    mensaje.remove();
                    // Si el contenedor quedó vacío, lo borramos también para que no ocupe espacio
                    if (contenedor && contenedor.children.length === 0) {
                        contenedor.remove();
                    }
                }, 500);
            });
        }, 4000); 
    }
});

document.addEventListener('DOMContentLoaded', function() {
    // Buscar el input del nombre de usuario
    const usernameInput = document.querySelector('input[name="username"]') || document.getElementById('id_username');
    
    if (usernameInput) {
        // 1. Limpiar el valor al recargar la página (reemplaza "_" por espacios)
        if (usernameInput.value) {
            usernameInput.value = usernameInput.value.replace(/_/g, ' ');
        }

        // 2. Prevenir que el usuario escriba guiones bajos manualmente por error
        usernameInput.addEventListener('input', function() {
            if (this.value.includes('_')) {
                this.value = this.value.replace(/_/g, ' ');
            }
        });
    }
});