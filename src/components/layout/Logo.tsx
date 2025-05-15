import Image from 'next/image';

export const Logo = () => (
  <div className="flex items-center text-xl font-semibold">
    <Image
      src="/logo.svg"
      alt="Roo Code Logo"
      width={120}
      height={26}
      className="mr-2 dark:hidden"
      style={{ height: 'auto' }}
    />
    <Image
      src="/logo-dark.svg"
      alt="Roo Code Logo"
      width={120}
      height={26}
      className="mr-2 hidden dark:block"
      style={{ height: 'auto' }}
    />
  </div>
);
