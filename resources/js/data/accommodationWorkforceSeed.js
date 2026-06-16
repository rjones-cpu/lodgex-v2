// Fallback account list used when the controller does not provide `accounts`.
// The live list is resolved server-side (see AccommodationWorkforceController)
// from `config/accommodation_workforce.php` or the configured accounts URL.
export const WORKFORCE_ACCOUNTS = [
    {
        id: 'reservation-manager',
        label: 'Reservation Manager',
        role: 'Reservation Manager',
        schedulingUrl: 'https://reservations1.lodgex.ca/scheduling/dashboard',
    },
    {
        id: 'prime-reservation-manager',
        label: 'Prime Reservation Manager',
        role: 'Prime Reservation Manager',
        schedulingUrl: 'https://reservations1.lodgex.ca/scheduling/dashboard',
    },
    {
        id: 'client-admin',
        label: 'Client Admin',
        role: 'Client Admin',
        schedulingUrl: 'https://reservations1.lodgex.ca/scheduling/dashboard',
    },
];
