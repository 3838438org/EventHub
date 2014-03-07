package com.mobicrave.eventtracker.storage;

import com.mobicrave.eventtracker.Criterion;
import com.mobicrave.eventtracker.model.Event;

import java.io.Closeable;
import java.util.List;

public interface EventStorage extends Closeable {
  long addEvent(Event event, int userId, int eventTypeId);
  Event getEvent(long eventId);
  int getUserId(long eventId);
  int getEventTypeId(long eventId);
  boolean satisfy(long eventId, List<Criterion> criteria);
  String getVarz(int indentation);
}
