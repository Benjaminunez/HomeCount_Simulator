import json
import requests
from django.shortcuts import render, redirect
from django.contrib.auth.forms import UserCreationForm, AuthenticationForm
from django.contrib.auth import login, logout, authenticate
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie

from .models import ModeloCasa, Material, Habitacion, Proyecto3D


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
                "imagen": mat.imagen.url if mat.imagen and mat.imagen.name else None
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
            nuevo_material = Material.objects.create(
                nombre=body.get('nombre'),
                coste=body.get('coste'),
                dimensiones=body.get('dimensiones', ''),
                unidad_medida=body.get('unidad_medida', 'Unidad')
            )
            return JsonResponse({"mensaje": "Material creado exitosamente", "id": nuevo_material.id}, status=201)
            
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

@login_required
def guardar_diseno(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            
            proyecto = Proyecto3D.objects.create(
                usuario=request.user, 
                nombre=data.get('nombre_proyecto', 'Sin nombre'),
                costo_total=data.get('costo_total', 0),
                datos_escena=data.get('datos_escena', []),
                datos_camara=data.get('datos_camara', {})
            )
            
            return JsonResponse({'estado': 'exito', 'mensaje': 'Proyecto guardado correctamente.', 'id': proyecto.id})
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
            'datos_camara': p.datos_camara
        }
        for p in proyectos
    ]
        
    return JsonResponse({'estado': 'exito', 'disenos': lista})