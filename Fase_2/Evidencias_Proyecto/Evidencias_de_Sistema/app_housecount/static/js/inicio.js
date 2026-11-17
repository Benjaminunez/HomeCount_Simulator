document.addEventListener("DOMContentLoaded", function() {
    const reveals = document.querySelectorAll(".reveal");
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add("active");
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15, rootMargin: "0px 0px -50px 0px" });

    reveals.forEach(reveal => observer.observe(reveal));
});

// --- Lógica del Carrusel de imagenes inicial ---
let slideIndex = 1;
let intervaloCarrusel;

function iniciarCarrusel() {
    mostrarSlides(slideIndex);
    iniciarTemporizador();
}

function moverSlide(n) {
    mostrarSlides(slideIndex += n);
    reiniciarTemporizador();
}

function irASlide(n) {
    mostrarSlides(slideIndex = n);
    reiniciarTemporizador();
}

function mostrarSlides(n) {
    let slides = document.getElementsByClassName("carousel-slide");
    let dots = document.getElementsByClassName("dot");
    
    if (n > slides.length) { slideIndex = 1; }    
    if (n < 1) { slideIndex = slides.length; }
    
    // Quita la clase activa de todos
    for (let i = 0; i < slides.length; i++) {
        slides[i].classList.remove("active");  
    }
    for (let i = 0; i < dots.length; i++) {
        dots[i].classList.remove("active");
    }
    
    // Agrega la clase activa al slide actual
    if(slides[slideIndex-1] && dots[slideIndex-1]){
        slides[slideIndex-1].classList.add("active");  
        dots[slideIndex-1].classList.add("active");
    }
}

function iniciarTemporizador() {
    intervaloCarrusel = setInterval(function() {
        moverSlide(1);
    }, 6000); // Cambia automáticamente cada 6 segundos
}

function reiniciarTemporizador() {
    clearInterval(intervaloCarrusel);
    iniciarTemporizador();
}

// Iniciar cuando cargue la página
document.addEventListener("DOMContentLoaded", iniciarCarrusel);


document.addEventListener('DOMContentLoaded', () => {
    const btnModoOscuro = document.getElementById('btn-modo-oscuro');
    const body = document.body;

    // 1. Revisar si el usuario ya tenía el modo oscuro activado (guardado en LocalStorage)
    if (localStorage.getItem('modo-oscuro') === 'activado') {
        body.classList.add('tema-oscuro');
        if (btnModoOscuro) btnModoOscuro.textContent = '☀️'; // Cambia el icono al sol
    }

    // 2. Evento para alternar entre modos al hacer clic
    if (btnModoOscuro) {
        btnModoOscuro.addEventListener('click', () => {
            body.classList.toggle('tema-oscuro');
            
            // Guardar preferencia y cambiar el icono
            if (body.classList.contains('tema-oscuro')) {
                localStorage.setItem('modo-oscuro', 'activado');
                btnModoOscuro.textContent = '☀️';
            } else {
                localStorage.setItem('modo-oscuro', 'desactivado');
                btnModoOscuro.textContent = '🌙';
            }
        });
    }
});