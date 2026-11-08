# Connect Four

A real-time multiplayer Connect Four application built with JavaScript, Vite and Supabase.

**[Play the live game](https://connect4-sooty.vercel.app)**

> **Current availability:** The live version is currently designed for a small group of players. Visitors can join using one of two predefined player identities: Stefania or Olga. The application does not currently offer open player registration or public matchmaking.

## Overview

Connect Four is a browser-based multiplayer game that allows two players to compete remotely in real time.

The project combines interactive frontend development with backend integration, real-time communication and game-state management. It was designed with a mobile-first approach, making the experience accessible across phones and desktop browsers.

## Features

- **Real-time multiplayer:** Two players can join the same game and compete remotely.
- **Live synchronisation:** Game state is shared between players using Supabase Realtime, with polling as an additional synchronisation mechanism.
- **Game logic:** Handles alternating turns, valid moves, four-in-a-row detection and draw conditions.
- **Score tracking:** Keeps track of players' results across games.
- **Rematch system:** Players can request and accept rematches.
- **Predefined player identities:** The current live version supports two player identities, Stefania and Olga.
- **In-game interaction:** Includes a buzz feature for notifying the other player.
- **Browser notifications:** Provides notifications for relevant game events.
- **Responsive interface:** Mobile-first layout designed for portrait phone screens as well as desktop.
- **Animations and feedback:** Animated game pieces and visual win celebrations.

## Technology Stack

| Technology | Purpose |
|---|---|
| JavaScript (ES Modules) | Application logic and game functionality |
| Vite | Development server and build tooling |
| Supabase | Backend services and shared game state |
| Supabase Realtime | Live communication between players |
| HTML5 | Application structure |
| CSS3 | Responsive layout, styling and animations |
| Vercel | Deployment |

## Technical Highlights

### Real-time multiplayer architecture

Supabase provides the backend infrastructure for players using separate devices to interact with the same game. Realtime updates help keep the game synchronised, while polling provides an additional mechanism for checking state.

### Game-state management

The application manages player turns, board state, winning combinations, draws and rematches. This brings together the underlying game logic and the multiplayer experience.

### Responsive frontend development

The interface was designed mobile-first, with a responsive game board, flexible sizing and portrait-screen layouts. The design also incorporates animated interactions and visual feedback.

## Running Locally

### Prerequisites

- Node.js
- npm
- A Supabase project configured for the application

### Installation

Clone the repository:

```bash
git clone https://github.com/Stef-Saba/Connect4.git
```

Navigate into the project:

```bash
cd Connect4
```

Install dependencies:

```bash
npm install
```

Configure the Supabase client in `src/lib/supabaseClient.js` with your own project credentials. Keep private credentials out of version control.

Start the development server:

```bash
npm run dev
```

Vite will display the local development URL in the terminal.

### Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm run preview` | Preview the production build |

## Project Objective

The aim was to build a complete, playable multiplayer application rather than a static implementation of Connect Four.

The project explores how frontend interfaces, backend services and real-time communication can work together to create an interactive experience across devices.

---

**Developer:** [Stef Saba](https://github.com/Stef-Saba)