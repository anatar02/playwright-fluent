import { PlaywrightFluent } from '../../playwright-fluent';
describe('Playwright Fluent - close', (): void => {
  beforeEach((): void => {
    jest.setTimeout(30000);
  });
  test('should close chromium', async (): Promise<void> => {
    // Given
    const browser = 'chromium';
    const p = new PlaywrightFluent();

    // And
    await p.withBrowser(browser);
    let createdBrowser = p.currentBrowser();
    const previousConnectedStatus = createdBrowser && createdBrowser.isConnected();

    // When
    await p.close();

    // Then
    createdBrowser = p.currentBrowser();
    const currentConnectedStatus = createdBrowser && createdBrowser.isConnected();
    expect(createdBrowser).toBeDefined();
    expect(previousConnectedStatus).toBe(true);
    expect(currentConnectedStatus).toBe(false);
  });
});
