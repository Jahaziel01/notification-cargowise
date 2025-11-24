import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import "dayjs/locale/es";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale("es");

const convertToBase64 = (id: string) => {
    try {
        return Buffer.from(JSON.stringify(id), "utf8").toString("base64");
    } catch (error) {
        return error;
    }
};

const safeDecode = (encoded: string) => {
    const clean = encoded.replace(/["\s]/g, "");
    const decoded = Buffer.from(clean, "base64").toString("utf8");

    return decoded.replace(/^"|"$/g, "");
};

function diffInDays(date1: string, date2: string) {
    const d1 = dayjs(date1);
    const d2 = dayjs(date2);

    if (!d1.isValid() || !d2.isValid()) return 0;

    return d2.diff(d1, "day");
}

function dateFormater(date: string | Date): string {
    return dayjs.utc(date).format("dddd, DD MMMM YYYY");
}

export { convertToBase64, safeDecode, diffInDays, dateFormater };