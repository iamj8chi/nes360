// place-rig — helper (no es un componente) que usan los finales del Safari.
//
// Ubica y rota el #cameraRig para que la CABEZA del jugador quede sobre un punto
// del mundo mirando hacia un rumbo dado. Hace falta porque en VR la cámara no está
// en el origen del rig: el jugador puede estar parado a un metro del centro de su
// guardián y mirando hacia cualquier lado del cuarto. Mover solo el rig lo dejaría
// fuera de la camioneta o de espaldas al logo.
//
// Cuentas (solo en XZ + yaw; la altura la pone el tracking/look-controls):
//   o   = offset de la cámara en el espacio del rig
//   phi = yaw de la cámara relativo al rig
//   rigYaw = targetYaw - phi
//   rigPos = target - rot(rigYaw) * o
//
// Usa el THREE global (ver CLAUDE.md §6). Los vectores se crean adentro de la
// función para no tocar THREE al evaluar el módulo.

// Yaw (rad) de un Object3D en mundo, en la convención de A-Frame: rotación +Y,
// con yaw 0 = mirando hacia −Z. Se saca del cuaternión con orden YXZ (no de
// getWorldDirection) para que mirar hacia abajo no lo vuelva inestable.
export function worldYaw(object3D) {
  const q = new THREE.Quaternion();
  object3D.getWorldQuaternion(q);
  return new THREE.Euler().setFromQuaternion(q, "YXZ").y;
}

// Yaw actual de la mirada del jugador (rad).
export function cameraYaw(sceneEl) {
  return sceneEl.camera ? worldYaw(sceneEl.camera) : 0;
}

/**
 * @param {Element} rigEl      el #cameraRig (hijo directo de la escena)
 * @param {THREE.Vector3} target  punto del mundo donde tiene que quedar la cabeza
 *                                (la Y se usa tal cual como altura del rig = piso)
 * @param {number} targetYaw   rumbo (rad) hacia el que tiene que mirar el jugador
 */
export function placeRigAt(rigEl, target, targetYaw) {
  const rig = rigEl.object3D;
  const cam = rigEl.sceneEl.camera;
  rig.updateMatrixWorld(true);

  const camPos = new THREE.Vector3();
  if (cam) cam.getWorldPosition(camPos);
  else rig.getWorldPosition(camPos);

  // Offset de la cámara expresado en el espacio (rotado) del rig.
  const rho0 = rig.rotation.y;
  const dx = camPos.x - rig.position.x;
  const dz = camPos.z - rig.position.z;
  const c0 = Math.cos(rho0);
  const s0 = Math.sin(rho0);
  // rot(-rho0) * (dx, dz)
  const ox = dx * c0 - dz * s0;
  const oz = dx * s0 + dz * c0;

  const phi = (cam ? worldYaw(cam) : rho0) - rho0;
  const rho1 = targetYaw - phi;
  const c1 = Math.cos(rho1);
  const s1 = Math.sin(rho1);

  rig.rotation.set(0, rho1, 0);
  // target - rot(rho1) * (ox, oz)
  rig.position.set(
    target.x - (ox * c1 + oz * s1),
    target.y,
    target.z - (-ox * s1 + oz * c1)
  );
}
