package com.mobicrave.eventtracker.storage;

import com.google.common.collect.ImmutableMap;
import com.mobicrave.eventtracker.model.Event;
import org.junit.Assert;
import org.junit.Test;

import java.util.Map;

public class MemEventStorageTest {
  @Test
  public void testAll() throws Exception {
    EventStorage eventStorage = MemEventStorage.build();
    String[] eventTypes = new String[] { "a", "b", "c" };
    String[] externalIds = new String[] { "x", "y", "z" };
    String[] dates = new String[] { "20130101", "20130102", "20131111" };
    Map<String, String>[] properties = (Map<String, String>[]) new Map[] {
        ImmutableMap.<String, String>builder().put("foo1", "bar1").build(),
        ImmutableMap.<String, String>builder().put("foo2", "bar2").build(),
        ImmutableMap.<String, String>builder().put("foo3", "bar3").build()
    };
    int[] userIds = new int[] { 1, 2, 3 };
    int[] eventTypeIds = new int[] { 4, 5, 6 };

    for (int i = 0; i < eventTypes.length; i++) {
      eventStorage.addEvent(new Event.Builder(
          eventTypes[i], externalIds[i], dates[i], properties[i]).build(),
          userIds[i], eventTypeIds[i]);
    }

    for (int i = 0; i < eventTypes.length; i++) {
      Assert.assertEquals(eventTypes[i], eventStorage.getEvent(i).getEventType());
      Assert.assertEquals(externalIds[i], eventStorage.getEvent(i).getExternalUserId());
      Assert.assertEquals(dates[i], eventStorage.getEvent(i).getDate());
      Assert.assertEquals(properties[i], eventStorage.getEvent(i).getProperties());
      Event.MetaData eventMetaData = eventStorage.getEventMetaData(i);
      Assert.assertEquals(userIds[i], eventMetaData.getUserId());
      Assert.assertEquals(eventTypeIds[i], eventMetaData.getEventTypeId());
      Assert.assertEquals(userIds[i], eventStorage.getEventMetaData(i).getUserId());
      Assert.assertEquals(eventTypeIds[i], eventStorage.getEventMetaData(i).getEventTypeId());
    }
  }
}
