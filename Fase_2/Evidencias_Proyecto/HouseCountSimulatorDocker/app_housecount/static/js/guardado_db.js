// --- 1. FUNCIÓN DE GUARDADO ---
async function procesarGuardado(objetos, camera, controles, costoTotal, miEscena, miRenderer, proyectoId = null, proyectoNombre = "") {
    if (!objetos || objetos.length <= 1) {
        alert("La escena está vacía. Añade elementos antes de guardar.");
        return;
    }

    let nombreProyecto = proyectoNombre;

    // Lógica para Sobrescribir vs Guardar Nuevo
    if (proyectoId) {
        const sobreescribir = confirm(`Actualmente estás editando "${proyectoNombre}".\n\n¿Deseas guardar los cambios en este mismo diseño?\n(Haz clic en "Cancelar" para guardarlo como un diseño totalmente nuevo)`);
        
        if (!sobreescribir) {
            nombreProyecto = prompt("Ingresa un nombre para la nueva copia del proyecto:");
            if (!nombreProyecto) return;
            proyectoId = null; // Al ponerlo en null, forzamos al servidor a crear uno nuevo
        }
    } else {
        nombreProyecto = prompt("Nombre para este proyecto:");
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
        proyecto_id: proyectoId, // 🔑 ENVIAMOS EL ID AL SERVIDOR
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
            alert("¡Proyecto guardado con éxito!");
        } else {
            alert("Error al guardar: " + data.mensaje);
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
            alert("Aún no tienes proyectos guardados.");
            return;
        }

        const modal = document.getElementById('modal-mis-disenos');
        const grid = document.getElementById('grid-disenos');
        grid.innerHTML = ''; 

        // 🔥 MAGIA ANTI-BLOQUEO: Forzamos que el modal esté por encima del 3D y reciba clics
        modal.style.position = 'fixed';
        modal.style.zIndex = '999999';
        modal.style.pointerEvents = 'auto';

        data.disenos.forEach(proyecto => {
            const card = document.createElement('div');
            card.className = 'tarjeta-diseno';
            
            // 🔥 PROTECCIÓN DE LA TARJETA
            card.style.cursor = 'pointer'; 
            card.style.pointerEvents = 'auto'; // Forzamos que el ratón la detecte
            card.style.position = 'relative';
            card.style.zIndex = '1000000';     // Aún más arriba que el modal

            const imgUrl = proyecto.imagen_url ? proyecto.imagen_url : 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='; 
            const precioFormateado = Number(proyecto.costo_total).toLocaleString('es-CL');

            card.innerHTML = `
                <img src="${imgUrl}" alt="Diseño: ${proyecto.nombre}">
                <div class="tarjeta-info">
                    <h3>${proyecto.nombre}</h3>
                    <p>🗓 ${proyecto.fecha}</p>
                    <p class="precio-tarjeta">💰 $${precioFormateado}</p>
                </div>
            `;

            // Asignamos el clic protegiéndolo de Three.js
            card.onclick = (e) => {
                e.stopPropagation(); // 🛡️ Evita que el clic traspase hacia el lienzo 3D
                console.log("✅ Clic exitoso. Cargando proyecto:", proyecto.nombre);
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

// Escuchamos absolutamente todos los clics en la pantalla
document.addEventListener("click", (e) => {
    const modal = document.getElementById('modal-mis-disenos');
    if (!modal) return;

    // 1. Cerrar si hace clic en CUALQUIER botón que parezca una "X" o tenga la clase close
    if (
        e.target.id === 'btn-cerrar-modal' || 
        e.target.classList.contains('close') || 
        e.target.innerText.trim() === '×' || 
        e.target.innerText.trim() === 'x' ||
        e.target.innerText.trim() === 'X'
    ) {
        console.log("Clic detectado en el botón de cerrar");
        modal.style.display = "none";
    }

    // 2. Cerrar si hace clic en la zona gris (fuera de la caja blanca)
    if (e.target === modal) {
        console.log("Clic detectado fuera del modal");
        modal.style.display = "none";
    }
});