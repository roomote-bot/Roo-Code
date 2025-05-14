import { APP_NAME } from '@/lib/constants';

import Image from 'next/image';

export const Logo = (props: { isTextHidden?: boolean }) => (
  <div className="flex items-center text-xl font-semibold">
    <Image
      src="/Roo-Code-Logo-Horiz-blk.svg"
      alt="Roo Code Logo"
      width={120}
      height={26}
      className="mr-2 dark:hidden"
      style={{ height: 'auto' }}
    />
    <Image
      src="/Roo-Code-Logo-Horiz-white.svg"
      alt="Roo Code Logo"
      width={120}
      height={26}
      className="mr-2 hidden dark:block"
      style={{ height: 'auto' }}
    />
    {!props.isTextHidden && APP_NAME}
  </div>
);
