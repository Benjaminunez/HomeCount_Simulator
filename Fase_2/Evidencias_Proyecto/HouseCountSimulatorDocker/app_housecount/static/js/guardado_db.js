async function procesarGuardado(objetos, camera, controles, costoTotal) {
    if (!objetos || objetos.length <= 1) {
        alert("La escena está vacía. Añade elementos antes de guardar.");
        return;
    }

    const nombreProyecto = prompt("Nombre para este proyecto:");
    if (!nombreProyecto) return;

    const datosEscena = [];

    // Recorrer objetos (índice 1 en adelante, saltando el plano del suelo)
    for (let i = 1; i < objetos.length; i++) {
        const obj = objetos[i];
        
        datosEscena.push({
            posX: obj.position.x,
            posY: obj.position.y,
            posZ: obj.position.z,
            rotY: obj.rotation.y,
            // Guardamos la escala real del objeto
            escalaX: obj.scale.x,
            escalaY: obj.scale.y,
            escalaZ: obj.scale.z,
            precio: obj.userData.precio || 0,
            tipo: obj.userData.tipo || "material",
            url3D: obj.userData.url3D || null,
            textura: obj.userData.textura || "concreto",
            nombre: obj.userData.nombre || "Bloque"
        });
    }

    const payload = {
        nombre_proyecto: nombreProyecto,
        costo_total: costoTotal,
        datos_escena: datosEscena,
        datos_camara: {
            posX: camera.position.x, posY: camera.position.y, posZ: camera.position.z,
            targetX: controles.target.x, targetY: controles.target.y, targetZ: controles.target.z
        }
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

// Función para descargar y armar los datos desde Django
async function cargarDisenosUsuario(scene, objetos, camera, controles, callbackActualizarUI) {
    try {
        const response = await fetch('/api/obtener-disenos/');
        const data = await response.json();

        if (!response.ok || !data.disenos || data.disenos.length === 0) {
            alert("No hay proyectos guardados.");
            return;
        }

        // Construir menú simple para seleccionar
        let menu = "Selecciona el ID del proyecto a cargar:\n\n";
        data.disenos.forEach(d => {
            menu += `ID: ${d.id} | ${d.nombre} ($${Number(d.costo_total).toLocaleString('es-CL')})\n`;
        });
        
        const idSeleccionado = prompt(menu);
        if (!idSeleccionado) return;

        const proyecto = data.disenos.find(d => String(d.id) === String(idSeleccionado));
        if (!proyecto) return;

        // Parsear JSON
        let datosEscena = typeof proyecto.datos_escena === 'string' 
            ? JSON.parse(proyecto.datos_escena) 
            : proyecto.datos_escena;

        // 1. Limpiar escena actual (conservando el plano base en índice 0)
        for (let i = objetos.length - 1; i >= 1; i--) {
            scene.remove(objetos[i]);
        }
        objetos.length = 1;
        let nuevoCostoTotal = 0;

        // 2. Instanciar el loader
        const loader = new THREE.GLTFLoader();

        // 3. Cargar todos los objetos en paralelo mediante promesas
        const promesas = datosEscena.map((item) => {
            nuevoCostoTotal += Number(item.precio || 0);

            return new Promise((resolve) => {
                if (item.url3D) {
                    loader.load(
                        item.url3D, 
                        (gltf) => {
                            const modelo = gltf.scene;

                            // 1. Posicionamiento y rotación
                            modelo.position.set(item.posX, item.posY, item.posZ);
                            modelo.rotation.y = item.rotY || 0;

                            // 2. Medir dimensiones originales del archivo .glb en bruto
                            const boxOriginal = new THREE.Box3().setFromObject(modelo);
                            const sizeOriginal = boxOriginal.getSize(new THREE.Vector3());

                            // 3. Evaluar la escala a aplicar
                            // Si la escala almacenada es 1 (o menor a 2), forzamos el redimensionado según la grilla
                            if (!item.escalaX || item.escalaX === 1) {
                                const esHabitacion = item.tipo === 'habitacion';
                                const anchoDeseado = esHabitacion ? 200 : 50;
                                const altoDeseado = esHabitacion ? 100 : 50;
                                const profundoDeseado = esHabitacion ? 200 : 50;

                                // Calcular factor de escala para ajustar al tamaño de la casilla
                                const escalaX = anchoDeseado / (sizeOriginal.x || 1);
                                const escalaY = altoDeseado / (sizeOriginal.y || 1);
                                const escalaZ = profundoDeseado / (sizeOriginal.z || 1);

                                modelo.scale.set(escalaX, escalaY, escalaZ);
                            } else {
                                // Si en el futuro guardas una escala distinta a 1, se respeta la guardada
                                modelo.scale.set(item.escalaX, item.escalaY, item.escalaZ);
                            }

                            // 4. Forzar actualización de transformaciones en el modelo
                            modelo.updateMatrixWorld(true);

                            // 5. Ajustar altura Y si el punto de pivote no está en la base
                            const boxFinal = new THREE.Box3().setFromObject(modelo);
                            if (boxFinal.min.y < 0) {
                                modelo.position.y -= boxFinal.min.y;
                            }

                            // 6. Restaurar metadatos en userData
                            modelo.userData = {
                                precio: item.precio || 0,
                                tipo: item.tipo || "material",
                                url3D: item.url3D,
                                textura: item.textura || "concreto",
                                nombre: item.nombre || "Modelo 3D"
                            };

                            scene.add(modelo);
                            objetos.push(modelo);
                            
                            resolve();
                        },
                        undefined,
                        (error) => {
                            console.error("Error al cargar modelo 3D:", item.url3D, error);
                            resolve(); 
                        }
                    );
                } else {
                    // Cargar bloque básico nativo
                    const isHab = item.tipo === 'habitacion';
                    const geo = new THREE.BoxGeometry(isHab ? 200 : 50, isHab ? 100 : 50, isHab ? 200 : 50);
                    const mat = new THREE.MeshLambertMaterial({ color: 0x7f8c8d }); 
                    
                    const malla = new THREE.Mesh(geo, mat);
                    malla.position.set(item.posX, item.posY, item.posZ);
                    malla.rotation.y = item.rotY || 0;
                    malla.userData = { 
                        precio: item.precio, 
                        tipo: item.tipo, 
                        url3D: null, 
                        textura: item.textura, 
                        nombre: item.nombre 
                    };
                    
                    scene.add(malla);
                    objetos.push(malla);
                    resolve();
                }
            });
        });

        await Promise.all(promesas);

        // 4. Restaurar la cámara
        if (proyecto.datos_camara) {
            let cam = typeof proyecto.datos_camara === 'string' ? JSON.parse(proyecto.datos_camara) : proyecto.datos_camara;
            camera.position.set(cam.posX, cam.posY, cam.posZ);
            controles.target.set(cam.targetX, cam.targetY, cam.targetZ);
            controles.update();
        }

        // 5. Notificar al script principal que debe actualizar la interfaz
        if (callbackActualizarUI) {
            callbackActualizarUI(nuevoCostoTotal);
        }

    } catch (err) {
        console.error("Error al cargar proyecto:", err);
    }
}

// Helper para obtener la cookie CSRF
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