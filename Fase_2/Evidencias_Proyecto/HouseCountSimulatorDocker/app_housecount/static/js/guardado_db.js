// --- 1. FUNCIÓN DE GUARDADO ---
async function procesarGuardado(objetos, camera, controles, costoTotal, miEscena, miRenderer, proyectoId = null, proyectoNombre = "") {
    if (!objetos || objetos.length <= 1) {
        await DialogoUI.alert("La escena está vacía. Añade elementos antes de guardar.");
        return;
    }

    let nombreProyecto = proyectoNombre;

    // NUEVA LÓGICA: Si existe ID, solo se actualiza. Si no existe, se crea uno nuevo.
    if (proyectoId) {
        const confirmarActualizacion = await DialogoUI.confirm(`Actualmente estás editando "${proyectoNombre}".\n\n¿Deseas actualizar y sobrescribir este diseño con los nuevos cambios?`);
        
        // Si el usuario hace clic en "Cancelar", detenemos el proceso de guardado.
        if (!confirmarActualizacion) {
            return; 
        }
    } else {
        // Si es un proyecto completamente nuevo (proyectoId es null)
        nombreProyecto = await DialogoUI.prompt("Nombre para este nuevo proyecto:");
        if (!nombreProyecto) return;
    }

    // Tomar fotografía de la escena
    let capturaBase64 = null;
    if (miEscena && miRenderer) {
        miRenderer.render(miEscena, camera); 
        capturaBase64 = miRenderer.domElement.toDataURL("image/png");
    }

    const datosEscena = [];
    for (let i = 1; i < objetos.length; i++) {
        const obj = objetos[i];
        datosEscena.push({
            posX: obj.position.x, posY: obj.position.y, posZ: obj.position.z,
            rotY: obj.rotation.y, escalaX: obj.scale.x, escalaY: obj.scale.y, escalaZ: obj.scale.z,
            precio: obj.userData.precio || 0, tipo: obj.userData.tipo || "material",
            url3D: obj.userData.url3D || null, textura: obj.userData.textura || "concreto",
            nombre: obj.userData.nombre || "Bloque"
        });
    }

    const payload = {
        proyecto_id: proyectoId, 
        nombre_proyecto: nombreProyecto,
        costo_total: costoTotal,
        datos_escena: datosEscena,
        datos_camara: {
            posX: camera.position.x, posY: camera.position.y, posZ: camera.position.z,
            targetX: controles.target.x, targetY: controles.target.y, targetZ: controles.target.z
        },
        captura_base64: capturaBase64 
    };

    try {
        const response = await fetch('/api/guardar-diseno/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': obtenerCookieCSRF('csrftoken') 
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (response.ok && data.estado === 'exito') {
            await DialogoUI.alert("¡Proyecto guardado con éxito!");
        } else {
            await DialogoUI.alert("Error al guardar: " + data.mensaje);
        }
    } catch (err) {
        console.error("Error de red al guardar:", err);
    }
}

// --- 2. FUNCIÓN PARA OBTENER DISEÑOS Y DIBUJAR TARJETAS ---
async function cargarDisenosUsuario(scene, objetos, camera, controles, callbackActualizarUI) {
    try {
        const response = await fetch('/api/obtener-disenos/');
        const data = await response.json();

        if (!response.ok || !data.disenos || data.disenos.length === 0) {
            await DialogoUI.alert("Aún no tienes proyectos guardados.");
            return;
        }

        const modal = document.getElementById('modal-mis-disenos');
        const grid = document.getElementById('grid-disenos');
        grid.innerHTML = ''; 

        modal.style.position = 'fixed';
        modal.style.zIndex = '999999';
        modal.style.pointerEvents = 'auto';

        data.disenos.forEach(proyecto => {
            const card = document.createElement('div');
            card.className = 'tarjeta-diseno';
            
            card.style.cursor = 'pointer'; 
            card.style.pointerEvents = 'auto'; 
            card.style.position = 'relative';
            card.style.zIndex = '1000000';     

            const imgUrl = proyecto.imagen_url ? proyecto.imagen_url : 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='; 
            const precioFormateado = Number(proyecto.costo_total).toLocaleString('es-CL');

            card.innerHTML = `
                <div class="btn-eliminar-diseno" title="Eliminar diseño">🗑️</div>
                <img src="${imgUrl}" alt="Diseño: ${proyecto.nombre}">
                <div class="tarjeta-info">
                    <h3>${proyecto.nombre}</h3>
                    <p>🗓 ${proyecto.fecha}</p>
                    <p class="precio-tarjeta">💰 $${precioFormateado}</p>
                </div>
            `;

            const btnEliminar = card.querySelector('.btn-eliminar-diseno');
            btnEliminar.onclick = async (e) => {
                e.stopPropagation(); 
                const confirmar = await DialogoUI.confirm(`¿Estás seguro de que deseas eliminar permanentemente el diseño "${proyecto.nombre}"?`);
                if (confirmar) {
                    await eliminarDisenoBD(proyecto.id, card); 
                }
            };

            card.onclick = (e) => {
                e.stopPropagation(); 
                modal.style.display = 'none';
                ejecutarCargaEscena3D(proyecto, scene, objetos, camera, controles, callbackActualizarUI);
            };

            grid.appendChild(card);
        });

        modal.style.display = 'block';

    } catch (err) {
        console.error("Error al cargar la galería de proyectos:", err);
    }
}

async function eliminarDisenoBD(proyectoId, tarjetaHtml) {
    try {
        const response = await fetch('/api/eliminar-diseno/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': obtenerCookieCSRF('csrftoken') 
            },
            body: JSON.stringify({ proyecto_id: proyectoId })
        });

        const data = await response.json();
        if (response.ok && data.estado === 'exito') {
            tarjetaHtml.style.transition = "all 0.3s";
            tarjetaHtml.style.opacity = "0";
            tarjetaHtml.style.transform = "scale(0.8)";
            setTimeout(() => tarjetaHtml.remove(), 300); 
        } else {
            await DialogoUI.alert("Error al eliminar: " + data.mensaje);
        }
    } catch (error) {
        console.error("Error de red al eliminar:", error);
    }
}

