import { BrowserCapabilities, BeyondPresenceError, BeyondPresenceErrorType } from '../types';

/**
 * Detects browser capabilities for WebRTC and LiveKit features
 */
export function detectBrowserCapabilities(): BrowserCapabilities {
  const capabilities: BrowserCapabilities = {
    webRTC: false,
    mediaDevices: false,
    insertableStreams: false,
    adaptiveStream: false,
    dynacast: false
  };

  // Check for basic WebRTC support
  if (typeof RTCPeerConnection !== 'undefined') {
    capabilities.webRTC = true;
  }

  // Check for MediaDevices API
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    capabilities.mediaDevices = true;
  }

  // Check for Insertable Streams (required for E2EE)
  if (typeof RTCRtpSender !== 'undefined' && 
      RTCRtpSender.prototype.createEncodedStreams) {
    capabilities.insertableStreams = true;
  }

  // Check for ResizeObserver (required for adaptive streaming)
  if (typeof ResizeObserver !== 'undefined') {
    capabilities.adaptiveStream = true;
  }

  // Check for dynacast support (requires modern browser features)
  if (capabilities.webRTC && capabilities.mediaDevices && 
      typeof IntersectionObserver !== 'undefined') {
    capabilities.dynacast = true;
  }

  return capabilities;
}

/**
 * Checks if the browser supports the minimum requirements for BeyondPresence
 */
export function isBrowserSupported(): boolean {
  const capabilities = detectBrowserCapabilities();
  return capabilities.webRTC && capabilities.mediaDevices;
}

/**
 * Throws an error if the browser is not supported
 */
export function validateBrowserSupport(): void {
  if (!isBrowserSupported()) {
    const capabilities = detectBrowserCapabilities();
    const missing: string[] = [];
    
    if (!capabilities.webRTC) missing.push('WebRTC');
    if (!capabilities.mediaDevices) missing.push('MediaDevices API');
    
    throw new BeyondPresenceError(
      BeyondPresenceErrorType.BROWSER_COMPATIBILITY_ERROR,
      `Browser does not support required features: ${missing.join(', ')}`
    );
  }
}

/**
 * Gets browser information for debugging
 */
export function getBrowserInfo(): {
  userAgent: string;
  vendor: string;
  platform: string;
  capabilities: BrowserCapabilities;
} {
  return {
    userAgent: navigator.userAgent,
    vendor: navigator.vendor || 'unknown',
    platform: navigator.platform || 'unknown',
    capabilities: detectBrowserCapabilities()
  };
}

/**
 * Checks if the browser supports adaptive streaming
 */
export function supportsAdaptiveStream(): boolean {
  return detectBrowserCapabilities().adaptiveStream;
}

/**
 * Checks if the browser supports dynacast
 */
export function supportsDynacast(): boolean {
  return detectBrowserCapabilities().dynacast;
}