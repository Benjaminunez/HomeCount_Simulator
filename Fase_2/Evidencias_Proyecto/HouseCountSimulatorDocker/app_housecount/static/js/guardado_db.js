// --- 1. FUNCIÓN DE GUARDADO ---
async function procesarGuardado(objetos, camera, controles, costoTotal, miEscena, miRenderer, proyectoId = null, proyectoNombre = "", esPrefabricada = false) {
    if (!objetos || objetos.length <= 1) {
        await DialogoUI.alert("La escena está vacía. Añade elementos antes de guardar.");
        return { exito: false };
    }

    let nombreProyecto = proyectoNombre;

    // 1. Validar nombre o actualización del diseño
    if (proyectoId) {
        const confirmarActualizacion = await DialogoUI.confirm(`Actualmente estás editando "${proyectoNombre}".\n\n¿Deseas actualizar y sobrescribir este diseño con los nuevos cambios?`);
        if (!confirmarActualizacion) return { exito: false }; 
    } else {
        nombreProyecto = await DialogoUI.prompt("Nombre para este nuevo proyecto:");
        if (!nombreProyecto) return { exito: false };
    }

    // 2. NUEVO: Pedir descripción SOLO si es modelo público (prefabricada)
    let descripcionPrefabricada = "";
    if (esPrefabricada) {
        descripcionPrefabricada = await DialogoUI.prompt(
            "Ingresa una descripción para el catálogo público (Opcional):", 
            "Ej: Casa compacta de 2 habitaciones, ideal para terrenos pequeños..."
        );
        
        // Si el usuario presiona "Cancelar" en el prompt de la descripción, detenemos el guardado.
        // Si quieres que no se cancele al darle a 'Cancelar', borra esta línea.
        if (descripcionPrefabricada === null) return { exito: false };
    }

    // 3. Captura de pantalla del modelo
    let capturaBase64 = null;
    if (miEscena && miRenderer) {
        miRenderer.render(miEscena, camera); 
        capturaBase64 = miRenderer.domElement.toDataURL("image/png");
    }

    // 4. Mapeo de la escena 3D
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

    // 5. Construcción del Payload final
    const payload = {
        proyecto_id: proyectoId, 
        nombre_proyecto: nombreProyecto,
        descripcion: descripcionPrefabricada, // <--- Se envía a Django
        costo_total: costoTotal,
        datos_escena: datosEscena,
        datos_camara: {
            posX: camera.position.x, posY: camera.position.y, posZ: camera.position.z,
            targetX: controles.target.x, targetY: controles.target.y, targetZ: controles.target.z
        },
        captura_base64: capturaBase64,
        es_prefabricada: esPrefabricada 
    };

    // 6. Envío al servidor
    try {
        const response = await fetch('/api/guardar-diseno/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': typeof obtenerCookieCSRF === 'function' ? obtenerCookieCSRF('csrftoken') : ''
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (response.ok && data.estado === 'exito') {
            await DialogoUI.alert("¡Diseño guardado con éxito!");
            return { exito: true, id: data.id, nombre: nombreProyecto };
        } else {
            await DialogoUI.alert("Error al guardar: " + data.mensaje);
            return { exito: false };
        }
    } catch (err) {
        console.error("Error de red al guardar:", err);
        return { exito: false };
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

        const timestamp = new Date().getTime();
        const imgUrl = proyecto.imagen_url 
            ? `${proyecto.imagen_url}?v=${timestamp}` 
            : 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';            
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
                    
                    // Si el usuario eliminó el proyecto que estaba editando en ese momento
                    if (typeof proyectoCargadoId !== 'undefined' && proyectoCargadoId === proyecto.id) {
                        proyectoCargadoId = null;
                        proyectoCargadoNombre = "";
                        if (typeof actualizarNombreInterfaz === 'function') actualizarNombreInterfaz("");
                    }
                }
            };

            card.onclick = (e) => {
                e.stopPropagation(); 
                modal.style.display = 'none';
                localStorage.removeItem('proyecto_homecount');
                localStorage.removeItem('camara_homecount');
                localStorage.setItem('proyecto_hc_id', proyecto.id);
                localStorage.setItem('proyecto_hc_nombre', proyecto.nombre);
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

async function cargarCatalogoPrefabricadas(scene, objetos, camera, controles, callbackActualizarUI) {
    try {
        const response = await fetch('/api/obtener-casas-prefabricadas/');
        const data = await response.json();

        if (!response.ok || !data.disenos || data.disenos.length === 0) {
            await DialogoUI.alert("Actualmente no hay casas prefabricadas en el catálogo público.");
            return;
        }

        const modal = document.getElementById('modal-mis-disenos');
        const grid = document.getElementById('grid-disenos');
        
        // Cambiamos el título temporalmente para que quede claro que es el catálogo
        const headerTitulo = modal.querySelector('.modal-header h2');
        if (headerTitulo) headerTitulo.textContent = 'Catálogo de Casas Prefabricadas';
        
        grid.innerHTML = ''; 
        modal.style.display = 'block';
        modal.style.position = 'fixed';
        modal.style.zIndex = '999999';
        modal.style.pointerEvents = 'auto';

        data.disenos.forEach(proyecto => {
            const card = document.createElement('div');
            card.className = 'tarjeta-diseno';
            card.style.cursor = 'pointer'; 
            card.style.position = 'relative';

            const imgUrl = proyecto.imagen_url 
                ? proyecto.imagen_url
                : 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';            
           const costoSeguro = Number(proyecto.costo_total) || 0;
            
            // Las tarjetas del catálogo público no tienen botón de eliminar (solo el admin podría hacerlo desde Django Admin)
            card.innerHTML = `
                <img src="${imgUrl}" alt="Modelo: ${proyecto.nombre}">
                <div class="tarjeta-info">
                    <h3>${proyecto.nombre}</h3>
                    <p>📐 ${proyecto.area_cuadrada} m²</p>
                    <p class="precio-tarjeta">💰 $${costoSeguro} CLP</p>
                </div>
            `;

            // Al hacer clic, se carga el diseño público en la escena
            card.onclick = (e) => {
                e.stopPropagation(); 
                modal.style.display = 'none';
                
                // Restablecemos el título del modal a su original
                if (headerTitulo) headerTitulo.textContent = 'Mis Diseños Guardados';

                // Llamamos a la misma función de reconstrucción (reutilizamos la lógica)
                // Se envía "null" en el ID para que, si el usuario decide guardar una modificación, se guarde como su PROYECTO PERSONAL nuevo y no intente sobrescribir el público.
                const proyectoCopia = {...proyecto, id: null}; 
                ejecutarCargaEscena3D(proyectoCopia, scene, objetos, camera, controles, callbackActualizarUI);
            };

            grid.appendChild(card);
        });

    } catch (err) {
        console.error("Error al cargar el catálogo de casas prefabricadas:", err);
    }
}

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
