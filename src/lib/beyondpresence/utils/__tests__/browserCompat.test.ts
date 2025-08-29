import {
  detectBrowserCapabilities,
  isBrowserSupported,
  validateBrowserSupport,
  getBrowserInfo,
  supportsAdaptiveStream,
  supportsDynacast
} from '../browserCompat';
import { BeyondPresenceError, BeyondPresenceErrorType } from '../../types';

// Mock browser APIs for testing
const mockRTCPeerConnection = jest.fn();
const mockMediaDevices = {
  getUserMedia: jest.fn()
};
const mockResizeObserver = jest.fn();
const mockIntersectionObserver = jest.fn();

describe('Browser Compatibility Utils', () => {
  beforeEach(() => {
    // Reset global mocks
    (global as any).RTCPeerConnection = mockRTCPeerConnection;
    (global as any).navigator = {
      mediaDevices: mockMediaDevices,
      userAgent: 'Test Browser',
      vendor: 'Test Vendor',
      platform: 'Test Platform'
    };
    (global as any).ResizeObserver = mockResizeObserver;
    (global as any).IntersectionObserver = mockIntersectionObserver;
  });

  describe('detectBrowserCapabilities', () => {
    it('should detect all capabilities when APIs are available', () => {
      const capabilities = detectBrowserCapabilities();
      
      expect(capabilities.webRTC).toBe(true);
      expect(capabilities.mediaDevices).toBe(true);
      expect(capabilities.adaptiveStream).toBe(true);
      expect(capabilities.dynacast).toBe(true);
    });

    it('should detect missing WebRTC support', () => {
      delete (global as any).RTCPeerConnection;
      
      const capabilities = detectBrowserCapabilities();
      expect(capabilities.webRTC).toBe(false);
    });

    it('should detect missing MediaDevices support', () => {
      (global as any).navigator.mediaDevices = undefined;
      
      const capabilities = detectBrowserCapabilities();
      expect(capabilities.mediaDevices).toBe(false);
    });
  });

  describe('isBrowserSupported', () => {
    it('should return true when minimum requirements are met', () => {
      expect(isBrowserSupported()).toBe(true);
    });

    it('should return false when WebRTC is missing', () => {
      delete (global as any).RTCPeerConnection;
      expect(isBrowserSupported()).toBe(false);
    });
  });

  describe('validateBrowserSupport', () => {
    it('should not throw when browser is supported', () => {
      expect(() => validateBrowserSupport()).not.toThrow();
    });

    it('should throw BeyondPresenceError when browser is not supported', () => {
      delete (global as any).RTCPeerConnection;
      
      expect(() => validateBrowserSupport()).toThrow(BeyondPresenceError);
      
      try {
        validateBrowserSupport();
      } catch (error) {
        expect((error as BeyondPresenceError).type).toBe(
          BeyondPresenceErrorType.BROWSER_COMPATIBILITY_ERROR
        );
      }
    });
  });

  describe('getBrowserInfo', () => {
    it('should return browser information', () => {
      const info = getBrowserInfo();
      
      expect(info.userAgent).toBe('Test Browser');
      expect(info.vendor).toBe('Test Vendor');
      expect(info.platform).toBe('Test Platform');
      expect(info.capabilities).toBeDefined();
    });
  });
});