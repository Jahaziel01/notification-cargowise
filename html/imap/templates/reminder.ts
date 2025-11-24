const templateReminder = (data: any): string => {
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
    </header>
    <div style="margin-top: 20px; margin-bottom: 20px;"></div>
    <main style="width: 600px;">
        <section>
            <p style="margin-bottom: 10px;"> Cordiarles saludos.</p>
            <div style="margin-bottom: 10px;">
                <p style="text-transform: uppercase;">
                    Le recordamos que la descripción de esta pre-alerta (enviado el <strong>${data.createdAt.template}</strong>) aún no ha sido confirmada.  
                </p>
            </div>
            ${data.diff >= 1 ? ` <p style="margin-bottom: 5px; text-transform: uppercase;">
                Tiempo transcurrido: <strong>${data.diff} ${data.diff === 1 ? 'día' : 'días'}</strong>
            </p>` : ""}
        </section>
    </main>
</body>
</html>
`}

export default templateReminder;
