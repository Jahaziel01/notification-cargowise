interface Notification {
    id: string;
    type: string;
    shipmentId: string;
    subject: string;
    recipient: string;
    retries: number;
    isAnswered: boolean;
    answeredBy: string;
    answeredAt: string;
}

const template = (notifications: any) => {
    const logo = `${process.env.PUBLIC_URL}:3000/images/logo.png`;

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
        font-family: Arial, sans-serif;
        font-size: 10px;
        padding: 10px;
    }
</style>

<body>
    <header>
        <img src=${logo} alt="logo-frankleo" width="220px">
        <h1>Report Notification</h1>
        <div>
            <ul style="list-style-type: none;">
                <li>Date:
                    <strong>${new Date().toLocaleString("es-ES")}</strong>
                </li>
            </ul>
        </div>
    </header>
    <main style="overflow-x: auto; overflow-y: auto;">
        <table style="border-collapse: collapse; min-width: 100%; height: auto;">
            <thead>
                <tr>
                    <th style="border: 1px solid #3a3a3a; padding: 5px; text-align: start;">ID</th>
                    <th style="border: 1px solid #3a3a3a; padding: 5px; text-align: start;">Shipment No.</th>
                    <th style="border: 1px solid #3a3a3a; padding: 5px; text-align: start;">Email Subject</th>
                    <th style="border: 1px solid #3a3a3a; padding: 5px; text-align: start;">Recipient(s)</th>
                    <th style="border: 1px solid #3a3a3a; padding: 5px; text-align: start;">Retry Count</th>
                    <th style="border: 1px solid #3a3a3a; padding: 5px; text-align: start;">Replied</th>
                    <th style="border: 1px solid #3a3a3a; padding: 5px; text-align: start;">Replied By</th>
                    <th style="border: 1px solid #3a3a3a; padding: 5px; text-align: start;">Reply Date</th>
                </tr>
            </thead>
            <tbody>
                ${notifications.map((notification: Notification) => {
        return `
                    <tr>
                        <td style="border: 1px solid #3a3a3a; padding: 5px; text-align: start;">${notification.id}</td>
                        <td style="border: 1px solid #3a3a3a; padding: 5px; text-align: start;">${notification.shipmentId}</td>
                        <td style="border: 1px solid #3a3a3a; padding: 5px; text-align: start;">${notification.subject}</td>
                        <td style="border: 1px solid #3a3a3a; padding: 5px; text-align: start;">${notification.recipient}</td>
                        <td style="border: 1px solid #3a3a3a; padding: 5px; text-align: start;">${notification.retries}</td>
                        <td style="border: 1px solid #3a3a3a; padding: 5px; text-align: start;">${notification.isAnswered}</td>
                        <td style="border: 1px solid #3a3a3a; padding: 5px; text-align: start;">${notification.answeredBy
                ? notification.answeredBy.replace(/</g, "&lt;").replace(/>/g, "&gt;")
                : ""}</td>
                        <td style="border: 1px solid #3a3a3a; padding: 5px; text-align: start;">${notification.answeredAt}</td>
                    </tr>
                    `;
    }).join("")}
            </tbody>
        </table>
    </main>
</body>

</html>
`;
}

export default template;