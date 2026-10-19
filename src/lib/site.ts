/** Dados do site público. Itens em [colchetes] são preenchidos antes de publicar. */
export const SITE = {
  name: "Espaço Kids",
  email: "[e-mail de contato]",
  privacyEmail: "[e-mail de privacidade]",
  company: "[Razão Social]",
  cnpj: "[CNPJ]",
  address: "[endereço completo]",
  updatedAt: "[data]",
};

export interface Plan {
  name: string;
  price: string;
  suffix?: string;
  limit: string;
  features: string[];
  highlight?: boolean;
}

/** Faixas por número de crianças cadastradas (valores de partida, a confirmar). */
export const PLANS: Plan[] = [
  {
    name: "Início",
    price: "Grátis",
    limit: "Até 30 crianças",
    features: [
      "Check-in e check-out por QR",
      "Chamadas aos responsáveis",
      "Ficha de saúde e alergias",
      "1 igreja",
    ],
  },
  {
    name: "Crescimento",
    price: "R$ 39,90",
    suffix: "/mês",
    limit: "Até 100 crianças",
    features: [
      "Tudo do Início",
      "Crachás e etiquetas das salas",
      "Relatórios de presença",
      "Equipe ilimitada",
    ],
  },
  {
    name: "Expansão",
    price: "R$ 69,90",
    suffix: "/mês",
    limit: "Até 250 crianças",
    features: [
      "Tudo do Crescimento",
      "Avisos e notificações push",
      "Exportação em CSV",
      "Suporte prioritário",
    ],
    highlight: true,
  },
  {
    name: "Ilimitado",
    price: "R$ 149,90",
    suffix: "/mês",
    limit: "Acima de 250 crianças",
    features: [
      "Tudo do Expansão",
      "Atendimento dedicado",
      "Ajuda na implantação",
    ],
  },
];

export const FAQ = [
  {
    q: "Posso mudar de plano depois?",
    a: "Sim, a qualquer momento. O valor é ajustado proporcionalmente.",
  },
  { q: "Existe fidelidade?", a: "Não. Você cancela quando quiser, sem multa." },
  {
    q: "Como funciona o teste?",
    a: "O plano Início é grátis para sempre. Os planos pagos têm 14 dias de teste.",
  },
  {
    q: "Os pais precisam pagar alguma coisa?",
    a: "Não. O app é gratuito para as famílias; quem assina é a igreja.",
  },
  {
    q: "Os dados das crianças ficam seguros?",
    a: "Sim. Cada igreja só enxerga os próprios dados e o acesso é controlado por perfis (veja a Política de Privacidade).",
  },
];
