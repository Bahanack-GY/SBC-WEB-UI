import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ok } from '../test/api';

const api = vi.hoisted(() => ({ pushGetPublicKey: vi.fn(), pushSubscribe: vi.fn() }));
vi.mock('../services/SBCApiService', () => ({ sbcApiService: api }));

import { enablePush, isPushEnabled, pushSupport } from './push';

const ANDROID = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/128 Mobile Safari/537.36';
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Version/17.5 Mobile/15E148 Safari/604.1';

const subscription = { endpoint: 'https://fcm.googleapis.com/fcm/send/abc', toJSON: () => ({ endpoint: 'https://fcm.googleapis.com/fcm/send/abc', keys: { p256dh: 'p', auth: 'a' } }) };
let pushManager: { getSubscription: ReturnType<typeof vi.fn>; subscribe: ReturnType<typeof vi.fn> };
let permission: NotificationPermission;

const stubBrowser = (ua: string, { push = true } = {}) => {
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(ua);
  pushManager = { getSubscription: vi.fn().mockResolvedValue(null), subscribe: vi.fn().mockResolvedValue(subscription) };
  const reg = { pushManager };
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: { getRegistration: vi.fn().mockResolvedValue(reg), register: vi.fn().mockResolvedValue(reg) },
  });
  if (push) (window as unknown as Record<string, unknown>).PushManager = function PushManager() {};
  else delete (window as unknown as Record<string, unknown>).PushManager;
  permission = 'default';
  (window as unknown as Record<string, unknown>).Notification = {
    get permission() { return permission; },
    requestPermission: vi.fn(async () => permission),
  };
};

beforeEach(() => {
  api.pushGetPublicKey.mockResolvedValue(ok({ publicKey: 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U' }));
  api.pushSubscribe.mockResolvedValue(ok({}));
});
afterEach(() => {
  delete (window as unknown as Record<string, unknown>).PushManager;
  delete (window as unknown as Record<string, unknown>).Notification;
});

describe('where push can work', () => {
  it('works in an Android browser', () => {
    stubBrowser(ANDROID);
    expect(pushSupport()).toBe('supported');
  });

  it('on iPhone, needs SBC on the home screen first', () => {
    stubBrowser(IPHONE);
    expect(pushSupport()).toBe('ios-needs-install');
  });

  it('is unavailable in a browser without push', () => {
    stubBrowser(ANDROID, { push: false });
    expect(pushSupport()).toBe('unsupported');
  });
});

describe('turning alerts on', () => {
  it('asks permission, subscribes with the server key, and saves the subscription', async () => {
    stubBrowser(ANDROID);
    permission = 'granted';

    expect(await enablePush()).toBe('enabled');

    const opts = pushManager.subscribe.mock.calls[0][0];
    expect(opts.userVisibleOnly).toBe(true);
    expect(opts.applicationServerKey).toBeInstanceOf(Uint8Array);
    expect(opts.applicationServerKey).toHaveLength(65); // an uncompressed P-256 public key
    expect(api.pushSubscribe).toHaveBeenCalledWith(subscription.toJSON());
  });

  it('reuses the subscription this browser already has', async () => {
    stubBrowser(ANDROID);
    permission = 'granted';
    pushManager.getSubscription.mockResolvedValue(subscription);

    expect(await enablePush()).toBe('enabled');
    expect(pushManager.subscribe).not.toHaveBeenCalled();
    expect(api.pushSubscribe).toHaveBeenCalled();
  });

  it('stops when the parrain refuses, without subscribing', async () => {
    stubBrowser(ANDROID);
    permission = 'denied';
    expect(await enablePush()).toBe('denied');
    expect(pushManager.subscribe).not.toHaveBeenCalled();
  });

  it('stops when push is off on the server', async () => {
    stubBrowser(ANDROID);
    permission = 'granted';
    api.pushGetPublicKey.mockResolvedValue(ok({ publicKey: null }));
    expect(await enablePush()).toBe('unavailable');
    expect(pushManager.subscribe).not.toHaveBeenCalled();
  });

  it('knows when this browser is already on', async () => {
    stubBrowser(ANDROID);
    permission = 'granted';
    pushManager.getSubscription.mockResolvedValue(subscription);
    expect(await isPushEnabled()).toBe(true);
  });
});
