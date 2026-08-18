# CRM Frontend

Modern CRM (Customer Relationship Management) frontend built with **React**, **TypeScript**, and **Vite**.

## Tech Stack
-   **Core**: React 19, TypeScript
-   **Navigation**: React Router DOM 7
-   **State Management**: Redux Toolkit & React-Query
-   **Styling**: Tailwind CSS 4
-   **UI Components**: Radix UI, Lucide React, Shadcn/ui (styled components)
-   **Forms**: React Hook Form with Zod validation
-   **Charts**: Recharts

## Getting Started

### Prerequisites
-   Node.js (LTS recommended)
-   npm or yarn

### Installation
```bash
# Clone the repository and navigate to the frontend folder
cd frontend

# Install dependencies
npm install
```

### Development
```bash
# Start the development server
npm run dev
```

### Build
```bash
# Build for production
npm run build
```

## Folder Structure
-   `src/app`: Application-wide providers and configuration.
-   `src/components`: Reusable UI components and layouts.
-   `src/features`: Feature-based modular structure (Auth, Dashboard, Leads, etc.).
-   `src/hooks`: Custom hooks.
-   `src/pages`: Page components.
-   `src/utils`: Utility functions.
