// --- CONTROLADOR GLOBAL DE MENSAJES (MODAL PERSONALIZADO) ---
const DialogoUI = {
    elementos: function() {
        return {
            overlay: document.getElementById('modal-personalizado-overlay'),
            titulo: document.getElementById('modal-ui-titulo'),
            mensaje: document.getElementById('modal-ui-mensaje'),
            input: document.getElementById('modal-ui-input'),
            btnAceptar: document.getElementById('modal-ui-btn-aceptar'),
            btnCancelar: document.getElementById('modal-ui-btn-cancelar')
        };
    },
    mostrar: function({ tipo, titulo, mensaje, placeholder = '' }) {
        return new Promise((resolve) => {
            const el = this.elementos();
            if (!el.overlay) {
                console.error("No se encontró el modal en el HTML");
                resolve(null);
                return;
            }
            
            el.titulo.textContent = titulo;
            el.mensaje.textContent = mensaje;
            el.overlay.style.display = 'flex';

            if (tipo === 'alert') {
                el.btnCancelar.style.display = 'none';
                el.input.style.display = 'none';
            } else if (tipo === 'confirm') {
                el.btnCancelar.style.display = 'block';
                el.input.style.display = 'none';
            } else if (tipo === 'prompt') {
                el.btnCancelar.style.display = 'block';
                el.input.style.display = 'block';
                el.input.value = '';
                el.input.placeholder = placeholder;
                el.input.focus();
            }

            const nuevoBtnAceptar = el.btnAceptar.cloneNode(true);
            const nuevoBtnCancelar = el.btnCancelar.cloneNode(true);
            el.btnAceptar.replaceWith(nuevoBtnAceptar);
            el.btnCancelar.replaceWith(nuevoBtnCancelar);

            const cerrar = (valor) => {
                el.overlay.style.display = 'none';
                resolve(valor);
            };

            nuevoBtnAceptar.onclick = () => {
                if (tipo === 'prompt') cerrar(el.input.value);
                else cerrar(true);
            };

            nuevoBtnCancelar.onclick = () => cerrar(false);
        });
    },
    alert: (mensaje) => DialogoUI.mostrar({ tipo: 'alert', titulo: 'Atención', mensaje }),
    confirm: (mensaje) => DialogoUI.mostrar({ tipo: 'confirm', titulo: 'Confirmar Acción', mensaje }),
    prompt: (mensaje, placeholder) => DialogoUI.mostrar({ tipo: 'prompt', titulo: 'Ingreso Requerido', mensaje, placeholder })
};


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
    let escalaActual = 1.0; 
    let urlActual = null;          
    let texturaActual = 'concreto';
    let esModoOscuro = false; 
    const uiTotal = document.getElementById('total-3d');
    
    const texturas = {
        madera: new THREE.MeshLambertMaterial({ color: 0x8b5a2b }),
        ladrillo: new THREE.MeshLambertMaterial({ color: 0xb22222 }),
        concreto: new THREE.MeshLambertMaterial({ color: 0x7f8c8d })
    };

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
        escalaActual = 1.0; 
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

    const contenedorMateriales = document.getElementById('lista-materiales');
    const contenedorHabitaciones = document.getElementById('lista-habitaciones');

    [contenedorMateriales, contenedorHabitaciones].forEach(contenedor => {
        if (!contenedor) return;
        contenedor.addEventListener('wheel', (evento) => {
            if (evento.deltaY !== 0) {
                evento.preventDefault(); 
                
                contenedor.scrollBy({
                    left: evento.deltaY * 1.2, 
                    behavior: 'smooth'         
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
                contenedorHabitaciones.style.display = 'none'; 
            }
            const contenedorFiltros = document.getElementById('filtros-categorias');
            if (data.materiales && data.materiales.length > 0) {
                
                let categoriasDB = [...new Set(data.materiales.map(mat => mat.categoria))];
                const otrasCategorias = categoriasDB.filter(c => c !== 'Estructura' && c !== 'Sin Categoría');
                
                const categoriasUnicas = ['Todos'];
                if (categoriasDB.includes('Estructura')) categoriasUnicas.push('Estructura');
                categoriasUnicas.push(...otrasCategorias.sort()); 
                if (categoriasDB.includes('Sin Categoría')) categoriasUnicas.push('Sin Categoría');
                
                if (data.habitaciones && data.habitaciones.length > 0) {
                    categoriasUnicas.push('Módulos Prehechos');
                }
                
                if (contenedorFiltros) {
                    contenedorFiltros.innerHTML = '';
                    
                    categoriasUnicas.forEach((cat, index) => {
                        const btnTab = document.createElement('button');
                        btnTab.textContent = cat;
                        btnTab.className = `tab-categoria ${index === 0 ? 'activa' : ''}`;
                        btnTab.addEventListener('click', () => {
                            document.querySelectorAll('.tab-categoria').forEach(b => b.classList.remove('activa'));
                            btnTab.classList.add('activa');
                            
                            if (cat === 'Módulos Prehechos') {
                                if (contenedorMateriales) contenedorMateriales.style.display = 'none';
                                if (contenedorHabitaciones) contenedorHabitaciones.style.display = 'flex';
                            } else {
                                if (contenedorMateriales) contenedorMateriales.style.display = 'flex';
                                if (contenedorHabitaciones) contenedorHabitaciones.style.display = 'none';
                                
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
        if (event.key === '+' || event.key === '=') {
            escalaActual += 0.1;
            if (bloqueFantasma) bloqueFantasma.scale.set(escalaActual, escalaActual, escalaActual);
        }
        if (event.key === '-') {
            escalaActual = Math.max(0.1, escalaActual - 0.1); 
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
                escala: obj.userData.escala || 1.0
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
                        const escalaFinal = escalaBase * (item.escala || 1.0);
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

    function calcularPosicionSnappeada(interseccion, usarGrid = true) {
        const gridTamXZ = (modoConstruccion === 'habitacion') ? 200 : 50;
        const gridTamY = (modoConstruccion === 'habitacion') ? 100 : 50;
        
        const normal = interseccion.face ? interseccion.face.normal : new THREE.Vector3(0, 1, 0);
        const punto = interseccion.point.clone().add(normal.clone().multiplyScalar(0.1));
        
        const alturaMinima = modeloActualGLTF ? 0 : (gridTamY / 2);

        if (!usarGrid) {
            return { x: punto.x, y: Math.max(punto.y, alturaMinima), z: punto.z };
        }

        const posX = Math.floor(punto.x / gridTamXZ) * gridTamXZ + (gridTamXZ / 2);
        const posZ = Math.floor(punto.z / gridTamXZ) * gridTamXZ + (gridTamXZ / 2);
        
        let posY;
        if (modeloActualGLTF) {
            posY = Math.floor(punto.y / gridTamY) * gridTamY;
        } else {
            posY = Math.floor(punto.y / gridTamY) * gridTamY + (gridTamY / 2);
        }
        
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

        if (event.shiftKey) { 
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
        } else { 
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
                nuevoObjeto.scale.set(escalaActual, escalaActual, escalaActual);
                nuevoObjeto.userData = { precio: precioActual, tipo: modoConstruccion, url3D: urlActual, textura: texturaActual, nombre: nombreActual, escala: escalaActual };
                
                scene.add(nuevoObjeto);
                objetosInteractuables.push(nuevoObjeto);
                
                recalcularTamanoTerreno(); 
                actualizarPresupuesto(precioActual);
                guardarEscenaLocal();
            }
        }
    });

    const btnModoOscuro = document.getElementById('btn-modo-oscuro');
    esModoOscuro = localStorage.getItem('modo_oscuro_homecount') === 'true';
    function aplicarTemaVisual(oscuro) {
        document.body.classList.toggle('tema-oscuro', oscuro);

        if (oscuro) {
            renderer.setClearColor(0x1a1a1a, 1); 
            if (gridHelper && gridHelper.material) gridHelper.material.color.setHex(0x777777); 
            if (btnModoOscuro) btnModoOscuro.textContent = '☀️'; 
        } else {
            renderer.setClearColor(0xe0e0e0, 1); 
            if (gridHelper && gridHelper.material) gridHelper.material.color.setHex(0x888888); 
            if (btnModoOscuro) btnModoOscuro.textContent = '🌙'; 
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
        btnBorrarTodo.addEventListener('click', async () => {
            const seguro = await DialogoUI.confirm("¿Estás seguro de que deseas borrar todo el diseño? Esta acción no se puede deshacer.");
            if (seguro) {
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

    let proyectoCargadoId = null;
    let proyectoCargadoNombre = "";

    const btnGuardarModelo = document.getElementById('btn-guardar-modelo');
    const btnMisModelos = document.getElementById('btn-mis-modelos');

    if (btnGuardarModelo) {
        btnGuardarModelo.addEventListener('click', (e) => {
            e.preventDefault();
            procesarGuardado(objetosInteractuables, camera, controles, costoTotal, scene, renderer, proyectoCargadoId, proyectoCargadoNombre);
        });
    }

    if (btnMisModelos) {
        btnMisModelos.addEventListener('click', (e) => {
            e.preventDefault();
            cargarDisenosUsuario(scene, objetosInteractuables, camera, controles, (nuevoCosto, idProyecto, nombreProyecto) => {
                costoTotal = nuevoCosto; 
                proyectoCargadoId = idProyecto;       
                proyectoCargadoNombre = nombreProyecto; 
                
                if (uiTotal) {
                    uiTotal.textContent = `$${new Intl.NumberFormat('es-CL').format(costoTotal)}`;
                }
                actualizarListaUI();       
                recalcularTamanoTerreno(); 
            });
        });
    }

    function ajustarYAgregarModelo(gltfScene, anchoDeseado, altoDeseado, profundoDeseado) {
        const boxOriginal = new THREE.Box3().setFromObject(gltfScene);
        const sizeOriginal = boxOriginal.getSize(new THREE.Vector3());

        const factorX = anchoDeseado / sizeOriginal.x;
        const factorY = altoDeseado / sizeOriginal.y;
        const factorZ = profundoDeseado / sizeOriginal.z;

        gltfScene.scale.set(factorX, factorY, factorZ);
        gltfScene.updateMatrixWorld(true);

        const boxEscalado = new THREE.Box3().setFromObject(gltfScene);
        gltfScene.position.y = -boxEscalado.min.y; 

        return gltfScene;
    }

    const btnDetalle = document.getElementById('btn-detalle-materiales');
    const contenedorLista = document.getElementById('lista-objetos-container');
    const iconoDetalle = document.getElementById('icono-detalle');

    if (btnDetalle && contenedorLista) {
        contenedorLista.style.display = 'none';
        if (iconoDetalle) iconoDetalle.textContent = '▶';

        btnDetalle.addEventListener('click', () => {
            if (contenedorLista.style.display === 'none' || contenedorLista.style.display === '') {
                contenedorLista.style.display = 'block'; 
                if (iconoDetalle) iconoDetalle.textContent = '▼'; 
            } else {
                contenedorLista.style.display = 'none'; 
                if (iconoDetalle) iconoDetalle.textContent = '▶'; 
            }
        });
    }

    cargarEscenaLocal();
    cargarCamaraLocal();
    actualizarListaUI(); 

    const mapaCategoriasMateriales = window.mapaCategoriasMateriales || {};

    function obtenerCalculoDimensiones() {
        const TAMANO_CELDA = 50; // 50 unidades = 1 metro
        const celdas = new Set();

        // Accede directamente a objetosInteractuables de script_casa1
        for (let i = 1; i < objetosInteractuables.length; i++) {
            const obj = objetosInteractuables[i];
            if (!obj || !obj.userData) continue;

            let cat = obj.userData.categoria || '';
            const tipo = obj.userData.tipo || '';
            const nombre = (obj.userData.nombre || '').toLowerCase();

            if (!cat && obj.userData.nombre && mapaCategoriasMateriales[obj.userData.nombre]) {
                cat = mapaCategoriasMateriales[obj.userData.nombre];
                obj.userData.categoria = cat;
            }

            const esModulo = cat === 'modulo_prehecho' || tipo === 'habitacion';
            const esEstructura = cat.toLowerCase() === 'estructura' ||
                (!cat && (nombre.includes('wall') || nombre.includes('doorway') || nombre.includes('paneling') || nombre.includes('stairs') || nombre.includes('floor')));

            if (!esEstructura && !esModulo) continue; 

            const tamCeldasOcupadas = esModulo ? 4 : 1;
            const tamMundo = tamCeldasOcupadas * TAMANO_CELDA;

            const gridX = Math.round((obj.position.x - tamMundo / 2) / TAMANO_CELDA);
            const gridZ = Math.round((obj.position.z - tamMundo / 2) / TAMANO_CELDA);

            for (let dx = 0; dx < tamCeldasOcupadas; dx++) {
                for (let dz = 0; dz < tamCeldasOcupadas; dz++) {
                    celdas.add(`${gridX + dx},${gridZ + dz}`);
                }
            }
        }

        if (celdas.size === 0) return { perimetro: 0, area: 0 };

        const vecinos = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        let ladosExteriores = 0;

        for (const celda of celdas) {
            const parts = celda.split(',');
            const cx = parseInt(parts[0], 10);
            const cz = parseInt(parts[1], 10);
            for (const [vx, vz] of vecinos) {
                if (!celdas.has(`${cx + vx},${cz + vz}`)) {
                    ladosExteriores++;
                }
            }
        }

        return { perimetro: ladosExteriores, area: celdas.size };
    }
    // Se exporta a window para que los botones del HTML puedan llamarla
    window.obtenerCalculoDimensiones = obtenerCalculoDimensiones;

    function calcularYMostrarPerimetro() {
        const dim = obtenerCalculoDimensiones();
        // Usa el DialogoUI que ya tienes configurado en script_casa1.js
        if(typeof DialogoUI !== 'undefined') {
            DialogoUI.alert(`📐 Resultados del terreno:\n\n• Perímetro Exterior: ${dim.perimetro} metros.\n• Área Construida: ${dim.area} m².`);
        } else {
            alert(`Perímetro: ${dim.perimetro}m | Área: ${dim.area}m²`);
        }
    }
    window.calcularYMostrarPerimetro = calcularYMostrarPerimetro;

    // --- RECOPILACIÓN DE DATOS PARA EL INFORME ---
    function obtenerDatosInforme() {
        const dim = obtenerCalculoDimensiones();
        const conteo = {};
        let totalPiezas = 0;

        // Accede directamente a objetosInteractuables y costoTotal
        for (let i = 1; i < objetosInteractuables.length; i++) {
            const obj = objetosInteractuables[i];
            if (!obj || !obj.userData) continue;

            totalPiezas++;
            const nombre = obj.userData.nombre || (obj.userData.tipo === 'habitacion' ? 'Módulo Habitacional' : 'Material');
            const precio = Number(obj.userData.precio) || 0;
            let categoria = obj.userData.categoria || '';

            if (!categoria && mapaCategoriasMateriales[nombre]) categoria = mapaCategoriasMateriales[nombre];
            if (!categoria) categoria = obj.userData.tipo === 'habitacion' ? 'Módulos Prehechos' : 'General';

            if (!conteo[nombre]) {
                conteo[nombre] = { nombre: nombre, categoria: categoria, tipo: obj.userData.tipo || 'material', cantidad: 0, precioUnitario: precio, subtotal: 0 };
            }
            conteo[nombre].cantidad += 1;
            conteo[nombre].subtotal += precio;
        }

        const ahora = new Date();
        const fechaFormateada = ahora.toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' });
        const horaFormateada = ahora.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
        const folio = 'HC-' + ahora.getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);

        return {
            folio: folio, fecha: `${fechaFormateada}, ${horaFormateada} hrs`,
            perimetro: dim.perimetro, area: dim.area, costoTotal: costoTotal,
            totalPiezas: totalPiezas, items: Object.values(conteo)
        };
    }

    // --- GENERADOR DE HTML PROFESIONAL PARA EL INFORME ---
    function generarHTMLInforme(datos, paraPDF = false) {
        const formatear = (valor) => new Intl.NumberFormat('es-CL').format(valor);
        const filasTabla = datos.items.map((item, idx) => {
            const esEstructura = item.categoria.toLowerCase() === 'estructura';
            const esModulo = item.tipo === 'habitacion' || item.categoria === 'modulo_prehecho';
            const badgeClass = esEstructura ? 'badge-estructura' : (esModulo ? 'badge-modulo' : 'badge-general');

            return `
                <tr>
                    <td style="text-align: center; color: #64748b;">${idx + 1}</td>
                    <td><strong>${item.nombre}</strong></td>
                    <td><span class="badge ${badgeClass}">${item.categoria}</span></td>
                    <td class="td-num"><strong>${item.cantidad}</strong></td>
                    <td class="td-num">$${formatear(item.precioUnitario)} CLP</td>
                    <td class="td-num" style="color: #2c3e50; font-weight: 700;">$${formatear(item.subtotal)} CLP</td>
                </tr>`;
        }).join('');

        return `<!DOCTYPE html>
    <html lang="es">
    <head>
    <meta charset="UTF-8"><title>Informe de Construcción - Folio ${datos.folio}</title>
    <style>
        body { font-family: 'Segoe UI', sans-serif; color: #1e293b; padding: ${paraPDF ? '16px' : '32px 24px'}; line-height: 1.5; }
        .informe-wrapper { max-width: 820px; margin: 0 auto; }
        .barra-superior-acciones { display: flex; justify-content: space-between; align-items: center; background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px 18px; margin-bottom: 24px; border-radius: 10px; }
        .btn-accion-print { background: #e67e22; color: #fff; border: none; padding: 8px 16px; border-radius: 6px; font-weight: bold; cursor: pointer; }
        .header-informe { display: flex; justify-content: space-between; border-bottom: 3px solid #e67e22; padding-bottom: 18px; margin-bottom: 24px; }
        .logo-box h1 { margin: 0; color: #2c3e50; } .logo-box h1 span { color: #e67e22; }
        .meta-folio { font-size: 15px; font-weight: bold; color: #e67e22; }
        table.tabla-informe { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 12px; }
        table.tabla-informe th { background: #f1f5f9; text-align: left; padding: 10px; border-bottom: 2px solid #cbd5e1; }
        table.tabla-informe td { padding: 9px; border-bottom: 1px solid #f1f5f9; }
        .td-num { text-align: right; }
        .badge { font-size: 10px; padding: 2px 8px; border-radius: 10px; font-weight: bold; }
        .badge-estructura { background: #ffedd5; color: #c2410c; }
        .badge-modulo { background: #e0e7ff; color: #4338ca; }
        .badge-general { background: #f1f5f9; color: #475569; }
        .fila-total td { background: #f8fafc; font-weight: bold; font-size: 14px; padding: 12px; }
        @media print { .no-print { display: none !important; } }
    </style>
    </head>
    <body>
    <div class="informe-wrapper">
        ${!paraPDF ? `<div class="barra-superior-acciones no-print"><span>📄 Vista previa.</span><button class="btn-accion-print" onclick="window.print()">🖨️ Imprimir / PDF</button></div>` : ''}
        <div class="header-informe">
            <div class="logo-box"><h1>HomeCount <span>Simulator</span></h1><p>Informe Técnico de Construcción</p></div>
            <div class="meta-box"><div class="meta-folio">FOLIO: ${datos.folio}</div><div>Fecha: ${datos.fecha}</div></div>
        </div>
        <div style="display:flex; justify-content:space-between; margin-bottom: 20px;">
            <div><strong>Perímetro:</strong> <span style="color:#e67e22">${datos.perimetro} m</span></div>
            <div><strong>Área:</strong> <span style="color:#2c3e50">${datos.area} m²</span></div>
            <div><strong>Costo:</strong> <span style="color:#27ae60">$${formatear(datos.costoTotal)}</span></div>
        </div>
        <table class="tabla-informe">
            <thead><tr><th>#</th><th>Artículo</th><th>Categoría</th><th class="td-num">Cant.</th><th class="td-num">P. Unit.</th><th class="td-num">Subtotal</th></tr></thead>
            <tbody>
                ${filasTabla}
                <tr class="fila-total"><td colspan="3" align="right">Total (${datos.totalPiezas} piezas):</td><td class="td-num">${datos.totalPiezas}</td><td></td><td class="td-num" style="color: #27ae60;">$${formatear(datos.costoTotal)} CLP</td></tr>
            </tbody>
        </table>
    </div>
    </body>
    </html>`;
    }

    // --- ACCIONES DEL MODAL Y DESCARGA ---
    window.abrirModalInforme = function() {
        const datos = obtenerDatosInforme();
        if (datos.totalPiezas === 0) {
            if(typeof DialogoUI !== 'undefined') DialogoUI.alert("No hay elementos construidos para generar un informe.");
            else alert("No hay elementos construidos en la escena.");
            return;
        }
        const contenedorResumen = document.getElementById('resumen-modal-informe');
        if (contenedorResumen) {
            contenedorResumen.innerHTML = `
                <div class="resumen-item"><span class="resumen-label">Perímetro Exterior</span><span class="resumen-valor">${datos.perimetro} m</span></div>
                <div class="resumen-item"><span class="resumen-label">Área Construida</span><span class="resumen-valor">${datos.area} m²</span></div>
                <div class="resumen-item"><span class="resumen-label">Total Artículos</span><span class="resumen-valor">${datos.totalPiezas} piezas</span></div>
                <div class="resumen-item"><span class="resumen-label">Presupuesto</span><span class="resumen-valor valor-costo">$${new Intl.NumberFormat('es-CL').format(datos.costoTotal)}</span></div>
            `;
        }
        const modal = document.getElementById('modal-informe');
        if (modal) modal.style.display = 'flex';
    };

    window.cerrarModalInforme = function() {
        const modal = document.getElementById('modal-informe');
        if (modal) modal.style.display = 'none';
    };

    // Descarga en PDF mediante html2pdf (Asegúrate de tener el script importado en HTML)
    window.descargarInformePDF = function() {
        const datos = obtenerDatosInforme();
        if (datos.totalPiezas === 0) return;

        if (typeof html2pdf !== 'undefined') {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = generarHTMLInforme(datos, true);
            tempDiv.style.position = 'fixed';
            tempDiv.style.left = '-9999px';
            tempDiv.style.top = '0';
            tempDiv.style.width = '780px';
            tempDiv.style.background = '#ffffff';
            document.body.appendChild(tempDiv);

            const btnPdf = document.querySelector('.btn-descarga-pdf strong');
            const textoOriginal = btnPdf ? btnPdf.textContent : '';
            if (btnPdf) btnPdf.textContent = 'Generando archivo PDF...';

            const opt = {
                margin: [8, 8, 8, 8],
                filename: `Informe_Construccion_HomeCount_${datos.folio}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true, logging: false },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

            html2pdf().set(opt).from(tempDiv).save()
                .then(() => {
                    if (btnPdf) btnPdf.textContent = textoOriginal;
                    if (tempDiv.parentNode) tempDiv.parentNode.removeChild(tempDiv);
                    cerrarModalInforme();
                })
                .catch(err => {
                    console.error("Error generando PDF con html2pdf:", err);
                    if (btnPdf) btnPdf.textContent = textoOriginal;
                    if (tempDiv.parentNode) tempDiv.parentNode.removeChild(tempDiv);
                    descargarInformeHTML();
                });
        } else {
            descargarInformeHTML();
        }
    };

    window.descargarInformeHTML = function() {
        const datos = obtenerDatosInforme();
        if (datos.totalPiezas === 0) return;
        const blob = new Blob([generarHTMLInforme(datos, false)], { type: 'text/html;charset=utf-8' });
        const enlace = document.createElement('a');
        enlace.href = URL.createObjectURL(blob);
        enlace.download = `Informe_HomeCount_${datos.folio}.html`;
        enlace.click();
        URL.revokeObjectURL(enlace.href);
        cerrarModalInforme();
    };

    window.imprimirInforme = function() {
        const datos = obtenerDatosInforme();
        if (datos.totalPiezas === 0) return;
        const ventana = window.open('', '_blank');
        if (ventana) {
            ventana.document.write(generarHTMLInforme(datos, false));
            ventana.document.close();
            ventana.focus();
            setTimeout(() => ventana.print(), 350);
        } else {
            if(typeof DialogoUI !== 'undefined') DialogoUI.alert("El navegador bloqueó la ventana emergente.");
        }
    };

    // Eventos para cerrar modal con clic fuera o escape
    document.addEventListener('DOMContentLoaded', () => {
        const modalInformeEl = document.getElementById('modal-informe');
        if (modalInformeEl) {
            modalInformeEl.addEventListener('click', (e) => {
                if (e.target === modalInformeEl) cerrarModalInforme();
            });
        }
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') cerrarModalInforme();
        });
    });
    
    
    function animar() {
        requestAnimationFrame(animar);
        controles.update(); 
        renderer.render(scene, camera);
    }
    
    animar();
    
    window.cambiarTab = function(tabId, elementoBoton) {
        const contenidos = document.querySelectorAll('.contenido-tab');
        contenidos.forEach(contenido => {
            contenido.style.display = 'none';
        });
        const botones = document.querySelectorAll('.btn-tab');
        botones.forEach(boton => {
            boton.classList.remove('activo');
        });
        const tabSeleccionado = document.getElementById(tabId);
        if (tabSeleccionado) {
            tabSeleccionado.style.display = 'block';
        }
        if (elementoBoton) {
            elementoBoton.classList.add('activo');
        }
    };
});