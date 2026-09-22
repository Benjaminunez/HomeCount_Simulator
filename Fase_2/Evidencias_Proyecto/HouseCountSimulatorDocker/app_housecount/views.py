from django.shortcuts import render
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
    
    context = {
        'modelos': modelos,
        'filtros': {
            'precio_max': precio_max or '',
            'm2_min': m2_min or '',
            'habitaciones': habitaciones or '',
            'banos': banos or '',
        }
    }
    return render(request, 'casas_rapidas.html', context)