// Follow-up messages used by the admin portal (Centro de mando). Written in
// the TIP-IT voice: tú, short sentences, "propina", "QR", "reseñas"; no loss
// framing, no urgency, no discounts, no promised amounts. One message per
// situation; the portal fills in the first name and opens WhatsApp or email
// with it ready to send (the person still presses send).

export const LEAD_STAGES = [
  { id: 'nuevo', label: 'Nuevo' },
  { id: 'contactado', label: 'Contactado' },
  { id: 'interesado', label: 'Interesado' },
  { id: 'registrado', label: 'Creó cuenta' },
  { id: 'activo', label: 'Ya recibe propinas' },
  { id: 'descartado', label: 'Descartado' },
];

// Stages that still need someone to follow up.
export const OPEN_STAGES = ['nuevo', 'contactado', 'interesado', 'registrado'];

const MESSAGES = {
  nuevo:
    'Hola {nombre}, soy Rodrigo de TIP-IT 👋 Vi que te interesa recibir propinas con QR. ¿Te ayudo a dejar tu cuenta y tu QR listos? Son unos 10 minutos, por aquí o en persona.',
  contactado:
    'Hola {nombre}, ¿cómo vas? Te escribo por lo de tu QR de propinas de TIP-IT. ¿Tienes 10 minutos esta semana para dejarlo listo juntos?',
  interesado:
    'Hola {nombre}, ya tengo todo para armar tu QR de TIP-IT. ¿Te queda bien hoy o mañana? Solo necesitas tu celular y los datos de tu banco.',
  registrado:
    'Hola {nombre}, vi que ya creaste tu cuenta en TIP-IT 🙌 ¿Te ayudo a terminar lo que falta para que tus clientes te dejen propina con tu QR?',
  sin_banco:
    'Hola {nombre}, vi que ya creaste tu cuenta en TIP-IT 🙌 Te falta conectar tu banco para que te lleguen las propinas. ¿Te ayudo a terminarlo? Toma unos minutos.',
  sin_propinas:
    'Hola {nombre}, tu QR de TIP-IT ya está listo. Un consejo: ponlo donde tus clientes lo vean al pagar (espejo, mostrador o estuche). ¿Te mando la versión para imprimir?',
  activo:
    'Hola {nombre}, ¡ya te llegaron propinas por TIP-IT! 🎉 ¿Me cuentas cómo te ha ido? Tu opinión nos ayuda a mejorar.',
};

export function firstName(name) {
  return String(name || '').trim().split(/\s+/)[0] || '';
}

export function messageFor(kind, name) {
  return (MESSAGES[kind] || MESSAGES.contactado).replace('{nombre}', firstName(name)).replace('Hola ,', 'Hola,');
}

// Mexican mobiles are usually typed as 10 digits; wa.me wants the country code.
export function whatsappUrl(phone, text) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length < 8) return null;
  const full = digits.length === 10 ? `52${digits}` : digits;
  return `https://wa.me/${full}?text=${encodeURIComponent(text)}`;
}

export function emailUrl(email, text) {
  if (!email) return null;
  return `mailto:${email}?subject=${encodeURIComponent('Tu QR de propinas de TIP-IT')}&body=${encodeURIComponent(text)}`;
}

export function instagramUrl(handle) {
  return handle ? `https://instagram.com/${handle}` : null;
}
