package com.mobicrave.eventtracker;

import com.google.common.collect.Lists;
import com.google.common.io.ByteStreams;
import org.fusesource.hawtjournal.api.Journal;
import org.fusesource.hawtjournal.api.Location;

import java.io.IOException;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;

public class JournalEventStorage implements EventStorage {
  private final Journal eventJournal;
  private final Journal metaDataJournal;
  private Event.MetaData[] metaDatas;
  private AtomicLong currentId;

  private JournalEventStorage(Journal eventJournal, Journal metaDataJournal, Event.MetaData[] metaDatas,
      AtomicLong currentId) {
    this.eventJournal = eventJournal;
    this.metaDataJournal = metaDataJournal;
    this.metaDatas = metaDatas;
    this.currentId = currentId;
  }

  @Override
  public synchronized long addEvent(Event event, long userId, int eventTypeId) {
    // TODO: remove this synchronized constraint
    // TODO: 4B constraint
    int id = (int) currentId.getAndIncrement();
    if (id >= metaDatas.length) {
      synchronized (this) {
        if (id >= metaDatas.length) {
          Event.MetaData[] newMetaDatas = new Event.MetaData[metaDatas.length * 2];
          System.arraycopy(metaDatas, 0, newMetaDatas, 0, metaDatas.length);
          metaDatas = newMetaDatas;
        }
      }
    }

    try {
      byte[] location = JournalUtil.locationToBytes(eventJournal.write(event.toByteBuffer(), true));
      Event.MetaData metaData = event.getMetaData(userId, eventTypeId, location);
      metaDatas[id] = metaData;
      metaDataJournal.write(metaData.toByteBuffer(), true);
      return id;
    } catch (IOException e) {
      throw new RuntimeException(e);
    }
  }

  @Override
  public Event.MetaData getEventMetaData(long eventId) {
    return metaDatas[(int) eventId];
  }

  @Override
  public Event getEvent(long eventId) {
    try {
      Location location = new Location();
      location.readExternal(ByteStreams.newDataInput(getEventMetaData(eventId).getLocation()));
      return Event.fromByteBuffer(eventJournal.read(location));
    } catch (IOException e) {
      throw new RuntimeException(e);
    }
  }

  @Override
  public void close() {
    try {
      eventJournal.close();
      metaDataJournal.close();
    } catch (IOException e) {
      throw new RuntimeException(e);
    }
  }

  public static JournalEventStorage build(String dataDir) {
    List<Event.MetaData> metaDatas = Lists.newArrayList();
    Journal eventJournal = JournalUtil.createJournal(dataDir + "/event_journal/");
    Journal metaDataJournal = JournalUtil.createJournal(dataDir + "/meta_data_journal/");
    try {
      for (Location location : metaDataJournal) {
        metaDatas.add(Event.MetaData.fromByteBuffer(metaDataJournal.read(location)));
      }
    } catch (IOException e) {
      throw new RuntimeException(e);
    }
    return new JournalEventStorage(eventJournal, metaDataJournal,
        metaDatas.toArray(new Event.MetaData[1024]), new AtomicLong(metaDatas.size()));
  }
}
