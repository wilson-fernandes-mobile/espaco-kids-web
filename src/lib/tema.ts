// Cor da igreja: cada igreja escolhe a sua em Configurações; vale no painel e no app.
// Mesmo desenho do ClinicaMedica (matiz OKLCH + escala de croma + deslocamento de
// luminosidade), com mais cores (inclui o coral do mixbot, #FF723A).
//
// Variáveis semânticas (destructive/success/warning, texto, fundos brancos)
// ficam de fora de propósito: são status/legibilidade, não marca.

export type TemaCor =
  | "verde"
  | "azul"
  | "laranja"
  | "vermelho"
  | "marrom"
  | "lilas"
  | "roxo"
  | "rosa"
  | "ciano"
  | "turquesa"
  | "dourado"
  | "grafite"
  | "indigo"
  | "bordo"
  | "coral"
  | "limao"
  | "menta"
  | "ceu"
  | "magenta"
  | "oliva"
  | "petroleo";

/** `original` = o azul padrão do Espaço Kids (sem sobrescrever nada). */
export type TemaEscolha = TemaCor | "original";

interface ConfigTema {
  label: string;
  /** Matiz OKLCH (0-360). */
  hue: number;
  /** Multiplica o croma de todas as variáveis (cores vivas pedem < 1; as que viram lama, também). */
  chromaScale?: number;
  /** Desloca a luminosidade só das variáveis "vivas" (não fundos quase-brancos). */
  lightnessShift?: number;
}

export const TEMAS: Record<TemaCor, ConfigTema> = {
  verde: { label: "Verde", hue: 155 },
  azul: { label: "Azul", hue: 235 },
  laranja: { label: "Laranja", hue: 45, chromaScale: 0.9 },
  vermelho: { label: "Vermelho", hue: 18, chromaScale: 0.72 },
  marrom: { label: "Marrom", hue: 55, chromaScale: 0.5, lightnessShift: -0.12 },
  lilas: { label: "Lilás", hue: 300, chromaScale: 0.8 },
  roxo: { label: "Roxo", hue: 275 },
  rosa: { label: "Rosa", hue: 340, chromaScale: 0.85 },
  ciano: { label: "Ciano", hue: 195 },
  turquesa: { label: "Turquesa", hue: 175, chromaScale: 0.95 },
  dourado: { label: "Dourado", hue: 85, chromaScale: 0.75, lightnessShift: -0.03 },
  grafite: { label: "Grafite", hue: 240, chromaScale: 0.25 },
  indigo: { label: "Índigo", hue: 260 },
  bordo: { label: "Bordô", hue: 5, chromaScale: 0.85, lightnessShift: -0.08 },
  // Novas
  coral: { label: "Coral", hue: 38, chromaScale: 1.05 }, // laranja-coral do mixbot (#FF723A)
  limao: { label: "Limão", hue: 125, chromaScale: 0.9 },
  menta: { label: "Menta", hue: 165, chromaScale: 0.7 },
  ceu: { label: "Céu", hue: 220, chromaScale: 0.85 },
  magenta: { label: "Magenta", hue: 325 },
  oliva: { label: "Oliva", hue: 115, chromaScale: 0.55, lightnessShift: -0.08 },
  petroleo: { label: "Petróleo", hue: 205, chromaScale: 0.6, lightnessShift: -0.1 },
};

export const TEMA_ORIGINAL: TemaEscolha = "original";
export const TEMA_ORDEM: TemaEscolha[] = [
  "original",
  ...(Object.keys(TEMAS) as TemaCor[]),
];

export function rotuloTema(t: TemaEscolha): string {
  return t === "original" ? "Original" : TEMAS[t].label;
}

/** Aceita qualquer texto salvo (ou nada) e devolve uma escolha válida. */
export function temaValido(v: unknown): TemaEscolha {
  return typeof v === "string" && v in TEMAS ? (v as TemaCor) : "original";
}

/**
 * [variável CSS, L, C, offset de matiz] — valores do `:root` de `styles.css`
 * (base azul, matiz 255; os neutros ficam em 250, daí o offset -5).
 */
const VARIAVEIS_TEMA: [string, number, number, number][] = [
  ["--background", 0.982, 0.004, -5],
  ["--primary", 0.52, 0.17, 0],
  ["--primary-soft", 0.95, 0.03, 0],
  ["--secondary", 0.955, 0.008, -5],
  ["--muted", 0.96, 0.006, -5],
  ["--accent", 0.95, 0.02, 0],
  ["--accent-foreground", 0.35, 0.1, 0],
  ["--border", 0.915, 0.01, -5],
  ["--input", 0.9, 0.01, -5],
  ["--ring", 0.52, 0.17, 0],
  ["--chart-1", 0.52, 0.17, 0],
  ["--sidebar-primary", 0.52, 0.17, 0],
  ["--sidebar-accent", 0.95, 0.03, 0],
  ["--sidebar-accent-foreground", 0.4, 0.14, 0],
  ["--sidebar-border", 0.925, 0.01, -5],
  ["--sidebar-ring", 0.52, 0.17, 0],
];

function paraOklch(l: number, c: number, h: number): string {
  const hn = ((h % 360) + 360) % 360;
  return `oklch(${l.toFixed(3)} ${c.toFixed(3)} ${hn.toFixed(1)})`;
}

function calcularVariaveis(cor: TemaCor): Record<string, string> {
  const cfg = TEMAS[cor];
  const escala = cfg.chromaScale ?? 1;
  const out: Record<string, string> = {};
  for (const [variavel, lBase, cBase, offset] of VARIAVEIS_TEMA) {
    const desloca = lBase <= 0.75 ? (cfg.lightnessShift ?? 0) : 0;
    const l = Math.min(1, Math.max(0, lBase + desloca));
    out[variavel] = paraOklch(l, cBase * escala, cfg.hue + offset);
  }
  return out;
}

/** Aplica a cor no `<html>`; `original` (ou inválida) devolve o padrão do CSS. */
export function aplicarTema(escolha: unknown): void {
  if (typeof document === "undefined") return;
  const raiz = document.documentElement.style;
  const tema = temaValido(escolha);
  if (tema === "original") {
    for (const [variavel] of VARIAVEIS_TEMA) raiz.removeProperty(variavel);
    return;
  }
  for (const [variavel, valor] of Object.entries(calcularVariaveis(tema)))
    raiz.setProperty(variavel, valor);
}

/** Gradiente da bolinha de escolha (mesma relação primary → tom mais claro). */
export function gradientePreviaTema(t: TemaEscolha): string {
  const cfg = t === "original" ? { hue: 255, chromaScale: 1, lightnessShift: 0 } : TEMAS[t];
  const escala = cfg.chromaScale ?? 1;
  const shift = cfg.lightnessShift ?? 0;
  const de = paraOklch(0.52 + shift, 0.17 * escala, cfg.hue);
  const para = paraOklch(0.72 + shift, 0.16 * escala, cfg.hue + 8);
  return `linear-gradient(135deg, ${de}, ${para})`;
}
