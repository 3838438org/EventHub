describe("EventTracker", function() {
  var name = "EventTracker";
  var sessionKey = name + "::activeSession";
  var generatedIdKey = name + "::generatedId";
  var identifiedUserKey = name + "::identifiedUser";
  var generatedUserKey = name + "::generatedUser";
  var eventTracker;

  var clearStorage = function() {
    delete sessionStorage[sessionKey];
    delete localStorage[generatedIdKey];
    delete localStorage[identifiedUserKey];
    delete localStorage[generatedUserKey];
    delete localStorage[name + '::Queue'];
  };

  beforeEach(function() {
    clearStorage();
    jasmine.clock().install();
    DevTips = jasmine.createSpyObj('DevTips', ['jsonp']);
    DevTips.jsonp.and.callFake(function(url, params, api, success, failure) {
      if (success) {
        success();
      }
    });

    eventTracker = new EventTracker(name,
      new StorageQueue(name, window.localStorage),
      window.localStorage,
      window.sessionStorage,
      { url: 'http://example.com' });
  });

  afterEach(function() {
    jasmine.clock().uninstall();
  });

  describe("basic tracking", function() {
    it("should send event with given url, event_type and properties", function() {
      eventTracker.track("submission", { a: 'b' });
      eventTracker.flush();

      expect(DevTips.jsonp.calls.count()).toBe(1);
      var args = DevTips.jsonp.calls.mostRecent().args;
      expect(args[0]).toBe('http://example.com/events/batch_track');
      var eventsSent = args[1].events;
      expect(eventsSent[0]).toEqual(
        jasmine.objectContaining({ event_type: 'submission', a: 'b' }));
    });

    it("should batch send events after the flushInterval", function() {
      eventTracker.initialize();
      eventTracker.start();
      eventTracker.track("submission");
      eventTracker.track("submission");
      eventTracker.track("submission");

      jasmine.clock().tick(501);
      expect(DevTips.jsonp).not.toHaveBeenCalled();
      jasmine.clock().tick(500);
      expect(DevTips.jsonp.calls.count()).toBe(1);
      expect(DevTips.jsonp.calls.mostRecent().args[1].events.length).toBe(3);
      jasmine.clock().tick(5000);
      expect(DevTips.jsonp.calls.count()).toBe(1);
    });

    it("should send previously queued events after resumed", function() {
      eventTracker.track('prev-submission', { a: 'b' });
      eventTracker.initialize();
      eventTracker.track('submission', { c: 'd' });
      eventTracker.flush();

      expect(DevTips.jsonp.calls.count()).toBe(2);
      expect(DevTips.jsonp.calls.first().args[1].events.length).toBe(1);
      expect(DevTips.jsonp.calls.first().args[1].events[0]).toEqual(
        jasmine.objectContaining({ event_type: 'prev-submission', a: 'b' }));
      expect(DevTips.jsonp.calls.mostRecent().args[1].events.length).toBe(1);
      expect(DevTips.jsonp.calls.mostRecent().args[1].events[0]).toEqual(
        jasmine.objectContaining({ event_type: 'submission', c: 'd' }));
    });
  });

  describe("tracking with generated user", function() {
    it("should generate a new user id during initialization", function() {
      expect(eventTracker._getUser().id).toBeUndefined();

      eventTracker.initialize();
      eventTracker.flush();
      expect(eventTracker._getUser().id).toBeDefined();
    });

    it("should send events with generated id", function() {
      eventTracker.initialize();
      eventTracker.track("submission");
      eventTracker.flush();

      expect(DevTips.jsonp.calls.count()).toBe(1);
      var eventsSent = DevTips.jsonp.calls.mostRecent().args[1].events;
      var generatedId = eventTracker._getUser().id;
      expect(generatedId).toBeDefined();
      expect(eventsSent[0].external_user_id).toBe(generatedId);
    });

    it("should reuse previously generated user if it's not a new session", function() {
      eventTracker.initialize();
      eventTracker.register({ foo: 'bar' });
      eventTracker.flush();
      var generatedUser = eventTracker._getUser();

      eventTracker.initialize();
      eventTracker.track("submission");
      eventTracker.flush();

      var eventsSent = DevTips.jsonp.calls.mostRecent().args[1].events;
      expect(eventsSent[0]).toEqual({
        event_type: 'submission',
        external_user_id: generatedUser.id,
        foo: 'bar'
      });
    });

    it("should invalidate previously generated user if it's a new session", function() {
      eventTracker.initialize();
      eventTracker.flush();
      var generatedUser = eventTracker._getUser();
      delete sessionStorage[sessionKey];

      eventTracker.initialize();
      eventTracker.track("submission");
      eventTracker.flush();

      var eventsSent = DevTips.jsonp.calls.mostRecent().args[1].events;
      expect(eventsSent[0].external_user_id).not.toBe(generatedUser.id);
    });

    it("should send previously queued events after resumed", function() {
      eventTracker.initialize();
      eventTracker.register({ foo: 'bar' });
      eventTracker.flush();
      var generatedUser = eventTracker._getUser();

      eventTracker.track('prev-submission', { a: 'b' });
      eventTracker.initialize();
      eventTracker.track('submission', { c: 'd' });
      eventTracker.flush();

      expect(DevTips.jsonp.calls.count()).toBe(2);
      expect(DevTips.jsonp.calls.first().args[1].events.length).toBe(1);
      expect(DevTips.jsonp.calls.first().args[1].events[0]).toEqual({
        external_user_id: generatedUser.id,
        event_type: 'prev-submission',
        a: 'b',
        foo: 'bar'
      });
      expect(DevTips.jsonp.calls.mostRecent().args[1].events.length).toBe(1);
      expect(DevTips.jsonp.calls.mostRecent().args[1].events[0]).toEqual({
        external_user_id: generatedUser.id,
        event_type: 'submission',
        c: 'd',
        foo: 'bar'
      });
    });
  });

  describe("tracking with identified user", function() {
    it("should send events with identified user id, and properties", function() {
      eventTracker.initialize();
      eventTracker.identify('foo@example.com', { foo: 'bar' });
      eventTracker.track("submission", { a: 'b' });
      eventTracker.flush();

      expect(DevTips.jsonp.calls.count()).toBe(1);
      var eventsSent = DevTips.jsonp.calls.mostRecent().args[1].events;
      expect(eventsSent[0]).toEqual(
        jasmine.objectContaining({
          event_type: 'submission',
          external_user_id: 'foo@example.com',
          foo: 'bar',
          a: 'b'
        }));
    });

    it("should invalidate previously identified user", function() {
      eventTracker.initialize();
      eventTracker.identify('foo', { foo: 'bar' });
      eventTracker.flush();

      eventTracker.initialize();
      eventTracker.track("submission");
      eventTracker.flush();

      var eventsSent = DevTips.jsonp.calls.mostRecent().args[1].events;
      expect(eventsSent[0].external_user_id).not.toBe('foo');
      expect(eventsSent[0].foo).toBeUndefined();
    });

    it("should send previously queued events after resumed", function() {
      eventTracker.initialize();
      eventTracker.identify('foo', { foo: 'bar' });
      eventTracker.flush();

      eventTracker.track('prev-submission', { a: 'b' });
      eventTracker.initialize();
      eventTracker.track('submission', { c: 'd' });
      eventTracker.flush();

      expect(DevTips.jsonp.calls.count()).toBe(2);
      expect(DevTips.jsonp.calls.first().args[1].events.length).toBe(1);
      expect(DevTips.jsonp.calls.first().args[1].events[0]).toEqual({
        external_user_id: 'foo',
        event_type: 'prev-submission',
        a: 'b',
        foo: 'bar'
      });
      expect(DevTips.jsonp.calls.mostRecent().args[1].events.length).toBe(1);
      expect(DevTips.jsonp.calls.mostRecent().args[1].events[0].external_user_id).not.toBe('foo');
      expect(DevTips.jsonp.calls.mostRecent().args[1].events[0].foo).toBeUndefined();
      expect(DevTips.jsonp.calls.mostRecent().args[1].events[0]).toEqual(jasmine.objectContaining({
        event_type: 'submission',
        c: 'd'
      }));
    });
  });
});