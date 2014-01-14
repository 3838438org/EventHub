package com.mobicrave.eventtracker.model;

import com.google.gson.Gson;
import com.mobicrave.eventtracker.base.Schema;

import java.nio.ByteBuffer;
import java.util.Map;

public class Event {
  private final String eventType;
  private final String externalUserId;
  private final String date;
  private final Map<String, String> properties;

  public Event(String eventType, String externalUserId,
      String date, Map<String, String> properties) {
    this.eventType = eventType;
    this.externalUserId = externalUserId;
    this.date = date;
    this.properties = properties;
  }

  public String getEventType() {
    return eventType;
  }

  public String getDate() {
    return date;
  }

  public String getExternalUserId() {
    return externalUserId;
  }

  public Map<String, String> getProperties() {
    return properties;
  }

  public MetaData getMetaData(long userId, int eventTypeId, byte[] location) {
    return new MetaData(userId, eventTypeId, location);
  }

  public ByteBuffer toByteBuffer() {
    Gson gson = new Gson();
    return ByteBuffer.wrap(gson.toJson(this).getBytes());
  }

  public static Event fromByteBuffer(ByteBuffer byteBuffer) {
    Gson gson = new Gson();
    return gson.fromJson(new String(byteBuffer.array()), Event.class);
  }

  public static class MetaData {
    private final long userId;
    private final byte[] location;
    private final int eventTypeId;

    public MetaData(long userId, int eventTypeId, byte[] location) {
      this.userId = userId;
      this.eventTypeId = eventTypeId;
      this.location = location;
    }

    public long getUserId() {
      return userId;
    }

    public int getEventTypeId() {
      return eventTypeId;
    }

    public byte[] getLocation() {
      return location;
    }

    public static Schema<MetaData> getSchema() {
      return new MetaDataSchema();
    }

    private static class MetaDataSchema implements Schema<MetaData> {
      @Override
      public int getObjectSize() {
        return 8 + 13 + 4;
      }

      @Override
      public byte[] toBytes(MetaData metaData) {
        ByteBuffer byteBuffer = ByteBuffer.allocate(getObjectSize());
        byteBuffer.putLong(metaData.userId)
                  .putInt(metaData.eventTypeId)
                  .put(metaData.location);
        return byteBuffer.array();
      }

      @Override
      public MetaData fromBytes(byte[] bytes) {
        ByteBuffer byteBuffer = ByteBuffer.wrap(bytes);
        long userId = byteBuffer.getLong();
        int eventTypeId = byteBuffer.getInt();
        byte[] location = new byte[13];
        byteBuffer.get(location);
        return new MetaData(userId, eventTypeId, location);
      }
    }
  }

  public static class Builder {
    private final String eventType;
    private final String externalUserId;
    private final String date;
    private Map<String, String> properties;

    public Builder(String eventType, String externalUserId, String date, Map<String, String> properties) {
      this.eventType = eventType;
      this.externalUserId = externalUserId;
      this.date = date;
      this.properties = properties;
    }

    public Builder add(String key, String value) {
      properties.put(key, value);
      return this;
    }

    public Event build() {
      return new Event(eventType, externalUserId, date, properties);
    }
  }
}
