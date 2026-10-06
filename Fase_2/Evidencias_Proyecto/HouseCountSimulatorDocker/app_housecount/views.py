import json
import requests
from django.shortcuts import render, redirect
from django.contrib.auth.forms import UserCreationForm, AuthenticationForm
from django.contrib.auth import login, logout, authenticate
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie

from .models import ModeloCasa, Material, Habitacion, Proyecto3D, CategoriaMaterial


# --- Vistas de Navegación HTML ---

def inicio(request): 
    return render(request, 'inicio.html')

def contrucion(request): 
    return render(request, 'contrucion.html')

def creacion_de_casas(request): 
    return render(request, 'creacion_de_Casas.html')

def casas_modelo_1(request): 
    return render(request, 'casas_modelo_1.html')

def casas_rapidas(request):
    modelos = ModeloCasa.objects.all()

    precio_max = request.GET.get('precio_max')
    m2_min = request.GET.get('m2_min')
    habitaciones = request.GET.get('habitaciones')
    banos = request.GET.get('banos')
    
    if precio_max:
        modelos = modelos.filter(precio__lte=precio_max)
    if m2_min:
        modelos = modelos.filter(metros_cuadrados__gte=m2_min)
    if habitaciones:
        modelos = modelos.filter(habitaciones__gte=habitaciones)
    if banos:
        modelos = modelos.filter(banos__gte=banos)

    casas_mercado = []
    
    try:
        url_api = "https://gist.githubusercontent.com/Benjaminunez/b367b26daa23044dd9ee7ee14ad3a8e0/raw/ac4792063436f31d0218f2025dccac3a2a285753/casas_api.json" 
        respuesta = requests.get(url_api, timeout=5)
        if respuesta.status_code == 200:
            casas_mercado = respuesta.json()
    except Exception as e:
        print(f"Error al conectar con la API: {e}")
    
    context = {
        'modelos': modelos,
        'filtros': {
            'precio_max': precio_max or '',
            'm2_min': m2_min or '',
            'habitaciones': habitaciones or '',
            'banos': banos or '',
        },
        'casas_mercado': casas_mercado,
    }
        
    return render(request, 'casas_rapidas.html', context)


# --- API para Propiedades (Postman / Integraciones) ---

def casa_a_dict(casa):
    return {
        'id': casa.id,
        'nombre': casa.nombre,
        'metros_cuadrados': casa.metros_cuadrados,
        'habitaciones': casa.habitaciones,
        'banos': casa.banos,
        'descripcion': casa.descripcion,
        'precio': casa.precio,
        'imagen': casa.imagen.url if casa.imagen else None
    }

@csrf_exempt
def api_propiedades_unica(request):
    if request.method == 'GET':
        casa_id = request.GET.get('id')
        if casa_id:
            try:
                casa = ModeloCasa.objects.get(id=casa_id)
                return JsonResponse(casa_a_dict(casa), status=200)
            except ModeloCasa.DoesNotExist:
                return JsonResponse({'error': f'Propiedad con ID {casa_id} no encontrada'}, status=404)
        else:
            casas = ModeloCasa.objects.all()
            return JsonResponse({'propiedades': [casa_a_dict(c) for c in casas]}, status=200)

    elif request.method == 'POST':
        try:
            data = json.loads(request.body)
            if isinstance(data, list):
                casas_creadas = []
                for item in data:
                    casa = ModeloCasa.objects.create(
                        nombre=item.get('nombre'),
                        metros_cuadrados=item.get('metros_cuadrados'),
                        habitaciones=item.get('habitaciones'),
                        banos=item.get('banos'),
                        descripcion=item.get('descripcion'),
                        precio=item.get('precio')
                    )
                    casas_creadas.append(casa.id)
                return JsonResponse({'mensaje': f'Se crearon {len(casas_creadas)} propiedades.', 'ids': casas_creadas}, status=201)
            else:
                casa = ModeloCasa.objects.create(
                    nombre=data.get('nombre'),
                    metros_cuadrados=data.get('metros_cuadrados'),
                    habitaciones=data.get('habitaciones'),
                    banos=data.get('banos'),
                    descripcion=data.get('descripcion'),
                    precio=data.get('precio')
                )
                return JsonResponse({'mensaje': 'Propiedad creada exitosamente', 'id': casa.id}, status=201)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)

    elif request.method in ['PUT', 'PATCH']:
        try:
            data = json.loads(request.body)
            casa_id = data.get('id')
            if not casa_id:
                return JsonResponse({'error': 'Debes incluir el "id" en el JSON para actualizar'}, status=400)
                
            casa = ModeloCasa.objects.get(id=casa_id)
            casa.nombre = data.get('nombre', casa.nombre)
            casa.metros_cuadrados = data.get('metros_cuadrados', casa.metros_cuadrados)
            casa.habitaciones = data.get('habitaciones', casa.habitaciones)
            casa.banos = data.get('banos', casa.banos)
            casa.descripcion = data.get('descripcion', casa.descripcion)
            casa.precio = data.get('precio', casa.precio)
            casa.save()
            return JsonResponse({'mensaje': 'Propiedad actualizada exitosamente', 'propiedad': casa_a_dict(casa)}, status=200)
            
        except ModeloCasa.DoesNotExist:
            return JsonResponse({'error': 'Propiedad no encontrada'}, status=404)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)

    elif request.method == 'DELETE':
        try:
            casa_id = request.GET.get('id')
            if not casa_id:
                data = json.loads(request.body)
                casa_id = data.get('id')
                
            if not casa_id:
                return JsonResponse({'error': 'Debes enviar el id para eliminar'}, status=400)
                
            casa = ModeloCasa.objects.get(id=casa_id)
            casa.delete()
            return JsonResponse({'mensaje': f'Propiedad con ID {casa_id} eliminada exitosamente'}, status=200)
            
        except ModeloCasa.DoesNotExist:
            return JsonResponse({'error': 'Propiedad no encontrada'}, status=404)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)

    return JsonResponse({'error': 'Método no permitido'}, status=405)


