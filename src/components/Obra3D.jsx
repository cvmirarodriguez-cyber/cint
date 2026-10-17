import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Escena: el plano (líneas naranjas) se va convirtiendo en obra gruesa, piso a piso.
const PISO = 1.25;
const XS = [-3, -1, 1, 3];
const ZS = [-1.6, 1.6];
const PISOS_CONSTRUIDOS = 5;
const PISOS_PLANO = 2;

const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Materiales declarados como JSX (R3F los gestiona: crea, adjunta y descarta),
// en vez de instancias compartidas que se pasan como prop material={...}.
const MATS = {
  hormigon: { color: '#9a9ca0', roughness: 0.92, metalness: 0.02 },
  losa: { color: '#6d7076', roughness: 0.9 },
  acero: { color: '#FF5F1F', roughness: 0.45, metalness: 0.35, emissive: '#FF5F1F', emissiveIntensity: 0.12 },
  hivis: { color: '#FFC21A', roughness: 0.5, metalness: 0.2 },
  oscuro: { color: '#33373d', roughness: 0.8 },
};
const TUNEL_MATS = {
  dovela: { color: '#8d9095', roughness: 0.95, side: THREE.DoubleSide },
  interior: { color: '#2a2d32', roughness: 1, side: THREE.DoubleSide },
  riel: { color: '#b9bcc2', roughness: 0.3, metalness: 0.9 },
  lampara: { color: '#fff1cc', emissive: '#ffd27a', emissiveIntensity: 2.2 },
  carro: { color: '#e4e6ea', roughness: 0.35, metalness: 0.45 },
  franja: { color: '#FF5F1F', roughness: 0.4, emissive: '#FF5F1F', emissiveIntensity: 0.25 },
  ventana: { color: '#ffe9b8', emissive: '#ffd98a', emissiveIntensity: 1.6 },
  faro: { color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 3 },
  oscuro: { color: '#33373d', roughness: 0.8 },
};

function Mat({ tipo }) {
  return <meshStandardMaterial {...MATS[tipo]} />;
}
function TunelMat({ tipo }) {
  return <meshStandardMaterial {...TUNEL_MATS[tipo]} />;
}

const easeOutBack = (t) => 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2);

// Pieza que "crece" desde su base cuando le llega su turno.
function Pieza({ pos, size, tipo, delay, eje = 'y' }) {
  const ref = useRef();
  useFrame(({ clock }) => {
    const t = reduce ? 1 : THREE.MathUtils.clamp((clock.elapsedTime - delay) / 0.7, 0, 1);
    const s = Math.max(0.0001, t === 1 ? 1 : easeOutBack(t));
    const m = ref.current;
    if (!m) return;
    m.visible = t > 0;
    if (eje === 'y') {
      m.scale.set(1, s, 1);
      m.position.y = pos[1] - size[1] / 2 + (size[1] * s) / 2;
    } else {
      m.scale.set(s, 1, s);
    }
  });
  return (
    <mesh ref={ref} position={pos} castShadow receiveShadow>
      <boxGeometry args={size} />
      <Mat tipo={tipo} />
    </mesh>
  );
}

