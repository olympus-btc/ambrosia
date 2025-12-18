# Iconos de la Aplicación

Esta carpeta debe contener los iconos de la aplicación en los formatos necesarios para cada plataforma.

## Iconos Necesarios

1. **icon.icns** - Para macOS
2. **icon.ico** - Para Windows
3. **icon.png** - Para Linux (512x512 px)

## Cómo Generar los Iconos

### Opción 1: Usando electron-icon-builder (Recomendado)

```bash
# Instalar electron-icon-builder
npm install -g electron-icon-builder

# Generar iconos desde una imagen PNG de 1024x1024
electron-icon-builder --input=../../imgs/Ambrosia.png --output=./ --flatten
```

### Opción 2: Manualmente

#### macOS (.icns)

1. Preparar imágenes PNG en los siguientes tamaños:
   - 16x16, 32x32, 64x64, 128x128, 256x256, 512x512, 1024x1024

2. Crear el iconset:
```bash
mkdir Ambrosia.iconset
# Copiar las imágenes con los nombres apropiados
cp icon_16x16.png Ambrosia.iconset/icon_16x16.png
cp icon_32x32.png Ambrosia.iconset/icon_16x16@2x.png
# ... etc
```

3. Convertir a .icns:
```bash
iconutil -c icns Ambrosia.iconset
```

#### Windows (.ico)

Usar herramientas como:
- ImageMagick: `convert icon.png -define icon:auto-resize=256,128,96,64,48,32,16 icon.ico`
- Sitios web: https://www.icoconverter.com/

#### Linux (.png)

Simplemente usar una imagen PNG de 512x512 píxeles.

## Logo Actual

El logo de Ambrosia está en: `../../imgs/Ambrosia.png`

Puedes usar este logo como base para generar todos los iconos necesarios.
