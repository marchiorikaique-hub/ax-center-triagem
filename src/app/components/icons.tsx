// Sistema de ícones simples, um traço só (1.6), herda a cor do texto.
// Nada de emoji na interface.

interface P {
  size?: number;
}
const base = (size = 16) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});

export const IconAlerta = ({ size }: P) => (
  <svg {...base(size)} aria-hidden>
    <path d="M10.3 3.9 2.4 17.5A1.6 1.6 0 0 0 3.8 20h16.4a1.6 1.6 0 0 0 1.4-2.5L13.7 3.9a1.6 1.6 0 0 0-2.8 0Z" />
    <path d="M12 9v4M12 17h.01" />
  </svg>
);

export const IconRelogio = ({ size }: P) => (
  <svg {...base(size)} aria-hidden>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 1.8" />
  </svg>
);

export const IconCopia = ({ size }: P) => (
  <svg {...base(size)} aria-hidden>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15V6a2 2 0 0 1 2-2h9" />
  </svg>
);

export const IconRepetir = ({ size }: P) => (
  <svg {...base(size)} aria-hidden>
    <path d="M4 8a6 6 0 0 1 10-2l2 2M20 6v4h-4" />
    <path d="M20 16a6 6 0 0 1-10 2l-2-2M4 18v-4h4" />
  </svg>
);

export const IconEnviar = ({ size }: P) => (
  <svg {...base(size)} aria-hidden>
    <path d="M21 3 10.5 13.5M21 3l-6.5 18-4-8-8-4L21 3Z" />
  </svg>
);

export const IconOk = ({ size }: P) => (
  <svg {...base(size)} aria-hidden>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

export const IconChevron = ({ size }: P) => (
  <svg {...base(size)} aria-hidden>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export const IconFila = ({ size }: P) => (
  <svg {...base(size)} aria-hidden>
    <path d="M4 6h16M4 12h16M4 18h10" />
  </svg>
);
