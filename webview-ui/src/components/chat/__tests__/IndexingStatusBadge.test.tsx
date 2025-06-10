import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import IndexingStatusBadge from '../IndexingStatusBadge';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../../i18n/i18n'; // Adjusted path

const mockPostMessage = jest.fn();
jest.mock('@src/utils/vscode', () => ({
  vscode: {
    postMessage: mockPostMessage,
  },
}));

describe('IndexingStatusBadge', () => {
  beforeEach(() => {
    mockPostMessage.mockClear();
    // Mock i18n instance if not already configured for tests
    if (!i18n.isInitialized) {
      i18n.init({
        lng: 'en',
        fallbackLng: 'en',
        resources: {
          en: {
            translation: {
              indexingBadge: {
                indexingInProgress: 'Indexing {{progress}}%',
                indexingError: 'Indexing Error',
              },
            },
          },
        },
        interpolation: {
          escapeValue: false, // React already safes from xss
        },
      });
    }
  });

  const renderWithI18n = (component: React.ReactElement) => {
    return render(<I18nextProvider i18n={i18n}>{component}</I18nextProvider>);
  };

  it('renders correctly when indexing', () => {
    renderWithI18n(
      <IndexingStatusBadge status="Indexing" progress={50} isVisible={true} />,
    );
    expect(screen.getByText('Indexing 50%')).toBeInTheDocument();
    // Check for yellow dot (presence of a div with bg-yellow-500)
    const dot = screen.getByText('Indexing 50%').previousSibling as HTMLElement;
    expect(dot).toHaveClass('bg-yellow-500');
    expect(dot).toHaveClass('animate-pulse');
  });

  it('renders correctly on error', () => {
    renderWithI18n(
      <IndexingStatusBadge status="Error" message="Test Error" progress={0} isVisible={true} />,
    );
    expect(screen.getByText('Indexing Error')).toBeInTheDocument();
    expect(screen.getByText('- Test Error')).toBeInTheDocument();
    // Check for red dot (presence of a div with bg-red-500)
    const dot = screen.getByText('Indexing Error').previousSibling as HTMLElement;
    expect(dot).toHaveClass('bg-red-500');
  });

  it('renders null if not visible', () => {
    const { container } = renderWithI18n(
      <IndexingStatusBadge status="Indexing" progress={50} isVisible={false} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders null for Standby status', () => {
    const { container } = renderWithI18n(
      <IndexingStatusBadge status="Standby" progress={0} isVisible={true} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders null for Indexed status', () => {
    const { container } = renderWithI18n(
      <IndexingStatusBadge status="Indexed" progress={100} isVisible={true} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('calls postMessage on click when indexing', () => {
    renderWithI18n(
      <IndexingStatusBadge status="Indexing" progress={50} isVisible={true} />,
    );
    // Find the clickable div (parent of the text)
    fireEvent.click(screen.getByText('Indexing 50%').closest('div.fixed')!);
    expect(mockPostMessage).toHaveBeenCalledWith({
      type: 'navigateTo',
      view: 'settings',
      section: 'codeIndex',
    });
  });

  it('calls postMessage on click when error', () => {
    renderWithI18n(
      <IndexingStatusBadge status="Error" message="Test Error" progress={0} isVisible={true} />,
    );
    fireEvent.click(screen.getByText('Indexing Error').closest('div.fixed')!);
    expect(mockPostMessage).toHaveBeenCalledWith({
      type: 'navigateTo',
      view: 'settings',
      section: 'codeIndex',
    });
  });
});
