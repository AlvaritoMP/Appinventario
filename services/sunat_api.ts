// @/services/sunat_api.ts

/**
 * Este archivo simula la interacción con una API externa como la de SUNAT
 * para la emisión de Guías de Remisión Electrónicas (GRE).
 */

export interface GREPayload {
    companyInfo: {
        ruc: string;
    };
    destinatario: {
        nombre: string;
        ruc: string;
    };
    puntos: {
        partida: string;
        llegada: string;
    };
    transportista: {
        placa: string;
        dniConductor: string;
        modalidad: string;
        pesoTotalKg: number;
    };
    motivoTraslado: string;
    fechaInicioTraslado: string;
    items: {
        codigo: string;
        descripcion: string;
        cantidad: number;
        unidad: string;
    }[];
    documentoReferencia?: string;
}

export interface GREResponse {
    success: boolean;
    ticket: string;
    cdr?: string; // Constancia de Recepción
    errors?: string[];
}

/**
 * Simula el envío de datos para generar una Guía de Remisión Electrónica.
 * @param payload Los datos de la guía a generar.
 * @returns Una promesa que resuelve con una respuesta simulada de la SUNAT.
 */
export const generateGRE_API = (payload: GREPayload): Promise<GREResponse> => {
    console.log("--- SIMULACIÓN DE ENVÍO A API SUNAT ---");
    console.log("Payload que se enviaría:");
    console.log(JSON.stringify(payload, null, 2));
    console.log("---------------------------------------");

    return new Promise((resolve, reject) => {
        // Simular un retraso de red
        setTimeout(() => {
            // Simular una respuesta de éxito en el 90% de los casos
            if (Math.random() < 0.95) {
                resolve({
                    success: true,
                    ticket: `TICKET-${Date.now()}`,
                    cdr: `CDR-${Math.floor(Math.random() * 1000000)}`,
                });
            } else {
                resolve({ // Usamos resolve también para errores controlados de la API
                    success: false,
                    ticket: `TICKET-${Date.now()}`,
                    errors: ["Error 2109: El RUC del transportista no existe."],
                });
            }
        }, 1500); // 1.5 segundos de retraso
    });
};