function PiezaPlano({ pos, size, delay }) {
  const ref = useRef();
  useFrame(({ clock }) => {
    const t = reduce ? 1 : THREE.MathUtils.clamp((clock.elapsedTime - delay) / 0.9, 0, 1);
    if (ref.current) ref.current.opacity = 0.55 * t;
  });
  return (
    <mesh position={pos}>
      <boxGeometry args={size} />
      <meshBasicMaterial ref={ref} color="#FF5F1F" wireframe transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}

function Edificio() {
  const piezas = useMemo(() => {
    const out = [];
    const ancho = XS[XS.length - 1] - XS[0] + 0.6;
    const fondo = ZS[1] - ZS[0] + 0.6;
    for (let p = 0; p < PISOS_CONSTRUIDOS + PISOS_PLANO; p++) {
      const y0 = p * PISO;
      const plano = p >= PISOS_CONSTRUIDOS;
      const d = 0.4 + p * 0.55;
      const add = (o) => out.push({ ...o, plano, key: out.length });
      XS.forEach((x, i) => ZS.forEach((z, j) => add({ pos: [x, y0 + PISO / 2, z], size: [0.28, PISO, 0.28], tipo: 'hormigon', delay: d + (i + j) * 0.04 })));
      // Losa + vigas perimetrales
      add({ pos: [0, y0 + PISO - 0.06, 0], size: [ancho, 0.12, fondo], tipo: 'losa', delay: d + 0.3, eje: 'xz' });
      ZS.forEach((z) => add({ pos: [0, y0 + PISO - 0.2, z], size: [ancho - 0.2, 0.2, 0.22], tipo: p % 2 ? 'acero' : 'oscuro', delay: d + 0.22, eje: 'xz' }));
    }
    // Moldaje en el último piso construido
    const yTop = PISOS_CONSTRUIDOS * PISO;
    out.push({ key: 'm1', pos: [-2, yTop + 0.35, 0], size: [1.2, 0.7, 0.08], tipo: 'hivis', delay: 3.6 });
    out.push({ key: 'm2', pos: [2.2, yTop + 0.25, 1.4], size: [0.9, 0.5, 0.9], tipo: 'oscuro', delay: 3.8 });
    return out;
  }, []);

  return (
    <group>
      {piezas.map((p) =>
        p.plano ? (
          <PiezaPlano key={p.key} pos={p.pos} size={p.size} delay={p.delay} />
        ) : (
          <Pieza key={p.key} pos={p.pos} size={p.size} tipo={p.tipo} delay={p.delay} eje={p.eje} />
        ),
      )}
    </group>
  );
}

function Grua() {
  const pluma = useRef();
  const cable = useRef();
  const alto = 10.5;
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (pluma.current) pluma.current.rotation.y = reduce ? 0.9 : 0.9 + Math.sin(t * 0.18) * 0.7;
    if (cable.current) cable.current.rotation.z = reduce ? 0 : Math.sin(t * 1.3) * 0.04;
  });
  return (
    <group position={[4.5, 0, -3.4]}>
      {/* Torre reticulada */}
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[i % 2 ? 0.22 : -0.22, alto / 2, i < 2 ? 0.22 : -0.22]} castShadow>
          <boxGeometry args={[0.06, alto, 0.06]} />
          <Mat tipo="hivis" />
        </mesh>
      ))}
      {Array.from({ length: 14 }).map((_, i) => (
        <mesh key={`r${i}`} position={[0, 0.4 + i * 0.72, 0]} rotation={[0, 0, i % 2 ? 0.55 : -0.55]}>
          <boxGeometry args={[0.04, 0.6, 0.48]} />
          <Mat tipo="hivis" />
        </mesh>
      ))}
      <group ref={pluma} position={[0, alto, 0]}>
        <mesh position={[-2.6, 0.1, 0]} castShadow>
          <boxGeometry args={[9, 0.22, 0.3]} />
          <Mat tipo="hivis" />
        </mesh>
        <mesh position={[1.4, -0.05, 0]}>
          <boxGeometry args={[0.9, 0.5, 0.5]} />
          <Mat tipo="oscuro" />
        </mesh>
        <mesh position={[0, 0.9, 0]}>
          <boxGeometry args={[0.12, 1.6, 0.12]} />
          <Mat tipo="oscuro" />
        </mesh>
        <group ref={cable} position={[-5.4, 0, 0]}>
          <mesh position={[0, -1.6, 0]}>
            <boxGeometry args={[0.02, 3.2, 0.02]} />
            <Mat tipo="oscuro" />
          </mesh>
          <mesh position={[0, -3.35, 0]} castShadow>
            <boxGeometry args={[1.1, 0.14, 0.18]} />
            <Mat tipo="acero" />
          </mesh>
        </group>
      </group>
    </group>
  );
}

// Túnel de metro en corte junto a la obra, con un tren que lo recorre en loop.
// Corre de lado a lado frente a la cámara, más allá de la grúa; la mitad abierta mira a la cámara.
const TUNEL = { x: 7.2, largo: 34, radio: 1.55 };

// Anillo de dovelas que aparece con un leve rebote, de derecha a izquierda.
function Anillo({ x, delay }) {
  const ref = useRef();
  useFrame(({ clock }) => {
    const t = reduce ? 1 : THREE.MathUtils.clamp((clock.elapsedTime - delay) / 0.6, 0, 1);
    if (!ref.current) return;
    ref.current.visible = t > 0;
    const s = Math.max(0.0001, t === 1 ? 1 : easeOutBack(t));
    ref.current.scale.set(1, s, s);
  });
  return (
    <mesh ref={ref} position={[x, 0, 0]} rotation={[0, Math.PI / 2, 0]} castShadow>
      <torusGeometry args={[TUNEL.radio, 0.09, 8, 28, Math.PI]} />
      <TunelMat tipo="dovela" />
    </mesh>
  );
}

function Carro({ largo, frente }) {
  return (
    <group>
      <mesh position={[0, 0.62, 0]} castShadow>
        <boxGeometry args={[largo, 0.9, 0.92]} />
        <TunelMat tipo="carro" />
      </mesh>
      <mesh position={[0, 0.78, 0]}>
        <boxGeometry args={[largo - 0.3, 0.24, 0.94]} />
        <TunelMat tipo="ventana" />
      </mesh>
      <mesh position={[0, 0.42, 0]}>
        <boxGeometry args={[largo + 0.01, 0.1, 0.95]} />
        <TunelMat tipo="franja" />
      </mesh>
      {frente && (
        <>
          <mesh position={[-largo / 2 - 0.01, 0.5, 0.28]}><boxGeometry args={[0.04, 0.08, 0.14]} /><TunelMat tipo="faro" /></mesh>
          <mesh position={[-largo / 2 - 0.01, 0.5, -0.28]}><boxGeometry args={[0.04, 0.08, 0.14]} /><TunelMat tipo="faro" /></mesh>
        </>
      )}
    </group>
  );
}

