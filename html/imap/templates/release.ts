const templateRelease = (message: string) => {
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
            <p style="margin-bottom: 5px;">Saludos estimado(a)</p>
            <p style="margin-bottom: 10px; text-transform: uppercase;">La solicitud con relación a la liberación de este embarque ha sido: <strong>${message}</strong></p>
            <p style="margin-top: 5px;">Gracias por su atención.</p>
        </section>
    </main>
</body>
</html>
    `;
};

export default templateRelease;