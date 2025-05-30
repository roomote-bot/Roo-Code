import { OrganizationProfile } from '@clerk/nextjs';

export default function Page() {
  return (
    <div className="mx-auto">
      <OrganizationProfile
        routing="path"
        path="/org"
        afterLeaveOrganizationUrl="/select-org"
      />
    </div>
  );
}
