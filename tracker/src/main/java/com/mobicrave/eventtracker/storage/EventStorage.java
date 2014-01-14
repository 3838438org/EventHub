package com.mobicrave.eventtracker.storage;

import com.mobicrave.eventtracker.model.Event;

import java.io.Closeable;

public interface EventStorage extends Closeable {
  public long addEvent(Event event, long userId, int eventTypeId);
  public Event.MetaData getEventMetaData(long eventId);
  public Event getEvent(long eventId);
}
