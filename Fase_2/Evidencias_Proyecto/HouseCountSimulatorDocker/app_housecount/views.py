from django.shortcuts import render
from .models import ModeloCasa
import requests
import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .models import ModeloCasa

def inicio(request): return render(request, 'inicio.html')
def contrucion(request): return render(request, 'contrucion.html')
def casas_rapidas(request): return render(request, 'casas_rapidas.html')
def creacion_de_casas(request): return render(request, 'creacion_de_Casas.html')
def casas_modelo_1(request): return render(request, 'casas_modelo_1.html')

def casas_rapidas(request):
    # 1. Traer todos los modelos por defecto
    modelos = ModeloCasa.objects.all()

    # 2. Capturar los parámetros enviados por la URL (GET)
    precio_max = request.GET.get('precio_max')
    m2_min = request.GET.get('m2_min')
    habitaciones = request.GET.get('habitaciones')
    banos = request.GET.get('banos')
    
    # 3. Aplicar los filtros solo si el usuario ingresó un valor
    if precio_max:
        modelos = modelos.filter(precio__lte=precio_max)  # lte = Menor o igual a
    if m2_min:
        modelos = modelos.filter(metros_cuadrados__gte=m2_min)  # gte = Mayor o igual a
    if habitaciones:
        modelos = modelos.filter(habitaciones__gte=habitaciones)
    if banos:
        modelos = modelos.filter(banos__gte=banos)

    casas_mercado = []
    
    try:
        
        url_api = "https://gist.githubusercontent.com/Benjaminunez/b367b26daa23044dd9ee7ee14ad3a8e0/raw/ac4792063436f31d0218f2025dccac3a2a285753/casas_api.json" 
        
        # Una petición limpia, sin headers ni bloqueos
        respuesta = requests.get(url_api, timeout=5)
        
        if respuesta.status_code == 200:
            casas_mercado = respuesta.json() # Los datos ya vienen listos
            
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

# metodo para la recepción de información generada por postman y que llegue al deb del HouseCount
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
    # -------------------------------------------------------------
    # GET: Leer todas o leer una sola (si se envía ?id=X)
    # -------------------------------------------------------------
    if request.method == 'GET':
        casa_id = request.GET.get('id') # Busca si hay un ?id= en la URL
        
        if casa_id:
            try:
                casa = ModeloCasa.objects.get(id=casa_id)
                return JsonResponse(casa_a_dict(casa), status=200)
            except ModeloCasa.DoesNotExist:
                return JsonResponse({'error': f'Propiedad con ID {casa_id} no encontrada'}, status=404)
        else:
            casas = ModeloCasa.objects.all()
            return JsonResponse({'propiedades': [casa_a_dict(c) for c in casas]}, status=200)

    # -------------------------------------------------------------
    # POST: Crear una o varias propiedades
    # -------------------------------------------------------------
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

    # -------------------------------------------------------------
    # PUT / PATCH: Actualizar (El ID debe venir en el JSON)
    # -------------------------------------------------------------
    elif request.method in ['PUT', 'PATCH']:
        try:
            data = json.loads(request.body)
            casa_id = data.get('id') # Extraemos el ID del JSON enviado
            
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

    # -------------------------------------------------------------
    # DELETE: Eliminar (Enviando el ID en la URL o en el JSON)
    # -------------------------------------------------------------
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