// Esperar a que el DOM cargue
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('canvas-3d-container');
    if (!container) return;

    // Variables de presupuesto y estado
    let materialActual = 'madera';
    let precioActual = 15000;
    let costoTotal = 0;
    const uiTotal = document.getElementById('total-3d');
    
    // Configurar materiales visuales en Three.js
    const texturas = {
        madera: new THREE.MeshLambertMaterial({ color: 0x8b5a2b }), // Café
        ladrillo: new THREE.MeshLambertMaterial({ color: 0xb22222 }), // Rojo
        concreto: new THREE.MeshLambertMaterial({ color: 0x7f8c8d })  // Gris
    };

    // --- 1. Configuración Básica y Color de Fondo ---
    const scene = new THREE.Scene();
    
    // Configuramos un ancho y alto seguros por si el CSS se demora
    const anchoSeguro = container.clientWidth || 800;
    const altoSeguro = container.clientHeight || 600;

    const camera = new THREE.PerspectiveCamera(45, anchoSeguro / altoSeguro, 1, 10000);
    camera.position.set(500, 800, 1300);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(anchoSeguro, altoSeguro);
    // Forzamos color gris claro de fondo
    renderer.setClearColor(0xe0e0e0, 1); 
    container.appendChild(renderer.domElement);

    // --- 2. Ajuste automático al cambiar el tamaño de la ventana ---
    window.addEventListener('resize', () => {
        if (!container) return;
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    });

    // --- 3. Configuración de Rotación (OrbitControls) ---
    const controles = new THREE.OrbitControls(camera, renderer.domElement);
    controles.maxPolarAngle = Math.PI / 2; // Evita ver por debajo del piso
    controles.enableDamping = true; // Movimiento suave
    controles.dampingFactor = 0.05;
    controles.enableZoom = true;
    controles.target.set(0, 0, 0);

    // --- 4. Luces ---
    const ambientLight = new THREE.AmbientLight(0x707070); 
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 0.5).normalize();
    scene.add(directionalLight);

    // --- 5. Entorno (Cuadrícula y Ejes) ---
    const gridHelper = new THREE.GridHelper(1000, 20);
    scene.add(gridHelper);

    const ejesBlender = new THREE.AxesHelper(300);
    scene.add(ejesBlender);

    const geometryPlano = new THREE.PlaneGeometry(1000, 1000);
    geometryPlano.rotateX(-Math.PI / 2);
    const plano = new THREE.Mesh(geometryPlano, new THREE.MeshBasicMaterial({ visible: false }));
    scene.add(plano);

    const geometriaBloque = new THREE.BoxGeometry(50, 50, 50);
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const objetosInteractuables = [plano]; 

    // --- 6. Funciones de Interfaz (Botones) ---
    document.querySelectorAll('.btn-mat-3d').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.btn-mat-3d').forEach(b => b.classList.remove('activo'));
            this.classList.add('activo');
            materialActual = this.dataset.mat;
            precioActual = parseInt(this.dataset.precio);
        });
    });

    function actualizarPresupuesto(valor) {
        costoTotal += valor;
        if (uiTotal) {
            uiTotal.textContent = `$${new Intl.NumberFormat('es-CL').format(costoTotal)}`;
        }
    }

    // --- 7. LÓGICA DE CONSTRUCCIÓN INTELIGENTE ---
    let inicioX = 0;
    let inicioY = 0;

    renderer.domElement.addEventListener('pointerdown', (event) => {
        inicioX = event.clientX;
        inicioY = event.clientY;
    });

    renderer.domElement.addEventListener('pointerup', (event) => {
        const distanciaMovida = Math.abs(event.clientX - inicioX) + Math.abs(event.clientY - inicioY);
        
        // Si arrastró el ratón, fue para rotar la cámara. Cancelamos la construcción.
        if (distanciaMovida > 5) return; 

        // Si fue un clic rápido, calculamos posición
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersecciones = raycaster.intersectObjects(objetosInteractuables);

        if (intersecciones.length > 0) {
            const interseccion = intersecciones[0];

            if (event.shiftKey) {
                // Borrar bloque
                if (interseccion.object !== plano) {
                    scene.remove(interseccion.object);
                    objetosInteractuables.splice(objetosInteractuables.indexOf(interseccion.object), 1);
                    actualizarPresupuesto(-interseccion.object.userData.precio);
                }
            } else {
                // Construir bloque
                const voxel = new THREE.Mesh(geometriaBloque, texturas[materialActual]);
                voxel.position.copy(interseccion.point).add(interseccion.face.normal);
                voxel.position.divideScalar(50).floor().multiplyScalar(50).addScalar(25);
                
                voxel.userData = { precio: precioActual };
                
                scene.add(voxel);
                objetosInteractuables.push(voxel);
                actualizarPresupuesto(precioActual);
            }
        }
    });

    // --- 8. Bucle de Animación ---
    function animar() {
        requestAnimationFrame(animar);
        controles.update(); 
        renderer.render(scene, camera);
    }
    
    // Iniciar la magia
    animar();
});