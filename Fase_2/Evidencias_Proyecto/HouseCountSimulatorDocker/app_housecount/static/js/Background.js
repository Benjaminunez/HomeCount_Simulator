document.addEventListener('DOMContentLoaded', function() {
    const card = document.querySelector('.login-card');
    if (!card) return;

    document.addEventListener('mousemove', function(e) {
        // 1. Calcular el centro de la tarjeta de login
        const cardRect = card.getBoundingClientRect();
        const cardCenterX = cardRect.left + (cardRect.width / 2);
        const cardCenterY = cardRect.top + (cardRect.height / 2);

        // 2. Calcular la distancia entre el cursor y la tarjeta
        const deltaX = e.clientX - cardCenterX;
        const deltaY = e.clientY - cardCenterY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        // Distancia máxima donde el efecto comienza a notarse
        const maxDistance = 700;

        if (distance < maxDistance) {
            // Intensidad de 0 (lejos) a 1 (justo encima)
            const proximity = 1 - (distance / maxDistance);
            
            // Limitamos la intensidad máxima al 35% para que el fondo no quede naranja chillón
            // y mantenga un aspecto oscuro y elegante.
            const intensity = proximity * 0.35; 
            
            // Interpolar entre el azul oscuro base rgb(26, 32, 44) y el naranja rgb(249, 115, 22)
            const red = 26 + (249 - 26) * intensity;
            const green = 32 + (115 - 32) * intensity;
            const blue = 44 + (22 - 44) * intensity;
            
            // Aplicar el nuevo color a todo el fondo
            document.body.style.setProperty('--bg-color', `rgb(${Math.round(red)}, ${Math.round(green)}, ${Math.round(blue)})`);

            // Brillo naranja en la sombra de la tarjeta
            const glowIntensity = proximity * 0.6;
            card.style.setProperty('--card-glow', `rgba(249, 115, 22, ${glowIntensity})`);

        } else {
            // Si el cursor está muy lejos, forzar los colores originales
            document.body.style.setProperty('--bg-color', 'rgb(26, 32, 44)');
            card.style.setProperty('--card-glow', 'rgba(0, 0, 0, 0.3)');
        }
    });
});