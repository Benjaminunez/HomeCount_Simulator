"""
Carga masiva de materiales a partir de archivos .glb.

Ubicación en el proyecto:
    app_housecount/management/commands/cargar_materiales.py

Uso básico (con Docker):
    docker compose exec web python manage.py cargar_materiales

Lee los .glb de la carpeta  carga_masiva/  (en la raíz del proyecto), copia cada
archivo a media/modelos_3d/materiales/ y crea un Material por cada uno.

Opciones:
    carpeta            Carpeta con los .glb (por defecto: carga_masiva)
    --csv ARCHIVO      CSV con nombre, coste, categoría, etc. (ver más abajo)
    --coste N          Coste por defecto para los que no estén en el CSV (def. 0)
    --categoria TXT    Categoría por defecto (se crea si no existe)
    --unidad TXT       Unidad de medida por defecto (def. "Unidad")
    --dry-run          Muestra lo que haría, sin guardar nada

Si junto a un .glb hay una imagen con el mismo nombre (lavamanos.glb +
lavamanos.png) se sube también como imagen del material.

Formato del CSV (separador "," o ";", primera fila = encabezados):
    archivo,nombre,coste,categoria,dimensiones,unidad_medida
    bathroomSink.glb,Lavamanos,60000,Baño,60cm x 45cm,Unidad
Solo "archivo" es obligatoria; el resto de columnas son opcionales.
"""
import csv
import re
from pathlib import Path

from django.conf import settings
from django.core.files import File
from django.core.management.base import BaseCommand, CommandError

from app_housecount.models import CategoriaMaterial, Material

RUTA_3D = "modelos_3d/materiales"
RUTA_IMG = "iconos_materiales"
EXTENSIONES_IMG = (".png", ".jpg", ".jpeg", ".webp")


def nombre_desde_archivo(stem):
    """kitchenCabinetUpper -> Kitchen Cabinet Upper ; wall_corner -> Wall Corner"""
    texto = stem.replace("_", " ").replace("-", " ")
    texto = re.sub(r"(?<=[a-z0-9])(?=[A-Z])", " ", texto)
    return " ".join(texto.split()).title()


def a_entero(valor):
    """'$35.000' -> 35000"""
    digitos = re.sub(r"\D", "", str(valor))
    return int(digitos) if digitos else None


class Command(BaseCommand):
    help = "Crea materiales en masa a partir de archivos .glb de una carpeta."

    def add_arguments(self, parser):
        parser.add_argument("carpeta", nargs="?", default="carga_masiva")
        parser.add_argument("--csv", help="CSV con los datos de cada material")
        parser.add_argument("--coste", type=int, default=0)
        parser.add_argument("--categoria")
        parser.add_argument("--unidad", default="Unidad")
        parser.add_argument("--dry-run", action="store_true")

    # ------------------------------------------------------------------
    def leer_csv(self, ruta):
        ruta = self.resolver(ruta)
        if not ruta.is_file():
            raise CommandError(f"No existe el CSV: {ruta}")
        with open(ruta, encoding="utf-8-sig", newline="") as f:
            primera = f.readline()
            f.seek(0)
            delimitador = ";" if primera.count(";") > primera.count(",") else ","
            filas = {}
            for fila in csv.DictReader(f, delimiter=delimitador):
                fila = {(k or "").strip().lower(): (v or "").strip() for k, v in fila.items()}
                clave = Path(fila.get("archivo", "")).stem.lower()
                if clave:
                    filas[clave] = fila
        return filas

    @staticmethod
    def resolver(ruta):
        ruta = Path(ruta)
        return ruta if ruta.is_absolute() else Path(settings.BASE_DIR) / ruta

    @staticmethod
    def ya_en_media(subcarpeta, nombre):
        return (Path(settings.MEDIA_ROOT) / subcarpeta / nombre).exists()

    # ------------------------------------------------------------------
    def handle(self, *args, **opts):
        carpeta = self.resolver(opts["carpeta"])
        if not carpeta.is_dir():
            raise CommandError(
                f"No existe la carpeta {carpeta}. Créala y copia ahí tus .glb."
            )

        datos_csv = self.leer_csv(opts["csv"]) if opts["csv"] else {}
        dry = opts["dry_run"]
        glbs = sorted(p for p in carpeta.iterdir() if p.suffix.lower() == ".glb")
        if not glbs:
            raise CommandError(f"No hay archivos .glb en {carpeta}")

        creados = omitidos = errores = 0
        cache_categorias = {}

        for glb in glbs:
            destino_rel = f"{RUTA_3D}/{glb.name}"

            if Material.objects.filter(archivo_3d=destino_rel).exists():
                omitidos += 1
                self.stdout.write(f"  = ya existe, se omite: {glb.name}")
                continue

            fila = datos_csv.get(glb.stem.lower(), {})
            nombre = fila.get("nombre") or nombre_desde_archivo(glb.stem)
            coste = a_entero(fila.get("coste", ""))
            if coste is None:
                coste = opts["coste"]
            nombre_cat = fila.get("categoria") or opts["categoria"]

            if dry:
                self.stdout.write(f"  + [simulación] {nombre} (${coste}) <- {glb.name}")
                creados += 1
                continue

            try:
                categoria = None
                if nombre_cat:
                    if nombre_cat not in cache_categorias:
                        cache_categorias[nombre_cat], _ = CategoriaMaterial.objects.get_or_create(
                            nombre=nombre_cat
                        )
                    categoria = cache_categorias[nombre_cat]

                material = Material(
                    nombre=nombre,
                    coste=coste,
                    dimensiones=fila.get("dimensiones") or None,
                    unidad_medida=fila.get("unidad_medida") or opts["unidad"],
                    categoria=categoria,
                )

                # Modelo 3D: si ya está en media/ se enlaza; si no, se copia.
                if self.ya_en_media(RUTA_3D, glb.name):
                    material.archivo_3d.name = destino_rel
                else:
                    with open(glb, "rb") as f:
                        material.archivo_3d.save(glb.name, File(f), save=False)

                # Imagen opcional con el mismo nombre que el .glb
                for ext in EXTENSIONES_IMG:
                    img = glb.with_suffix(ext)
                    if img.is_file():
                        if self.ya_en_media(RUTA_IMG, img.name):
                            material.imagen.name = f"{RUTA_IMG}/{img.name}"
                        else:
                            with open(img, "rb") as f:
                                material.imagen.save(img.name, File(f), save=False)
                        break

                material.save()
                creados += 1
                self.stdout.write(self.style.SUCCESS(f"  + {nombre} <- {glb.name}"))
            except Exception as exc:  # seguimos con el resto de archivos
                errores += 1
                self.stderr.write(self.style.ERROR(f"  ! {glb.name}: {exc}"))

        etiqueta = "Simulación terminada" if dry else "Listo"
        self.stdout.write(
            f"\n{etiqueta}: {creados} creados, {omitidos} omitidos, {errores} con error."
        )
