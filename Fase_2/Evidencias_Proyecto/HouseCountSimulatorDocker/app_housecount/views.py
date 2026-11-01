import json
import requests
import random
import base64
from django.core.files.base import ContentFile
from django.shortcuts import render, redirect
from django.contrib.auth.forms import UserCreationForm, AuthenticationForm
from django.contrib.auth import login, logout, authenticate
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
from django.utils import timezone
from django.core.mail import send_mail, EmailMultiAlternatives
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
        # Copiamos los datos para poder modificarlos
        datos_post = request.POST.copy()
        
        # Si el usuario ingresó un username, reemplazamos espacios por barras bajas
        if 'username' in datos_post:
            datos_post['username'] = datos_post['username'].replace(' ', '_')
            
        form = UserCreationForm(datos_post)
        correo = request.POST.get('email', '')
        avatar_base64 = request.POST.get('avatar_base64', '') 
        
        if form.is_valid():
            user = form.save(commit=False)
            if correo:
                user.email = correo
            user.save()
            
            avatar_file = request.FILES.get('avatar_file')
            
            if avatar_file:
                if avatar_file.name.lower().endswith(('.png', '.jpg', '.jpeg')):
                    Avatar.objects.create(usuario=user, imagen=avatar_file)
            
            elif avatar_base64 and ';base64,' in avatar_base64:
                try:
                    formato, imgstr = avatar_base64.split(';base64,')
                    ext = formato.split('/')[-1]
                    nombre_archivo = f"avatar_{user.username}.{ext}"
                    archivo_recuperado = ContentFile(base64.b64decode(imgstr), name=nombre_archivo)
                    Avatar.objects.create(usuario=user, imagen=archivo_recuperado)
                except Exception:
                    pass 
            
            login(request, user)
            messages.success(request, f"¡Bienvenido {user.username}! Tu cuenta ha sido creada.")
            return redirect('inicio')
        else:
            return render(request, 'inicioSesion/registroUser.html', {
                'form': form,
                'email_ingresado': correo,
                'avatar_base64': avatar_base64
            })
    else:
        form = UserCreationForm()
        
    return render(request, 'inicioSesion/registroUser.html', {'form': form})

def iniciar_sesion(request):
    if request.method == 'POST':
        # 1. Hacemos una copia mutable de los datos enviados
        datos_post = request.POST.copy()
        
        # 2. Si el usuario escribió su nombre con espacios, lo convertimos a barras bajas
        if 'username' in datos_post:
            datos_post['username'] = datos_post['username'].replace(' ', '_')
            
        # 3. Le pasamos los datos formateados al formulario de autenticación
        form = AuthenticationForm(request, data=datos_post)
        
        if form.is_valid():
            username = form.cleaned_data.get('username')
            password = form.cleaned_data.get('password')
            user = authenticate(username=username, password=password)
            if user is not None:
                login(request, user)
                # Opcional: si quieres que el mensaje de éxito muestre el nombre sin barras
                nombre_limpio = username.replace('_', ' ')
                messages.success(request, f"Has iniciado sesión como {nombre_limpio}.")
                return redirect('inicio')
        else:
            messages.error(request, "Usuario o contraseña incorrectos.")
    else:
        form = AuthenticationForm()
        
    return render(request, 'inicioSesion/loginUser.html', {'form': form})

def cerrar_sesion(request):
    logout(request)
    messages.info(request, "Has cerrado sesión exitosamente.")
    return redirect('inicio')


# --- Guardar / Cargar Escenas 3D ---

