# DemandIt! ChatBot

A modern React-based chatbot web application with a beautiful UI.

## Features

- 🎨 Modern, responsive UI with Tailwind CSS
- 💬 Chat interface with message bubbles
- ⏰ Timestamp display for messages
- ⌨️ Keyboard shortcuts (Enter to send)
- 🎯 Ready for chat functionality integration

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser and navigate to the URL shown in the terminal (typically `http://localhost:5173`)

## Project Structure

```
src/
  ├── components/
  │   ├── ChatBot.jsx      # Main chatbot container
  │   ├── ChatMessage.jsx  # Individual message component
  │   └── ChatInput.jsx    # Message input component
  ├── App.jsx              # Root component
  ├── main.jsx             # Entry point
  └── index.css            # Global styles
```

## Chat Functionality

Chat functionality is currently a placeholder. The `handleSendMessage` function in `ChatBot.jsx` is ready to be implemented with your chat logic.

## Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Tech Stack

- React 18
- Vite
- Tailwind CSS

