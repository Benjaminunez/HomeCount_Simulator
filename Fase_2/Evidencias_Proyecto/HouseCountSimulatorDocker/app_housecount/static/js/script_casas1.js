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
    let escalaActual = 1.0; // NUEVA VARIABLE PARA LA ESCALA
    let urlActual = null;          
    let texturaActual = 'concreto';
    let esModoOscuro = false; // Nueva variable de estado para el modo oscuro
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
    let gridHelper = new THREE.GridHelper(tamanoTerreno, tamanoTerreno / 50, 0x888888, 0x888888);
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
        
        // Mantener el color adecuado de la cuadrícula dependiendo del tema actual
        const colorGrid = esModoOscuro ? 0x444444 : 0x888888;
        gridHelper = new THREE.GridHelper(tamanoTerreno, Math.floor(tamanoTerreno / 50), colorGrid, colorGrid);
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
        escalaActual = 1.0; // Reiniciar escala
        if (bloqueFantasma) {
            bloqueFantasma.rotation.y = 0;
            bloqueFantasma.scale.set(1, 1, 1);
        }

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
                    modeloCargado.updateMatrixWorld(true);
                }
                
                const cajaEscalada = new THREE.Box3().setFromObject(modeloCargado);
                modeloCargado.position.y -= cajaEscalada.min.y;

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

    // --- CARGA DINÁMICA DE LA API ---
    const contenedorMateriales = document.getElementById('lista-materiales');
    const contenedorHabitaciones = document.getElementById('lista-habitaciones');

    // --- NUEVA MEJORA: Scroll horizontal con la rueda del ratón ---
    [contenedorMateriales, contenedorHabitaciones].forEach(contenedor => {
        if (!contenedor) return;
        contenedor.addEventListener('wheel', (evento) => {
            if (evento.deltaY !== 0) {
                evento.preventDefault(); 
                
                contenedor.scrollBy({
                    left: evento.deltaY * 1.2, // Multiplicador para ajustar la distancia por cada giro de rueda
                    behavior: 'smooth'         // Magia para la fluidez
                });
            }
        }, { passive: false });
    });

    fetch('/api/materiales-3d/')
        .then(response => response.json())
        .then(data => {
            if (contenedorMateriales) contenedorMateriales.innerHTML = ''; 
            if (contenedorHabitaciones) {
                contenedorHabitaciones.innerHTML = '';
                // 1. Inicia oculto para que no aparezca junto a "Todos"
                contenedorHabitaciones.style.display = 'none'; 
            }
            // --- LÓGICA DE PESTAÑAS (CATEGORÍAS) ---
            const contenedorFiltros = document.getElementById('filtros-categorias');
            if (data.materiales && data.materiales.length > 0) {
                
                // Extraer categorías de materiales
                let categoriasDB = [...new Set(data.materiales.map(mat => mat.categoria))];
                const otrasCategorias = categoriasDB.filter(c => c !== 'Estructura' && c !== 'Sin Categoría');
                
                const categoriasUnicas = ['Todos'];
                if (categoriasDB.includes('Estructura')) categoriasUnicas.push('Estructura');
                categoriasUnicas.push(...otrasCategorias.sort()); 
                if (categoriasDB.includes('Sin Categoría')) categoriasUnicas.push('Sin Categoría');
                // 2. AGREGAR LA NUEVA PESTAÑA SI EXISTEN HABITACIONES
                if (data.habitaciones && data.habitaciones.length > 0) {
                    categoriasUnicas.push('Módulos Prehechos');
                }
                // Generar los botones de las pestañas
                if (contenedorFiltros) {
                    contenedorFiltros.innerHTML = '';
                    
                    categoriasUnicas.forEach((cat, index) => {
                        const btnTab = document.createElement('button');
                        btnTab.textContent = cat;
                        btnTab.className = `tab-categoria ${index === 0 ? 'activa' : ''}`;
                        btnTab.addEventListener('click', () => {
                            // Cambiar clase activa en los botones de pestañas
                            document.querySelectorAll('.tab-categoria').forEach(b => b.classList.remove('activa'));
                            btnTab.classList.add('activa');
                            // 3. LÓGICA DE VISIBILIDAD: ¿Es Módulos Prehechos o Materiales?
                            if (cat === 'Módulos Prehechos') {
                                // Ocultar materiales y mostrar módulos de habitaciones
                                if (contenedorMateriales) contenedorMateriales.style.display = 'none';
                                if (contenedorHabitaciones) contenedorHabitaciones.style.display = 'flex';
                            } else {
                                // Mostrar materiales y ocultar módulos de habitaciones
                                if (contenedorMateriales) contenedorMateriales.style.display = 'flex';
                                if (contenedorHabitaciones) contenedorHabitaciones.style.display = 'none';
                                // Filtrar los materiales según la categoría seleccionada
                                document.querySelectorAll('.btn-mat-3d').forEach(btnMat => {
                                    const categoriaMat = btnMat.dataset.categoria;
                                    if (cat === 'Todos' || categoriaMat === cat) {
                                        btnMat.style.display = 'inline-block';
                                    } else {
                                        btnMat.style.display = 'none';
                                    }
                                });
                            }
                        });
                        contenedorFiltros.appendChild(btnTab);
                    });
                }
                // Renderizar los materiales (se mantiene igual que antes)...
                data.materiales.forEach((mat, index) => {
                    const btn = document.createElement('button');
                    btn.className = `btn-mat-3d ${index === 0 ? 'activo' : ''}`;
                    btn.dataset.categoria = mat.categoria;
                    const precioFormateado = new Intl.NumberFormat('es-CL').format(mat.coste);
                    
                    if (mat.imagen) {
                        btn.innerHTML = `<img src="${mat.imagen}" alt="${mat.nombre}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px; pointer-events: none;">`;
                    } else {
                        btn.innerHTML = `<span style="font-size: 1.8rem; pointer-events: none;">🧱</span>`;
                    }
                    btn.addEventListener('mouseenter', () => {
                        tooltipCatalogo.innerHTML = `<span style="font-size: 10px; color: #a0aec0;">${mat.categoria}</span><br>${mat.nombre}<br><strong>$${precioFormateado} CLP</strong>`;
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
            // Renderizar las habitaciones (se mantiene igual que antes)...
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


    // --- FUNCIÓN: Actualizar Desglose en la UI ---
    function actualizarListaUI() {
        const listaUI = document.getElementById('lista-objetos-ui');
        if (!listaUI) return; 

        const conteoObjetos = {};
        
        for (let i = 1; i < objetosInteractuables.length; i++) {
            const obj = objetosInteractuables[i];
            const nombre = obj.userData.nombre || (obj.userData.tipo === 'habitacion' ? 'Módulo Habitacional' : 'Bloque Material');
            const precio = obj.userData.precio || 0;

            if (!conteoObjetos[nombre]) {
                conteoObjetos[nombre] = { cantidad: 0, subtotal: 0 };
            }
            conteoObjetos[nombre].cantidad += 1;
            conteoObjetos[nombre].subtotal += precio;
        }

        listaUI.innerHTML = '';
        const nombres = Object.keys(conteoObjetos);
        
        if (nombres.length === 0) {
            listaUI.innerHTML = '<li class="item-vacio">No hay elementos en la escena</li>';
            return;
        }

        nombres.forEach(nombre => {
            const datos = conteoObjetos[nombre];
            const subtotalFormateado = new Intl.NumberFormat('es-CL').format(datos.subtotal);
            
            const li = document.createElement('li');
            li.className = 'item-lista-objeto';
            li.innerHTML = `
                <div>
                    <span class="nombre-item">${nombre}</span>
                    <span class="cantidad-item">x${datos.cantidad}</span>
                </div>
                <span class="subtotal-item">$${subtotalFormateado}</span>
            `;
            listaUI.appendChild(li);
        });
    }

    function actualizarPresupuesto(valor) {
        costoTotal += valor;
        if (uiTotal) uiTotal.textContent = `$${new Intl.NumberFormat('es-CL').format(costoTotal)}`;
        actualizarListaUI();
    }

    document.addEventListener('keydown', (event) => {
        if (event.key.toLowerCase() === 'r') {
            rotacionActual -= Math.PI / 4;
            if (bloqueFantasma) bloqueFantasma.rotation.y = rotacionActual;
        }
        // Controles de escala con + y -
        if (event.key === '+' || event.key === '=') {
            escalaActual += 0.1;
            if (bloqueFantasma) bloqueFantasma.scale.set(escalaActual, escalaActual, escalaActual);
        }
        if (event.key === '-') {
            escalaActual = Math.max(0.1, escalaActual - 0.1); // Evitar que desaparezca o sea negativo
            if (bloqueFantasma) bloqueFantasma.scale.set(escalaActual, escalaActual, escalaActual);
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
                nombre: obj.userData.nombre,
                escala: obj.userData.escala || 1.0 // Guarda la escala
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
                        const escalaBase = (item.tipo === 'habitacion' ? 200 : 50) / maxDimension;
                        const escalaFinal = escalaBase * (item.escala || 1.0); // Multiplica por la escala del usuario
                        modelo.scale.set(escalaFinal, escalaFinal, escalaFinal);
                        modelo.updateMatrixWorld(true);
                    }
                    
                    const cajaEscalada = new THREE.Box3().setFromObject(modelo);
                    modelo.position.y -= cajaEscalada.min.y;

                    const grupo = new THREE.Group();
                    grupo.add(modelo);
                    grupo.position.set(item.posX, item.posY, item.posZ);
                    grupo.rotation.y = item.rotY;
                    grupo.userData = { precio: item.precio, tipo: item.tipo, url3D: item.url3D, textura: item.textura, nombre: item.nombre, escala: item.escala || 1.0 };
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
                const esc = item.escala || 1.0;
                malla.scale.set(esc, esc, esc);
                malla.userData = { precio: item.precio, tipo: item.tipo, url3D: null, textura: item.textura, nombre: item.nombre, escala: esc };
                scene.add(malla);
                objetosInteractuables.push(malla);
                actualizarPresupuesto(item.precio);
                recalcularTamanoTerreno(); 
            }
        });
    }

    window.addEventListener('beforeunload', guardarCamaraLocal);

    let inicioX = 0, inicioY = 0;

    // --- NUEVA MEJORA: Eje Y dinámico para apilar ---
    function calcularPosicionSnappeada(interseccion, usarGrid = true) {
        const gridTamXZ = (modoConstruccion === 'habitacion') ? 200 : 50;
        const gridTamY = (modoConstruccion === 'habitacion') ? 100 : 50;
        
        // Obtener la normal para empujar el punto ligeramente hacia afuera (para calcular la posición correcta)
        const normal = interseccion.face ? interseccion.face.normal : new THREE.Vector3(0, 1, 0);
        const punto = interseccion.point.clone().add(normal.clone().multiplyScalar(0.1));
        
        // La altura del suelo sigue siendo el mínimo
        const alturaMinima = modeloActualGLTF ? 0 : (gridTamY / 2);

        if (!usarGrid) {
            // Si el grid está desactivado, tomamos la altura exacta, pero evitamos que pase debajo del piso
            return { x: punto.x, y: Math.max(punto.y, alturaMinima), z: punto.z };
        }

        // Posicionamiento "encajado" (Grid Snapping) para X y Z
        const posX = Math.floor(punto.x / gridTamXZ) * gridTamXZ + (gridTamXZ / 2);
        const posZ = Math.floor(punto.z / gridTamXZ) * gridTamXZ + (gridTamXZ / 2);
        
        // Posicionamiento para Y (Aquí está la mejora que permite apilar)
        let posY;
        if (modeloActualGLTF) {
            // Si es un modelo 3D (su centro/pivote suele estar abajo)
            posY = Math.floor(punto.y / gridTamY) * gridTamY;
        } else {
            // Si es un bloque geométrico nativo (su pivote está en el centro)
            posY = Math.floor(punto.y / gridTamY) * gridTamY + (gridTamY / 2);
        }
        
        // Protegemos que no quede por debajo del suelo
        posY = Math.max(posY, alturaMinima);
        
        return { x: posX, y: posY, z: posZ };
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
                const pos = calcularPosicionSnappeada(intersecciones[0], !event.altKey);
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
                
                const pos = calcularPosicionSnappeada(interseccion, !event.altKey);
                nuevoObjeto.position.set(pos.x, pos.y, pos.z);
                nuevoObjeto.rotation.y = rotacionActual;
                nuevoObjeto.scale.set(escalaActual, escalaActual, escalaActual); // Aplica escala
                nuevoObjeto.userData = { precio: precioActual, tipo: modoConstruccion, url3D: urlActual, textura: texturaActual, nombre: nombreActual, escala: escalaActual };
                
                scene.add(nuevoObjeto);
                objetosInteractuables.push(nuevoObjeto);
                
                recalcularTamanoTerreno(); 
                actualizarPresupuesto(precioActual);
                guardarEscenaLocal();
            }
        }
    });

    // --- Lógica del Modo Claro / Oscuro ---
    const btnModoOscuro = document.getElementById('btn-modo-oscuro');
    esModoOscuro = localStorage.getItem('modo_oscuro_homecount') === 'true';
    function aplicarTemaVisual(oscuro) {
        document.body.classList.toggle('tema-oscuro', oscuro);

        if (oscuro) {
            renderer.setClearColor(0x1a1a1a, 1); // Fondo oscuro
            if (gridHelper && gridHelper.material) gridHelper.material.color.setHex(0x777777); // Grid oscuro
            if (btnModoOscuro) btnModoOscuro.textContent = '☀️'; // Cambia el icono al sol
        } else {
            renderer.setClearColor(0xe0e0e0, 1); // Fondo gris claro (original)
            if (gridHelper && gridHelper.material) gridHelper.material.color.setHex(0x888888); // Grid normal
            if (btnModoOscuro) btnModoOscuro.textContent = '🌙'; // Vuelve al icono de luna
        }
    }
    aplicarTemaVisual(esModoOscuro);

    if (btnModoOscuro) {
        btnModoOscuro.addEventListener('click', () => {
            esModoOscuro = !esModoOscuro;
            localStorage.setItem('modo_oscuro_homecount', esModoOscuro);
            aplicarTemaVisual(esModoOscuro);
        });
    }

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
                actualizarListaUI();
                
                localStorage.removeItem('proyecto_homecount');
                localStorage.removeItem('camara_homecount');

                cambiarTamanoTerreno(1000);

                camera.position.set(500, 800, 1300);
                controles.target.set(0, 0, 0);
                controles.update();
            }
        });
    }

