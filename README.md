Click this link to try: https://travel-planner-three-pi.vercel.app/

Project Overview
The application allows users to create, manage, and share travel plans, including detailed itineraries with activities. Key features include:

Plan Management: Users can create new travel plans (new/page.tsx), view a dashboard of their plans (ClientDashboard.tsx), and manage individual plan details (ClientPlanDetail.tsx), such as adding, editing, or deleting activities.
Activity Details: Each plan includes activities with fields like title, destination, start/end dates, times, and remarks.
Google Maps Integration: Displays a map with markers for activity destinations (ClientPlanDetail.tsx).
Export Functionality: Users can export plans to CSV files for offline use (ClientDashboard.tsx and ClientPlanDetail.tsx).
User Authentication: Uses next-auth for user sessions, allowing secure access and permission-based actions (e.g., only owners can edit/delete plans).
State Management: Utilizes Redux for managing plans (ClientDashboard.tsx) and React state for local component state (e.g., form inputs, editing states).
Responsive UI: Built with Tailwind CSS and ShadCN UI components for a modern, responsive design.
The app is likely deployed on Vercel, given your references to Vercel logs and deployment steps, and it uses server actions for backend operations (e.g., createPlan, updatePlanTitle, deleteActivity).

Skillset Reflected in the Website
The development of this website demonstrates proficiency in several areas:

Frontend Development:
React & Next.js: The project uses Next.js with the App Router (use client, server actions), showcasing knowledge of modern React frameworks, client-side rendering, and server-side functionality.
Component Libraries: Integration of ShadCN UI (Button, Calendar) and lucide-react for icons, indicating familiarity with UI component libraries and customization.
State Management: Uses Redux for global state (planSlice) and React hooks (useState, useEffect, useRef) for local state, showing proficiency in managing application state at different levels.
Backend Integration:
Server Actions: Leverages Next.js server actions (createPlan, updateActivity, etc.) for backend operations, indicating understanding of server-side logic in a Next.js environment.
Authentication: Implements next-auth for user authentication, managing sessions and permissions (isOwner checks).
Third-Party APIs:
Google Maps API: Integrates Google Maps for geocoding and mapping destinations, demonstrating experience with external APIs and handling asynchronous operations (geocoder.geocode).
Environment Variables: Properly manages API keys (e.g., NEXT_PUBLIC_GOOGLE_MAPS_API_KEY), showing awareness of security best practices.
Styling and UI/UX:
Tailwind CSS: Uses Tailwind for responsive, utility-first styling, reflecting skills in modern CSS frameworks.
ShadCN UI: Customizes components like Calendar, indicating ability to work with design systems and adapt them to project needs.
User Experience: Features like export to CSV, inline editing, and form validation enhance usability, showing attention to UX design.
File Handling:
CSV Export: Implements CSV generation and file downloads using file-saver, demonstrating knowledge of file handling in the browser.
TypeScript:
Uses TypeScript for type safety (e.g., interfaces like DBPlan, DBActivity, ClientPlanDetailProps), reflecting skills in writing maintainable, type-safe code.
Deployment and Debugging:
Vercel Deployment: Familiarity with deploying Next.js apps on Vercel, including managing logs and debugging deployment issues.
Dependency Management: Resolves dependency conflicts (e.g., react-day-picker with React 19) and updates components (e.g., Calendar for react-day-picker@9.x), showing problem-solving skills.
Testing and Debugging:
Includes thorough testing steps (local, build, deploy) and debug logging (e.g., console logs in initializeMap), indicating a methodical approach to development and debugging.
Summary
This project is a full-stack travel planning app showcasing skills in Next.js, React, TypeScript, Tailwind CSS, ShadCN UI, Redux, Google Maps API, authentication with next-auth, and deployment on Vercel. It reflects a well-rounded skillset in frontend development, UI/UX design, third-party API integration, state management, and modern JavaScript/TypeScript practices. The ability to handle dependency issues and implement features like CSV export further highlights problem-solving and practical development skills.

Let me know if you'd like a deeper dive into any specific aspect!
