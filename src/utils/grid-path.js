// grid-path — helper (no es un componente) para el autopiloto de demo-mode.
//
// Planifica rutas a pie sobre la isla con A* en una grilla XZ. Un esquive "reactivo"
// (campos de fuerza) se trababa en mínimos locales: frente al centro del cartel de
// 7 m, o en el bolsillo entre su extremo y un árbol. Con una ruta planificada no hay
// mínimos locales.
//
// JS puro (no usa THREE). Obstáculos: círculos {x, z, r} (collision-cylinder) o
// rectángulos sin rotar {x, z, hw, hd} (collision-cube).

// Distancia de (px, pz) a la superficie de un obstáculo (≤ 0 = adentro) y la normal
// hacia afuera desde su punto más cercano.
export function obstacleInfo(o, px, pz) {
  let cx = o.x;
  let cz = o.z;
  let r = 0;
  if (o.r !== undefined) {
    r = o.r;
  } else {
    cx = Math.max(o.x - o.hw, Math.min(px, o.x + o.hw));
    cz = Math.max(o.z - o.hd, Math.min(pz, o.z + o.hd));
  }
  let nx = px - cx;
  let nz = pz - cz;
  let d = Math.hypot(nx, nz);
  const surface = d - r;
  if (d < 1e-4) {
    // Adentro del rectángulo: normal desde el centro.
    nx = px - o.x;
    nz = pz - o.z;
    d = Math.hypot(nx, nz) || 1;
  }
  return { surface, nx: nx / d, nz: nz / d };
}

/**
 * Grilla de celdas transitables: fuera del círculo `radius` o a menos de `clearance`
 * de un obstáculo = bloqueada.
 */
export function buildGrid(obstacles, { cell, radius, clearance }) {
  const n = Math.ceil((2 * radius) / cell) + 1;
  const blocked = new Uint8Array(n * n);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const x = -radius + i * cell;
      const z = -radius + j * cell;
      let b = Math.hypot(x, z) > radius;
      for (let k = 0; !b && k < obstacles.length; k++) {
        b = obstacleInfo(obstacles[k], x, z).surface < clearance;
      }
      blocked[j * n + i] = b ? 1 : 0;
    }
  }
  return { n, cell, radius, blocked };
}

function cellOf(grid, x, z) {
  const i = Math.round((x + grid.radius) / grid.cell);
  const j = Math.round((z + grid.radius) / grid.cell);
  if (i < 0 || j < 0 || i >= grid.n || j >= grid.n) return -1;
  return j * grid.n + i;
}

function cellX(grid, idx) {
  return -grid.radius + (idx % grid.n) * grid.cell;
}

function cellZ(grid, idx) {
  return -grid.radius + Math.floor(idx / grid.n) * grid.cell;
}

// `extra(x, z)` permite bloquear cosas que se mueven entre rutas (los otros animales).
function isBlocked(grid, idx, extra) {
  if (idx < 0 || grid.blocked[idx]) return true;
  return extra ? extra(cellX(grid, idx), cellZ(grid, idx)) : false;
}

// ¿Se puede ir en línea recta de A a B? Muestrea el segmento cada media celda.
export function lineFree(grid, ax, az, bx, bz, extra) {
  const len = Math.hypot(bx - ax, bz - az);
  const steps = Math.max(1, Math.ceil(len / (grid.cell * 0.5)));
  for (let s = 0; s <= steps; s++) {
    const k = s / steps;
    const idx = cellOf(grid, ax + (bx - ax) * k, az + (bz - az) * k);
    if (isBlocked(grid, idx, extra)) return false;
  }
  return true;
}

// Celda libre más cercana (en anillos), por si el punto cae dentro del margen.
function nearestFree(grid, idx, extra, maxRing = 8) {
  if (!isBlocked(grid, idx, extra)) return idx;
  const n = grid.n;
  const ci = idx % n;
  const cj = Math.floor(idx / n);
  for (let ring = 1; ring <= maxRing; ring++) {
    for (let dj = -ring; dj <= ring; dj++) {
      for (let di = -ring; di <= ring; di++) {
        if (Math.max(Math.abs(di), Math.abs(dj)) !== ring) continue;
        const i = ci + di;
        const j = cj + dj;
        if (i < 0 || j < 0 || i >= n || j >= n) continue;
        const k = j * n + i;
        if (!isBlocked(grid, k, extra)) return k;
      }
    }
  }
  return -1;
}

