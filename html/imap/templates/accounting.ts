import { DPTOS_CREDIT } from "@/constants";

const templateAccounting = (data: any) => {
    const containers = data.json?.containers?.map((container: any) => container.container).join(", ");
    return `
<!DOCTYPE html>
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
    </header>
    <div style="margin-top: 20px; margin-bottom: 20px;"></div>
    <main style="width: 600px;">
        <section>
            <p style="margin-bottom: 5px;">Saludos estimado(a) <strong>@${DPTOS_CREDIT[0]}</strong></p>
            <p style="margin-bottom: 10px; text-transform: uppercase;">Por medio de la presente se solicita la revisión de crédito, saldos en antigüedad y pagos pendientes de este embarque:</p>
            <ul>
                <li>BL: <strong>${data.json?.shipment.shipmentNumber}</strong></li>
                <li>FECHA DE LIBERACIÓN: <strong>${data.release}</strong></li>
                <li>CONTENEDOR: <strong>${containers}</strong></li>
            </ul>
            <p style="margin-top: 5px;">Gracias por su atención.</p>
        </section>
    </main>
</body>
</html>
    `;
};

export default templateAccounting;