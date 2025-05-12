import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';

import messages from '@/i18n/locales/en.json';

import { CenteredFooter } from './CenteredFooter';

describe('CenteredFooter', () => {
  describe('Render method', () => {
    it('should have copyright information', () => {
      render(
        <NextIntlClientProvider locale="en" messages={messages}>
          <CenteredFooter iconList={null} legalLinks={null}>
            Random children
          </CenteredFooter>
        </NextIntlClientProvider>,
      );

      const copyright = screen.getByText(/© Copyright/);

      expect(copyright).toBeInTheDocument();
    });
  });
});
