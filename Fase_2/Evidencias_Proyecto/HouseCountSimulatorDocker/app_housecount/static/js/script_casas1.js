// Esperar a que el DOM cargue
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('canvas-3d-container');
    if (!container) return;

    // Variables de presupuesto y estado
    let materialActual = 'madera';
    let precioActual = 15000;
    let costoTotal = 0;
    let modoConstruccion = 'material'; 
    let rotacionActual = 0; // Control de rotación
    const uiTotal = document.getElementById('total-3d');
    
    // Configurar materiales visuales de respaldo (Fallback)
    const texturas = {
        madera: new THREE.MeshLambertMaterial({ color: 0x8b5a2b }),
        ladrillo: new THREE.MeshLambertMaterial({ color: 0xb22222 }),
        concreto: new THREE.MeshLambertMaterial({ color: 0x7f8c8d })
    };

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

    // --- 3. Configuración de Controles ---
    const controles = new THREE.OrbitControls(camera, renderer.domElement);
    controles.maxPolarAngle = Math.PI / 2;
    controles.enableDamping = true;
    controles.dampingFactor = 0.05;
    controles.enableZoom = true;
    controles.target.set(0, 0, 0);

    // --- 4. Luces ---
    const ambientLight = new THREE.AmbientLight(0x808080); 
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
    directionalLight.position.set(1, 1, 0.5).normalize();
    scene.add(directionalLight);

    // --- 5. Entorno y Herramientas 3D ---
    const gridHelper = new THREE.GridHelper(1000, 20);
    scene.add(gridHelper);

    const ejesBlender = new THREE.AxesHelper(300);
    scene.add(ejesBlender);

    const geometryPlano = new THREE.PlaneGeometry(1000, 1000);
    geometryPlano.rotateX(-Math.PI / 2);
    const plano = new THREE.Mesh(geometryPlano, new THREE.MeshBasicMaterial({ visible: false }));
    scene.add(plano);

    const geometriaBloque = new THREE.BoxGeometry(50, 50, 50);
    const geometriaHabitacion = new THREE.BoxGeometry(200, 100, 200);
    
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const objetosInteractuables = [plano]; 

    // Inicialización del Cargador GLTF y Cursor Fantasma
    const loader = new THREE.GLTFLoader();
    let modeloActualGLTF = null;
    
    const materialFantasma = new THREE.MeshBasicMaterial({ color: 0x00ff00, opacity: 0.5, transparent: true });
    let bloqueFantasma = new THREE.Mesh(geometriaBloque, materialFantasma);
    bloqueFantasma.visible = false;
    scene.add(bloqueFantasma);

    // --- 6. Función para gestionar la selección y ajustar escala/pivote ---
    function seleccionarElemento(url3D, precio, esHabitacion, nombreTextura) {
        precioActual = precio;
        modoConstruccion = esHabitacion ? 'habitacion' : 'material';
        modeloActualGLTF = null;
        
        rotacionActual = 0;
        if (bloqueFantasma) bloqueFantasma.rotation.y = 0;

        if (url3D) {
            loader.load(url3D, (gltf) => {
                const modeloCargado = gltf.scene;

                // 1. Escalado automático adaptado a la rejilla
                const caja = new THREE.Box3().setFromObject(modeloCargado);
                const tamano = new THREE.Vector3();
                caja.getSize(tamano);

                const tamanoObjetivo = esHabitacion ? 200 : 50; 
                const maxDimension = Math.max(tamano.x, tamano.z);

                if (maxDimension > 0) {
                    const escala = tamanoObjetivo / maxDimension;
                    modeloCargado.scale.set(escala, escala, escala);
                }

                // 2. Alineación de base a Y = 0 (Evita pivotes desfasados)
                const cajaEscalada = new THREE.Box3().setFromObject(modeloCargado);
                modeloCargado.position.y = -cajaEscalada.min.y;

                // 3. Envolver en un grupo para conservar la altura al clonar
                modeloActualGLTF = new THREE.Group();
                modeloActualGLTF.add(modeloCargado);

                // 4. Actualizar fantasma verde
                scene.remove(bloqueFantasma);
                bloqueFantasma = modeloActualGLTF.clone();
                
                bloqueFantasma.traverse((child) => {
                    if (child.isMesh) {
                        child.material = materialFantasma;
                    }
                });
                
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

    // --- 7. Carga Dinámica desde Django ---
    const contenedorMateriales = document.getElementById('lista-materiales');
    const contenedorHabitaciones = document.getElementById('lista-habitaciones');

    fetch('/api/materiales-3d/')
        .then(response => response.json())
        .then(data => {
            if (contenedorMateriales) contenedorMateriales.innerHTML = ''; 
            if (contenedorHabitaciones) contenedorHabitaciones.innerHTML = '';

            if (data.materiales && data.materiales.length > 0) {
                data.materiales.forEach((mat, index) => {
                    const btn = document.createElement('button');
                    btn.className = `btn-mat-3d ${index === 0 ? 'activo' : ''}`;
                    const precioFormateado = new Intl.NumberFormat('es-CL').format(mat.coste);
                    btn.innerHTML = `🧱 ${mat.nombre}<br><small>$${precioFormateado}</small>`;

                    btn.addEventListener('click', function() {
                        document.querySelectorAll('.btn-mat-3d, .btn-hab-3d').forEach(b => b.classList.remove('activo'));
                        this.classList.add('activo');
                        seleccionarElemento(mat.archivo_3d, mat.coste, false, mat.textura_key);
                    });

                    if (contenedorMateriales) contenedorMateriales.appendChild(btn);
                    if (index === 0) seleccionarElemento(mat.archivo_3d, mat.coste, false, mat.textura_key);
                });
            }

            if (data.habitaciones && data.habitaciones.length > 0) {
                data.habitaciones.forEach(hab => {
                    const btn = document.createElement('button');
                    btn.className = 'btn-hab-3d'; 
                    const costoTotalFormateado = new Intl.NumberFormat('es-CL').format(hab.coste_total);
                    btn.innerHTML = `🏠 ${hab.nombre} (${hab.dimensiones})<br><small>$${costoTotalFormateado}</small>`;

                    btn.addEventListener('click', function() {
                        document.querySelectorAll('.btn-mat-3d, .btn-hab-3d').forEach(b => b.classList.remove('activo'));
                        this.classList.add('activo');
                        seleccionarElemento(hab.archivo_3d, hab.coste_total, true, 'concreto');
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

    // --- 8. Control de Teclado (Rotación con tecla R) ---
    document.addEventListener('keydown', (event) => {
        if (event.key.toLowerCase() === 'r') {
            rotacionActual -= Math.PI / 2;
            if (bloqueFantasma) {
                bloqueFantasma.rotation.y = rotacionActual;
            }
        }
    });

    // --- 9. Lógica de Posicionamiento y Construcción Precisa ---
    let inicioX = 0;
    let inicioY = 0;

    // Función auxiliar para calcular las coordenadas alineadas a la rejilla
    function calcularPosicionSnappeada(interseccion) {
        const gridTam = (modoConstruccion === 'habitacion') ? 200 : 50;
        const offsetXZ = gridTam / 2;

        // Alinear X y Z exactamente al centro de la celda de la rejilla
        const posX = Math.floor(interseccion.point.x / gridTam) * gridTam + offsetXZ;
        const posZ = Math.floor(interseccion.point.z / gridTam) * gridTam + offsetXZ;

        // Calcular Y exacto según el tipo de objeto
        let posY = interseccion.point.y;
        
        // Si es un cubo básico (sin modelo 3D cargado), elevamos Y a la mitad de su altura
        if (!modeloActualGLTF) {
            const mitadAltura = (modoConstruccion === 'habitacion') ? 50 : 25;
            posY = interseccion.point.y + mitadAltura;
        }

        return { x: posX, y: Math.max(0, posY), z: posZ };
    }

    renderer.domElement.addEventListener('pointermove', (event) => {
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersecciones = raycaster.intersectObjects(objetosInteractuables, true);

        if (intersecciones.length > 0) {
            const pos = calcularPosicionSnappeada(intersecciones[0]);
            
            bloqueFantasma.position.set(pos.x, pos.y, pos.z);
            bloqueFantasma.visible = true;
            materialFantasma.color.setHex(event.shiftKey ? 0xff0000 : 0x00ff00);
        } else {
            bloqueFantasma.visible = false;
        }
    });

    renderer.domElement.addEventListener('pointerleave', () => {
        bloqueFantasma.visible = false;
    });

    renderer.domElement.addEventListener('pointerdown', (event) => {
        inicioX = event.clientX;
        inicioY = event.clientY;
    });

    renderer.domElement.addEventListener('pointerup', (event) => {
        // Evitar construir si el usuario estaba arrastrando la cámara
        const distanciaMovida = Math.abs(event.clientX - inicioX) + Math.abs(event.clientY - inicioY);
        if (distanciaMovida > 5) return; 

        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        raycaster.setFromCamera(mouse, camera);
        const intersecciones = raycaster.intersectObjects(objetosInteractuables, true);

        if (intersecciones.length > 0) {
            const interseccion = intersecciones[0];

            if (event.shiftKey) {
                // BORRAR
                let objBorrar = interseccion.object;
                while (objBorrar.parent && objBorrar.parent !== scene) {
                    objBorrar = objBorrar.parent;
                }
                if (objBorrar !== plano) {
                    scene.remove(objBorrar);
                    objetosInteractuables.splice(objetosInteractuables.indexOf(objBorrar), 1);
                    actualizarPresupuesto(-objBorrar.userData.precio);
                }
            } else {
                // CONSTRUIR
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
                nuevoObjeto.userData = { precio: precioActual, tipo: modoConstruccion };
                
                scene.add(nuevoObjeto);
                objetosInteractuables.push(nuevoObjeto);
                actualizarPresupuesto(precioActual);
            }
        }
    });

    // --- 10. Bucle de Animación ---
    function animar() {
        requestAnimationFrame(animar);
        controles.update(); 
        renderer.render(scene, camera);
    }
    
    animar();
});