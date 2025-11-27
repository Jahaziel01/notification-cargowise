import { isArray } from "lodash";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { sendNotification, sendNotificationError } from "@/imap";
import "dayjs/locale/es";
import { MESSAGE_ERROR } from "@/constants";
import { dateFormater } from "@/constants/helpers";
import { fileTest } from "@/test";
import "dayjs/locale/es";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale("es");

async function xmlParser(xml: any, type: string): Promise<void | any> {
    ///const test = await fileTest();

    try {
        const shippingDocument = xml?.XmlInterchange?.Payload?.Consols?.Consol || {};
        const document = xml?.XmlInterchange?.Payload?.Consols?.Consol?.Shipments?.Shipment || {};

        const shipmentNumber = document?.ShipmentIdentifier?.[0]?._;

        const txnLines = document?.ARInvoices?.TxnHeader?.TxnLines?.TxnLine;
        const events = document?.Events?.Event;
        const mawb = (Array.isArray(txnLines) ? txnLines : txnLines ? [txnLines] : [])
            .find((line: any) => line?.MasterBillNo)?.MasterBillNo ||
            (Array.isArray(events) ? events : events ? [events] : [])
                .find((event: any) => event?.Information?.includes("Master"))?.Information?.split('"')?.[1] || "";

        const user = (document?.Events?.Event || [])
            .find((event: any) => event?.Information?.includes("Aviso de llegada") || event?.Information?.includes("Pre-Alerta"))
            ?.UserName;

        const operation = document?.ShipmentDetails?.AgentReference;

        const rawETA = shippingDocument?.ConsolDetail?.Vessel?.ETA;

        const dateArrival = dateFormater(rawETA);
        const etaAt = dayjs(rawETA).isValid() ? dayjs(rawETA).toISOString() : null;

        const consol = shippingDocument?.ConsolDetail?.AgentReference;
        const incoterms = document?.ShipmentDetails?.Incoterm;
        const freight = document?.ShipmentDetails?.AdditionalTerms;

        const transportMode = document?.ShipmentDetails?.TransportMode;

        const consignee = {
            name: document?.ShipmentDetails?.Consignee?.OrganisationDetails?.Name,
            address: (
                document?.ShipmentDetails?.Consignee?.OrganisationDetails?.Addresses?.Address?.AddressLine1 || "" + ", "
                + document?.ShipmentDetails?.Consignee?.OrganisationDetails?.Addresses?.Address?.AddressLine2 || "" + ", "
                + document?.ShipmentDetails?.Consignee?.OrganisationDetails?.Addresses?.Address?.CityOrSuburb || "" + ", "
                + document?.ShipmentDetails?.Consignee?.OrganisationDetails?.Addresses?.Address?.StateOrProvince || "" + ", "
                + document?.ShipmentDetails?.Consignee?.OrganisationDetails?.Addresses?.Address?.PostCode || "" + ", "
                + document?.ShipmentDetails?.Consignee?.OrganisationDetails?.Location?.Country || ""
            ),
        };

        const consignor = {
            name: document?.ShipmentDetails?.Consignor?.OrganisationDetails?.Name,
            address: (
                document?.ShipmentDetails?.Consignor?.OrganisationDetails?.Addresses?.Address?.AddressLine1 || "" + ", "
                + document?.ShipmentDetails?.Consignor?.OrganisationDetails?.Addresses?.Address?.AddressLine2 || "" + ", "
                + document?.ShipmentDetails?.Consignor?.OrganisationDetails?.Addresses?.Address?.CityOrSuburb || "" + ", "
                + document?.ShipmentDetails?.Consignor?.OrganisationDetails?.Addresses?.Address?.StateOrProvince || "" + ", "
                + document?.ShipmentDetails?.Consignor?.OrganisationDetails?.Addresses?.Address?.PostCode || "" + ", "
                + document?.ShipmentDetails?.Consignor?.OrganisationDetails?.Location?.Country || ""
            ),
        };

        function extractRecipientList(document: any) {
            const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

            const docAddresses = document?.ShipmentDetails?.DocAddresses?.DocAddress;
            const docAddressArray = Array.isArray(docAddresses) ? docAddresses : [docAddresses];

            const recipientList = docAddressArray
                .map((addressType: any) => addressType?.AddressReference?.Organisation)
                .map((org: any) => org?.OrganisationDetails?.Contacts)
                .filter((contactGroup: any) => contactGroup?.Contact)
                .flatMap((contactGroup: any) => contactGroup.Contact)
                .filter((contact: any) => isValidEmail(contact?.EmailAddress))
                .map((contact: any) => contact?.EmailAddress)
                .filter((email: string) => !email.toLowerCase().includes("@frankleo"));

            return [...new Set(recipientList)];
        };

        const recipientList = consignee.name === "OXYGEN DEVELOPMENT DR LIMITED" ?
            ["jmartinez@oxygendevelopment.com", "wnunez@oxygendevelopment.com", "jcruz@oxygendevelopment.com", "rpaulino@oxygendevelopment.com", "imercedes@oxygendevelopment.com", "cyhernandez@oxygendevelopment.com", "accountingdr@oxygendevelopment.com", "erosa@oxygendevelopment.com"]
            : extractRecipientList(document);

        const description = document?.ShipmentDetails?.GoodsDescription;
        const packingMode = document?.ShipmentDetails?.PackingMode;

        const totalPackages = document?.ShipmentDetails?.TotalOuterPacksQty?._;
        const totalPackagesUnit = document?.ShipmentDetails?.TotalOuterPacksQty?.DimensionType;

        const weight = document?.ShipmentDetails?.Weight?._;
        const weightUnit = document?.ShipmentDetails?.Weight?.DimensionType;

        const volume = document?.ShipmentDetails?.Volume?._;
        const volumeUnit = document?.ShipmentDetails?.Volume?.DimensionType;

        const chargeableWeight = document?.ShipmentDetails?.ChargeableWeight?._;
        const chargeableWeightUnit = document?.ShipmentDetails?.ChargeableWeight?.DimensionType;

        const origin = (document?.ShipmentDetails?.PortOfOrigin?.Port?._) + " = " +
            (document?.ShipmentDetails?.PortOfOrigin?.Port?.City) + ", " +
            (document?.ShipmentDetails?.PortOfOrigin?.Port?.Country + " - " +
                dateFormater(document?.ShipmentDetails?.PortOfOrigin?.EstimatedDateTime)
            );

        const destination = (document?.ShipmentDetails?.PortofDestination?.Port?._) + " = " +
            (document?.ShipmentDetails?.PortofDestination?.Port?.City) + ", " +
            (document?.ShipmentDetails?.PortofDestination?.Port?.Country + " - " +
                dateFormater(document?.ShipmentDetails?.PortofDestination?.EstimatedDateTime)
            );

        const packages = document?.ShipmentDetails?.Packages?.Package;
        const packageArray = Array.isArray(packages) ? packages : [packages];

        const containers = packageArray.map((pkg: any) => ({
            container: pkg?.ContainerNumber ?? null,
            volume: pkg?.Volume?._ ?? null,
            volumeUnit: pkg?.Volume?.DimensionType ?? null,
            weight: pkg?.Weight?._ ?? null,
            weightUnit: pkg?.Weight?.DimensionType ?? null,
        }));

        const aduanas = Array.isArray(document?.ShipmentDetails?.CustomValues?.CustomValue)
            ? document?.ShipmentDetails?.CustomValues?.CustomValue?.find((item: any) => item.Name === "ADUANAS")?.["_"]
            : null;

        const aduanasAllow = aduanas === "Y";

        const agent = {
            consignor, consignee, user
        };

        const shipment = {
            shipmentNumber, mawb, operation, consol, dateArrival, etaAt, incoterms, description, packingMode, type, freight, transportMode, aduanasAllow
        };

        const charge = {
            chargeableWeight, chargeableWeightUnit, totalPackages, totalPackagesUnit, weight, weightUnit, volume, volumeUnit
        };

        const origins = {
            origin, destination
        };


        const CRITICALINFO = [shipmentNumber, dateArrival, recipientList, etaAt];


        if (CRITICALINFO.some(v => !v || (Array.isArray(v) && v.length === 0))) {
            return;
            /** 
            await sendNotificationError({
                subject: "ERROR // " + type + " // " + shipment.operation,
                data: MESSAGE_ERROR.shipment
            });
           
            */
        }

        const data = { type, shipment, agent, charge, origins, containers, recipientList };

        console.log(data);
        return;
        await sendNotification(data);

    } catch (error) {
        console.error(error);
    }
}

export default xmlParser;