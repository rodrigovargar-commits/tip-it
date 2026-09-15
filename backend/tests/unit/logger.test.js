const { logger, logSecurityEvent, SECURITY_EVENTS } = require('../../src/utils/logger');

describe('logSecurityEvent (§8 catalog enforcement)', () => {
  it('logs every declared event type without throwing', () => {
    SECURITY_EVENTS.forEach((event) => {
      expect(() =>
        logSecurityEvent({ event, outcome: 'success', actorId: 'test', sourceIp: '127.0.0.1' })
      ).not.toThrow();
    });
  });

  it('refuses to log an event type outside the declared catalog', () => {
    const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {});
    const infoSpy = jest.spyOn(logger, 'info').mockImplementation(() => {});

    logSecurityEvent({ event: 'made.up.event', outcome: 'success' });

    expect(warnSpy).toHaveBeenCalled();
    expect(infoSpy).not.toHaveBeenCalled();

    warnSpy.mockRestore();
    infoSpy.mockRestore();
  });

  it('defaults actor_id to "anonymous" when none is given', () => {
    const infoSpy = jest.spyOn(logger, 'info').mockImplementation(() => {});
    logSecurityEvent({ event: 'admin.access', outcome: 'failure' });
    expect(infoSpy).toHaveBeenCalledWith(expect.objectContaining({ actor_id: 'anonymous' }));
    infoSpy.mockRestore();
  });
});
