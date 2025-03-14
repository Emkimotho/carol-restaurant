
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


The 19th Hole Restaurant and Bar Website
Welcome to the The 19th Hole Restaurant and Bar website repository. This project is built with Next.js and TypeScript and aims to provide a seamless online experience for customers.

Table of Contents
Project Overview
Features
Getting Started
Prerequisites
Installation
Running the Development Server
Project Structure
Available Scripts
Contributing
License
Project Overview
This project is a web application for The 19th Hole Restaurant and Bar, showcasing menus, galleries, and allowing users to make reservations.

Features
Home Page: Includes a banner, neon sign indicating open/closed status, about us section, menu preview, and gallery.
Responsive Design: The website is fully responsive and works across different devices.
Context API: Uses React Context API to manage opening hours and display open/closed status dynamically.
Next.js Features: Utilizes Next.js for server-side rendering and optimized performance.
Getting Started
Prerequisites
Node.js (version 14 or higher)
npm or yarn
Installation
Clone the repository:

bash
Copy code
git clone https://github.com/yourusername/19th-hole-next.git
Navigate to the project directory:

bash
Copy code
cd 19th-hole-next
Install dependencies:

bash
Copy code
npm install
# or
yarn install
Running the Development Server
Start the development server with the following command:

bash
Copy code
npm run dev
# or
yarn dev
Open http://localhost:3000 in your browser to view the application.

Project Structure
plaintext
Copy code
19th-hole-next/
├── app/
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── Banner/
│   ├── Gallery/
│   ├── MainContent/
│   ├── MenuPreview/
│   └── NeonSign/
├── contexts/
│   └── OpeningHoursContext.tsx
├── public/
│   └── images/
│       ├── staff-abtus.jpg
│       ├── home-cover.jpg
│       └── ... (other images)
├── styles/
│   └── globals.css
├── utils/
│   └── timeUtils.ts
├── package.json
└── README.md
app/: Contains the Next.js pages and layout.
components/: Reusable React components.
contexts/: React Context for managing global state.
public/: Static assets like images.
styles/: Global and component-specific CSS files.
utils/: Utility functions.
Available Scripts
npm run dev: Runs the app in development mode.
npm run build: Builds the app for production.
npm start: Runs the built app in production mode.
Contributing
Contributions are welcome! Please fork the repository and submit a pull request for any changes.

License
This project is licensed under the MIT License.