// --- VARIABLES GLOBALES PARA RECORDAR EL PROYECTO CARGADO ---
    let proyectoCargadoId = null;
    let proyectoCargadoNombre = "";

    // --- EVENTOS DE GUARDADO Y CARGA CONECTADOS A GUARDADO_DB.JS ---
    const btnGuardarModelo = document.getElementById('btn-guardar-modelo');
    const btnMisModelos = document.getElementById('btn-mis-modelos');

    // Botón Guardar (💾)
    if (btnGuardarModelo) {
        btnGuardarModelo.addEventListener('click', (e) => {
            e.preventDefault();
            // Ahora le pasamos el ID y el Nombre a la función de guardado
            procesarGuardado(objetosInteractuables, camera, controles, costoTotal, scene, renderer, proyectoCargadoId, proyectoCargadoNombre);
        });
    }

    // Botón Mis Diseños (📁)
    if (btnMisModelos) {
        btnMisModelos.addEventListener('click', (e) => {
            e.preventDefault();
            // El callback ahora recibe el id y nombre desde la base de datos
            cargarDisenosUsuario(scene, objetosInteractuables, camera, controles, (nuevoCosto, idProyecto, nombreProyecto) => {
                costoTotal = nuevoCosto; 
                proyectoCargadoId = idProyecto;       // Memorizamos el ID
                proyectoCargadoNombre = nombreProyecto; // Memorizamos el Nombre
                
                if (uiTotal) {
                    uiTotal.textContent = `$${new Intl.NumberFormat('es-CL').format(costoTotal)}`;
                }
                actualizarListaUI();       
                recalcularTamanoTerreno(); 
            });
        });
    }

    function ajustarYAgregarModelo(gltfScene, anchoDeseado, altoDeseado, profundoDeseado) {
        // 1. Calcular tamaño original del archivo GLTF
        const boxOriginal = new THREE.Box3().setFromObject(gltfScene);
        const sizeOriginal = boxOriginal.getSize(new THREE.Vector3());

        // 2. Calcular los factores de escala necesarios
        const factorX = anchoDeseado / sizeOriginal.x;
        const factorY = altoDeseado / sizeOriginal.y;
        const factorZ = profundoDeseado / sizeOriginal.z;

        // 3. Aplicar escala al grupo principal
        gltfScene.scale.set(factorX, factorY, factorZ);

        // 4. Forzar actualización de la matriz para que el Bounding Box se recalcule correctamente
        gltfScene.updateMatrixWorld(true);

        // 5. Corregir altura para que no quede enterrado en el piso (Y = 0)
        const boxEscalado = new THREE.Box3().setFromObject(gltfScene);
        gltfScene.position.y = -boxEscalado.min.y; // Ajusta la base exactamente al suelo

        return gltfScene;
    }

    // --- Lógica del Botón Detalle ---
    const btnDetalle = document.getElementById('btn-detalle-materiales');
    const contenedorLista = document.getElementById('lista-objetos-container');
    const iconoDetalle = document.getElementById('icono-detalle');

    if (btnDetalle && contenedorLista) {
        // Aseguramos que inicie cerrado al cargar la página
        contenedorLista.style.display = 'none';
        if (iconoDetalle) iconoDetalle.textContent = '▶';

        // Lógica para abrir/cerrar al hacer clic
        btnDetalle.addEventListener('click', () => {
            if (contenedorLista.style.display === 'none' || contenedorLista.style.display === '') {
                contenedorLista.style.display = 'block'; // Muestra la lista
                if (iconoDetalle) iconoDetalle.textContent = '▼'; // Flecha abajo
            } else {
                contenedorLista.style.display = 'none'; // Oculta la lista
                if (iconoDetalle) iconoDetalle.textContent = '▶'; // Flecha lateral
            }
        });
    }

    cargarEscenaLocal();
    cargarCamaraLocal();
    actualizarListaUI(); 

    function animar() {
        requestAnimationFrame(animar);
        controles.update(); 
        renderer.render(scene, camera);
    }
    
    animar();

    window.cambiarTab = function(tabId, elementoBoton) {
        // 1. Ocultar todos los contenidos
        const contenidos = document.querySelectorAll('.contenido-tab');
        contenidos.forEach(contenido => {
            contenido.style.display = 'none';
        });
        // 2. Quitar la clase 'activo' de todos los botones
        const botones = document.querySelectorAll('.btn-tab');
        botones.forEach(boton => {
            boton.classList.remove('activo');
        });
        // 3. Mostrar el tab seleccionado
        const tabSeleccionado = document.getElementById(tabId);
        if (tabSeleccionado) {
            tabSeleccionado.style.display = 'block';
        }
        
        // 4. Marcar el botón presionado como activo
        if (elementoBoton) {
            elementoBoton.classList.add('activo');
        }
    };
});