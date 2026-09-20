from django.shortcuts import render

def inicio(request): return render(request, 'inicio.html')
def contrucion(request): return render(request, 'contrucion.html')
def casas_rapidas(request): return render(request, 'casas_rapidas.html')
def creacion_de_casas(request): return render(request, 'creacion_de_Casas.html')
def casas_modelo_1(request): return render(request, 'casas_modelo_1.html')
