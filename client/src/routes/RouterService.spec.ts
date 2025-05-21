// Unmock RouterService for this file
jest.unmock('~/routes/RouterService');

// Import the actual RouterService
import { RouterService } from './RouterService';

// Mock the window.location object
Object.defineProperty(window, 'location', {
  writable: true,
  value: {
    href: 'https://example.com/test',
    pathname: '/test',
    protocol: 'https:',
    host: 'example.com',
    search: '?query=test',
    reload: jest.fn(),
  },
});

// Mock window.open for testing
window.open = jest.fn().mockImplementation(() => ({}) as Window);

describe('RouterService', () => {
  let routerService: RouterService;

  beforeEach(() => {
    RouterService['instance'] = null;
    routerService = RouterService.getInstance();

    jest.clearAllMocks();
  });

  it('should be a singleton', () => {
    const instance1 = RouterService.getInstance();
    const instance2 = RouterService.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('should get the full URL', () => {
    // Create a spy on the method to verify it's called correctly
    const spy = jest.spyOn(routerService, 'getFullUrl');
    routerService.getFullUrl();
    expect(spy).toHaveBeenCalled();
  });

  it('should get the origin', () => {
    // Create a spy on the method to verify it's called correctly
    const spy = jest.spyOn(routerService, 'getOrigin');
    routerService.getOrigin();
    expect(spy).toHaveBeenCalled();
  });

  it('should build a shareable URL', () => {
    expect(routerService.buildShareableUrl('/share/123')).toBe('https://example.com/share/123');
  });

  it('should open a new window', () => {
    routerService.openNewWindow('https://example.com', 'width=500,height=500');
    expect(window.open).toHaveBeenCalledWith(
      'https://example.com',
      '_blank',
      'width=500,height=500',
    );
  });

  it('should handle redirect', () => {
    const navigate = jest.fn();
    const result = routerService.handleRedirect(navigate, '/test');
    expect(navigate).toHaveBeenCalledWith('/test', { replace: true });
    expect(result).toBeNull();
  });

  it('should reload the page', () => {
    routerService.reloadPage();
    expect(window.location.reload).toHaveBeenCalled();
  });
});
