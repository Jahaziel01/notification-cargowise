import { DPTOS_CREDIT } from "@/constants";

const templateLogistics = (data: any) => {
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
            <p style="margin-bottom: 5px;">Saludos estimado(a) <strong>@${DPTOS_CREDIT[1]}</strong></p>
            <p style="margin-bottom: 10px; text-transform: uppercase;">Por medio de la presente, se solicita la liberación del presente embarque ante la naviera.</p>
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

export default templateLogistics;