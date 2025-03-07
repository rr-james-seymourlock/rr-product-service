import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { parseDomain } from '../parseUrlComponents.js';

describe('parseDomain', () => {
  let consoleErrorSpy: any;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('handles basic domains correctly', () => {
    expect(parseDomain('example.com')).toBe('example.com');
    expect(parseDomain('example.com')).toBe('example.com');
    expect(parseDomain('example.org')).toBe('example.org');
  });

  it('removes www prefix', () => {
    expect(parseDomain('www.example.com')).toBe('example.com');
    expect(parseDomain('www.test.org')).toBe('test.org');
  });

  it('handles known country-specific suffixes', () => {
    expect(parseDomain('example.co.uk')).toBe('example.co.uk');
    expect(parseDomain('example.com.au')).toBe('example.com.au');
    expect(parseDomain('example.co.jp')).toBe('example.co.jp');
  });

  it('handles subdomains correctly', () => {
    expect(parseDomain('shop.example.com')).toBe('example.com');
    expect(parseDomain('store.test.co.uk')).toBe('test.co.uk');
    expect(parseDomain('a.b.c.example.com')).toBe('example.com');
  });

  it('handles store specific subdomains correctly', () => {
    expect(parseDomain('oldnavy.gap.com')).toBe('oldnavy.gap.com');
    expect(parseDomain('www.oldnavy.gap.com')).toBe('oldnavy.gap.com');
    expect(parseDomain('www.mobile.oldnavy.gap.com')).toBe('oldnavy.gap.com');
    expect(parseDomain('bananarepublic.gap.com')).toBe('bananarepublic.gap.com');
    expect(parseDomain('athleta.gap.com')).toBe('athleta.gap.com');
    expect(parseDomain('bananarepublicfactory.gapfactory.com')).toBe('bananarepublicfactory.gapfactory.com');
    expect(parseDomain('shop.nike.com')).toBe('nike.com');
  });

  it('removes all known subdomain prefixes', () => {
    expect(parseDomain('www.example.com')).toBe('example.com');
    expect(parseDomain('www2.example.com')).toBe('example.com');
    expect(parseDomain('www.shop.example.com')).toBe('example.com');
    expect(parseDomain('m.example.com')).toBe('example.com');
    expect(parseDomain('mobile.example.com')).toBe('example.com');
    expect(parseDomain('us.example.com')).toBe('example.com');
    expect(parseDomain('launch.example.com')).toBe('example.com');
    expect(parseDomain('store.example.com')).toBe('example.com');
  });
});