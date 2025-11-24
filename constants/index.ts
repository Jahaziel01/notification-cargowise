function ISVALID_NOTIFICATION_SUBJECT(subject: string): boolean {
  if (!subject) return false;

  const NOTIFICATIONS_KEY = [
    "EMBARQUE - PRE-ALERTA",
  ].map(key => key.toUpperCase());

  const upperSubject = subject.toUpperCase();

  const baseMatch = NOTIFICATIONS_KEY.some(key =>
    upperSubject.startsWith(key)
  );

  if (!baseMatch) return false;

  const regex = /^EMBARQUE - (PRE-ALERTA|AVISO DE LLEGADA)\s+[A-Z0-9]+$/i;

  return regex.test(subject);
};

function PARSE_CONSOLIDADO(text: string) {
  const upper = text.toUpperCase();

  if (upper.startsWith("CONSOLIDADO") && upper.includes("-")) {
    const parts = text.split("-").map(p => p.trim());

    return [parts[1], parts[2]];
  }

  return null;
}

const NOTIFICATION_REMINDER = [
    "PRE-ALERTA",
    "AVISO DE LLEGADA"
];

const DOMAINS_NOT_ALLOWED = [
    "wisecloud.com",
    "frankleo.com"
];

const INTERNAL_MAIL = [
    "assistancefrankleo@gmail.com"
];

const REPORTS_KEY = [
    "REPORTE",
    "REPORT",
    "REPORTS",
    "ENVIAME",
    "REPORTES",
    "ENVIA",
    "ENVÍAME",
    "ENVÍA"
];

const MAIL_TEST = [
    "jahazielmartinez80@gmail.com",
    "jmartinez@frankleo.com"
];

const MAIL_ERROR = [
    "traffic@frankleo.com"
];

const MESSAGE_ERROR = {
    shipping: "Los datos de la <strong>naviera</strong> estaban incompletos o no se encontraron.",
    shipment: "Los datos del <strong>embarque</strong> estan incompletos o no se encontraron.",
}

const GATEWAY_NOT_ALLOWED = [
    "192.168.100.1"
];

const DPTOS_CREDIT = [
    "jahazielmartinez80@gmail.com", //simulacion contabilidad
    "jmartinez@frankleo.com"  //simulacion traffic / operaciones
];

export {
    PARSE_CONSOLIDADO,
    NOTIFICATION_REMINDER,
    DOMAINS_NOT_ALLOWED,
    REPORTS_KEY,
    ISVALID_NOTIFICATION_SUBJECT,
    MAIL_TEST,
    MESSAGE_ERROR,
    MAIL_ERROR,
    INTERNAL_MAIL,
    GATEWAY_NOT_ALLOWED,
    DPTOS_CREDIT
};
