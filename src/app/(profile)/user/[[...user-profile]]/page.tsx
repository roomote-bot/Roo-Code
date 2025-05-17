import { UserProfile } from '@clerk/nextjs';

export default function Page() {
  return <UserProfile routing="path" path="/user" />;
}
