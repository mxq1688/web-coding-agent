"use client";

import { useEffect } from "react";

export default function CacheBuster() {
  useEffect(() => {
    // Check if timestamp parameter exists
    const url = new URL(window.location.href);
    const hasTimestamp = url.searchParams.has('_t');
    
    // If no timestamp, add one and reload
    if (!hasTimestamp) {
      url.searchParams.set('_t', Date.now().toString());
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  return null;
}