@login_required
def guardar_diseno(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            proyecto_id = data.get('proyecto_id', None) 
            nombre = data.get('nombre_proyecto', 'Sin nombre')
            costo_total = data.get('costo_total', 0)
            datos_escena = data.get('datos_escena', [])
            datos_camara = data.get('datos_camara', {})
            captura_base64 = data.get('captura_base64', None)
            
            if proyecto_id:
                proyecto = Proyecto3D.objects.get(id=proyecto_id, usuario=request.user)
                proyecto.nombre = nombre
                proyecto.costo_total = costo_total
                proyecto.datos_escena = datos_escena
                proyecto.datos_camara = datos_camara
            else:
                proyecto = Proyecto3D(
                    usuario=request.user, 
                    nombre=nombre,
                    costo_total=costo_total,
                    datos_escena=datos_escena,
                    datos_camara=datos_camara
                )
            
            if captura_base64 and ';base64,' in captura_base64:
                formato, imgstr = captura_base64.split(';base64,') 
                ext = formato.split('/')[-1] 
                nombre_archivo = f"diseno_{request.user.username}_{nombre.replace(' ', '_')}.{ext}"
                
                if proyecto_id and proyecto.imagen_captura:
                    proyecto.imagen_captura.delete(save=False)
                
                proyecto.imagen_captura.save(
                    nombre_archivo, 
                    ContentFile(base64.b64decode(imgstr)), 
                    save=False 
                )
            
            proyecto.save()
            return JsonResponse({'estado': 'exito', 'mensaje': 'Proyecto guardado/actualizado correctamente.', 'id': proyecto.id})
            
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
                proyecto = Proyecto3D.objects.get(id=proyecto_id, usuario=request.user)
                if proyecto.imagen_captura:
                    proyecto.imagen_captura.delete(save=False)
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
            codigo = str(random.randint(100000, 999999))
            
            CodigoRecuperacion.objects.filter(usuario=user).delete()
            CodigoRecuperacion.objects.create(usuario=user, codigo=codigo)
            
            asunto = 'Código de Recuperación - HouseCount Simulator'
            cuerpo_texto = f'Hola {user.username},\n\nTu código de recuperación es: {codigo}\n\nEste código expirará en 15 minutos.'

            cuerpo_html = f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <div style="background-color: #f97316; padding: 20px; text-align: center; color: white;">
                    <h2 style="margin: 0; font-size: 24px;">HouseCount Simulator</h2>
                    <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">Recuperación de Contraseña</p>
                </div>
                <div style="padding: 30px; background-color: #ffffff; color: #333;">
                    <p style="font-size: 16px; margin-top: 0;">Hola <strong>{user.username}</strong>,</p>
                    <p style="font-size: 16px; line-height: 1.5;">Hemos recibido una solicitud para restablecer la contraseña de tu cuenta. Por favor, ingresa el siguiente código en el simulador para continuar:</p>
                    <div style="text-align: center; margin: 35px 0;">
                        <span style="display: inline-block; background-color: #fff7ed; border: 2px dashed #f97316; color: #ea580c; font-size: 36px; font-weight: bold; letter-spacing: 8px; padding: 15px 30px; border-radius: 8px;">
                            {codigo}
                        </span>
                    </div>
                    <p style="text-align: center; font-size: 14px; color: #f97316; font-weight: bold; margin-bottom: 25px;">
                        ⏳ Este código expirará en 15 minutos.
                    </p>
                    <p style="font-size: 14px; color: #64748b; line-height: 1.5; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 15px;">
                        ⚠️ Si no solicitaste cambiar tu contraseña, puedes ignorar este correo con tranquilidad. Tu cuenta sigue estando protegida.
                    </p>
                </div>
                <div style="background-color: #1e293b; color: #94a3b8; text-align: center; padding: 15px; font-size: 12px;">
                    © 2026 HouseCount Simulator.<br>
                    Este es un mensaje de seguridad automático, por favor no respondas a este correo.
                </div>
            </div>
            """

            send_mail(
                asunto,
                cuerpo_texto,
                settings.DEFAULT_FROM_EMAIL,
                [email],
                fail_silently=False,
                html_message=cuerpo_html
            )
            
            request.session['reset_email'] = email
            return redirect('recuperar_clave_codigo')
            
        except User.DoesNotExist:
            messages.error(request, "No encontramos ninguna cuenta con ese correo electrónico.")
            
    return render(request, 'recuperacion/solicitar_correo.html')

def recuperar_clave_codigo(request):
    email = request.session.get('reset_email')
    if not email:
        return redirect('recuperar_clave_correo')

    if request.method == 'POST':
        codigo_ingresado = request.POST.get('codigo')
        try:
            user = User.objects.get(email=email)
            registro = CodigoRecuperacion.objects.get(usuario=user, codigo=codigo_ingresado)
            
            tiempo_transcurrido = timezone.now() - registro.creado_en
            if tiempo_transcurrido.total_seconds() > 900:
                messages.error(request, "El código ha expirado. Solicita uno nuevo.")
                return redirect('recuperar_clave_correo')
                
            request.session['codigo_valido'] = True
            return redirect('recuperar_clave_nueva')
            
        except (User.DoesNotExist, CodigoRecuperacion.DoesNotExist):
            messages.error(request, "El código ingresado es incorrecto.")

    return render(request, 'recuperacion/ingresar_codigo.html', {'email': email})

def recuperar_clave_nueva(request):
    email = request.session.get('reset_email')
    
    if not email or not request.session.get('codigo_valido'):
        return redirect('recuperar_clave_correo')

    if request.method == 'POST':
        pass1 = request.POST.get('pass1')
        pass2 = request.POST.get('pass2')
        
        if pass1 == pass2 and len(pass1) >= 8:
            user = User.objects.get(email=email)
            user.set_password(pass1)
            user.save()
            
            CodigoRecuperacion.objects.filter(usuario=user).delete()
            del request.session['reset_email']
            del request.session['codigo_valido']
            
            messages.success(request, "¡Tu contraseña ha sido actualizada exitosamente! Ya puedes iniciar sesión.")
            return redirect('login')
        else:
            messages.error(request, "Las contraseñas no coinciden o tienen menos de 8 caracteres.")

    return render(request, 'recuperacion/nueva_clave.html')


# --- Edición de Perfil ---

@login_required
def editar_perfil(request):
    if request.method == 'POST':
        # Capturamos los datos y aplicamos el reemplazo de espacios
        nuevo_username = request.POST.get('username', '').replace(' ', '_')
        nuevo_email = request.POST.get('email')
        nuevo_avatar = request.FILES.get('avatar')

        usuario = request.user
        usuario.username = nuevo_username
        usuario.email = nuevo_email
        
        if nuevo_avatar:
            avatar_obj, created = Avatar.objects.get_or_create(usuario=usuario)
            avatar_obj.imagen = nuevo_avatar
            avatar_obj.save()
            
        usuario.save()
        
        messages.success(request, '¡Tu perfil ha sido actualizado exitosamente!', extra_tags='success')
        
    ruta_anterior = request.META.get('HTTP_REFERER', 'inicio')
    return redirect(ruta_anterior)


def enviar_contacto(request):
    if request.method == 'POST':
        nombre = request.POST.get('user_name')
        correo_usuario = request.POST.get('user_email')
        mensaje = request.POST.get('message')

        asunto = f"Nuevo mensaje desde la Web de: {nombre}"
        cuerpo_texto = f"Mensaje de: {nombre}\nCorreo: {correo_usuario}\n\nMensaje:\n{mensaje}"

        cuerpo_html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <div style="background-color: #f97316; padding: 20px; text-align: center; color: white;">
                <h2 style="margin: 0; font-size: 24px;">HouseCount Simulator</h2>
                <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">Nuevo mensaje de contacto</p>
            </div>
            <div style="padding: 25px; background-color: #ffffff; color: #333;">
                <p style="font-size: 16px; margin-top: 0;">Hola Equipo,</p>
                <p style="font-size: 16px;">Has recibido una nueva consulta a través del formulario de la web:</p>
                <div style="background-color: #f8fafc; padding: 15px; border-radius: 5px; margin: 20px 0; border: 1px solid #e2e8f0;">
                    <p style="margin: 0 0 10px 0; font-size: 15px;"><strong>👤 Nombre:</strong> {nombre}</p>
                    <p style="margin: 0; font-size: 15px;"><strong>✉️ Correo:</strong> <a href="mailto:{correo_usuario}" style="color: #f97316; text-decoration: none;">{correo_usuario}</a></p>
                </div>
                <h3 style="margin-bottom: 10px; color: #1e293b; border-bottom: 2px solid #f1f5f9; padding-bottom: 5px; font-size: 16px;">📝 Mensaje del cliente:</h3>
                <div style="background-color: #f8fafc; padding: 15px; border-left: 4px solid #f97316; border-radius: 0 4px 4px 0;">
                    <p style="margin: 0; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">{mensaje}</p>
                </div>
            </div>
            <div style="background-color: #1e293b; color: #94a3b8; text-align: center; padding: 15px; font-size: 12px;">
                © 2026 HouseCount Simulator.<br>
                Este es un mensaje automático generado por el sistema.
            </div>
        </div>
        """

        try:
            correo = EmailMultiAlternatives(
                subject=asunto,
                body=cuerpo_texto,
                from_email=settings.EMAIL_HOST_USER, 
                to=['housecountsimulator@gmail.com'], 
                reply_to=[correo_usuario] 
            )
            
            correo.attach_alternative(cuerpo_html, "text/html")
            correo.send(fail_silently=False)
            
            return JsonResponse({'status': 'success', 'mensaje': '¡Mensaje enviado con éxito! Te contactaremos pronto.'})
        except Exception as e:
            return JsonResponse({'status': 'error', 'mensaje': 'Hubo un error al enviar el mensaje. Intenta más tarde.'})
            
    return JsonResponse({'status': 'invalid', 'mensaje': 'Método no permitido.'})