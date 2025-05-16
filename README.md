# SBC App Web UI

A modern web application for the Sniper Business Center (SBC) platform, built with React, TypeScript, and Vite. This app provides a seamless experience for users to manage their business activities, subscriptions, referrals, and marketplace interactions.

## Features

- **Marketplace**: Browse, search, and filter products and services. Add, edit, and manage your own listings.
- **Subscription Management**: View and upgrade your subscription plans with clear pricing and feature breakdowns.
- **Referral System**: Track your direct and indirect referrals, copy your referral code or link, and view referral statistics.
- **Profile Management**: Edit your profile, including avatar, contact info, profession, interests, and more.
- **Filleuls (Referrals) Dashboard**: See all your referred users, filter by direct/indirect and subscription status, and contact them via WhatsApp.
- **Transactions**: (Planned) View and manage your active transactions.
- **Responsive Design**: Optimized for both desktop and mobile devices.
- **Modern UI/UX**: Clean, intuitive interface with smooth animations and skeleton loading states for a polished user experience.

## Tech Stack

- **React** + **TypeScript**
- **Vite** (for fast development and HMR)
- **Tailwind CSS** (utility-first styling)
- **Framer Motion** (animations)
- **React Icons** (iconography)

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```
2. **Start the development server:**
   ```bash
   npm run dev
   ```
3. **Build for production:**
   ```bash
   npm run build
   ```

## Project Structure

- `src/pages/` — Main app pages (Marketplace, Profile, Abonnement, MesFilleuls, etc.)
- `src/components/` — Reusable UI components (cards, buttons, skeletons, etc.)
- `src/assets/` — Images and icons

### Folder Structure

```
src/
├── assets/
│   └── icon/           # App icons and images
├── components/
│   ├── common/         # Shared UI components (BackButton, Skeleton, etc.)
│   └── ...             # Other reusable components
├── pages/
│   ├── Abonnement.tsx
│   ├── AjouterProduit.tsx
│   ├── Marketplace.tsx
│   ├── MesFilleuls.tsx
│   ├── MesProduits.tsx
│   ├── ModifierLeProfil.tsx
│   ├── ModifierProduit.tsx
│   ├── Profile.tsx
│   └── ...             # Other main pages
├── App.tsx             # Main app component and routes
├── main.tsx            # App entry point
├── index.css           # Global styles
└── vite-env.d.ts       # Vite/TypeScript env types
```

## Customization

- Update business logic, API integration, and UI components as needed for your use case.
- Tailwind CSS can be customized via `tailwind.config.js`.

## Environment Variables

- Create a `.env` file in the root for any API keys or environment-specific settings.
- Example:
  ```env
  VITE_API_URL=https://api.example.com
  ```

## Browser Support

- The app is tested on the latest versions of Chrome, Firefox, Edge, and Safari.
- For best results, use a modern browser.

## Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/YourFeature`)
3. Commit your changes (`git commit -am 'Add some feature'`)
4. Push to the branch (`git push origin feature/YourFeature`)
5. Open a pull request

## Support

- If you encounter bugs or have feature requests, please open an issue in the repository.
- For urgent issues, contact the SBC technical team.

## Contact

- **Sniper Business Center (SBC)**
- Email: [support@sbc.com](mailto:support@sbc.com)
- Website: [https://sbc.com](https://sbc.com)

## License

This project is proprietary to Sniper Business Center (SBC).
