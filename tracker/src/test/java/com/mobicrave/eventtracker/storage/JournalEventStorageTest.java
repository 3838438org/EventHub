package com.mobicrave.eventtracker.storage;


import com.google.common.collect.ImmutableMap;
import com.google.common.collect.Lists;
import com.mobicrave.eventtracker.Criterion;
import com.mobicrave.eventtracker.model.Event;
import org.junit.Assert;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.TemporaryFolder;

import java.util.List;
import java.util.Map;

public class JournalEventStorageTest {
  @Rule
  public TemporaryFolder folder = new TemporaryFolder();

  @Test
  public void testAll() throws Exception {
    String dataDir = folder.newFolder("journal-event-storage-test").getCanonicalPath() + "/";
    JournalEventStorage eventStorage = JournalEventStorage.build(dataDir);
    String[] eventTypes = new String[] { "a", "b", "c" };
    String[] externalUserIds = new String[] { "x", "y", "z" };
    String[] dates = new String[] { "20130101", "20130102", "20131111" };
    Map<String, String>[] properties = (Map<String, String>[]) new Map[] {
        ImmutableMap.<String, String>builder().put("foo1", "bar1").put("foo2", "bar2").build(),
        ImmutableMap.<String, String>builder().put("foo2", "bar2").put("foo3", "bar3").build(),
        ImmutableMap.<String, String>builder().put("foo3", "bar3").build()
    };
    int[] userIds = new int[] { 1, 2, 3 };
    int[] eventTypeIds = new int[] { 4, 5, 6 };

    for (int i = 0; i < eventTypes.length - 1; i++) {
      eventStorage.addEvent(new Event.Builder(
          eventTypes[i], externalUserIds[i], dates[i], properties[i]).build(),
          userIds[i], eventTypeIds[i]);
    }

    List[] matchedCriteria = new List[] {
        Lists.newArrayList(new Criterion("foo1", "bar1"), new Criterion("foo2", "bar2")),
        Lists.newArrayList(new Criterion("foo2", "bar2")),
        Lists.newArrayList(new Criterion("foo3", "bar3"))
    };
    List[] unmatchedCriteria = new List[] {
        Lists.newArrayList(new Criterion("foo1", "bar1"), new Criterion("foo2", "bar2"),
            new Criterion("foo3", "bar3")),
        Lists.newArrayList(new Criterion("foo2", "bar1")),
        Lists.newArrayList(new Criterion("foo1", "bar1"))
    };
    for (int i = 0; i < eventTypes.length - 1; i++) {
      Assert.assertTrue(eventStorage.satisfy(i, matchedCriteria[i]));
      Assert.assertFalse(eventStorage.satisfy(i, unmatchedCriteria[i]));
      Assert.assertEquals(eventTypes[i], eventStorage.getEvent(i).getEventType());
      Assert.assertEquals(externalUserIds[i], eventStorage.getEvent(i).getExternalUserId());
      Assert.assertEquals(dates[i], eventStorage.getEvent(i).getDate());
      Assert.assertEquals(properties[i], eventStorage.getEvent(i).getProperties());
      Assert.assertEquals(userIds[i], eventStorage.getUserId(i));
      Assert.assertEquals(eventTypeIds[i], eventStorage.getEventTypeId(i));
    }
    eventStorage.close();

    eventStorage = JournalEventStorage.build(dataDir);
    eventStorage.addEvent(new Event.Builder(
        eventTypes[eventTypes.length - 1], externalUserIds[eventTypes.length - 1],
        dates[eventTypes.length - 1], properties[eventTypes.length - 1]).build(),
        userIds[eventTypes.length - 1], eventTypeIds[eventTypes.length - 1]);
    for (int i = 0; i < eventTypes.length; i++) {
      Assert.assertTrue(eventStorage.satisfy(i, matchedCriteria[i]));
      Assert.assertFalse(eventStorage.satisfy(i, unmatchedCriteria[i]));
      Assert.assertEquals(eventTypes[i], eventStorage.getEvent(i).getEventType());
      Assert.assertEquals(externalUserIds[i], eventStorage.getEvent(i).getExternalUserId());
      Assert.assertEquals(dates[i], eventStorage.getEvent(i).getDate());
      Assert.assertEquals(userIds[i], eventStorage.getUserId(i));
      Assert.assertEquals(eventTypeIds[i], eventStorage.getEventTypeId(i));
    }
  }
}
