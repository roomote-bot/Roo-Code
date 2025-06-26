'use client';

import { useEffect } from 'react';
import { LoaderCircle } from 'lucide-react';

export default function Page() {
  useEffect(() => {
    setTimeout(() => {
      window.location.href = '/sign-in';
    }, 1000);
  }, []);

  return (
    <div className="flex justify-center">
      <LoaderCircle className="animate-spin" />
    </div>
  );
}
