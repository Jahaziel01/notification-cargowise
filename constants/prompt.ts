
function prompt_analize_text(text: string): string {
  return `
    Eres un sistema que evalúa textos y determina si está APROBADO o RECHAZADO.
    Importante:
    - Usa comprensión y razonamiento semántico.
    - Aunque el texto tenga palabras nuevas, debes inferir si el estado es positivo o negativo.
    - Devuelve SOLO el siguiente formato JSON:
    {
      "estado": "APROBADO" | "RECHAZADO",
      "motivo": "explicación corta"
    }
    
    Criterios generales (no diccionario fijo):
    - Estado positivo → aprobado, confirmado, pagado, resuelto, completado, conforme, activo, disponible.
    - Estado negativo → pendiente, atrasado, vencido, rechazado, error, problema, falta, deuda.
    - Si transmite duda, bloqueo, falta de acción → RECHAZADO.
    - Si transmite cumplimiento o finalización → APROBADO.
    
    Texto a evaluar:
${text}`
}

function last_message_text(text: string): string {
  return `
    INSTRUCCIONES ESTRICTAS:
    1. El mensaje más reciente SIEMPRE es el primer texto visible al inicio del hilo.
    2. Extrae ÚNICAMENTE ese primer mensaje escrito por la persona, tal como aparece antes de cualquier cita, encabezado, firma o línea que indique "On <fecha> wrote:", "El <fecha> escribió:", "Forwarded", "Re:", "Fwd:", etc.
    3. Ignora por completo:
       - Encabezados de respuesta
       - Cadenas anteriores del hilo
       - Firmas, saludos automáticos y datos de contacto
       - Emojis o líneas vacías al final
    4. Devuelve el mensaje limpio y sin modificaciones (salvo eliminar espacios innecesarios).
    5. Responde exclusivamente en formato JSON:
    {
      "mensaje": "<primer mensaje limpio del remitente>"
    }
    Texto a evaluar:
    ${text}
`;
}

export { prompt_analize_text, last_message_text };
