import { SelectOrg } from './SelectOrg';

type Props = {
  params: Promise<{ state: string }>;
};

export default async function Page({ params }: Props) {
  const { state } = await params;
  return <SelectOrg state={state} />;
}