# --- API para Materiales y Módulos 3D ---

@csrf_exempt
def api_materiales_3d(request):
    if request.method == 'GET':
        materiales = Material.objects.all()
        habitaciones = Habitacion.objects.prefetch_related('detalles_materiales__material').all()
        
        lista_materiales = [
            {
                "id": mat.id,
                "nombre": mat.nombre,
                "coste": mat.coste,
                "textura_key": mat.nombre.split()[0].lower() if mat.nombre else "default",
                "archivo_3d": mat.archivo_3d.url if mat.archivo_3d and mat.archivo_3d.name else None,
                "imagen": mat.imagen.url if mat.imagen and mat.imagen.name else None,
                "categoria": mat.categoria.nombre if mat.categoria else "Sin Categoría"
            }
            for mat in materiales
        ]
            
        lista_habitaciones = [
            {
                "id": hab.id,
                "nombre": hab.nombre_modulo,
                "dimensiones": hab.dimensiones,
                "coste_total": hab.coste_total,  
                "materiales": [
                    {
                        "material": detalle.material.nombre,
                        "cantidad": detalle.cantidad,
                        "subtotal": detalle.coste_subtotal
                    }
                    for detalle in hab.detalles_materiales.all()
                ],
                "archivo_3d": hab.archivo_3d.url if hab.archivo_3d and hab.archivo_3d.name else None,
                "imagen": hab.imagen.url if hab.imagen and hab.imagen.name else None
            }
            for hab in habitaciones
        ]
            
        return JsonResponse({
            "materiales": lista_materiales,
            "habitaciones": lista_habitaciones
        }, safe=False)
        
    elif request.method == 'POST':
        try:
            body = json.loads(request.body)
            
            def crear_material(item):
                nombre_cat = item.get('categoria')
                cat_obj = None
                if nombre_cat:
                    cat_obj, _ = CategoriaMaterial.objects.get_or_create(nombre=nombre_cat)
                return Material.objects.create(
                    nombre=item.get('nombre'),
                    coste=item.get('coste', 0),
                    dimensiones=item.get('dimensiones', ''),
                    unidad_medida=item.get('unidad_medida', 'Unidad'),
                    categoria=cat_obj
                )

            if isinstance(body, list):
                creados = [crear_material(item).id for item in body]
                return JsonResponse({"mensaje": f"Se crearon {len(creados)} materiales exitosamente.", "ids": creados}, status=201)
            else:
                mat = crear_material(body)
                return JsonResponse({"mensaje": "Material creado exitosamente", "id": mat.id}, status=201)
                
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)


# --- Autenticación de Usuarios ---

def registro(request):
    if request.method == 'POST':
        form = UserCreationForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            messages.success(request, f"¡Bienvenido {user.username}! Tu cuenta ha sido creada.")
            return redirect('inicio')
    else:
        form = UserCreationForm()
    return render(request, 'registroUser.html', {'form': form})

