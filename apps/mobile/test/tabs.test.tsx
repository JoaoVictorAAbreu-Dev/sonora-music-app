import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import TabsLayout from '../src/app/(tabs)/_layout';
import HomeScreen from '../src/app/(tabs)/index';
import SearchScreen from '../src/app/(tabs)/search';
import LibraryScreen from '../src/app/(tabs)/library';

function renderTabs() {
  return renderRouter(
    {
      '(tabs)/_layout': TabsLayout,
      '(tabs)/index': HomeScreen,
      '(tabs)/search': SearchScreen,
      '(tabs)/library': LibraryScreen,
    },
    { initialUrl: '/' },
  );
}

describe('tab shell', () => {
  it('shows three labelled tabs with Início selected', async () => {
    await renderTabs();
    const tabs = await screen.findAllByRole('tab');
    expect(tabs.map((t) => t.props.accessibilityLabel)).toEqual(['Início', 'Buscar', 'Biblioteca']);
    expect(screen.getByTestId('tab-index').props.accessibilityState).toEqual({ selected: true });
    expect(screen.getByTestId('screen-index')).toBeTruthy();
  });

  it('switches tabs and updates the selected state', async () => {
    await renderTabs();
    await fireEvent.press(await screen.findByTestId('tab-search'));
    expect(await screen.findByTestId('screen-search')).toBeTruthy();
    expect(screen).toHavePathname('/search');
    expect(screen.getByTestId('tab-search').props.accessibilityState).toEqual({ selected: true });

    await fireEvent.press(screen.getByTestId('tab-library'));
    expect(await screen.findByTestId('screen-library')).toBeTruthy();
    expect(screen).toHavePathname('/library');
  });
});
