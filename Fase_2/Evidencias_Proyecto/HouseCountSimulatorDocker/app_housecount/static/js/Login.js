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