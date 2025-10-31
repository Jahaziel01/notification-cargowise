import get from "lodash/get.js";
import { testFile } from "../test/index";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import "dayjs/locale/es";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale("es");

async function xmlParser(xml: any): Promise<void> {
    try {
        const data = await testFile();
        const document = get(data, 'XmlInterchange.Payload.Shipments.Shipment', {});

        const shipmentNumber = document.ShipmentIdentifier[0]._;
        const mawb =
            get(document, "ARInvoices.TxnHeader.TxnLines.TxnLine", [])
                .filter((line: any) => line?.MasterBillNo)[0]?.MasterBillNo
            ||
            get(document, "Events.Event", [])
                .find((event: any) => event.Information?.includes("Master"))
                ?.Information?.split('"')[1];

        const operation = get(document, "ShipmentDetails.AgentReference", "");
        const dateArrival = dateFormater(get(document, "Events.Event", [])
            .find((event: any) => event.CodeDescription === "Llegada")?.DateTime || "");

        const incoterms = get(document, "ShipmentDetails.Incoterm", "");

        const consignee = {
            name: get(document, "ShipmentDetails.Consignee.OrganisationDetails.Name", ""),
            address: (
                get(document, "ShipmentDetails.Consignee.OrganisationDetails.Addresses.Address.AddressLine1", "") + ", "
                + get(document, "ShipmentDetails.Consignee.OrganisationDetails.Addresses.Address.AddressLine2", "") + ", "
                + get(document, "ShipmentDetails.Consignee.OrganisationDetails.Addresses.Address.CityOrSuburb", "") + ", "
                + get(document, "ShipmentDetails.Consignee.OrganisationDetails.Addresses.Address.StateOrProvince", "") + ", "
                + get(document, "ShipmentDetails.Consignee.OrganisationDetails.Addresses.Address.PostCode", "") + ", "
                + get(document, "ShipmentDetails.Consignee.OrganisationDetails.Location.Country", "")
            ),
        };

        const consignor = {
            name: get(document, "ShipmentDetails.Consignor.OrganisationDetails.Name", ""),
            address: (
                get(document, "ShipmentDetails.Consignor.OrganisationDetails.Addresses.Address.AddressLine1", "") + ", "
                + get(document, "ShipmentDetails.Consignor.OrganisationDetails.Addresses.Address.AddressLine2", "") + ", "
                + get(document, "ShipmentDetails.Consignor.OrganisationDetails.Addresses.Address.CityOrSuburb", "") + ", "
                + get(document, "ShipmentDetails.Consignor.OrganisationDetails.Addresses.Address.StateOrProvince", "") + ", "
                + get(document, "ShipmentDetails.Consignor.OrganisationDetails.Addresses.Address.PostCode", "") + ", "
                + get(document, "ShipmentDetails.Consignor.OrganisationDetails.Location.Country", "")
            ),
        };

        const description = get(document, "ShipmentDetails.GoodsDescription", "");
        const packingMode = get(document, "ShipmentDetails.PackingMode", "");

        const totalPackages = get(document, "ShipmentDetails.TotalOuterPacksQty", "")["_"];
        const totalPackagesUnit = get(document, "ShipmentDetails.TotalOuterPacksQty", "")["DimensionType"];

        const weight = get(document, "ShipmentDetails.Weight", {})["_"];
        const weightUnit = get(document, "ShipmentDetails.Weight", {})["DimensionType"];

        const volume = get(document, "ShipmentDetails.Volume", {})["_"];
        const volumeUnit = get(document, "ShipmentDetails.Volume", {})["DimensionType"];

        const chargeableWeight = get(document, "ShipmentDetails.ChargeableWeight", {})["_"];
        const chargeableWeightUnit = get(document, "ShipmentDetails.ChargeableWeight", {})["DimensionType"];

        const origin = (get(document, "ShipmentDetails.PortOfOrigin.Port", "")["_"]) + " = " +
            (get(document, "ShipmentDetails.PortOfOrigin.Port", "")["City"]) + ", " +
            (get(document, "ShipmentDetails.PortOfOrigin.Port", "")["Country"] + " - " +
                dateFormater(get(document, "ShipmentDetails.PortOfOrigin.EstimatedDateTime", ""))
            );

        const destination = (get(document, "ShipmentDetails.PortofDestination.Port", "")["_"]) + " = " +
            (get(document, "ShipmentDetails.PortofDestination.Port", "")["City"]) + ", " +
            (get(document, "ShipmentDetails.PortofDestination.Port", "")["Country"] + " - " +
                dateFormater(get(document, "ShipmentDetails.PortofDestination.EstimatedDateTime", ""))
            );

        const packages = get(document, "ShipmentDetails.Packages.Package", []);
        const packageArray = Array.isArray(packages) ? packages : [packages];

        const containers = packageArray.map((pkg: any) => ({
            container: pkg?.ContainerNumber ?? null,
            volume: pkg?.Volume?._ ?? null,
            volumeUnit: pkg?.Volume?.DimensionType ?? null,
            weight: pkg?.Weight?._ ?? null,
            weightUnit: pkg?.Weight?.DimensionType ?? null,
        }));

        const agent = {
            consignor, consignee
        };
        
        const shipment = {
            shipmentNumber, mawb, operation, dateArrival, incoterms, description, packingMode
        };

        const charge = {
            chargeableWeight, chargeableWeightUnit, totalPackages, totalPackagesUnit, weight, weightUnit, volume, volumeUnit
        };

        const origins = {
            origin, destination
        };

        console.log({ shipment, agent, charge, origins, containers });

    } catch (error) {
        console.error(error);
    }
}

export default xmlParser;

function dateFormater(date: string): string {
    const dateFormated = dayjs(date).tz("America/Santo_Domingo").format("dddd, DD MMMM YYYY HH:mm:ss");
    return dateFormated;
}