function Tren() {
  const carros = useRef([]);
  const luz = useRef();
  const LARGO = 3, SEP = 0.18, N = 3;
  const recorrido = TUNEL.largo + 16;
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    // El tren entra por la derecha y sale por la izquierda; espera a que se arme el túnel.
    const cabeza = reduce ? 2 : TUNEL.largo / 2 + 6 - (((Math.max(0, t - 3.2)) * 5.5) % recorrido);
    carros.current.forEach((c, i) => {
      if (!c) return;
      const x = cabeza + i * (LARGO + SEP) + LARGO / 2;
      c.position.x = x;
      c.visible = Math.abs(x) < TUNEL.largo / 2 - LARGO / 2;
    });
    if (luz.current) {
      luz.current.position.x = cabeza - 0.6;
      luz.current.intensity = Math.abs(cabeza) < TUNEL.largo / 2 ? 14 : 0;
    }
  });
  return (
    <group>
      {Array.from({ length: N }).map((_, i) => (
        <group key={i} ref={(el) => (carros.current[i] = el)}>
          <Carro largo={LARGO} frente={i === 0} />
        </group>
      ))}
      <pointLight ref={luz} position={[0, 0.7, 0]} color="#fff4dc" distance={7} intensity={0} />
    </group>
  );
}

function Metro() {
  const anillos = useMemo(() => {
    const out = [];
    for (let x = TUNEL.largo / 2; x >= -TUNEL.largo / 2; x -= 1.1) out.push(x);
    return out;
  }, []);
  return (
    <group position={[TUNEL.x, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
      {/* Mitad trasera del túnel cerrada; la delantera queda en corte para ver el tren */}
      <mesh rotation={[0, 0, Math.PI / 2]} receiveShadow>
        <cylinderGeometry args={[TUNEL.radio - 0.04, TUNEL.radio - 0.04, TUNEL.largo, 28, 1, true, Math.PI / 2, Math.PI / 2]} />
        <TunelMat tipo="interior" />
      </mesh>
      <mesh position={[0, 0.04, 0]} receiveShadow>
        <boxGeometry args={[TUNEL.largo, 0.08, TUNEL.radio * 2]} />
        <TunelMat tipo="oscuro" />
      </mesh>
      {[-0.36, 0.36].map((z) => (
        <mesh key={z} position={[0, 0.12, z]}>
          <boxGeometry args={[TUNEL.largo, 0.05, 0.06]} />
          <TunelMat tipo="riel" />
        </mesh>
      ))}
      {anillos.map((x, i) => <Anillo key={x} x={x} delay={1.2 + i * 0.06} />)}
      {anillos.filter((_, i) => i % 3 === 0).map((x) => (
        <mesh key={`l${x}`} position={[x, 1.22, -0.88]}>
          <boxGeometry args={[0.5, 0.05, 0.08]} />
          <TunelMat tipo="lampara" />
        </mesh>
      ))}
      <Tren />
    </group>
  );
}

function Rig({ children }) {
  const g = useRef();
  useFrame(({ pointer, clock }, dt) => {
    if (!g.current || reduce) return;
    const objetivoY = -0.55 + pointer.x * 0.25 + Math.sin(clock.elapsedTime * 0.08) * 0.15;
    const objetivoX = pointer.y * 0.05;
    g.current.rotation.y = THREE.MathUtils.damp(g.current.rotation.y, objetivoY, 2.2, dt);
    g.current.rotation.x = THREE.MathUtils.damp(g.current.rotation.x, objetivoX, 2.2, dt);
  });
  return <group ref={g} rotation={[0, -0.55, 0]}>{children}</group>;
}

export default function Obra3D({ className = '', camara = [17, 9.5, 20] }) {
  return (
    <div className={className} aria-hidden="true">
      <Canvas
        shadows
        dpr={[1, 1.75]}
        camera={{ position: camara, fov: 32, near: 0.1, far: 120 }}
        onCreated={({ camera }) => camera.lookAt(1.2, 3.2, 0)}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      >
        <fog attach="fog" args={['#0c0d0f', 24, 55]} />
        <hemisphereLight args={['#ffe9d6', '#1a1c20', 1.1]} />
        <directionalLight position={[8, 14, 6]} intensity={3.2} color="#ffd9b8" castShadow />
        <pointLight position={[-6, 3, 4]} intensity={30} color="#FF5F1F" distance={18} />
        <Rig>
          <Edificio />
          <Grua />
          <Metro />
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.001, 0]}>
            <planeGeometry args={[60, 60]} />
            <shadowMaterial opacity={0.45} />
          </mesh>
          <gridHelper args={[60, 60, '#5a3420', '#2b2f35']} position={[0, 0, 0]} />
        </Rig>
      </Canvas>
    </div>
  );
}