document.addEventListener('DOMContentLoaded', function() {
    const avatarInput = document.getElementById('id_avatar_input');
    const base64Input = document.getElementById('id_avatar_base64'); // Input oculto
    const previewImg = document.getElementById('avatar-preview');
    const defaultIcon = document.getElementById('default-avatar-icon');
    const labelContainer = document.querySelector('.avatar-preview-label');
    const textoUpload = document.getElementById('texto-upload');

    // 1. RESTAURAR: Si la página recargó por un error y hay una imagen guardada
    // Se verifica que base64Input exista y contenga información válida
    if (base64Input && base64Input.value.includes('base64,')) {
        previewImg.src = base64Input.value;
        previewImg.style.display = 'block';
        defaultIcon.style.display = 'none';
        
        // Clases y textos del nuevo diseño
        labelContainer.classList.add('has-file');
        if (textoUpload) textoUpload.textContent = '¡Imagen seleccionada!';
    }

    // 2. NUEVA SUBIDA: Cuando el usuario elige una foto nueva
    if (avatarInput) {
        avatarInput.addEventListener('change', function(event) {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    // Mostrar miniatura
                    previewImg.src = e.target.result;
                    previewImg.style.display = 'block';
                    defaultIcon.style.display = 'none';
                    
                    // Clases y textos del nuevo diseño
                    labelContainer.classList.add('has-file');
                    if (textoUpload) textoUpload.textContent = '¡Imagen seleccionada!';
                    
                    // Guardar en el input oculto como texto para sobrevivir recargas
                    if (base64Input) base64Input.value = e.target.result;
                }
                reader.readAsDataURL(file);
            } else {
                // Si el usuario cancela la selección, limpiamos todo
                previewImg.src = '';
                previewImg.style.display = 'none';
                defaultIcon.style.display = 'block';
                
                // Restauramos el diseño a su estado original
                labelContainer.classList.remove('has-file');
                if (textoUpload) textoUpload.textContent = 'Subir foto de perfil';
                if (base64Input) base64Input.value = '';
            }
        });
    }

    // 3. AUTOCOMPLETAR PLACEHOLDERS: Poner nombre a los campos que genera Django
    const formInputs = document.querySelectorAll('.login-form input[type="text"], .login-form input[type="password"]');
    formInputs.forEach(input => {
        if (!input.placeholder) {
            // Capitaliza la primera letra y reemplaza los guiones bajos por espacios
            input.placeholder = input.name.charAt(0).toUpperCase() + input.name.slice(1).replace('_', ' ');
        }
    });
});