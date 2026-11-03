# Tipografías

## Dominique (subida)

Familia completa ya incluida en este directorio:

```
assets/fonts/
├── Dominique-Black.otf        (900, normal)
├── Dominique-BlackItalic.otf  (900, italic)  ← usada en el sitio
├── Dominique-Bold.otf         (700, normal)
├── Dominique-BoldItalic.otf   (700, italic)
└── Dominique-ExtraBold.otf    (800, normal)
```

El sitio usa el corte **Black Italic** (`font-weight: 900; font-style: italic;`)
para el nombre del header, el menú (Trabajo / Personal / About Me) y el
"ANNA GIRONA" gigante del final de la home — es lo único declarado en
`css/fonts.css` bajo `--font-display`. El resto de cortes ya están
registrados vía `@font-face` por si se necesitan en el diseño mobile o en
fichas de proyecto.

## Mono 45 Headline (pendiente)

Para "CREATIVE ART DIRECTOR", el párrafo descriptivo del header y las
etiquetas de los proyectos. Añade aquí, con estos nombres exactos, y
`css/fonts.css` la detectará sin tocar código:

```
Mono45Headline.woff2
Mono45Headline.woff
```

Mientras no exista, `--font-mono` usa una monoespaciada del sistema para
mantener proporciones similares.
