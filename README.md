# Lumen & Co

An elegant, light-theme e-commerce storefront built as part of a vibe-coding workshop (Day 1), demonstrating a full browsing-to-checkout flow with no backend dependency.

## Features

- **Product catalog** with category filtering (Audio & Sound, Workspace & Desk, Watches & Wearables, Living & Lighting, Travel & Lifestyle) and sorting
- **Product detail pages** with quantity selection and add-to-cart
- **Shopping cart** with quantity updates, item removal, and running total — persists via local storage
- **Mock checkout flow** — shipping info → payment placeholder → order confirmation
- **Admin panel** ("Manage Store") gated behind a soft passcode, allowing products to be added, edited, or deleted directly from the UI
- **Review system**  — visitors can submit star ratings and written reviews, which update each product's displayed rating in real time
- **Scroll-triggered text animations** on hero and section headings, built with vanilla JS and Intersection Observer
- **Subtle nav hover animations** with accurate active-state highlighting

## Tech Stack

- HTML / CSS / JavaScript (no framework, no backend)
- Local storage for cart, product, and review data persistence

## Getting Started

1. Clone the repo:

```bash
   git clone https://github.com/satyamtech007/Lumen-Co.git
```

2. Open `index.html` in a browser, or serve it locally with any static server.

## Notes

- This is a client-side demo — data is stored per-browser via local storage and does not sync across devices or visitors.
- The admin panel passcode is hardcoded for demo purposes only and is not intended as real authentication.

## Author

Built by Satyam as part of a Vibe Coding workshop.