// Min-heap mínimo de [f, idx].
function heapPush(h, item) {
  h.push(item);
  let i = h.length - 1;
  while (i > 0) {
    const p = (i - 1) >> 1;
    if (h[p][0] <= h[i][0]) break;
    [h[p], h[i]] = [h[i], h[p]];
    i = p;
  }
}

function heapPop(h) {
  const top = h[0];
  const last = h.pop();
  if (h.length) {
    h[0] = last;
    let i = 0;
    for (;;) {
      const l = 2 * i + 1;
      const r = l + 1;
      let m = i;
      if (l < h.length && h[l][0] < h[m][0]) m = l;
      if (r < h.length && h[r][0] < h[m][0]) m = r;
      if (m === i) break;
      [h[m], h[i]] = [h[i], h[m]];
      i = m;
    }
  }
  return top;
}

/**
 * Ruta de (sx, sz) hasta cualquier celda libre a ≤ `reach` m de (gx, gz), con línea
 * de visión hasta el objetivo (para no "llegar" del otro lado de una pared).
 * Devuelve waypoints [{x, z}, …] ya suavizados, o null si no hay camino.
 */
export function findPath(grid, sx, sz, gx, gz, reach, extra) {
  const n = grid.n;
  const start = nearestFree(grid, cellOf(grid, sx, sz), extra);
  if (start < 0) return null;

  const g = new Float32Array(n * n).fill(Infinity);
  const from = new Int32Array(n * n).fill(-1);
  const closed = new Uint8Array(n * n);
  const h = (idx) =>
    Math.max(
      0,
      Math.hypot(cellX(grid, idx) - gx, cellZ(grid, idx) - gz) - reach
    );

  const open = [];
  g[start] = 0;
  heapPush(open, [h(start), start]);
  let goal = -1;

  while (open.length) {
    const [, cur] = heapPop(open);
    if (closed[cur]) continue;
    closed[cur] = 1;

    const cx = cellX(grid, cur);
    const cz = cellZ(grid, cur);
    const dGoal = Math.hypot(cx - gx, cz - gz);
    if (dGoal <= reach) {
      // Línea de visión hasta 1.2 m antes del animal: el animal puede estar cerca de
      // un tronco (dentro del margen), pero no puede haber una pared en el medio.
      const k = Math.max(0, dGoal - 1.2) / (dGoal || 1);
      if (
        lineFree(grid, cx, cz, cx + (gx - cx) * k, cz + (gz - cz) * k, extra)
      ) {
        goal = cur;
        break;
      }
    }

    const ci = cur % n;
    const cj = Math.floor(cur / n);
    for (let dj = -1; dj <= 1; dj++) {
      for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue;
        const i = ci + di;
        const j = cj + dj;
        if (i < 0 || j < 0 || i >= n || j >= n) continue;
        const nb = j * n + i;
        if (closed[nb] || isBlocked(grid, nb, extra)) continue;
        // Diagonal: no cortar esquinas entre dos celdas bloqueadas.
        if (
          di &&
          dj &&
          (isBlocked(grid, cj * n + i, extra) ||
            isBlocked(grid, j * n + ci, extra))
        ) {
          continue;
        }
        const cost = g[cur] + (di && dj ? Math.SQRT2 : 1) * grid.cell;
        if (cost < g[nb]) {
          g[nb] = cost;
          from[nb] = cur;
          heapPush(open, [cost + h(nb), nb]);
        }
      }
    }
  }
  if (goal < 0) return null;

  const cells = [];
  for (let c = goal; c >= 0; c = from[c]) cells.push(c);
  cells.reverse();
  const pts = cells.map((c) => ({ x: cellX(grid, c), z: cellZ(grid, c) }));

  // Suavizado por línea de visión: desde cada punto, saltar al más lejano visible.
  const out = [];
  let i = 0;
  while (i < pts.length - 1) {
    let j = pts.length - 1;
    while (
      j > i + 1 &&
      !lineFree(grid, pts[i].x, pts[i].z, pts[j].x, pts[j].z, extra)
    ) {
      j--;
    }
    out.push(pts[j]);
    i = j;
  }
  if (!out.length) out.push(pts[0]);
  return out;
}
