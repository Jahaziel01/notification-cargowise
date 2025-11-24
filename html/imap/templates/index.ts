import dotenv from "dotenv";
import { convertToBase64 } from "@/constants/helpers";
import { GET_ATA_ARRIVAL_NOTICE } from "@/controllers/notification/arrivalNotice";

dotenv.config();

const template = async (data: any) => {
    const type = (data.type === "PRE_ALERT" ? "Pre-Alerta" : "Aviso de Llegada").toUpperCase();

    const ataAt = await GET_ATA_ARRIVAL_NOTICE({ shipment: data.shipment.operation });
    const params_confirmation = convertToBase64(data.shipment.operation);
    const route_confirmation_arrival = `${process.env.FRONTEND_URL as string}/arrival/confirm/${params_confirmation}`;

    const route_confirmation_prealert = `${process.env.FRONTEND_URL as string}/pre-alert/confirm/${params_confirmation}`;
    const SHOW = false;

    const obj_dispatch = {
        shipment: data.shipment.operation,
        hbl: data.shipment.shipmentNumber,
        containers: data.containers.map((container: any) => container.container).join(", "),
        eta: data.shipment.dateArrival,
        shipping: data.shipping,
    };

    const params_dispatch = convertToBase64(JSON.stringify(obj_dispatch));
    const route_dispatch = `${process.env.FRONTEND_URL as string}/arrival/schedule/${params_dispatch}`;

    const params_bl = convertToBase64(JSON.stringify(data.shipment.operation));
    const route_bl = `${process.env.FRONTEND_URL as string}/view/pdf/${params_bl}`;

    const confirmNotification = type === "AVISO DE LLEGADA" ? `
<table role="presentation" cellpadding="0" cellspacing="0">
  <tr>
    <td>
      <div style="padding-bottom: 20px;">
        <a href="${route_confirmation_arrival}" style="display:inline-block; text-decoration:none; text-transform:uppercase; color:black; background-color:#ffd31f; padding:20px; border-radius:5px; font-size:16px; font-weight:500;">
          Confirmar Recepción
        </a>
      </div>
    </td>
  </tr>

  <tr>
    <td>
      <div style="padding-bottom: 20px;">
        <a href="${route_dispatch}" style="display:inline-block; text-decoration:none; text-transform:uppercase; color:black; background-color:#ffd31f; padding:20px; border-radius:5px; font-size:16px; font-weight:500;">
          Programar Liberación
        </a>
      </div>
    </td>
  </tr>
  <tr>
    <td>
      <div style="padding-bottom: 20px;">
        <a href="${route_bl}" style="display:inline-block; text-decoration:none; text-transform:uppercase; color:black; background-color:#ffd31f; padding:20px; border-radius:5px; font-size:16px; font-weight:500;">
        <button>BL</button>
        </a>
      </div>
    </td>
  </tr>
</table>
    ` : `${SHOW ? `
         <div style="padding-bottom: 20px;">
        <a href="${route_confirmation_prealert}" style="display:inline-block; text-decoration:none; text-transform:uppercase; color:black; background-color:#ffd31f; padding:20px; border-radius:5px; font-size:16px; font-weight:500;">
          Confirmar Pre-Alerta
        </a>
      </div>` : ''}
      `;

    const listContainers = data?.containers
        ?.map(
            (container: any) => `
      <div style="width: 100%; display: flex; font-size: 10px; gap: 5px; margin-bottom: 8px;">
        <div style="width: 33%; display: flex; flex-direction: column; gap: 3px;">
          <p style="font-size: 10px; background-color: rgb(244, 244, 244); padding: 2px; border: 1px solid black; font-weight: bold;">
            CONTENEDOR
          </p>
          <p><span style="font-size: 10px;">${container.container || "-"}</span></p>
        </div>

        <div style="width: 33%; display: flex; flex-direction: column; gap: 3px;">
          <p style="font-size: 10px; background-color: rgb(244, 244, 244); padding: 2px; border: 1px solid black; font-weight: bold;">
            TIPO
          </p>
          <p><span style="font-size: 10px;">${container.volume || "-"} ${container.volumeUnit || "-"}</span></p>
        </div>

        <div style="width: 33%; display: flex; flex-direction: column; gap: 3px;">
          <p style="font-size: 10px; background-color: rgb(244, 244, 244); padding: 2px; border: 1px solid black; font-weight: bold;">
            BULTOS
          </p>
          <p><span style="font-size: 10px;">${container.weight || "-"} ${container.weightUnit || "-"}</span></p>
        </div>
      </div>
    `
        )
        .join("");

    return `<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
</head>
<style>
    body {
        font-family: Arial, Helvetica, sans-serif;
        width: 600px;
        font-size: 12px;
    }

    p {
        margin: 0;
    }
</style>

<body>
    <header>
       <img src="cid:logoFrankleo" alt="logo-frankleo" width="600" />
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h1 style="text-transform: uppercase;">${type}</h1>
            <ul style="list-style: none;">
                <li style="margin-bottom: 3px;">HAWB/HBL: <strong>${data?.shipment?.shipmentNumber}</strong></li>
                <li style="margin-bottom: 3px;">Operación: <strong>${data?.shipment?.operation}</strong></li>
                <li style="margin-bottom: 3px;">${type === "PRE-ALERTA" ?
            `Fecha estimada de llegada (ETA): <br><strong>${data?.shipment?.dateArrival}</strong>`
            : `Fecha exacta de llegada (ATA): <br><strong>${ataAt}</strong>`
        }</li>
            </ul>
        </div>
    </header>
    <main style="width: 600px;">
        <section style="margin-bottom: 20px;">
            <p style="margin-bottom: 10px;"> Cordiarles saludos.</p>
            <p style="margin-bottom: 10px;">${type === 'PRE-ALERTA' ? 'Adjunto documentaciones del embarque en referencia del suplidor:' : 'Adjunto aviso de llegada y copia de BL del embarque en referencia del suplidor:'} 
                <br>
                <strong>${data?.agent?.consignor?.name}</strong>
            </p>
            <p style="margin-bottom: 30px;">${type === 'PRE-ALERTA' ? 'FECHA ESTIMADA DE LLEGADA <strong>*SUJETO A CONFIRMACION*</strong>' : '<strong>*FECHA EXACTA DE LLEGADA*</strong>'}
                <br>
                <strong style="color: red;">${data?.shipment?.dateArrival}</strong>
            </p>
          
                ${data?.shipment?.freight ? `<p style="margin-bottom: 30px;">FLETE MANIFESTADO: <strong>${data?.shipment?.freight}</strong></p>` : ''}
        
            ${confirmNotification}
            ${type === 'PRE-ALERTA' ? `
            <p style="margin-bottom: 20px;"><strong>***POR FAVOR CONFIRMAR LA DESCRIPCION DE LA MERCANCIA PARA FINES
                    DE MANIFIESTO ADUANAL.***</strong></p>
            ` : ''}
            ${type === 'PRE-ALERTA' ? `
            <section style="margin-bottom: 20px; border-bottom: 1px solid black;">
                <p style="background-color: black; color: white; padding: 4px; margin-bottom: 10px;">DATOS DEL EMBARQUE</p>
                <div style="display: flex; justify-content: space-between; gap: 10px; margin-bottom: 10px;">
                    <div style="width: 50%; font-size: 10px; display: flex; flex-direction: column; gap: 5px;">
                        <p
                            style="font-size: 10px; background-color:rgb(244, 244, 244); padding: 2px; border: 1px solid black; font-weight: bold;">
                            SUPLIDOR</p>
                        <p><span>${data?.agent?.consignor?.name}</span><br>${data?.agent?.consignor?.address}</p>
                    </div>
                    <div style="width: 50%; font-size: 10px; display: flex; flex-direction: column; gap: 5px;">
                        <p
                            style="font-size: 10px; background-color:rgb(244, 244, 244); padding: 2px; border: 1px solid black; font-weight: bold;">
                            CONSIGNATARIO</p>
                        <p><span style="font-size: 10px;">${data?.agent?.consignee?.name}</span><br>${data?.agent?.consignee?.address}</p>
                    </div>
                </div>
                <div style="display: flex; justify-content: space-between; gap: 10px; margin-bottom: 10px;">
                    <div style="width: 50%; font-size: 10px; display: flex; flex-direction: column; gap: 5px;">
                        <p
                            style="font-size: 10px; background-color:rgb(244, 244, 244); padding: 2px; border: 1px solid black; font-weight: bold;">
                            BL / HAWB</p>
                        <p><span style="font-size: 10px;">${data?.shipment?.shipmentNumber}</span></p>
                    </div>
                    <div style="width: 50%; font-size: 10px; display: flex; flex-direction: column; gap: 5px;">
                        <p
                            style="font-size: 10px; background-color:rgb(244, 244, 244); padding: 2px; border: 1px solid black; font-weight: bold;">
                            HAWB/HBL</p>
                        <p><span style="font-size: 10px;">${data?.shipment?.shipmentNumber}</span></p>
                    </div>
                </div>
                <div style="display: flex; justify-content: space-between; gap: 10px; margin-bottom: 10px;">
                    <div style="width: 50%; font-size: 10px; display: flex; flex-direction: column; gap: 5px;">
                        <p
                            style="font-size: 10px; background-color:rgb(244, 244, 244); padding: 2px; border: 1px solid black; font-weight: bold;">
                            PESO</p>
                        <p><span style="font-size: 10px;">${data?.charge?.totalPackages} ${data?.charge?.totalPackagesUnit}</span></p>
                    </div>
                    <div style="width: 50%; font-size: 10px; display: flex; flex-direction: column; gap: 5px;">
                        <p
                            style="font-size: 10px; background-color:rgb(244, 244, 244); padding: 2px; border: 1px solid black; font-weight: bold;">
                            VOLUMEN</p>
                        <p><span style="font-size: 10px;">${data?.charge?.volume} ${data?.charge?.volumeUnit}</span></p>
                    </div>
                    <div style="width: 50%; font-size: 10px; display: flex; flex-direction: column; gap: 5px;">
                        <p
                            style="font-size: 10px; background-color:rgb(244, 244, 244); padding: 2px; border: 1px solid black; font-weight: bold;">
                            CARGABLE</p>
                        <p><span style="font-size: 10px;">${data?.charge?.chargeableWeight} ${data?.charge?.chargeableWeightUnit}</span></p>
                    </div>
                </div>
                <div style="display: flex; justify-content: space-between; gap: 10px; margin-bottom: 10px;">
                    <div style="width: 50%; font-size: 10px; display: flex; flex-direction: column; gap: 5px;">
                        <p
                            style="font-size: 10px; background-color:rgb(244, 244, 244); padding: 2px; border: 1px solid black; font-weight: bold;">
                            MERCANCÍA RECOGIDA EN</p>
                        <p><span style="font-size: 10px;">${data?.origins?.origin}</span></p>
                    </div>
                    <div style="width: 50%; font-size: 10px; display: flex; flex-direction: column; gap: 5px;">
                        <p
                            style="font-size: 10px; background-color:rgb(244, 244, 244); padding: 2px; border: 1px solid black; font-weight: bold;">
                            MERCANCÍA ENTREGADA EN</p>
                        <p><span style="font-size: 10px;">${data?.origins?.destination}</span></p>
                    </div>
                </div>
                <div style="display: flex; justify-content: space-between; gap: 10px; margin-bottom: 10px;">
                    ${listContainers}
                </div>
            </section>
            `: ''}
            <p style="margin-bottom: 10px; text-align: justify;">Para asegurar que su consulta sea atendida por nuestro equipo de
                operaciones, por favor siempre copie a
                <a href="mailto:operaciones@frankleo.com" target="_blank" style="color: black;"> <strong
                        style="text-decoration: underline;">operaciones@frankleo.com</strong></a>
                en todos los correos electrónicos. De esta manera, podemos garantizar una respuesta oportuna a su
                solicitud.Gracias por su comprensión y paciencia.
            </p>

            <p style="margin-bottom: 10px; text-align: justify;">Les recordamos:</p>

            <p style="margin-bottom: 5px; text-align: justify;">1. Agilizar los trámites aduanales necesarios, considerando que el tiempo libre para presentación aduanal es de 5 días a partir de la fecha de llegada del buque, pasados los días libres Aduanas le aplica una multa por presentación tardía (Art. 52).</p>
            <p style="margin-bottom: 5px; text-align: justify;">2. Las cartas de corrección deben ser presentadas ante las Aduanas dentro del mismo período de tiempo (5 días). El Valor de las mismas van desde $2,000 hasta $10,000 después de los 5 días de la llegada de la mercancía, notando que estas últimas son enviadas a la DGA para su aprobación. No somos Responsables de correcciones tramitadas después de este periodo.</p>
            <p style="margin-bottom: 2px; text-align: justify;">3. <strong>NOTA SOBRE ART. 52 –</strong> Declaración Tardía: Estimado Consignatario tener la advertencia que una vez entre en vigencia la nueva ley 168-21 de la Direccione General de Aduanas, los días permitidos para la declaración de su importación serán 5 dias calendario contando el día de llegada así también Sábados-Domingos y días feriados, una vez transcurrido este tiempo las importaciones serán penalizadas bajo el Art-52 Declaracion Tardía, lo que implica una penalidad del 3% de valor Costo-Seguro y Flete expresado en la declaración aduanal, esta penalidad se aplica a todo régimen de importación: Consumo, Zonas Franca, Temporal, Centro Logstico, ect.</p>
            <p style="margin-bottom: 10px; text-align: justify;"><strong>Recomendamos presentar sus cargas bajo la modalidad NO MANIFIESTO para evitar incurrir en esta penalización.</strong></p>
        </section>
      
        <footer style="margin-top: 20px; font-family: Arial, sans-serif;">
            <p style="margin-bottom: 10px;">
                <em>Notificación generada por el sistema.</em>
            </p>
            <p>
                <strong>Saludos cordiales,</strong>
            </p>
            ${data?.agent?.user ? `<p style="margin: 5px 0 0 0;">
                <span style="color: #000;">${data?.agent?.user}</span><br>
            </p>` : ""}
        </footer>
    </main>
</body>

</html>
`};

export default template;