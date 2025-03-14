"use client"; 
import React, { useState, useEffect } from "react";

/** 
 * Enhanced Preloader component with fade-in, pulsing, and spinning effects. 
 * Displays a spinner and a brand name while the app is loading.
 */
export default function Preloader() {
  // State to control visibility of the preloader
  const [isLoading, setIsLoading] = useState(true);

  // Optional: hide the preloader after a certain time or when content is loaded
  useEffect(() => {
    // For demo purposes, auto-hide after 2 seconds. In practice, trigger this when your app is ready.
    const timer = setTimeout(() => setIsLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  // If not loading, don't render (or you can render null to unmount it)
  // Alternatively, you could keep it in DOM with opacity 0 for a fade-out effect.
  if (!isLoading) {
    return null;
  }

  return (
    <div
      className={`
        fixed inset-0 flex items-center justify-center 
        bg-white z-50 
        transition-opacity duration-700 
        ${isLoading ? "opacity-100" : "opacity-0 pointer-events-none"}
      `}
    >
      {/* Spinner Icon */}
      <div className="flex flex-col items-center">
        {/* Animated spinner: a circular border with one segment colored differently */}
        <div 
          className="h-16 w-16 border-4 border-solid rounded-full animate-spin" 
          style={{
            borderColor: "#00BF63",          // primary color for the spinner
            borderTopColor: "#D0A933"        // secondary color for the top segment (accent)
          }} 
        />
        {/* Branding text */}
        <span className="mt-4 text-xl font-semibold text-[#343a40] animate-pulse">
          19th Hole @BlackRock
        </span>
      </div>
    </div>
  );
}
