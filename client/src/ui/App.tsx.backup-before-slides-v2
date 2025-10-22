import React from "react";
import SlideEngine from "./slides/SlideEngine";
import { slides } from "./slides/slides.config";

export default function App() {
  return (
    <main className="min-h-screen bg-neutral-900 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-5xl">
        <SlideEngine
          slides={slides}
          onFinish={() => {
            console.log("Slides fertig durchlaufen.");
          }}
        />
      </div>
    </main>
  );
}
