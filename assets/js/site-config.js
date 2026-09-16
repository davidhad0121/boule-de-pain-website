/* Business details used by the site's live features (hours, open/closed status,
   ordering rules and form sending). Edit values here, keep the JSON format. */
window.SITE = {
  "name": "Boule de Pain",
  "tagline": "Making the Ordinary Extraordinary",
  "subTagline": "Freshly Baked, Daily, for the Discerning Palate",
  "description": "Boule de Pain is an artisanal French bakery in Canoga Park baking croissants, breads, pastries and cakes daily. Order online for pickup or next-day delivery in Los Angeles and Orange County, book catering, or find us at LA farmers markets.",
  "url": "https://www.bouledepain.com",
  "timezone": "America/Los_Angeles",
  "address": {
    "street": "7226 Topanga Canyon Blvd",
    "city": "Canoga Park",
    "region": "CA",
    "zip": "91303",
    "country": "US"
  },
  "phones": {
    "main": {
      "label": "Bakery",
      "display": "(818) 340-0203",
      "tel": "+18183400203"
    },
    "events": {
      "label": "Catering & wholesale",
      "display": "(424) 213-0916",
      "tel": "+14242130916"
    }
  },
  "email": "contact@bouledepain.com",
  "hours": [
    {
      "day": 0,
      "name": "Sunday",
      "short": "Sun",
      "open": "09:00",
      "close": "15:00"
    },
    {
      "day": 1,
      "name": "Monday",
      "short": "Mon",
      "open": "09:00",
      "close": "18:00"
    },
    {
      "day": 2,
      "name": "Tuesday",
      "short": "Tue",
      "open": "09:00",
      "close": "18:00"
    },
    {
      "day": 3,
      "name": "Wednesday",
      "short": "Wed",
      "open": "09:00",
      "close": "18:00"
    },
    {
      "day": 4,
      "name": "Thursday",
      "short": "Thu",
      "open": "09:00",
      "close": "18:00"
    },
    {
      "day": 5,
      "name": "Friday",
      "short": "Fri",
      "open": "09:00",
      "close": "18:00"
    },
    {
      "day": 6,
      "name": "Saturday",
      "short": "Sat",
      "open": "08:00",
      "close": "18:00"
    }
  ],
  "closedDates": [],
  "social": {
    "facebook": "https://www.facebook.com/pastriesbyediebdp",
    "instagram": "https://www.instagram.com/bouledepainla",
    "instagramHandle": "@bouledepainla",
    "yelp": "https://www.yelp.com/biz/boule-de-pain-by-edies-pastries-canoga-park?osq=pastries+by+edie"
  },
  "ordering": {
    "cutoff": "15:00",
    "leadDays": 1,
    "deliveryDays": [
      1,
      2,
      3,
      4,
      5
    ],
    "deliveryWindows": [],
    "maxDaysAhead": 42,
    "deliveryArea": "Los Angeles and Orange County",
    "checkoutUrl": "",
    "windowMinutes": 180
  },
  "forms": {
    "provider": "mailto",
    "endpoint": "",
    "to": "contact@bouledepain.com"
  },
  "giftCards": {
    "amounts": [
      25,
      50,
      100,
      150,
      200
    ],
    "buyUrl": ""
  },
  "chatbot": {
    "workerUrl": "https://bouledepain-chatbot.bouledepain.workers.dev"
  },
  "admin": {
    "url": "https://bouledepain-admin.bouledepain.workers.dev"
  },
  "announcement": "Order before 3 PM for next-day delivery · No deliveries on Saturday & Sunday",
  "markets": [
    {
      "day": 4,
      "name": "Thursday",
      "photo": "market-brentwood",
      "locations": [
        "Westwood Village"
      ]
    },
    {
      "day": 6,
      "name": "Saturday",
      "photo": "market-playa-vista",
      "locations": [
        "Playa Vista",
        "Marina del Rey",
        "Calabasas"
      ]
    },
    {
      "day": 0,
      "name": "Sunday",
      "photo": "market-calabasas",
      "locations": [
        "Melrose Place",
        "Brentwood",
        "Pacific Palisades",
        "Beverly Hills",
        "Channel Islands",
        "Westlake Village",
        "Newport Beach",
        "Malibu"
      ]
    }
  ]
};
