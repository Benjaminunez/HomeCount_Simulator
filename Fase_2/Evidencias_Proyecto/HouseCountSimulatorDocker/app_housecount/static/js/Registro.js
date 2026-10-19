document.addEventListener('DOMContentLoaded', function() {
    const avatarInput = document.getElementById('id_avatar_input');
    const base64Input = document.getElementById('id_avatar_base64'); // Input oculto
    const previewImg = document.getElementById('avatar-preview');
    const defaultIcon = document.getElementById('default-avatar-icon');
    const labelContainer = document.querySelector('.avatar-preview-label');

    // 1. RESTAURAR: Si la página recargó por un error y hay una imagen guardada
    if (base64Input && base64Input.value.includes('base64,')) {
        previewImg.src = base64Input.value;
        previewImg.style.display = 'block';
        defaultIcon.style.display = 'none';
        labelContainer.classList.add('has-image');
    }

    // 2. NUEVA SUBIDA: Cuando el usuario elige una foto nueva
    if (avatarInput) {
        avatarInput.addEventListener('change', function(event) {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    // Mostrar preview
                    previewImg.src = e.target.result;
                    previewImg.style.display = 'block';
                    defaultIcon.style.display = 'none';
                    labelContainer.classList.add('has-image');
                    
                    // Guardar en el input oculto como texto para sobrevivir recargas
                    if (base64Input) base64Input.value = e.target.result;
                }
                reader.readAsDataURL(file);
            } else {
                // Si el usuario cancela la selección, limpiamos todo
                previewImg.src = '';
                previewImg.style.display = 'none';
                defaultIcon.style.display = 'block';
                labelContainer.classList.remove('has-image');
                if (base64Input) base64Input.value = '';
            }
        });
    }
});