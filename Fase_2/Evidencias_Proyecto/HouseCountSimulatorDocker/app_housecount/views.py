import json
import requests
import random
from django.shortcuts import render, redirect
from django.contrib.auth.forms import UserCreationForm, AuthenticationForm
from django.contrib.auth import login, logout, authenticate
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from django.contrib.auth.models import User

from .models import ModeloCasa, Material, Habitacion, Proyecto3D, CategoriaMaterial, Avatar, CodigoRecuperacion


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
        correo = request.POST.get('email', '')
        avatar_base64 = request.POST.get('avatar_base64', '') # Capturamos el texto Base64
        
        if form.is_valid():
            user = form.save(commit=False)
            if correo:
                user.email = correo
            user.save()
            
            # Guardado del Avatar
            avatar_file = request.FILES.get('avatar_file')
            
            # Si envió el archivo de forma normal
            if avatar_file:
                if avatar_file.name.lower().endswith(('.png', '.jpg', '.jpeg')):
                    Avatar.objects.create(usuario=user, imagen=avatar_file)
            
            # Si el archivo se perdió por una recarga, pero recuperamos el Base64 oculto
            elif avatar_base64 and ';base64,' in avatar_base64:
                try:
                    formato, imgstr = avatar_base64.split(';base64,')
                    ext = formato.split('/')[-1]
                    nombre_archivo = f"avatar_{user.username}.{ext}"
                    # Decodificamos el texto de vuelta a un archivo físico
                    archivo_recuperado = ContentFile(base64.b64decode(imgstr), name=nombre_archivo)
                    Avatar.objects.create(usuario=user, imagen=archivo_recuperado)
                except Exception:
                    pass # Si ocurre un error decodificando, se queda con avatar por defecto
            
            login(request, user)
            messages.success(request, f"¡Bienvenido {user.username}! Tu cuenta ha sido creada.")
            return redirect('inicio')
        else:
            # SI HAY ERRORES: Devolvemos el correo y el Base64 de la imagen para que NO se borren
            return render(request, 'registroUser.html', {
                'form': form,
                'email_ingresado': correo,
                'avatar_base64': avatar_base64
            })
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

@login_required
def eliminar_diseno(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            proyecto_id = data.get('proyecto_id')
            
            if proyecto_id:
                # Buscamos el proyecto (asegurándonos de que sea del usuario activo)
                proyecto = Proyecto3D.objects.get(id=proyecto_id, usuario=request.user)
                
                # Borramos la imagen del disco duro del servidor para no acumular basura
                if proyecto.imagen_captura:
                    proyecto.imagen_captura.delete(save=False)
                
                # Borramos el registro de la base de datos
                proyecto.delete()
                
                return JsonResponse({'estado': 'exito', 'mensaje': 'Proyecto eliminado correctamente'})
                
        except Proyecto3D.DoesNotExist:
            return JsonResponse({'estado': 'error', 'mensaje': 'El proyecto no existe o no tienes permisos.'}, status=404)
        except Exception as e:
            return JsonResponse({'estado': 'error', 'mensaje': str(e)}, status=400)
            
    return JsonResponse({'estado': 'error', 'mensaje': 'Método no permitido'}, status=405)


def recuperar_clave_correo(request):
    if request.method == 'POST':
        email = request.POST.get('email')
        try:
            user = User.objects.get(email=email)
            
            # Generar código aleatorio de 6 dígitos
            codigo = str(random.randint(100000, 999999))
            
            # Borrar códigos anteriores de este usuario por seguridad y guardar el nuevo
            CodigoRecuperacion.objects.filter(usuario=user).delete()
            CodigoRecuperacion.objects.create(usuario=user, codigo=codigo)
            
            # Enviar el correo
            send_mail(
                'Código de Recuperación - HouseCount',
                f'Hola {user.username},\n\nTu código de recuperación es: {codigo}\n\nEste código expirará en 15 minutos.',
                settings.DEFAULT_FROM_EMAIL,
                [email],
                fail_silently=False,
            )
            
            # Guardamos el correo en la sesión para el siguiente paso
            request.session['reset_email'] = email
            return redirect('recuperar_clave_codigo')
            
        except User.DoesNotExist:
            messages.error(request, "No encontramos ninguna cuenta con ese correo electrónico.")
            
    return render(request, 'recuperacion/solicitar_correo.html')

def recuperar_clave_codigo(request):
    # Si no hay un correo en sesión, lo devolvemos al paso 1
    email = request.session.get('reset_email')
    if not email:
        return redirect('recuperar_clave_correo')

    if request.method == 'POST':
        codigo_ingresado = request.POST.get('codigo')
        try:
            user = User.objects.get(email=email)
            # Buscamos si existe ese código exacto para ese usuario
            registro = CodigoRecuperacion.objects.get(usuario=user, codigo=codigo_ingresado)
            
            # Validar que no hayan pasado más de 15 minutos (900 segundos)
            tiempo_transcurrido = timezone.now() - registro.creado_en
            if tiempo_transcurrido.total_seconds() > 900:
                messages.error(request, "El código ha expirado. Solicita uno nuevo.")
                return redirect('recuperar_clave_correo')
                
            # Si todo está bien, habilitamos el permiso para cambiar la clave
            request.session['codigo_valido'] = True
            return redirect('recuperar_clave_nueva')
            
        except (User.DoesNotExist, CodigoRecuperacion.DoesNotExist):
            messages.error(request, "El código ingresado es incorrecto.")

    return render(request, 'recuperacion/ingresar_codigo.html', {'email': email})

def recuperar_clave_nueva(request):
    email = request.session.get('reset_email')
    
    # Validamos que haya pasado el paso del código exitosamente
    if not email or not request.session.get('codigo_valido'):
        return redirect('recuperar_clave_correo')

    if request.method == 'POST':
        pass1 = request.POST.get('pass1')
        pass2 = request.POST.get('pass2')
        
        if pass1 == pass2 and len(pass1) >= 8:
            user = User.objects.get(email=email)
            # set_password es el método nativo de Django para encriptar la nueva clave
            user.set_password(pass1)
            user.save()
            
            # Limpiamos la base de datos y la sesión
            CodigoRecuperacion.objects.filter(usuario=user).delete()
            del request.session['reset_email']
            del request.session['codigo_valido']
            
            messages.success(request, "¡Tu contraseña ha sido actualizada exitosamente! Ya puedes iniciar sesión.")
            return redirect('login')
        else:
            messages.error(request, "Las contraseñas no coinciden o tienen menos de 8 caracteres.")

    return render(request, 'recuperacion/nueva_clave.html')