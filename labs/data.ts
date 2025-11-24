function shippingData(shippingDocument: any) {
    const shipping = {
        agency:
            shippingDocument?.ConsolDetail?.PlannedLegs?.PlannedLeg?.Vessel?.Carrier
                ?.OrganisationDetails?.Name ?? "",

        emails: (() => {
            const contacts =
                shippingDocument?.ConsolDetail?.PlannedLegs?.PlannedLeg?.Vessel?.Carrier
                    ?.OrganisationDetails?.Contacts;

            if (Array.isArray(contacts)) {
                return contacts
                    .filter((c: any) => c?.EmailAddress)
                    .map((c: any) => c.EmailAddress);
            }

            const email = contacts?.Contact?.EmailAddress;
            return email ? [email] : [];
        })(),
    };

    return shipping;
}