'use strict';

window.GAME = new WHS.World({
  autoresize: true,

  gravity: {
    x: 0,
    y: -10,
    z: 0
  },

  camera: {
    far: 2000,
    near: 1,
    z: 20,
    x: -8,
    y: 5,

    aspect: 45
  },

  background: {
    color: 0xffffff
  }
});

var data = new Float32Array(3993000);
var colors = new Float32Array(3993000);

var i = 0;
for (var x = 0; x <= 100; x++) {
  for (var y = 0; y <= 100; y++) {
    for (var z = 0; z <= 100; z++) {
      data[i * 3] = x;
      data[i * 3 + 1] = y;
      data[i * 3 + 2] = z;
      colors[i * 3] = x / 100;
      colors[i * 3 + 1] = y / 100;
      colors[i * 3 + 2] = z / 100;
      i++;
    }
  }
}

var geom = new THREE.BufferGeometry();

geom.addAttribute('position', new THREE.BufferAttribute(data, 3));
geom.addAttribute('color', new THREE.BufferAttribute(colors, 3));

window.points = new WHS.Points({
  geometry: geom,

  material: {
    kind: 'points',
    vertexColors: THREE.VertexColors,
    size: 0.1
  }
});

points.addTo(GAME);

GAME.setControls(WHS.orbitControls(new THREE.Vector3(50, 50, 50)));

// Start rendering.
GAME.start();
