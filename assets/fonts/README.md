# Tipografías

Coloca aquí los archivos de las dos fuentes compradas, respetando exactamente
estos nombres (formato `.woff2` preferido, con `.woff` como respaldo). En
cuanto añadas los archivos, `css/fonts.css` los detectará sin tocar código.

```
assets/fonts/
├── DominiqueBlackItalic.woff2
├── DominiqueBlackItalic.woff
├── Mono45Headline.woff2
└── Mono45Headline.woff
```

- **Dominique Black Italic** → nombre "Anna Girona" en el header, menú
  (Trabajo / Personal / About Me) y el "ANNA GIRONA" gigante del final de la
  home.
- **Mono 45 Headline** → "CREATIVE ART DIRECTOR" y el párrafo descriptivo del
  header, además de las etiquetas de los proyectos.

Mientras los archivos no existan, `css/fonts.css` usa alternativas del
sistema (una serif itálica y una monoespaciada) para que el layout sea fiel
en proporciones y no se rompa nada al añadir las fuentes reales.
