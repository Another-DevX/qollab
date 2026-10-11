/**
 * Vista 3D de la esfera de Bloch (Three.js).
 *
 * Coordenadas: la física usa (x, y, z) con |0⟩ en +z. Three.js usa "y hacia arriba",
 * así que mapeamos físico → three como (x, y, z) ↦ (y, z, x). Este mapeo conserva la
 * orientación (es una permutación cíclica), por lo que el sentido de giro se mantiene.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DObject, CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { t } from '../i18n/index.js';
import { formatVec } from '../ui/format.js';
export const COLORS = {
    ideal: 0x17a34a,
    err: 0xdc2626,
    idealAxis: 0x0f5132,
    errAxis: 0xf59e0b,
    sphere: 0x7dd3fc,
    grid: 0x64748b,
    axis: 0x334155,
};
const toThree = (r) => new THREE.Vector3(r[1], r[2], r[0]);
const UP = new THREE.Vector3(0, 1, 0);
const INITIAL_CAMERA = toThree([1.9, 1.35, 1.0]).normalize().multiplyScalar(4.4);
/** Flecha gruesa (cilindro + cono) desde el origen. */
class Arrow extends THREE.Group {
    constructor(color, radius = 0.025, onTop = false) {
        super();
        // onTop: se dibuja siempre encima (el vector con error, más fino, se ve dentro del ideal cuando coinciden)
        const mat = new THREE.MeshPhongMaterial({ color, shininess: 60, depthTest: !onTop });
        this.shaft = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 1, 20), mat);
        this.head = new THREE.Mesh(new THREE.ConeGeometry(radius * 3, 0.14, 24), mat);
        if (onTop)
            this.shaft.renderOrder = this.head.renderOrder = 10;
        this.add(this.shaft, this.head);
    }
    setDirection(r) {
        const v = toThree(r);
        const len = v.length();
        const headLen = 0.14;
        const shaftLen = Math.max(0.001, len - headLen);
        this.shaft.scale.set(1, shaftLen, 1);
        this.shaft.position.set(0, shaftLen / 2, 0);
        this.head.position.set(0, shaftLen + headLen / 2, 0);
        this.quaternion.setFromUnitVectors(UP, v.clone().normalize());
    }
}
/** Línea de un eje de rotación que atraviesa la esfera, con una punta que indica el sentido. */
class AxisLine extends THREE.Group {
    constructor(color) {
        super();
        const geom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, -1.3, 0), new THREE.Vector3(0, 1.3, 0)]);
        this.line = new THREE.Line(geom, new THREE.LineDashedMaterial({ color, dashSize: 0.08, gapSize: 0.05 }));
        this.line.computeLineDistances();
        this.tip = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.09, 16), new THREE.MeshBasicMaterial({ color }));
        this.tip.position.y = 1.345;
        this.add(this.line, this.tip);
    }
    setAxis(n) {
        this.quaternion.setFromUnitVectors(UP, toThree(n).normalize());
    }
}
/** Polilínea con búfer reutilizable. */
class Trail {
    constructor(material) {
        this.capacity = 0;
        this.line = new THREE.Line(new THREE.BufferGeometry(), material);
        this.line.frustumCulled = false;
        this.ensure(2048);
    }
    ensure(n) {
        if (n <= this.capacity)
            return;
        this.capacity = Math.max(n, this.capacity * 2);
        this.line.geometry.dispose();
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.capacity * 3), 3));
        g.setAttribute('lineDistance', new THREE.BufferAttribute(new Float32Array(this.capacity), 1));
        this.line.geometry = g;
    }
    set(points) {
        this.ensure(points.length);
        const pos = this.line.geometry.getAttribute('position');
        const dist = this.line.geometry.getAttribute('lineDistance');
        let acc = 0;
        // radio 1.004: un pelo por fuera de la esfera para que no la atraviese visualmente
        for (let i = 0; i < points.length; i++) {
            const [x, y, z] = points[i];
            pos.setXYZ(i, y * 1.004, z * 1.004, x * 1.004);
            if (i > 0) {
                const [a, b, c] = points[i - 1];
                acc += Math.hypot(x - a, y - b, z - c);
            }
            dist.setX(i, acc);
        }
        pos.needsUpdate = true;
        dist.needsUpdate = true;
        this.line.geometry.setDrawRange(0, points.length);
    }
}
export class BlochView {
    constructor(host, model, liveRegion) {
        this.host = host;
        this.model = model;
        this.liveRegion = liveRegion;
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
        this.idealArrow = new Arrow(COLORS.ideal);
        this.errArrow = new Arrow(COLORS.err, 0.014, true);
        this.idealTrail = new Trail(new THREE.LineBasicMaterial({ color: COLORS.ideal }));
        this.errTrail = new Trail(new THREE.LineDashedMaterial({ color: COLORS.err, dashSize: 0.045, gapSize: 0.03 }));
        this.idealAxis = new AxisLine(COLORS.idealAxis);
        this.errAxis = new AxisLine(COLORS.errAxis);
        this.labels = [];
        this.pending = false;
        this.wasAnimating = false;
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        host.appendChild(this.renderer.domElement);
        this.labelRenderer = new CSS2DRenderer();
        this.labelRenderer.domElement.className = 'bloch-labels';
        host.appendChild(this.labelRenderer.domElement);
        this.camera.position.copy(INITIAL_CAMERA);
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enablePan = false;
        this.controls.minDistance = 2.2;
        this.controls.maxDistance = 7;
        this.controls.addEventListener('change', () => this.requestRender());
        this.buildScene();
        this.setupKeyboard();
        this.ro = new ResizeObserver(() => this.resize());
        this.ro.observe(host);
        this.resize();
        this.unsubscribe = model.subscribe(() => this.update());
    }
    /** Libera el contexto WebGL, los observadores y el DOM al salir de la página. */
    dispose() {
        this.ro.disconnect();
        this.unsubscribe();
        this.controls.dispose();
        this.renderer.dispose();
        this.renderer.domElement.remove();
        this.labelRenderer.domElement.remove();
    }
    // ---------------- escena estática ----------------
    buildScene() {
        this.scene.add(new THREE.AmbientLight(0xffffff, 1.6));
        const dir = new THREE.DirectionalLight(0xffffff, 1.6);
        dir.position.set(3, 4, 5);
        this.scene.add(dir);
        // Esfera semitransparente
        const sphere = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 48), new THREE.MeshPhongMaterial({ color: COLORS.sphere, transparent: true, opacity: 0.16, depthWrite: false, shininess: 80 }));
        sphere.renderOrder = -1;
        this.scene.add(sphere);
        // Ecuador y meridianos tenues
        const circle = (opacity) => {
            const pts = [];
            for (let i = 0; i <= 128; i++) {
                const a = (i / 128) * Math.PI * 2;
                pts.push(new THREE.Vector3(Math.cos(a), 0, Math.sin(a)));
            }
            return new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: COLORS.grid, transparent: true, opacity }));
        };
        this.scene.add(circle(0.55)); // ecuador
        for (let k = 0; k < 4; k++) {
            // círculo vertical (plano XY de three) girado k·45° alrededor del eje vertical
            const meridian = circle(0.18);
            meridian.rotation.x = Math.PI / 2;
            const holder = new THREE.Group();
            holder.add(meridian);
            holder.rotation.y = (k * Math.PI) / 4;
            this.scene.add(holder);
        }
        for (const lat of [-0.5, 0.5]) {
            const c = circle(0.14);
            const r = Math.sqrt(1 - lat * lat);
            c.scale.set(r, 1, r);
            c.position.y = lat;
            this.scene.add(c);
        }
        // Ejes x, y, z
        const axisMat = new THREE.LineBasicMaterial({ color: COLORS.axis, transparent: true, opacity: 0.7 });
        const axes = [
            { dir: [1, 0, 0], letter: 'x', pos: '|+⟩', neg: '|−⟩' },
            { dir: [0, 1, 0], letter: 'y', pos: '|+i⟩', neg: '|−i⟩' },
            { dir: [0, 0, 1], letter: 'z', pos: '|0⟩', neg: '|1⟩' },
        ];
        for (const a of axes) {
            const p = toThree(a.dir);
            this.scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([p.clone().multiplyScalar(-1.2), p.clone().multiplyScalar(1.2)]), axisMat));
            this.addLabel(p.clone().multiplyScalar(1.32), () => a.pos, 'ket');
            this.addLabel(p.clone().multiplyScalar(-1.32), () => a.neg, 'ket');
            this.addLabel(p.clone().multiplyScalar(1.13).add(new THREE.Vector3(0.06, 0.06, 0.06)), () => a.letter, 'axis-letter');
        }
        this.scene.add(this.idealTrail.line, this.errTrail.line, this.idealAxis, this.errAxis, this.idealArrow, this.errArrow);
        const origin = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 12), new THREE.MeshPhongMaterial({ color: COLORS.axis }));
        this.scene.add(origin);
    }
    addLabel(pos, text, cls) {
        const el = document.createElement('div');
        el.className = `bloch-label ${cls}`;
        el.textContent = text();
        const obj = new CSS2DObject(el);
        obj.position.copy(pos);
        this.scene.add(obj);
        this.labels.push({ el, text });
    }
    // ---------------- interacción ----------------
    setupKeyboard() {
        const el = this.renderer.domElement;
        el.tabIndex = 0;
        el.setAttribute('role', 'img');
        el.dataset.i18nAria = 'bloch.aria';
        el.setAttribute('aria-label', t('bloch.aria'));
        el.addEventListener('keydown', (e) => {
            const step = 0.12;
            const offset = this.camera.position.clone().sub(this.controls.target);
            const sph = new THREE.Spherical().setFromVector3(offset);
            switch (e.key) {
                case 'ArrowLeft':
                    sph.theta -= step;
                    break;
                case 'ArrowRight':
                    sph.theta += step;
                    break;
                case 'ArrowUp':
                    sph.phi = Math.max(0.1, sph.phi - step);
                    break;
                case 'ArrowDown':
                    sph.phi = Math.min(Math.PI - 0.1, sph.phi + step);
                    break;
                case '+':
                case '=':
                    sph.radius = Math.max(this.controls.minDistance, sph.radius * 0.9);
                    break;
                case '-':
                    sph.radius = Math.min(this.controls.maxDistance, sph.radius * 1.1);
                    break;
                default:
                    return;
            }
            e.preventDefault();
            this.camera.position.copy(this.controls.target).add(new THREE.Vector3().setFromSpherical(sph));
            this.camera.lookAt(this.controls.target);
            this.controls.update();
        });
    }
    resetView() {
        this.camera.position.copy(INITIAL_CAMERA);
        this.controls.target.set(0, 0, 0);
        this.controls.update();
    }
    resize() {
        const w = this.host.clientWidth;
        const h = this.host.clientHeight;
        if (w === 0 || h === 0)
            return;
        this.renderer.setSize(w, h);
        this.labelRenderer.setSize(w, h);
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.requestRender();
    }
    // ---------------- actualización desde el modelo ----------------
    update() {
        const m = this.model;
        const d = m.display;
        const ri = m.idealNow;
        const re = m.errNow;
        this.idealArrow.setDirection(ri);
        this.errArrow.setDirection(re);
        this.errArrow.visible = d.errorVector;
        const traj = m.trajectories();
        this.idealTrail.set(traj.ideal);
        this.errTrail.set(traj.err);
        this.idealTrail.line.visible = d.trajectories;
        this.errTrail.line.visible = d.trajectories && d.errorVector;
        this.idealAxis.setAxis(m.app.ideal.axis);
        this.errAxis.setAxis(m.app.effective.axis);
        this.idealAxis.visible = d.rotationAxes && m.app.ideal.angle !== 0;
        this.errAxis.visible = d.rotationAxes && d.errorVector && m.app.effective.angle > 1e-9;
        // Descripción accesible: sólo al terminar (evita inundar el lector de pantalla)
        const animating = m.isAnimating;
        if (!animating) {
            const text = t('bloch.describe', { ideal: formatVec(ri), err: formatVec(re), f: m.fidelityNow.toFixed(4) });
            if (this.wasAnimating || this.liveRegion.textContent === '')
                this.liveRegion.textContent = text;
            this.renderer.domElement.setAttribute('aria-description', text);
        }
        this.wasAnimating = animating;
        this.requestRender();
    }
    refreshLanguage() {
        for (const l of this.labels)
            l.el.textContent = l.text();
        this.update();
    }
    requestRender() {
        if (this.pending)
            return;
        this.pending = true;
        requestAnimationFrame(() => {
            this.pending = false;
            this.renderer.render(this.scene, this.camera);
            this.labelRenderer.render(this.scene, this.camera);
        });
    }
}
