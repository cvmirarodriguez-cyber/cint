// WhatsApp de soporte (formato internacional, solo dígitos; ej. 56912345678).
export const WHATSAPP_SOPORTE = '';

export const enlaceWhatsApp = (texto) =>
  WHATSAPP_SOPORTE ? `https://wa.me/${WHATSAPP_SOPORTE}?text=${encodeURIComponent(texto)}` : null;