def iniciar_sesion(request):
    if request.method == 'POST':
        form = AuthenticationForm(request, data=request.POST)
        if form.is_valid():
            username = form.cleaned_data.get('username')
            password = form.cleaned_data.get('password')
            user = authenticate(username=username, password=password)
            if user is not None:
                login(request, user)
                messages.success(request, f"Has iniciado sesión como {username}.")
                return redirect('inicio')
        else:
            messages.error(request, "Usuario o contraseña incorrectos.")
    else:
        form = AuthenticationForm()
    return render(request, 'loginUser.html', {'form': form})

def cerrar_sesion(request):
    logout(request)
    messages.info(request, "Has cerrado sesión exitosamente.")
    return redirect('inicio')


# --- Guardar / Cargar Escenas 3D (Vinculado con el usuario activo) ---

# Asegúrate de agregar estas importaciones al inicio de tu archivo views.py
import base64
from django.core.files.base import ContentFile

@login_required
def guardar_diseno(request):
    if request.method == 'POST':
        try:
            # 1. Leer los datos enviados
            data = json.loads(request.body)
            
            # 2. Extraer información básica
            proyecto_id = data.get('proyecto_id', None) # 🔑 NUEVO: Rescatamos el ID
            nombre = data.get('nombre_proyecto', 'Sin nombre')
            costo_total = data.get('costo_total', 0)
            datos_escena = data.get('datos_escena', [])
            datos_camara = data.get('datos_camara', {})
            captura_base64 = data.get('captura_base64', None)
            
            # 3. VERIFICAR SI ACTUALIZAMOS O CREAMOS
            if proyecto_id:
                # Buscamos el proyecto existente (asegurándonos de que pertenezca al usuario)
                proyecto = Proyecto3D.objects.get(id=proyecto_id, usuario=request.user)
                proyecto.nombre = nombre
                proyecto.costo_total = costo_total
                proyecto.datos_escena = datos_escena
                proyecto.datos_camara = datos_camara
            else:
                # Si no hay ID, creamos un registro totalmente nuevo
                proyecto = Proyecto3D(
                    usuario=request.user, 
                    nombre=nombre,
                    costo_total=costo_total,
                    datos_escena=datos_escena,
                    datos_camara=datos_camara
                )
            
            # 4. Decodificar la imagen Base64 y guardarla/sobrescribirla
            if captura_base64 and ';base64,' in captura_base64:
                # Separar el encabezado de los datos puros
                formato, imgstr = captura_base64.split(';base64,') 
                ext = formato.split('/')[-1] 
                
                # Generar un nombre de archivo
                nombre_archivo = f"diseno_{request.user.username}_{nombre.replace(' ', '_')}.{ext}"
                
                # Opcional pero recomendado: Si estamos sobrescribiendo, borramos la imagen física anterior para no acumular basura
                if proyecto_id and proyecto.imagen_captura:
                    proyecto.imagen_captura.delete(save=False)
                
                # Guardar la nueva captura
                proyecto.imagen_captura.save(
                    nombre_archivo, 
                    ContentFile(base64.b64decode(imgstr)), 
                    save=False 
                )
            
            # 5. Guardar definitivamente en la base de datos (Ejecuta UPDATE o INSERT según corresponda)
            proyecto.save()
            
            return JsonResponse({
                'estado': 'exito', 
                'mensaje': 'Proyecto guardado/actualizado correctamente.', 
                'id': proyecto.id
            })
            
        except Proyecto3D.DoesNotExist:
            return JsonResponse({'estado': 'error', 'mensaje': 'El proyecto a modificar no existe o no tienes permisos.'}, status=404)
        except Exception as e:
            return JsonResponse({'estado': 'error', 'mensaje': str(e)}, status=400)
            
    return JsonResponse({'estado': 'error', 'mensaje': 'Método no permitido'}, status=405)

@ensure_csrf_cookie
def obtener_disenos(request):
    if not request.user.is_authenticated:
        return JsonResponse({'estado': 'error', 'mensaje': 'Debes iniciar sesión.'}, status=403)
    
    proyectos = Proyecto3D.objects.filter(usuario=request.user).order_by('-fecha_creacion')
    lista = [
        {
            'id': p.id,
            'nombre': p.nombre,
            'costo_total': float(p.costo_total),
            'fecha': p.fecha_creacion.strftime('%d/%m/%Y %H:%M'),
            'datos_escena': p.datos_escena,
            'datos_camara': p.datos_camara,
            # --- NUEVOS DATOS ---
            'imagen_url': p.imagen_captura.url if p.imagen_captura else None,
            'area_cuadrada': float(p.area_cuadrada) if p.area_cuadrada else 0.0
        }
        for p in proyectos
    ]
        
    return JsonResponse({'estado': 'exito', 'disenos': lista})