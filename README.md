# POCIA Count

POCIA Count es un prototipo web para contar personas y autos desde la camara de un celular usando solo capacidades del navegador.

## Capacidades

- Captura de video con `getUserMedia`.
- Deteccion en navegador con TensorFlow.js y COCO-SSD.
- Conteo de cruces por linea horizontal o vertical.
- Visualizacion en vivo sobre canvas.
- Pruebas unitarias para el tracker y render inicial.
- Preparado para despliegue estatico en Netlify.

## Comandos

```bash
npm install
npm test
npm run build
npm run dev
```

## Nota de precision

La precision depende del angulo de la camara, iluminacion, distancia, densidad de objetos y rendimiento del dispositivo. Para uso productivo se recomienda una etapa de calibracion en terreno.
