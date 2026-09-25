// Esperar a que el DOM cargue
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('canvas-3d-container');
    if (!container) return;

    // Variables de presupuesto y estado
    let materialActual = 'madera';
    let nombreActual = 'Bloque de Madera'; 
    let precioActual = 15000;
    let costoTotal = 0;
    let modoConstruccion = 'material'; 
    let rotacionActual = 0; 
    let urlActual = null;          
    let texturaActual = 'concreto'; 
    const uiTotal = document.getElementById('total-3d');
    
    // Configurar materiales visuales de respaldo (Fallback)
    const texturas = {
        madera: new THREE.MeshLambertMaterial({ color: 0x8b5a2b }),
        ladrillo: new THREE.MeshLambertMaterial({ color: 0xb22222 }),
        concreto: new THREE.MeshLambertMaterial({ color: 0x7f8c8d })
    };

    // --- Tooltip Flotante para Eliminación ---
    let tooltip = document.getElementById('tooltip-eliminar');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'tooltip-eliminar';
        tooltip.style.position = 'fixed';
        tooltip.style.display = 'none';
        tooltip.style.backgroundColor = 'rgba(231, 76, 60, 0.95)';
        tooltip.style.color = 'white';
        tooltip.style.padding = '8px 12px';
        tooltip.style.borderRadius = '6px';
        tooltip.style.fontSize = '12px';
        tooltip.style.fontWeight = 'bold';
        tooltip.style.pointerEvents = 'none';
        tooltip.style.zIndex = '10000';
        tooltip.style.boxShadow = '0px 3px 8px rgba(0,0,0,0.3)';
        document.body.appendChild(tooltip);
    }

    // --- Tooltip Flotante para el Catálogo ---
    let tooltipCatalogo = document.getElementById('tooltip-catalogo');
    if (!tooltipCatalogo) {
        tooltipCatalogo = document.createElement('div');
        tooltipCatalogo.id = 'tooltip-catalogo';
        tooltipCatalogo.style.position = 'fixed';
        tooltipCatalogo.style.display = 'none';
        tooltipCatalogo.style.backgroundColor = '#2c3e50';
        tooltipCatalogo.style.color = 'white';
        tooltipCatalogo.style.padding = '8px 12px';
        tooltipCatalogo.style.borderRadius = '6px';
        tooltipCatalogo.style.fontSize = '13px';
        tooltipCatalogo.style.pointerEvents = 'none';
        tooltipCatalogo.style.zIndex = '10000';
        tooltipCatalogo.style.textAlign = 'center';
        tooltipCatalogo.style.boxShadow = '0px 4px 10px rgba(0,0,0,0.2)';
        tooltipCatalogo.style.transform = 'translateX(-50%)'; 
        document.body.appendChild(tooltipCatalogo);
    }

    // --- 1. Configuración Básica y Renderizador ---
    const scene = new THREE.Scene();
    const anchoSeguro = container.clientWidth || 800;
    const altoSeguro = container.clientHeight || 600;

    const camera = new THREE.PerspectiveCamera(45, anchoSeguro / altoSeguro, 1, 10000);
    camera.position.set(500, 800, 1300);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(anchoSeguro, altoSeguro);
    renderer.setClearColor(0xe0e0e0, 1); 
    container.appendChild(renderer.domElement);

    // --- 2. Ajuste automático (Resize) ---
    window.addEventListener('resize', () => {
        if (!container) return;
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    });

    const controles = new THREE.OrbitControls(camera, renderer.domElement);
    controles.maxPolarAngle = Math.PI / 2;
    controles.enableDamping = true;
    controles.dampingFactor = 0.05;
    controles.enableZoom = true;
    controles.target.set(0, 0, 0);

    const ambientLight = new THREE.AmbientLight(0x808080); 
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
    directionalLight.position.set(1, 1, 0.5).normalize();
    scene.add(directionalLight);

    // --- 5. Entorno y Herramientas 3D (Auto Expansión y Reducción) ---
    let tamanoTerreno = 1000;
    let gridHelper = new THREE.GridHelper(tamanoTerreno, tamanoTerreno / 50);
    scene.add(gridHelper);

    const ejesBlender = new THREE.AxesHelper(300);
    scene.add(ejesBlender);

    let geometryPlano = new THREE.PlaneGeometry(tamanoTerreno, tamanoTerreno);
    geometryPlano.rotateX(-Math.PI / 2);
    let plano = new THREE.Mesh(geometryPlano, new THREE.MeshBasicMaterial({ visible: false }));
    scene.add(plano);

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const objetosInteractuables = [plano]; 

    function cambiarTamanoTerreno(nuevoTamano) {
        if (nuevoTamano <= 0 || nuevoTamano === tamanoTerreno) return;
        tamanoTerreno = nuevoTamano;

        scene.remove(gridHelper);
        if (gridHelper.geometry) gridHelper.geometry.dispose();
        gridHelper = new THREE.GridHelper(tamanoTerreno, Math.floor(tamanoTerreno / 50));
        scene.add(gridHelper);

        scene.remove(plano);
        if (plano.geometry) plano.geometry.dispose();
        geometryPlano = new THREE.PlaneGeometry(tamanoTerreno, tamanoTerreno);
        geometryPlano.rotateX(-Math.PI / 2);
        plano = new THREE.Mesh(geometryPlano, new THREE.MeshBasicMaterial({ visible: false }));
        scene.add(plano);

        objetosInteractuables[0] = plano;
    }

    function recalcularTamanoTerreno() {
        let maxDistancia = 0;
        const margen = 150; 

        for (let i = 1; i < objetosInteractuables.length; i++) {
            const obj = objetosInteractuables[i];
            const dist = Math.max(Math.abs(obj.position.x), Math.abs(obj.position.z));
            if (dist > maxDistancia) {
                maxDistancia = dist;
            }
        }

        const radioNecesario = maxDistancia + margen;
        const tamanoRequerido = Math.max(1000, Math.ceil(radioNecesario / 500) * 1000);

        cambiarTamanoTerreno(tamanoRequerido);
    }

    const geometriaBloque = new THREE.BoxGeometry(50, 50, 50); 
    const geometriaHabitacion = new THREE.BoxGeometry(200, 100, 200); 

    const loader = new THREE.GLTFLoader();
    const dracoLoader = new THREE.DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    loader.setDRACOLoader(dracoLoader);
    const cacheModelos = {};

    function cargarModeloOptimizado(url, callback) {
        if (cacheModelos[url]) {
            callback(cacheModelos[url].clone());
            return;
        }
        loader.load(
            url,
            (gltf) => {
                cacheModelos[url] = gltf.scene;
                callback(gltf.scene.clone());
            },
            undefined,
            (error) => console.error("Error cargando modelo:", error)
        );
    }

    let modeloActualGLTF = null;
    const materialFantasma = new THREE.MeshBasicMaterial({ color: 0x00ff00, opacity: 0.5, transparent: true });
    let bloqueFantasma = new THREE.Mesh(geometriaBloque, materialFantasma);
    bloqueFantasma.visible = false;
    scene.add(bloqueFantasma);

    const materialRojoEliminar = new THREE.MeshBasicMaterial({ color: 0xff4444, transparent: true, opacity: 0.35 });
    let objetoResaltado = null;

    function resaltarObjeto(obj) {
        if (objetoResaltado === obj) return;
        restaurarResaltado();
        if (!obj || obj === plano) return;
        objetoResaltado = obj;
        objetoResaltado.traverse((child) => {
            if (child.isMesh) {
                if (!child.userData.matOriginal) child.userData.matOriginal = child.material;
                child.material = materialRojoEliminar;
            }
        });
    }

    function restaurarResaltado() {
        if (objetoResaltado) {
            objetoResaltado.traverse((child) => {
                if (child.isMesh && child.userData.matOriginal) child.material = child.userData.matOriginal;
            });
            objetoResaltado = null;
        }
    }

    function seleccionarElemento(url3D, precio, esHabitacion, nombreTextura, nombreElemento) {
        precioActual = precio;
        modoConstruccion = esHabitacion ? 'habitacion' : 'material';
        urlActual = url3D;                               
        texturaActual = nombreTextura || 'concreto';     
        nombreActual = nombreElemento || (esHabitacion ? 'Módulo Habitacional' : 'Material Base');
        modeloActualGLTF = null;
        rotacionActual = 0;
        if (bloqueFantasma) bloqueFantasma.rotation.y = 0;

        if (url3D) {
            cargarModeloOptimizado(url3D, (modeloCargado) => {
                const caja = new THREE.Box3().setFromObject(modeloCargado);
                const tamano = new THREE.Vector3();
                caja.getSize(tamano);
                const tamanoObjetivo = esHabitacion ? 200 : 50; 
                const maxDimension = Math.max(tamano.x, tamano.z);
                if (maxDimension > 0) {
                    const escala = tamanoObjetivo / maxDimension;
                    modeloCargado.scale.set(escala, escala, escala);
                }
                const cajaEscalada = new THREE.Box3().setFromObject(modeloCargado);
                modeloCargado.position.y = -cajaEscalada.min.y;

                modeloActualGLTF = new THREE.Group();
                modeloActualGLTF.add(modeloCargado);
                scene.remove(bloqueFantasma);
                bloqueFantasma = modeloActualGLTF.clone();
                bloqueFantasma.traverse((child) => { if (child.isMesh) child.material = materialFantasma; });
                bloqueFantasma.visible = false;
                scene.add(bloqueFantasma);
            });
        } else {
            materialActual = nombreTextura || 'concreto';
            scene.remove(bloqueFantasma);
            bloqueFantasma = new THREE.Mesh(esHabitacion ? geometriaHabitacion : geometriaBloque, materialFantasma);
            bloqueFantasma.visible = false;
            scene.add(bloqueFantasma);
        }
    }

    // --- CARGA DINÁMICA DE LA API (Actualizada para UI Limpia con Tooltip JS) ---
    const contenedorMateriales = document.getElementById('lista-materiales');
    const contenedorHabitaciones = document.getElementById('lista-habitaciones');

    fetch('/api/materiales-3d/')
        .then(response => response.json())
        .then(data => {
            if (contenedorMateriales) contenedorMateriales.innerHTML = ''; 
            if (contenedorHabitaciones) contenedorHabitaciones.innerHTML = '';

            // --- RENDERIZADO DE MATERIALES BASE ---
            if (data.materiales && data.materiales.length > 0) {
                data.materiales.forEach((mat, index) => {
                    const btn = document.createElement('button');
                    btn.className = `btn-mat-3d ${index === 0 ? 'activo' : ''}`;
                    const precioFormateado = new Intl.NumberFormat('es-CL').format(mat.coste);
                    
                    if (mat.imagen) {
                        btn.innerHTML = `<img src="${mat.imagen}" alt="${mat.nombre}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px; pointer-events: none;">`;
                    } else {
                        // Si algún material no tiene imagen subida, muestra el emoji por defecto
                        btn.innerHTML = `<span style="font-size: 1.8rem; pointer-events: none;">🧱</span>`;
                    }

                    // Eventos para mostrar el tooltip flotante
                    btn.addEventListener('mouseenter', () => {
                        tooltipCatalogo.innerHTML = `${mat.nombre}<br><strong>$${precioFormateado} CLP</strong>`;
                        tooltipCatalogo.style.display = 'block';
                        const rect = btn.getBoundingClientRect();
                        tooltipCatalogo.style.left = (rect.left + (rect.width / 2)) + 'px';
                        tooltipCatalogo.style.top = (rect.top - tooltipCatalogo.offsetHeight - 8) + 'px';
                    });

                    btn.addEventListener('mouseleave', () => {
                        tooltipCatalogo.style.display = 'none';
                    });

                    btn.addEventListener('click', function() {
                        document.querySelectorAll('.btn-mat-3d, .btn-hab-3d').forEach(b => b.classList.remove('activo'));
                        this.classList.add('activo');
                        seleccionarElemento(mat.archivo_3d, mat.coste, false, mat.textura_key, mat.nombre);
                    });

                    if (contenedorMateriales) contenedorMateriales.appendChild(btn);
                    if (index === 0) seleccionarElemento(mat.archivo_3d, mat.coste, false, mat.textura_key, mat.nombre);
                });
            }

            // --- RENDERIZADO DE HABITACIONES/MÓDULOS ---
            if (data.habitaciones && data.habitaciones.length > 0) {
                data.habitaciones.forEach(hab => {
                    const btn = document.createElement('button');
                    btn.className = 'btn-hab-3d'; 
                    const costoTotalFormateado = new Intl.NumberFormat('es-CL').format(hab.coste_total);
                    
                    if (hab.imagen) {
                        btn.innerHTML = `<img src="${hab.imagen}" alt="${hab.nombre}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px; pointer-events: none;">`;
                    } else {
                        btn.innerHTML = `<span style="font-size: 1.8rem; pointer-events: none;">🏠</span>`;
                    }

                    // Eventos para mostrar el tooltip flotante
                    btn.addEventListener('mouseenter', () => {
                        tooltipCatalogo.innerHTML = `${hab.nombre} (${hab.dimensiones})<br><strong>$${costoTotalFormateado} CLP</strong>`;
                        tooltipCatalogo.style.display = 'block';
                        const rect = btn.getBoundingClientRect();
                        tooltipCatalogo.style.left = (rect.left + (rect.width / 2)) + 'px';
                        tooltipCatalogo.style.top = (rect.top - tooltipCatalogo.offsetHeight - 8) + 'px';
                    });

                    btn.addEventListener('mouseleave', () => {
                        tooltipCatalogo.style.display = 'none';
                    });

                    btn.addEventListener('click', function() {
                        document.querySelectorAll('.btn-mat-3d, .btn-hab-3d').forEach(b => b.classList.remove('activo'));
                        this.classList.add('activo');
                        seleccionarElemento(hab.archivo_3d, hab.coste_total, true, 'concreto', hab.nombre);
                    });
                    
                    if (contenedorHabitaciones) contenedorHabitaciones.appendChild(btn);
                });
            }
        })
        .catch(error => console.error("Error cargando el catálogo:", error));

    function actualizarPresupuesto(valor) {
        costoTotal += valor;
        if (uiTotal) uiTotal.textContent = `$${new Intl.NumberFormat('es-CL').format(costoTotal)}`;
    }

    document.addEventListener('keydown', (event) => {
        if (event.key.toLowerCase() === 'r') {
            rotacionActual -= Math.PI / 4;
            if (bloqueFantasma) bloqueFantasma.rotation.y = rotacionActual;
        }
    });

    document.addEventListener('keyup', (event) => {
        if (event.key === 'Shift') {
            restaurarResaltado();
            if (tooltip) tooltip.style.display = 'none';
        }
    });

    function guardarEscenaLocal() {
        const datosGuardados = [];
        for (let i = 1; i < objetosInteractuables.length; i++) {
            const obj = objetosInteractuables[i];
            datosGuardados.push({
                posX: obj.position.x,
                posY: obj.position.y,
                posZ: obj.position.z,
                rotY: obj.rotation.y,
                precio: obj.userData.precio,
                tipo: obj.userData.tipo,
                url3D: obj.userData.url3D,
                textura: obj.userData.textura,
                nombre: obj.userData.nombre
            });
        }
        localStorage.setItem('proyecto_homecount', JSON.stringify(datosGuardados));
        guardarCamaraLocal();
    }

    function guardarCamaraLocal() {
        const camEstado = {
            posX: camera.position.x,
            posY: camera.position.y,
            posZ: camera.position.z,
            targetX: controles.target.x,
            targetY: controles.target.y,
            targetZ: controles.target.z
        };
        localStorage.setItem('camara_homecount', JSON.stringify(camEstado));
    }

    function cargarCamaraLocal() {
        const camString = localStorage.getItem('camara_homecount');
        if (camString) {
            const cam = JSON.parse(camString);
            camera.position.set(cam.posX, cam.posY, cam.posZ);
            controles.target.set(cam.targetX, cam.targetY, cam.targetZ);
            controles.update();
        }
    }

    function cargarEscenaLocal() {
        const datosString = localStorage.getItem('proyecto_homecount');
        if (!datosString) return;
        const datosGuardados = JSON.parse(datosString);
        
        datosGuardados.forEach(item => {
            if (item.url3D) {
                cargarModeloOptimizado(item.url3D, (modelo) => {
                    const caja = new THREE.Box3().setFromObject(modelo);
                    const tamano = new THREE.Vector3();
                    caja.getSize(tamano);
                    const maxDimension = Math.max(tamano.x, tamano.z);
                    
                    if (maxDimension > 0) {
                        const escala = (item.tipo === 'habitacion' ? 200 : 50) / maxDimension;
                        modelo.scale.set(escala, escala, escala);
                    }
                    
                    const cajaEscalada = new THREE.Box3().setFromObject(modelo);
                    modelo.position.y = -cajaEscalada.min.y;

                    const grupo = new THREE.Group();
                    grupo.add(modelo);
                    grupo.position.set(item.posX, item.posY, item.posZ);
                    grupo.rotation.y = item.rotY;
                    grupo.userData = { precio: item.precio, tipo: item.tipo, url3D: item.url3D, textura: item.textura, nombre: item.nombre };
                    scene.add(grupo);
                    objetosInteractuables.push(grupo);
                    actualizarPresupuesto(item.precio);
                    recalcularTamanoTerreno(); 
                });
            } else {
                const geo = (item.tipo === 'habitacion') ? geometriaHabitacion : geometriaBloque;
                const mat = texturas[item.textura] || texturas['concreto'];
                const malla = new THREE.Mesh(geo, mat);
                malla.position.set(item.posX, item.posY, item.posZ);
                malla.rotation.y = item.rotY;
                malla.userData = { precio: item.precio, tipo: item.tipo, url3D: null, textura: item.textura, nombre: item.nombre };
                scene.add(malla);
                objetosInteractuables.push(malla);
                actualizarPresupuesto(item.precio);
                recalcularTamanoTerreno(); 
            }
        });
    }

    window.addEventListener('beforeunload', guardarCamaraLocal);

    let inicioX = 0, inicioY = 0;

    function calcularPosicionSnappeada(interseccion) {
        const gridTamXZ = (modoConstruccion === 'habitacion') ? 200 : 50;
        const gridTamY = (modoConstruccion === 'habitacion') ? 100 : 50;
        const normal = interseccion.face ? interseccion.face.normal : new THREE.Vector3(0, 1, 0);
        const punto = interseccion.point.clone().add(normal.clone().multiplyScalar(0.1));
        const posX = Math.floor(punto.x / gridTamXZ) * gridTamXZ + (gridTamXZ / 2);
        const posZ = Math.floor(punto.z / gridTamXZ) * gridTamXZ + (gridTamXZ / 2);
        let posY = !modeloActualGLTF ? Math.floor(punto.y / gridTamY) * gridTamY + (gridTamY / 2) : Math.floor(punto.y / gridTamY) * gridTamY;
        const alturaMinima = modeloActualGLTF ? 0 : (gridTamY / 2);
        return { x: posX, y: Math.max(alturaMinima, posY), z: posZ };
    }

    renderer.domElement.addEventListener('pointermove', (event) => {
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);

        if (event.shiftKey) {
            bloqueFantasma.visible = false;
            const objetosConstruidos = objetosInteractuables.filter(obj => obj !== plano);
            const intersecciones = raycaster.intersectObjects(objetosConstruidos, true);

            if (intersecciones.length > 0) {
                let objRaiz = intersecciones[0].object;
                while (objRaiz.parent && objRaiz.parent !== scene) objRaiz = objRaiz.parent;
                resaltarObjeto(objRaiz);

                const nombreItem = objRaiz.userData.nombre || (objRaiz.userData.tipo === 'habitacion' ? 'Módulo Habitacional' : 'Bloque Material');
                const precioRestar = new Intl.NumberFormat('es-CL').format(objRaiz.userData.precio);
                
                tooltip.innerHTML = `🗑️ Eliminar: <strong>${nombreItem}</strong><br><span style="font-weight: normal; font-size: 11px;">Restar: -$${precioRestar}</span>`;
                tooltip.style.left = (event.clientX + 15) + 'px';
                tooltip.style.top = (event.clientY + 15) + 'px';
                tooltip.style.display = 'block';
            } else {
                restaurarResaltado();
                tooltip.style.display = 'none';
            }
        } else {
            restaurarResaltado();
            tooltip.style.display = 'none';

            const intersecciones = raycaster.intersectObjects(objetosInteractuables, true);
            if (intersecciones.length > 0) {
                const pos = calcularPosicionSnappeada(intersecciones[0]);
                bloqueFantasma.position.set(pos.x, pos.y, pos.z);
                bloqueFantasma.visible = true;
                materialFantasma.color.setHex(0x00ff00); 
            } else {
                bloqueFantasma.visible = false;
            }
        }
    });

    renderer.domElement.addEventListener('pointerleave', () => {
        bloqueFantasma.visible = false;
        restaurarResaltado();
        if (tooltip) tooltip.style.display = 'none';
    });

    renderer.domElement.addEventListener('pointerdown', (event) => { 
        inicioX = event.clientX; 
        inicioY = event.clientY; 
    });

    renderer.domElement.addEventListener('pointerup', (event) => {
        const distanciaMovida = Math.abs(event.clientX - inicioX) + Math.abs(event.clientY - inicioY);
        if (distanciaMovida > 5) return; 

        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);

        if (event.shiftKey) { // ELIMINAR
            const objetosConstruidos = objetosInteractuables.filter(obj => obj !== plano);
            const intersecciones = raycaster.intersectObjects(objetosConstruidos, true);

            if (intersecciones.length > 0) {
                let objBorrar = intersecciones[0].object;
                while (objBorrar.parent && objBorrar.parent !== scene) objBorrar = objBorrar.parent;

                restaurarResaltado();
                scene.remove(objBorrar);
                objetosInteractuables.splice(objetosInteractuables.indexOf(objBorrar), 1);
                actualizarPresupuesto(-objBorrar.userData.precio);
                
                recalcularTamanoTerreno(); 
                
                guardarEscenaLocal();
                if (tooltip) tooltip.style.display = 'none';
            }
        } else { // CONSTRUIR
            const intersecciones = raycaster.intersectObjects(objetosInteractuables, true);
            if (intersecciones.length > 0) {
                const interseccion = intersecciones[0];
                let nuevoObjeto;

                if (modeloActualGLTF) {
                    nuevoObjeto = modeloActualGLTF.clone();
                } else {
                    const geometriaFinal = (modoConstruccion === 'habitacion') ? geometriaHabitacion : geometriaBloque;
                    const materialVisual = texturas[materialActual] || new THREE.MeshLambertMaterial({ color: 0x95a5a6 });
                    nuevoObjeto = new THREE.Mesh(geometriaFinal, materialVisual);
                }
                
                const pos = calcularPosicionSnappeada(interseccion);
                nuevoObjeto.position.set(pos.x, pos.y, pos.z);
                nuevoObjeto.rotation.y = rotacionActual;
                nuevoObjeto.userData = { precio: precioActual, tipo: modoConstruccion, url3D: urlActual, textura: texturaActual, nombre: nombreActual };
                
                scene.add(nuevoObjeto);
                objetosInteractuables.push(nuevoObjeto);
                
                recalcularTamanoTerreno(); 

                actualizarPresupuesto(precioActual);
                guardarEscenaLocal();
            }
        }
    });

    const btnBorrarTodo = document.getElementById('btn-borrar-todo');
    if (btnBorrarTodo) {
        btnBorrarTodo.addEventListener('click', () => {
            if (confirm("¿Estás seguro de que deseas borrar todo el diseño? Esta acción no se puede deshacer.")) {
                restaurarResaltado();
                if (tooltip) tooltip.style.display = 'none';
                for (let i = objetosInteractuables.length - 1; i > 0; i--) scene.remove(objetosInteractuables[i]);
                objetosInteractuables.length = 1; 
                costoTotal = 0;
                if (uiTotal) uiTotal.textContent = '$0';
                localStorage.removeItem('proyecto_homecount');
                localStorage.removeItem('camara_homecount');

                cambiarTamanoTerreno(1000);

                camera.position.set(500, 800, 1300);
                controles.target.set(0, 0, 0);
                controles.update();
            }
        });
    }

    cargarEscenaLocal();
    cargarCamaraLocal();

    function animar() {
        requestAnimationFrame(animar);
        controles.update(); 
        renderer.render(scene, camera);
    }
    
    animar();
});