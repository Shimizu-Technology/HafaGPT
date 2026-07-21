import { useState, useEffect } from 'react';

const GREETINGS = [
  { chamorro: 'Håfa Adai', english: 'Hello' },
  { chamorro: 'Buenas', english: 'Good day' },
  { chamorro: 'Mañana si Yu\'os', english: 'Good morning' },
  { chamorro: 'Takhulo\'', english: 'Good afternoon' },
  { chamorro: 'Puenge\' si Yu\'os', english: 'Good evening' },
];

export function useRotatingGreeting() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % GREETINGS.length);
    }, 5000); // Change every 5 seconds

    return () => clearInterval(interval);
  }, []);

  return GREETINGS[currentIndex];
}

