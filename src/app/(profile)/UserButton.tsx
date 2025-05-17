import { UserButton as ClerkUserButton } from '@clerk/nextjs';

export const UserButton = () => (
  <div className="absolute top-8 right-8">
    <ClerkUserButton />
  </div>
);