// --- 3. RECONSTRUCCIÓN 3D PARA SEGUIR EDITANDO ---
async function ejecutarCargaEscena3D(proyecto, scene, objetos, camera, controles, callbackActualizarUI) {
    let datosEscena = typeof proyecto.datos_escena === 'string' ? JSON.parse(proyecto.datos_escena) : proyecto.datos_escena;

    for (let i = objetos.length - 1; i >= 1; i--) {
        scene.remove(objetos[i]);
    }
    objetos.length = 1; 
    let nuevoCostoTotal = 0;

    const loader = new THREE.GLTFLoader();
    const dracoLoader = new THREE.DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    loader.setDRACOLoader(dracoLoader);

    const promesas = datosEscena.map((item) => {
        nuevoCostoTotal += Number(item.precio || 0);

        return new Promise((resolve) => {
            if (item.url3D) {
                loader.load(
                    item.url3D, 
                    (gltf) => {
                        const modelo = gltf.scene;
                        const boxOriginal = new THREE.Box3().setFromObject(modelo);
                        const sizeOriginal = boxOriginal.getSize(new THREE.Vector3());
                        const esHabitacion = item.tipo === 'habitacion';
                        const maxDimension = Math.max(sizeOriginal.x, sizeOriginal.z);
                        
                        if (maxDimension > 0) {
                            const escalaBase = (esHabitacion ? 200 : 50) / maxDimension;
                            const escalaFinal = escalaBase * (item.escalaX || 1.0); 
                            modelo.scale.set(escalaFinal, escalaFinal, escalaFinal);
                            modelo.updateMatrixWorld(true);
                        }

                        const boxEscalado = new THREE.Box3().setFromObject(modelo);
                        modelo.position.y -= boxEscalado.min.y;

                        const grupo = new THREE.Group();
                        grupo.add(modelo);
                        grupo.position.set(item.posX, item.posY, item.posZ);
                        grupo.rotation.y = item.rotY || 0;
                        
                        grupo.userData = {
                            precio: item.precio || 0, tipo: item.tipo || "material",
                            url3D: item.url3D, textura: item.textura || "concreto",
                            nombre: item.nombre || "Modelo 3D", escala: item.escalaX || 1.0
                        };

                        scene.add(grupo);
                        objetos.push(grupo); 
                        resolve();
                    },
                    undefined,
                    (error) => { console.error("Error al cargar modelo:", error); resolve(); }
                );
            } else {
                const isHab = item.tipo === 'habitacion';
                const geo = new THREE.BoxGeometry(isHab ? 200 : 50, isHab ? 100 : 50, isHab ? 200 : 50);
                let colorBase = 0x7f8c8d; 
                if (item.textura === 'madera') colorBase = 0x8b5a2b;
                if (item.textura === 'ladrillo') colorBase = 0xb22222;

                const mat = new THREE.MeshLambertMaterial({ color: colorBase }); 
                const malla = new THREE.Mesh(geo, mat);
                malla.position.set(item.posX, item.posY, item.posZ);
                malla.rotation.y = item.rotY || 0;
                
                const esc = item.escalaX || 1.0;
                malla.scale.set(esc, esc, esc);
                
                malla.userData = { 
                    precio: item.precio, tipo: item.tipo, url3D: null, 
                    textura: item.textura, nombre: item.nombre, escala: esc 
                };
                
                scene.add(malla);
                objetos.push(malla); 
                resolve();
            }
        });
    });

    await Promise.all(promesas);

    if (proyecto.datos_camara) {
        let cam = typeof proyecto.datos_camara === 'string' ? JSON.parse(proyecto.datos_camara) : proyecto.datos_camara;
        camera.position.set(cam.posX, cam.posY, cam.posZ);
        controles.target.set(cam.targetX, cam.targetY, cam.targetZ);
        controles.update();
    }

    if (callbackActualizarUI) {
        callbackActualizarUI(nuevoCostoTotal, proyecto.id, proyecto.nombre);
    }
    
    if (typeof window.calcularYMostrarPerimetro === 'function') {
        window.calcularYMostrarPerimetro();
    }
}

// --- 4. HELPERS Y CERRADO DE MODAL ---
function obtenerCookieCSRF(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

document.addEventListener("click", (e) => {
    const modal = document.getElementById('modal-mis-disenos');
    if (!modal) return;

    if (
        e.target.id === 'btn-cerrar-modal' || 
        e.target.classList.contains('close') || 
        e.target.innerText.trim() === '×' || 
        e.target.innerText.trim() === 'x' ||
        e.target.innerText.trim() === 'X'
    ) {
        modal.style.display = "none";
    }

    if (e.target === modal) {
        modal.style.display = "none";
    }
});

function togglePanelDerecho() {
    const panel = document.querySelector('.panel-superior-derecho');
    const btn = document.getElementById('btn-toggle-panel-der');
    
    panel.classList.toggle('colapsado');
    
    if (panel.classList.contains('colapsado')) {
        btn.innerHTML = '▼ Mostrar Detalles';
    } else {
        btn.innerHTML = '▲ Ocultar Detalles';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const panel = document.querySelector('.panel-superior-derecho');
    const btn = document.getElementById('btn-toggle-panel-der');
    
    if (panel && btn) {
        panel.classList.add('colapsado');
        btn.innerHTML = '▼ Mostrar Detalles';
    }
});